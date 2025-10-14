import { useEffect, useState, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Purchase } from '../types'
import { v4 as uuidv4 } from 'uuid'

const STORAGE_KEY = 'purchases_v1'

export function usePurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (json) setPurchases(JSON.parse(json))
      })
      .finally(() => setLoading(false))
  }, [])

  const persist = useCallback(async (next: Purchase[]) => {
    setPurchases(next)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  const add = useCallback(async (p: Omit<Purchase, 'id'>) => {
    const newP: Purchase = { id: uuidv4(), ...p }
    await persist([newP, ...purchases])
    return newP
  }, [purchases, persist])

  const remove = useCallback(async (id: string) => {
    const next = purchases.filter((p) => p.id !== id)
    await persist(next)
  }, [purchases, persist])

  const clear = useCallback(async () => {
    await persist([])
  }, [persist])

  const totalByCategory = useCallback(() => {
    const map: Record<string, number> = {}
    purchases.forEach((p) => {
      const cat = p.category || 'Uncategorized'
      map[cat] = (map[cat] || 0) + (p.amount || 0)
    })
    return map
  }, [purchases])

  // Return recent purchases formatted for AI: trimmed and simplified
  const recentPurchasesForAi = useCallback(() => {
    return purchases.slice(0, 100).map((p) => ({ merchant: p.merchant, amount: p.amount, category: p.category || 'Uncategorized', date: p.date }))
  }, [purchases])

  const totalsLastN = useCallback((n = 30) => {
    const recent = purchases.slice(0, n)
    const map: Record<string, number> = {}
    recent.forEach((p) => {
      const cat = p.category || 'Uncategorized'
      map[cat] = (map[cat] || 0) + (p.amount || 0)
    })
    return map
  }, [purchases])

  return { purchases, loading, add, remove, clear, totalByCategory, recentPurchasesForAi, totalsLastN }
}