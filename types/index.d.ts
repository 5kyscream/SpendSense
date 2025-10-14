export interface Purchase {
  id: string
  merchant: string
  amount: number
  currency?: string
  date?: string // ISO
  category?: string
  sourceImageUri?: string
}

export interface OcrResult {
  rawText: string
  parsed?: Partial<Purchase>
}