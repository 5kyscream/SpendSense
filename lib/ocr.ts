import { OcrResult, Purchase } from '../types'
import { getVisionApiKey } from './config'
import * as FileSystem from 'expo-file-system'

function normalizeSpaces(s: string) {
  return s.replace(/\s+/g, ' ').trim()
}

function parseAmountCandidates(text: string): number | undefined {
  // find rupee amounts like ₹1,032 or 1032.00 etc. prefer those with ₹ symbol
  const amountRegex = /₹\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g
  let match
  const nums: number[] = []
  while ((match = amountRegex.exec(text)) !== null) {
    const cleaned = match[1].replace(/,/g, '')
    const n = parseFloat(cleaned)
    if (!isNaN(n)) nums.push(n)
  }

  // fallback: any standalone number with commas; prefer bigger numbers (display amounts)
  if (nums.length === 0) {
    const numRegex = /([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g
    while ((match = numRegex.exec(text)) !== null) {
      const cleaned = match[1].replace(/,/g, '')
      const n = parseFloat(cleaned)
      if (!isNaN(n)) nums.push(n)
    }
  }

  if (nums.length === 0) return undefined
  // often the displayed large amount is the biggest number
  return Math.max(...nums)
}

function parseDate(text: string): string | undefined {
  // matches common formats: 12 Oct 2025, 1:47 pm or 4 Oct 2025, 6:43 pm or 29 Sept 2025, 6:07 pm
  const dateRegex = /(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}(?:,?\s*\d{1,2}:\d{2}(?:\s*(?:am|pm))?)?)/i
  const m = text.match(dateRegex)
  if (m) return normalizeSpaces(m[1])

  // fallback ISO-like date
  const iso = text.match(/(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]
  return undefined
}

function parseTransactionId(text: string): string | undefined {
  const m = text.match(/UPI transaction ID\s*[:\-]?\s*([A-Za-z0-9\-_]+)/i)
  if (m) return m[1]
  const m2 = text.match(/Google transaction ID\s*[:\-]?\s*([A-Za-z0-9\-_]+)/i)
  if (m2) return m2[1]
  // generic transaction-like tokens (CICA...)
  const generic = text.match(/([A-Z0-9]{4,}[A-Za-z0-9_\-]{3,})/)
  if (generic) return generic[1]
  return undefined
}

function inferTransactionType(text: string): 'sent' | 'received' | undefined {
  // look for keywords
  const lower = text.toLowerCase()
  if (/(payment received from|credited)/.test(lower)) return 'received'
  if (/(paid to|payment sent|to:|paytm|pay again|paid)/.test(lower)) return 'sent'
  return undefined
}

function inferCategoryFromMerchant(merchant = ''): string | undefined {
  const m = merchant.toLowerCase()
  if (!m) return undefined
  if (/restaurant|cafe|food|dominos|zomato|swiggy/.test(m)) return 'Food'
  if (/uber|ola|taxi|cab/.test(m)) return 'Transport'
  if (/grocer|grocery|supermarket|reliance|big bazaar|dmart|jio mart|spencer/.test(m)) return 'Groceries'
  if (/movie|bookmyshow|cinema|ticket/.test(m)) return 'Entertainment'
  if (/rent|house|apartment/.test(m)) return 'Rent'
  if (/phone|mobile|recharge|internet|jio/.test(m)) return 'Utilities'
  return undefined
}

function simpleParseText(text: string): Partial<Purchase> | undefined {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const joined = lines.join('\n')

  // merchant extraction: prioritize 'To:' or 'To' lines, then 'From', then Merchant label, then uppercase line
  let merchant: string | undefined
  for (const line of lines) {
    const m = line.match(/^To[:\-]?\s*(.+)$/i) || line.match(/^To\s+(.+)$/i)
    if (m) {
      merchant = normalizeSpaces(m[1].replace(/\(.*\)/, ''))
      break
    }
  }

  if (!merchant) {
    for (const line of lines) {
      const m = line.match(/^From[:\-]?\s*(.+)$/i)
      if (m) {
        merchant = normalizeSpaces(m[1].replace(/\(.*\)/, ''))
        break
      }
    }
  }

  if (!merchant) {
    for (const line of lines) {
      const m = line.match(/Merchant[:\-]?\s*(.+)/i)
      if (m) {
        merchant = normalizeSpaces(m[1])
        break
      }
    }
  }

  // fallback: take a long uppercase line (often name)
  if (!merchant) {
    for (const line of lines) {
      if (line.length > 3 && /[A-Z\s]{4,}/.test(line) && line.split(' ').length <= 4) {
        merchant = normalizeSpaces(line)
        break
      }
    }
  }

  const amount = parseAmountCandidates(joined)
  const date = parseDate(joined)
  const tx = parseTransactionId(joined)
  const txType = inferTransactionType(joined)
  const suggestedCategory = inferCategoryFromMerchant(merchant || '')

  if (!amount && !merchant) return undefined

  return {
    merchant: merchant || 'Unknown',
    amount: amount || 0,
    date,
    transactionId: tx,
    transactionType: txType,
    // @ts-ignore - attach suggestion
    suggestedCategory,
  }
}

async function callGoogleVisionBase64(base64: string, apiKey: string): Promise<string | undefined> {
  const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`
  const body = {
    requests: [
      {
        image: { content: base64 },
        features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
      },
    ],
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Vision API error ${res.status}: ${txt}`)
  }
  const json = await res.json()
  try {
    const text = json.responses?.[0]?.fullTextAnnotation?.text
    return text
  } catch (err) {
    return undefined
  }
}

export async function performOcrOnImage(uri: string): Promise<OcrResult> {
  // First try cloud Vision if API key is configured
  try {
    const apiKey = await getVisionApiKey()
    if (apiKey) {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
      const rawText = (await callGoogleVisionBase64(base64, apiKey)) || ''
      const parsed = simpleParseText(rawText)
      return { rawText, parsed }
    }
  } catch (err) {
    // continue to fallbacks
  }

  // Native ML Kit fallbacks
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mlkit = require('@react-native-ml-kit/text-recognition')
    const recognizer = mlkit && (mlkit.default || mlkit)
    if (recognizer && typeof recognizer.recognize === 'function') {
      const result = await recognizer.recognize(uri)
      const rawText = Array.isArray(result)
        ? result.map((r: any) => (r.text ? r.text : JSON.stringify(r))).join('\n')
        : (result.text || JSON.stringify(result))
      const parsed = simpleParseText(rawText)
      return { rawText, parsed }
    }
  } catch (err) {
    // ignore
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ml = require('react-native-mlkit-ocr')
    const recognizer = ml && (ml.default || ml)
    if (recognizer && typeof recognizer.mlKitTextRecognition === 'function') {
      const blocks = await recognizer.mlKitTextRecognition(uri)
      const rawText = Array.isArray(blocks) ? blocks.map((b: any) => b.text || JSON.stringify(b)).join('\n') : JSON.stringify(blocks)
      const parsed = simpleParseText(rawText)
      return { rawText, parsed }
    }
  } catch (err) {
    // ignore
  }

  // Fallback mock
  const rawText = `PAYMENT RECEIVED\nMerchant: Example Store\nAmount: ₹299.00\nDate: 2025-08-10`
  const parsed = simpleParseText(rawText)
  return { rawText, parsed }
}