import * as SecureStore from 'expo-secure-store'

const A0_KEY = 'A0_API_KEY'
const VISION_KEY = 'GOOGLE_VISION_API_KEY'

// Save and retrieve the a0 LLM API key
export async function saveA0ApiKey(key: string | null) {
  if (!key) {
    await SecureStore.deleteItemAsync(A0_KEY)
    return
  }
  await SecureStore.setItemAsync(A0_KEY, key)
}

export async function getA0ApiKey(): Promise<string | null> {
  return await SecureStore.getItemAsync(A0_KEY)
}

export async function hasA0ApiKey(): Promise<boolean> {
  const k = await getA0ApiKey()
  return Boolean(k)
}

// Save and retrieve the Google Vision API key (server/API key for Vision HTTP API)
export async function saveVisionApiKey(key: string | null) {
  if (!key) {
    await SecureStore.deleteItemAsync(VISION_KEY)
    return
  }
  await SecureStore.setItemAsync(VISION_KEY, key)
}

export async function getVisionApiKey(): Promise<string | null> {
  return await SecureStore.getItemAsync(VISION_KEY)
}

export async function hasVisionApiKey(): Promise<boolean> {
  const k = await getVisionApiKey()
  return Boolean(k)
}