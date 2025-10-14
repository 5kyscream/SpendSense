import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getA0ApiKey, saveA0ApiKey, getVisionApiKey, saveVisionApiKey } from '../lib/config'
import { theme } from '../lib/theme'

export default function SettingsScreen() {
  const [a0Key, setA0Key] = useState<string | null>(null)
  const [visionKey, setVisionKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      const k = await getA0ApiKey()
      const v = await getVisionApiKey()
      if (!mounted) return
      setA0Key(k)
      setVisionKey(v)
      setLoading(false)
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  async function handleSave() {
    await saveA0ApiKey(a0Key || null)
    await saveVisionApiKey(visionKey || null)
    Alert.alert('Saved', 'API keys saved to secure storage.')
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.inner}>
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.label}>AI API Key (a0)</Text>
        <TextInput value={a0Key ?? ''} onChangeText={setA0Key as any} placeholder="Enter a0 API key" style={styles.input} autoCapitalize="none" />

        <Text style={styles.label}>Google Vision API Key</Text>
        <TextInput value={visionKey ?? ''} onChangeText={setVisionKey as any} placeholder="Enter Vision API key" style={styles.input} autoCapitalize="none" />

        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 12 }}>
          <Text style={{ color: '#6B7280' }}>
            Note: Vision API keys call a Google Cloud product. Keep the key private. For Expo Go usage, storing the key in SecureStore is convenient for testing. For production, consider using a server-side proxy to avoid shipping keys in the client.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface },
  inner: { padding: theme.spacing.md },
  title: { fontSize: theme.text.lg, fontWeight: '700', marginBottom: theme.spacing.md, color: theme.colors.onSurface },
  label: { marginTop: theme.spacing.sm, color: theme.colors.onSurface },
  input: { backgroundColor: 'white', padding: theme.spacing.sm, borderRadius: theme.radii.sm, marginTop: theme.spacing.xs },
  button: { marginTop: theme.spacing.md, backgroundColor: theme.colors.primary, padding: theme.spacing.sm, borderRadius: theme.radii.sm, alignItems: 'center' },
  buttonText: { color: theme.colors.onPrimary, fontWeight: '700' },
})