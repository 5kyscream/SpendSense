export async function generateAdvice(purchases: any[], latestPurchase: any) {
  // Build a simple prompt
  const prompt = `You are a helpful personal finance assistant. The user has purchase history: ${JSON.stringify(
    purchases.slice(0, 30)
  )}. The latest purchase is: ${JSON.stringify(latestPurchase)}. Provide 3 concise pieces of advice to help the user manage spend and suggest a category for the latest purchase.`

  try {
    const res = await fetch('https://api.a0.dev/ai/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
    })
    const json = await res.json()
    return json.completion || 'Could not generate advice.'
  } catch (err) {
    console.warn('AI call failed', err)
    return 'Failed to generate advice. Try again later.'
  }
}