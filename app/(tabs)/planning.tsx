import * as React from 'react'
import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { View, Text, Pressable, TextInput, ScrollView, Alert, StyleSheet } from 'react-native'
import {
  Plus,
  Trash2,
  Pencil,
  X,
  TrendingUp,
  TrendingDown,
  Wallet,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native'
import { getSavingsAccounts, saveSavingsAccount, deleteSavingsAccount } from '../../src/lib/store'
import { formatCurrency, generateId } from '../../src/lib/utils'
import { SAVINGS_TYPES, type SavingsAccount, type SavingsType } from '../../src/lib/types'
import { he, savingsTypeLabel } from '../../src/locales/he'
import { colors } from '../../src/lib/theme'

export default function Planning() {
  const [accounts, setAccounts] = useState<SavingsAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedType, setExpandedType] = useState<SavingsType | null>(null)

  const refresh = async () => {
    try {
      const data = await getSavingsAccounts()
      setAccounts(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const grouped = useMemo(() => {
    const map = new Map<SavingsType, SavingsAccount[]>()
    for (const type of SAVINGS_TYPES) {
      const items = accounts.filter((a) => a.type === type.id)
      if (items.length > 0) map.set(type.id, items)
    }
    return map
  }, [accounts])

  const totalAssets = useMemo(
    () => accounts.filter((a) => a.type !== 'loan').reduce((sum, a) => sum + a.current_amount, 0),
    [accounts],
  )

  const totalDebts = useMemo(
    () => accounts.filter((a) => a.type === 'loan').reduce((sum, a) => sum + (a.current_amount > 0 ? a.current_amount : a.target_amount - a.current_amount), 0),
    [accounts],
  )

  const netWorth = totalAssets - totalDebts

  const handleDelete = async (id: string) => {
    Alert.alert('', he.planning.deleteConfirm, [
      { text: he.common.cancel, style: 'cancel' },
      {
        text: he.planning.deleteConfirm,
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSavingsAccount(id)
            await refresh()
          } catch (e) {
            console.error(e)
          }
        },
      },
    ])
  }

  const handleEdit = (id: string) => {
    setEditingId(id)
    setShowForm(true)
  }

  const handleSaved = async () => {
    setShowForm(false)
    setEditingId(null)
    await refresh()
  }

  const toggleSection = (type: SavingsType) => {
    setExpandedType((prev) => (prev === type ? null : type))
  }

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingText}>{he.common.loading}</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.scrollRoot} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{he.planning.title}</Text>
        <Pressable
          onPress={() => { setEditingId(null); setShowForm(true) }}
          style={styles.addButton}
        >
          <Plus size={14} color={colors.white} />
          <Text style={styles.addButtonLabel}>{he.planning.addNew}</Text>
        </Pressable>
      </View>

      <Text style={styles.hintBanner}>
        {he.planning.budgetLinkHint}
      </Text>

      {/* Summary banner */}
      <View style={styles.summaryRow}>
        <SummaryCard
          label={he.planning.totalAssets}
          amount={totalAssets}
          icon={<TrendingUp size={16} color={colors.income} />}
          tone="income"
        />
        <SummaryCard
          label={he.planning.totalDebts}
          amount={totalDebts}
          icon={<TrendingDown size={16} color={colors.expense} />}
          tone="expense"
        />
        <SummaryCard
          label={he.planning.netWorth}
          amount={netWorth}
          icon={<Wallet size={16} color={netWorth >= 0 ? colors.income : colors.expense} />}
          tone={netWorth >= 0 ? 'income' : 'expense'}
        />
      </View>

      {/* Add / Edit form */}
      {showForm && (
        <AccountForm
          editItem={editingId ? accounts.find((a) => a.id === editingId) ?? null : null}
          onSave={handleSaved}
          onCancel={() => { setShowForm(false); setEditingId(null) }}
        />
      )}

      {/* Account groups */}
      {accounts.length === 0 && !showForm ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>{he.planning.noAccounts}</Text>
          <Text style={styles.emptyStateSubtitle}>{he.planning.tapToAdd}</Text>
        </View>
      ) : (
        <View style={styles.groupsColumn}>
          {SAVINGS_TYPES.map((typeInfo) => {
            const items = grouped.get(typeInfo.id)
            if (!items) return null
            const isLoan = typeInfo.id === 'loan'
            const sectionTotal = items.reduce((s, a) => s + a.current_amount, 0)
            const isExpanded = expandedType === typeInfo.id

            return (
              <View key={typeInfo.id} style={styles.sectionCard}>
                <Pressable
                  onPress={() => toggleSection(typeInfo.id)}
                  style={styles.sectionHeader}
                >
                  <Text style={styles.sectionIcon}>{typeInfo.icon}</Text>
                  <View style={styles.sectionHeaderBody}>
                    <View style={styles.sectionTitleRow}>
                      <Text style={styles.sectionTypeName}>
                        {savingsTypeLabel(typeInfo.id)}
                      </Text>
                      <Text style={isLoan ? styles.sectionTotalExpense : styles.sectionTotalIncome}>
                        {formatCurrency(sectionTotal)}
                      </Text>
                    </View>
                    <Text style={styles.sectionMeta}>
                      {items.length === 1 ? '\u05E4\u05E8\u05D9\u05D8 \u05D0\u05D7\u05D3' : `${items.length} \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD`}
                    </Text>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={16} color={colors.gray400} />
                  ) : (
                    <ChevronDown size={16} color={colors.gray400} />
                  )}
                </Pressable>

                {isExpanded && (
                  <View style={styles.sectionDividerTop}>
                    {items.map((account, i) => (
                      <View key={account.id}>
                        {i > 0 && <View style={styles.rowDivider} />}
                        <AccountCard
                          account={account}
                          onEdit={() => handleEdit(account.id)}
                          onDelete={() => handleDelete(account.id)}
                        />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

/* ── Summary Card ──────────────────────────────────────── */

function SummaryCard({
  label,
  amount,
  icon,
  tone,
}: {
  label: string
  amount: number
  icon: ReactNode
  tone: 'income' | 'expense'
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIconWrap, tone === 'income' ? styles.summaryIconWrapIncome : styles.summaryIconWrapExpense]}>
        {icon}
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryAmount, tone === 'income' ? styles.summaryAmountIncome : styles.summaryAmountExpense]}>{formatCurrency(amount)}</Text>
    </View>
  )
}

/* ── Account Card ──────────────────────────────────────── */

function AccountCard({
  account,
  onEdit,
  onDelete,
}: {
  account: SavingsAccount
  onEdit: () => void
  onDelete: () => void
}) {
  const isLoan = account.type === 'loan'
  const pct =
    account.target_amount > 0
      ? Math.min((account.current_amount / account.target_amount) * 100, 100)
      : 0

  const monthsEstimate =
    account.monthly_amount > 0
      ? Math.ceil(
          isLoan
            ? account.current_amount / account.monthly_amount
            : (account.target_amount - account.current_amount) / account.monthly_amount,
        )
      : null

  return (
    <View style={styles.accountCardPadding}>
      <View style={styles.accountTopRow}>
        <View style={styles.flex1}>
          <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
          {account.note ? (
            <Text style={styles.accountNote} numberOfLines={1}>{account.note}</Text>
          ) : null}
        </View>
        <View style={styles.accountActions}>
          <Pressable onPress={onEdit} style={styles.iconButton}>
            <Pencil size={14} color={colors.gray300} />
          </Pressable>
          <Pressable onPress={onDelete} style={styles.iconButton}>
            <Trash2 size={14} color={colors.gray300} />
          </Pressable>
        </View>
      </View>

      {account.target_amount > 0 && (
        <View style={styles.progressBlock}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressAmountLabel}>
              {formatCurrency(account.current_amount)}
              {!isLoan && account.target_amount > 0 && (
                <Text style={styles.progressSlash}> / {formatCurrency(account.target_amount)}</Text>
              )}
            </Text>
            <Text style={styles.progressPct}>{pct.toFixed(0)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                isLoan ? styles.progressFillExpense : styles.progressFillIncome,
                { width: `${pct}%` },
              ]}
            />
          </View>
        </View>
      )}

      <View style={styles.accountMetaRow}>
        {account.monthly_amount > 0 && (
          <Text style={styles.metaMuted}>
            {isLoan ? he.planning.monthlyPayment : he.planning.monthly}:{' '}
            <Text style={styles.metaStrong}>{formatCurrency(account.monthly_amount)}</Text>
          </Text>
        )}
        {isLoan && account.interest_rate > 0 && (
          <Text style={styles.metaMuted}>
            {he.planning.interestRate}: {account.interest_rate}%
          </Text>
        )}
        {monthsEstimate != null && monthsEstimate > 0 && monthsEstimate < 1200 && (
          <Text style={styles.metaEstimate}>
            {isLoan
              ? he.planning.loanRemaining(monthsEstimate)
              : he.planning.estimatedMonths(monthsEstimate)}
          </Text>
        )}
      </View>
    </View>
  )
}

/* ── Account Form ──────────────────────────────────────── */

function AccountForm({
  editItem,
  onSave,
  onCancel,
}: {
  editItem: SavingsAccount | null
  onSave: () => void
  onCancel: () => void
}) {
  const [type, setType] = useState<SavingsType>(editItem?.type ?? 'emergency')
  const [name, setName] = useState(editItem?.name ?? '')
  const [targetAmount, setTargetAmount] = useState(editItem?.target_amount?.toString() ?? '')
  const [currentAmount, setCurrentAmount] = useState(editItem?.current_amount?.toString() ?? '')
  const [monthlyAmount, setMonthlyAmount] = useState(editItem?.monthly_amount?.toString() ?? '')
  const [interestRate, setInterestRate] = useState(editItem?.interest_rate?.toString() ?? '')
  const [note, setNote] = useState(editItem?.note ?? '')
  const [saving, setSaving] = useState(false)

  const isLoan = type === 'loan'

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await saveSavingsAccount({
        id: editItem?.id ?? generateId(),
        type,
        name: name.trim(),
        target_amount: parseFloat(targetAmount) || 0,
        current_amount: parseFloat(currentAmount) || 0,
        monthly_amount: parseFloat(monthlyAmount) || 0,
        interest_rate: parseFloat(interestRate) || 0,
        note: note.trim(),
        created_at: editItem?.created_at ?? new Date().toISOString(),
      })
      onSave()
    } catch (e) {
      console.error(e)
      Alert.alert('', he.common.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.formCard}>
      <Pressable onPress={onCancel} style={styles.formClose}>
        <X size={18} color={colors.gray300} />
      </Pressable>

      <Text style={styles.formTitle}>
        {editItem ? he.planning.editTitle : he.planning.addTitle}
      </Text>

      {/* Type selector */}
      <View style={styles.formFieldBlock}>
        <Text style={styles.formLabel}>{he.planning.type}</Text>
        <View style={styles.typeRow}>
          {SAVINGS_TYPES.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setType(t.id)}
              style={[
                styles.typeChip,
                type === t.id ? styles.typeChipSelected : styles.typeChipIdle,
              ]}
            >
              <Text style={styles.typeChipIcon}>{t.icon}</Text>
              <Text style={[styles.typeChipLabel, type === t.id ? styles.typeChipLabelSelected : styles.typeChipLabelIdle]}>
                {savingsTypeLabel(t.id)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Name */}
      <View style={styles.formFieldBlock}>
        <Text style={styles.formLabelTight}>{he.planning.name}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={he.planning.namePlaceholder}
          placeholderTextColor={colors.gray300}
          style={styles.input}
        />
      </View>

      {/* Amount fields */}
      <View style={styles.formRowGap}>
        <View style={styles.flex1}>
          <Text style={styles.formLabelTight}>
            {isLoan ? he.planning.remaining : he.planning.target}
          </Text>
          <TextInput
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.gray300}
            value={targetAmount}
            onChangeText={setTargetAmount}
            style={styles.input}
          />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.formLabelTight}>{he.planning.current}</Text>
          <TextInput
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.gray300}
            value={currentAmount}
            onChangeText={setCurrentAmount}
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.formRowGap}>
        <View style={styles.flex1}>
          <Text style={styles.formLabelTight}>
            {isLoan ? he.planning.monthlyPayment : he.planning.monthly}
          </Text>
          <TextInput
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.gray300}
            value={monthlyAmount}
            onChangeText={setMonthlyAmount}
            style={styles.input}
          />
        </View>
        {isLoan && (
          <View style={styles.flex1}>
            <Text style={styles.formLabelTight}>{he.planning.interestRate}</Text>
            <TextInput
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.gray300}
              value={interestRate}
              onChangeText={setInterestRate}
              style={styles.input}
            />
          </View>
        )}
      </View>

      {/* Note */}
      <View style={styles.formNoteBlock}>
        <Text style={styles.formLabelTight}>{he.planning.note}</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={he.planning.notePlaceholder}
          placeholderTextColor={colors.gray300}
          style={styles.input}
        />
      </View>

      {/* Actions */}
      <View style={styles.formActions}>
        <Pressable
          onPress={onCancel}
          style={styles.formCancelBtn}
        >
          <Text style={styles.formCancelLabel}>{he.common.cancel}</Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!name.trim() || saving}
          style={[styles.formSaveBtn, (!name.trim() || saving) && styles.formSaveBtnDisabled]}
        >
          <Text style={styles.formSaveLabel}>{he.common.save}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const cardShadow = {
  shadowColor: colors.black,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.gray400,
  },
  scrollRoot: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 96,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray800,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  addButtonLabel: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  hintBanner: {
    fontSize: 11,
    color: colors.gray600,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray100,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    lineHeight: 16,
    ...cardShadow,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    ...cardShadow,
    alignItems: 'center',
  },
  summaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryIconWrapIncome: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  summaryIconWrapExpense: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  summaryLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: colors.gray400,
    marginBottom: 2,
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryAmountIncome: {
    color: colors.income,
  },
  summaryAmountExpense: {
    color: colors.expense,
  },
  emptyState: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 32,
    ...cardShadow,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 14,
    color: colors.gray400,
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: colors.gray400,
  },
  groupsColumn: {
    gap: 12,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    ...cardShadow,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionHeaderBody: {
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionTypeName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray800,
  },
  sectionTotalIncome: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.income,
  },
  sectionTotalExpense: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.expense,
  },
  sectionMeta: {
    fontSize: 12,
    color: colors.gray400,
  },
  sectionDividerTop: {
    borderTopWidth: 1,
    borderTopColor: colors.gray50,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.gray50,
  },
  accountCardPadding: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  accountTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  flex1: {
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray800,
  },
  accountNote: {
    fontSize: 12,
    color: colors.gray400,
    marginTop: 2,
  },
  accountActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconButton: {
    padding: 6,
  },
  progressBlock: {
    marginBottom: 8,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressAmountLabel: {
    fontSize: 12,
    color: colors.gray500,
  },
  progressSlash: {
    color: colors.gray300,
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray500,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: colors.gray100,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressFillIncome: {
    backgroundColor: colors.income,
  },
  progressFillExpense: {
    backgroundColor: colors.expense,
  },
  accountMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    rowGap: 4,
  },
  metaMuted: {
    fontSize: 12,
    color: colors.gray400,
  },
  metaStrong: {
    color: colors.gray600,
    fontWeight: '500',
  },
  metaEstimate: {
    fontSize: 12,
    color: colors.gray500,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    ...cardShadow,
    marginBottom: 16,
    position: 'relative',
  },
  formClose: {
    position: 'absolute',
    top: 12,
    left: 12,
    padding: 4,
    zIndex: 10,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 16,
  },
  formFieldBlock: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    color: colors.gray400,
    marginBottom: 6,
  },
  formLabelTight: {
    fontSize: 12,
    color: colors.gray400,
    marginBottom: 4,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  typeChip: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  typeChipSelected: {
    backgroundColor: colors.primary,
    ...cardShadow,
  },
  typeChipIdle: {
    backgroundColor: colors.gray50,
  },
  typeChipIcon: {
    fontSize: 16,
  },
  typeChipLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },
  typeChipLabelSelected: {
    color: colors.white,
  },
  typeChipLabelIdle: {
    color: colors.gray500,
  },
  input: {
    width: '100%',
    backgroundColor: colors.gray50,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.gray800,
  },
  formRowGap: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  formNoteBlock: {
    marginBottom: 16,
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
  },
  formCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    alignItems: 'center',
  },
  formCancelLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray500,
  },
  formSaveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  formSaveBtnDisabled: {
    opacity: 0.4,
  },
  formSaveLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
})
