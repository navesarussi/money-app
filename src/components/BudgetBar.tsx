import { View, Text, StyleSheet } from 'react-native'
import { formatCurrency } from '../lib/utils'
import { he } from '../locales/he'
import { colors } from '../lib/theme'

interface Props {
  spent: number
  limit: number
}

export default function BudgetBar({ spent, limit }: Props) {
  if (limit <= 0) {
    if (spent <= 0) return null
    return (
      <View style={[s.card, { borderColor: colors.red100, borderWidth: 1 }]}>
        <Text style={{ fontSize: 12, color: colors.red700, lineHeight: 18 }}>{he.budget.noRoomButVariableSpent}</Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.expense, marginTop: 8 }}>
          {he.budget.spent} {formatCurrency(spent)}
        </Text>
      </View>
    )
  }

  const pct = Math.min((spent / limit) * 100, 100)
  const remaining = limit - spent
  const isOver = remaining < 0
  const barBg = isOver ? colors.red500 : pct > 80 ? colors.amber500 : colors.primary

  return (
    <View style={s.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, color: colors.gray500 }}>{he.budget.title}</Text>
          <Text style={{ fontSize: 10, color: colors.gray400, marginTop: 2 }}>{he.budget.autoDerived}</Text>
        </View>
        <Text style={{ fontSize: 12, color: colors.gray400, marginLeft: 4 }}>
          {pct.toFixed(0)}% {he.budget.percentUsed}
        </Text>
      </View>
      <View style={s.trackBg}>
        <View style={[s.trackFill, { width: `${pct}%` as any, backgroundColor: barBg }]} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 14, color: colors.gray500 }}>
          {he.budget.spent}{' '}
          <Text style={{ fontWeight: '600', color: colors.gray800 }}>{formatCurrency(spent)}</Text>
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: isOver ? colors.red500 : colors.income }}>
          {isOver ? `${he.budget.overBy} ` : ''}
          {formatCurrency(Math.abs(remaining))}
          {isOver ? '' : ` ${he.budget.left}`}
        </Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  trackBg: { width: '100%', height: 12, backgroundColor: colors.gray100, borderRadius: 999, overflow: 'hidden', marginBottom: 8 },
  trackFill: { height: '100%', borderRadius: 999 },
})
