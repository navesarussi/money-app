import { View, Text, Pressable, StyleSheet } from 'react-native'
import { OWNERS, type Owner } from '../lib/types'
import { ownerLabel } from '../locales/he'
import { colors } from '../lib/theme'

interface Props {
  selected: Owner
  onSelect: (o: Owner) => void
}

export default function OwnerPicker({ selected, onSelect }: Props) {
  return (
    <View style={s.row}>
      {OWNERS.map((id) => {
        const active = selected === id
        return (
          <Pressable key={id} onPress={() => onSelect(id)} style={[s.btn, active ? s.btnActive : s.btnInactive]}>
            <Text style={[s.label, active && { color: colors.white }]}>{ownerLabel(id)}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  btnActive: { backgroundColor: colors.primary, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  btnInactive: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200 },
  label: { fontSize: 14, fontWeight: '600', color: colors.gray600 },
})
