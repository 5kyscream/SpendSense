import React from 'react'
import { View, Text, StyleSheet, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { usePurchases } from '../hooks/usePurchases'
import { theme } from '../lib/theme'
import { Svg, G, Path } from 'react-native-svg'

const DEFAULT_COLORS = ['#2B8AFF', '#FFB020', '#34D399', '#F472B6', '#A78BFA', '#FB7185', '#60A5FA', '#F59E0B']

function hashStringToIndex(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h) % DEFAULT_COLORS.length
}

function colorForCategory(category: string) {
  const idx = hashStringToIndex(category || 'Uncategorized')
  return DEFAULT_COLORS[idx]
}

function PieChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data)
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1
  let start = 0
  const radius = 80
  const cx = 90
  const cy = 90

  function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
    return { x: cx + r * Math.cos(angleInRadians), y: cy + r * Math.sin(angleInRadians) }
  }

  function arcPath(startAngle: number, endAngle: number) {
    const start = polarToCartesian(cx, cy, radius, endAngle)
    const end = polarToCartesian(cx, cy, radius, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`
  }

  return (
    <Svg width={180} height={180}>
      <G>
        {entries.map(([key, value], idx) => {
          const percent = (value / total) * 100
          const angle = (percent / 100) * 360
          const path = arcPath(start, start + angle)
          start += angle
          const fill = colorForCategory(key)
          return <Path key={key} d={path} fill={fill} />
        })}
      </G>
    </Svg>
  )
}

export default function OverviewScreen() {
  const { purchases, totalByCategory } = usePurchases()
  const totals = totalByCategory()
  const totalAll = Object.values(totals).reduce((s, v) => s + v, 0) || 1

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Overview</Text>
      </View>

      <View style={styles.chartRow}>
        <PieChart data={totals} />
        <View style={styles.legend}>
          {Object.entries(totals).map(([k, v]) => {
            const color = colorForCategory(k)
            const percent = ((v / totalAll) * 100).toFixed(0)
            return (
              <View key={k} style={styles.legendRow}>
                <View style={[styles.colorDot, { backgroundColor: color }]} />
                <Text style={styles.legendText}>{k} — ₹{v.toFixed(2)} ({percent}%)</Text>
              </View>
            )
          })}
        </View>
      </View>

      <View style={styles.listWrap}>
        <Text style={styles.sectionTitle}>Recent</Text>
        <FlatList
          data={purchases}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View>
                <Text style={styles.itemTitle}>{item.merchant}</Text>
                <Text style={styles.itemMeta}>{item.date ?? ''}</Text>
              </View>
              <Text style={[styles.itemAmount, { color: colorForCategory(item.category || 'Other') } ]}>₹{item.amount.toFixed(2)}</Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface, padding: theme.spacing.md },
  header: { marginBottom: theme.spacing.md },
  title: { fontSize: theme.text.lg, fontWeight: '700', color: theme.colors.onSurface },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  legend: { marginLeft: theme.spacing.md, flex: 1 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: theme.spacing.sm },
  legendText: { color: theme.colors.onSurface },
  listWrap: { marginTop: theme.spacing.md, flex: 1 },
  sectionTitle: { fontWeight: '700', marginBottom: theme.spacing.sm },
  item: { backgroundColor: 'white', padding: theme.spacing.sm, borderRadius: theme.radii.sm, flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  itemTitle: { fontWeight: '600' },
  itemMeta: { color: '#6B7280', fontSize: 12 },
  itemAmount: { fontWeight: '700' },
})