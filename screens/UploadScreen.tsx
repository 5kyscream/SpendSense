import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, ScrollView, Alert, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { performOcrOnImage } from '../lib/ocr'
import { usePurchases } from '../hooks/usePurchases'
import { generateAdvice } from '../lib/ai'
import { theme } from '../lib/theme'
import { hasA0ApiKey, hasVisionApiKey } from '../lib/config'
import { useNavigation } from '@react-navigation/native'

export default function UploadScreen() {
  const { add, purchases } = usePurchases()
  const { recentPurchasesForAi } = usePurchases()
  const [image, setImage] = useState<string | null>(null)
  const [ocr, setOcr] = useState<any | null>(null)
  const [editableMerchant, setEditableMerchant] = useState<string>('')
  const [editableAmount, setEditableAmount] = useState<string>('')
  const [editableDate, setEditableDate] = useState<string>('')
  const [editableCategory, setEditableCategory] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [advice, setAdvice] = useState<string | null>(null)
  const [hasA0, setHasA0] = useState<boolean | null>(null)
  const [hasVision, setHasVision] = useState<boolean | null>(null)
  const navigation = useNavigation<any>()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const a = await hasA0ApiKey()
      const v = await hasVisionApiKey()
      if (!mounted) return
      setHasA0(a)
      setHasVision(v)
    })()
    return () => {
      mounted = false
    }
  }, [])

  async function pickImage() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please allow photo library access to upload screenshots.')
        return
      }

      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images })
      const uri = (res as any).uri || (res as any).assets?.[0]?.uri
      if (!uri) return
      setImage(uri)
      setLoading(true)
      try {
        const o = await performOcrOnImage(uri)
        setOcr(o)
        // prefill editable fields from parsed OCR result
        const parsed = o?.parsed || {}
        setEditableMerchant(parsed.merchant || '')
        setEditableAmount(parsed.amount ? String(parsed.amount) : '')
        setEditableDate(parsed.date || '')
        setEditableCategory(parsed.category || '')
      } catch (err) {
        console.warn('OCR failed', err)
        Alert.alert('OCR failed', 'Could not extract text from the image. Try a different screenshot.')
      } finally {
        setLoading(false)
      }
    } catch (err) {
      console.warn('Image pick failed', err)
      Alert.alert('Image pick failed', 'An unexpected error occurred while selecting the image.')
    }
  }

  async function handleSaveAndAdvise() {
    if (!ocr?.parsed) {
      Alert.alert('No purchase parsed', 'We could not detect purchase info. Try a clearer screenshot.')
      return
    }

    setLoading(true)
    try {
      // use edited fields
      const latest = {
        merchant: editableMerchant || ocr.parsed.merchant || 'Unknown',
        amount: Number(editableAmount || ocr.parsed.amount || 0),
        date: editableDate || ocr.parsed.date,
      }

      const history = recentPurchasesForAi ? recentPurchasesForAi() : purchases || []
      const ai = await generateAdvice(history || [], latest)
      const suggested = ai?.suggestedCategory || undefined
      const categoryToSave = editableCategory || suggested

      const created = await add({
        merchant: latest.merchant,
        amount: latest.amount,
        date: latest.date,
        category: categoryToSave,
        sourceImageUri: image || undefined,
      })

      setAdvice(ai?.advice || null)
      setOcr((prev: any) => ({ ...prev, parsed: { ...prev.parsed, category: categoryToSave } }))
    } catch (err) {
      console.warn('Save & advise failed', err)
      Alert.alert('Save failed', 'Could not save purchase. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Upload Payment Screenshot</Text>

        {(hasA0 === false || hasVision === false) && (
          <TouchableOpacity style={styles.notice} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.noticeText}>
              {hasA0 === false ? 'AI API key missing. ' : ''}
              {hasVision === false ? 'Vision API key missing. ' : ''}
              Tap to open Settings.
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.uploader} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.preview} />
          ) : (
            <Text style={styles.uploadText}>Tap to choose a screenshot (GPay / PhonePe)</Text>
          )}
        </TouchableOpacity>

        {loading && <ActivityIndicator style={{ marginTop: 12 }} color={theme.colors.primary} />}

        {ocr && (
          <View style={styles.resultCard}>
            <Text style={styles.subTitle}>Parsed</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>{ocr.parsed?.transactionType === 'received' ? 'Received' : 'Sent'}</Text>
              {ocr.parsed?.suggestedCategory ? (
                <View style={styles.chip}><Text style={{ color: theme.colors.onPrimary }}>{ocr.parsed.suggestedCategory}</Text></View>
              ) : null}
            </View>

            <Text style={{ marginTop: 6 }}>Merchant</Text>
            <TextInput value={editableMerchant} onChangeText={setEditableMerchant as any} style={styles.input} />
            <Text style={{ marginTop: 6 }}>Amount (numeric)</Text>
            <TextInput value={editableAmount} onChangeText={setEditableAmount as any} keyboardType="numeric" style={styles.input} />
            <Text style={{ marginTop: 6 }}>Date</Text>
            <TextInput value={editableDate} onChangeText={setEditableDate as any} style={styles.input} />
            <Text style={{ marginTop: 6 }}>Category</Text>
            <TextInput value={editableCategory} onChangeText={setEditableCategory as any} placeholder={ocr.parsed?.category || ocr.parsed?.suggestedCategory || 'e.g., Food'} style={styles.input} />

            <TouchableOpacity style={styles.button} onPress={handleSaveAndAdvise}>
              <Text style={styles.buttonText}>Save & Get Advice</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 12 }}>
              <Text style={{ fontWeight: '700', marginBottom: 6 }}>Raw OCR Text</Text>
              <Text selectable style={{ color: '#334155' }}>{ocr.rawText}</Text>
            </View>
          </View>
        )}

        {advice && (
          <View style={styles.adviceCard}>
            <Text style={styles.subTitle}>AI Advice</Text>
            <Text>{advice}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface },
  content: { padding: theme.spacing.md },
  title: { fontSize: theme.text.lg, fontWeight: '700', marginBottom: theme.spacing.md, color: theme.colors.onSurface },
  notice: { padding: theme.spacing.sm, backgroundColor: '#FEF3C7', borderRadius: theme.radii.sm, marginBottom: theme.spacing.sm },
  noticeText: { color: '#92400E' },
  uploader: {
    backgroundColor: theme.colors.onPrimary,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    padding: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
  },
  chip: { backgroundColor: theme.colors.primary, padding: 6, borderRadius: 16 },
  uploadText: { color: theme.colors.onSurface },
  preview: { width: '100%', height: '100%', borderRadius: theme.radii.md },
  resultCard: {
    backgroundColor: 'white',
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  subTitle: { fontWeight: '700', marginBottom: theme.spacing.xs },
  button: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    alignItems: 'center',
  },
  buttonText: { color: theme.colors.onPrimary, fontWeight: '700' },
  adviceCard: { marginTop: theme.spacing.md, backgroundColor: 'white', padding: theme.spacing.md, borderRadius: theme.radii.md },
  input: { backgroundColor: '#F8FAFC', padding: theme.spacing.sm, borderRadius: theme.radii.sm, marginTop: theme.spacing.xs },
})