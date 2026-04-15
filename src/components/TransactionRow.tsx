import { useState, useEffect } from 'react'
import { View, Text, Pressable, TextInput, Alert, StyleSheet } from 'react-native'
import { getCategoryIcon } from '../lib/types'
import { formatCurrency } from '../lib/utils'
import type { Transaction, SavingsAccount } from '../lib/types'
import { Pencil, Trash2, Link2 } from 'lucide-react-native'
import { categoryLabel, ownerLabel, he, savingsTypeLabel } from '../locales/he'
import { colors } from '../lib/theme'

interface Props {
  tx: Transaction
  onDelete: (id: string) => void
  onSaveNote: (tx: Transaction, note: string) => Promise<void>
  savingsAccounts?: SavingsAccount[]
}

export default function TransactionRow({ tx, onDelete, onSaveNote, savingsAccounts = [] }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(tx.note)
  const [saving, setSaving] = useState(false)

  const linkedAccount = tx.linked_savings_id ? savingsAccounts.find(a => a.id === tx.linked_savings_id) : null

  useEffect(() => { setDraft(tx.note); setEditing(false) }, [tx.id, tx.note])

  const handleSave = async () => {
    setSaving(true)
    try { await onSaveNote(tx, draft.trim()); setEditing(false) }
    catch (e) { console.error(e); Alert.alert('', he.common.saveFailed) }
    finally { setSaving(false) }
  }

  return (
    <View style={s.container}>
      <View style={s.row}>
        <View style={s.iconBox}><Text style={{ fontSize: 24 }}>{getCategoryIcon(tx.category)}</Text></View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ fontWeight: '500', color: colors.gray800, fontSize: 14 }}>{categoryLabel(tx.category)}</Text>
            <Text style={{ fontWeight: '600', fontSize: 14, color: tx.type === 'income' ? colors.income : colors.expense }}>
              {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
            <Text style={{ fontSize: 12, color: colors.gray400 }}>{ownerLabel(tx.owner)}</Text>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              <Pressable onPress={() => setEditing(e => !e)} style={{ padding: 6 }}>
                <Pencil size={14} color={colors.gray400} />
              </Pressable>
              <Pressable onPress={() => Alert.alert('', he.transaction.deleteConfirm, [{ text: he.common.cancel, style: 'cancel' }, { text: he.transaction.deleteConfirm, style: 'destructive', onPress: () => onDelete(tx.id) }])} style={{ padding: 6 }}>
                <Trash2 size={14} color={colors.gray400} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {tx.note && !editing && <Text style={s.note}>{tx.note}</Text>}
      {linkedAccount && !editing && (
        <View style={s.linkedRow}>
          <Link2 size={10} color={colors.gray400} />
          <Text style={{ fontSize: 10, color: colors.gray400 }}>{savingsTypeLabel(linkedAccount.type)} - {linkedAccount.name}</Text>
        </View>
      )}

      {editing && (
        <View style={s.editArea}>
          <TextInput multiline numberOfLines={3} value={draft} onChangeText={setDraft} placeholder={he.transaction.notePlaceholder} placeholderTextColor={colors.gray300} style={s.textarea} textAlignVertical="top" />
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
            <Pressable onPress={() => { setDraft(tx.note); setEditing(false) }} style={s.cancelBtn}><Text style={{ fontSize: 12, fontWeight: '600', color: colors.gray500 }}>{he.common.cancel}</Text></Pressable>
            <Pressable onPress={() => void handleSave()} disabled={saving} style={[s.saveBtn, { opacity: saving ? 0.5 : 1 }]}><Text style={{ fontSize: 12, fontWeight: '600', color: colors.white }}>{he.common.save}</Text></Pressable>
          </View>
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: { paddingVertical: 12, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gray50, borderRadius: 12 },
  note: { fontSize: 12, color: colors.gray500, marginTop: 8, marginRight: 52, lineHeight: 18 },
  linkedRow: { marginTop: 8, marginRight: 52, flexDirection: 'row', alignItems: 'center', gap: 6 },
  editArea: { marginTop: 8, marginRight: 52, gap: 8 },
  textarea: { backgroundColor: colors.gray50, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: colors.gray800, minHeight: 72 },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200 },
  saveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primary },
})
