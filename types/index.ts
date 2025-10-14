export interface Purchase {
  id: string
  merchant: string
  amount: number
  currency?: string
  date?: string // ISO or human-friendly
  category?: string
  sourceImageUri?: string
  // optional extended fields
  transactionId?: string
  transactionType?: 'sent' | 'received'
}

export interface OcrResult {
  rawText: string
  // parsed may include extra helper fields like transactionId / transactionType / suggestedCategory
  parsed?: Partial<Purchase> & { suggestedCategory?: string }
}