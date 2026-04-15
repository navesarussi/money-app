import { View, Text, StyleSheet } from 'react-native'
import { formatCurrency } from '../lib/utils'
import { getCategoryIcon, type ExpenseCategory } from '../lib/types'
import { categoryLabel, he } from '../locales/he'
import { colors } from '../lib/theme'

const COLORS: Record<ExpenseCategory, string> = {
  housing: '#6366f1',
  food: '#f59e0b',
  transport: '#3b82f6',
  bills: '#8b5cf6',
  fun: '#ec4899',
  savings: '#10b981',
  loan: '#dc2626',
  other: '#6b7280',
}

function barColor(category: string): string {
  if (category in COLORS) return COLORS[category as ExpenseCategory]
  let h = 0
  for (let i = 0; i < category.length; i++) {
    h = category.charCodeAt(i) + ((h << 5) - h)
  }
  return `hsl(${Math.abs(h) % 360}, 42%, 52%)`
}

interface Props {
  data: Record<string, number>
  transactionCounts?: Record<string, number>
}

export default function SpendingChart({ data, transactionCounts }: Props) {
  const counts = transactionCounts ?? {}
  const chartData = Object.entries(data)
    .filter(([, amount]) => amount > 0)
    .map(([category, amount]) => ({ category, icon: getCategoryIcon(category), amount, txCount: counts[category] ?? 0 }))
    .sort((a, b) => b.amount - a.amount)

  if (chartData.length === 0) {
    return (
      <View style={[s.card, { alignItems: 'center', paddingVertical: 32 }]}>
        <Text style={{ fontSize: 14, color: colors.gray400 }}>{he.spendingChart.empty}</Text>
      </View>
    )
  }

  const maxAmount = Math.max(...chartData.map((d) => d.amount), 1)

  return (
    <View style={s.card}>
      <Text style={{ fontSize: 14, fontWeight: '500', color: colors.gray500, marginBottom: 16 }}>{he.spendingChart.title}</Text>
      <View style={{ gap: 20 }}>
        {chartData.map((row) => {
          const pct = Math.min(100, Math.round((row.amount / maxAmount) * 100))
          return (
            <View key={row.category}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <Text style={{ fontSize: 24 }}>{row.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.gray800 }}>{categoryLabel(row.category)}</Text>
                    {row.txCount > 0 && <Text style={{ fontSize: 11, color: colors.gray400, marginTop: 2 }}>{he.spendingChart.txCount(row.txCount)}</Text>}
                  </View>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.gray800 }}>{formatCurrency(row.amount)}</Text>
              </View>
              <View style={s.trackBg}>
                <View style={{ height: '100%', borderRadius: 999, backgroundColor: barColor(row.category), width: `${pct}%` as any, minWidth: 4 }} />
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  trackBg: { height: 10, width: '100%', borderRadius: 999, backgroundColor: colors.gray100, overflow: 'hidden' },
})
