import { View, Text, Pressable, StyleSheet } from 'react-native'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type TransactionType } from '../lib/types'
import { loadUserCategories } from '../lib/userCategories'
import { categoryLabel } from '../locales/he'
import { colors } from '../lib/theme'

interface Props {
  type: TransactionType
  selected: string
  onSelect: (c: string) => void
}

export default function CategoryGrid({ type, selected, onSelect }: Props) {
  const builtIn = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const extra = loadUserCategories().filter((u) => u.kind === type).map((u) => ({ id: u.id, icon: u.icon }))
  const list = [...builtIn, ...extra]

  return (
    <View style={s.grid}>
      {list.map((cat) => {
        const active = selected === cat.id
        return (
          <Pressable key={cat.id} onPress={() => onSelect(cat.id)} style={[s.item, active ? s.itemActive : s.itemInactive]}>
            <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
            <Text style={[s.itemLabel, active && { color: colors.white }]}>{categoryLabel(cat.id)}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  item: { alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: 12, width: '31%' as any },
  itemActive: { backgroundColor: colors.primary, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  itemInactive: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200 },
  itemLabel: { fontSize: 14, fontWeight: '500', color: colors.gray700 },
})
