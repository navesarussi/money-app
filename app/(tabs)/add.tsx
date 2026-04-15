import { useState, useEffect, useMemo, useRef } from 'react'
import { View, Text, Pressable, TextInput, ScrollView, Alert, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import CategoryGrid from '../../src/components/CategoryGrid'
import OwnerPicker from '../../src/components/OwnerPicker'
import { saveTransaction, getSavingsAccounts } from '../../src/lib/store'
import { generateId, todayString } from '../../src/lib/utils'
import { colors } from '../../src/lib/theme'
import {
  isExpenseCategory,
  isIncomeCategory,
  type TransactionType,
  type Owner,
  type SavingsAccount,
} from '../../src/lib/types'
import { he, savingsTypeLabel } from '../../src/locales/he'

const TYPE_OPTIONS: { id: TransactionType; label: string }[] = [
  { id: 'expense', label: he.transactionType.expense },
  { id: 'income', label: he.transactionType.income },
]

export default function AddTransaction() {
  const router = useRouter()
  const inputRef = useRef<TextInput>(null)

  const [amount, setAmount] = useState('')
  const [type, setType] = useState<TransactionType>('expense')
  const [category, setCategory] = useState<string>('food')
  const [owner, setOwner] = useState<Owner>('me')
  const [date, setDate] = useState(todayString())
  const [note, setNote] = useState('')
  const [linkedSavingsId, setLinkedSavingsId] = useState<string>('')
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([])

  const nonLoanAccounts = useMemo(
    () => savingsAccounts.filter((a) => a.type !== 'loan'),
    [savingsAccounts]
  )
  const loanAccounts = useMemo(
    () => savingsAccounts.filter((a) => a.type === 'loan'),
    [savingsAccounts]
  )

  const linkOptions = useMemo(() => {
    if (category === 'savings' || category === 'income_savings') return nonLoanAccounts
    if (category === 'loan' || category === 'income_loan') return loanAccounts
    return []
  }, [category, nonLoanAccounts, loanAccounts])

  const categoryNeedsAccountLink =
    category === 'savings' ||
    category === 'loan' ||
    category === 'income_savings' ||
    category === 'income_loan'

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300)
    getSavingsAccounts().then(setSavingsAccounts).catch(console.error)
  }, [])

  useEffect(() => {
    if (type === 'expense') {
      setCategory((c) => (isExpenseCategory(c) ? c : 'food'))
    } else {
      setCategory((c) => (isIncomeCategory(c) ? c : 'salary'))
    }
  }, [type])

  useEffect(() => {
    if (!categoryNeedsAccountLink) {
      setLinkedSavingsId('')
    }
  }, [categoryNeedsAccountLink])

  useEffect(() => {
    if (!linkedSavingsId || savingsAccounts.length === 0) return
    const acc = savingsAccounts.find((a) => a.id === linkedSavingsId)
    if ((category === 'savings' || category === 'income_savings') && acc?.type === 'loan') {
      setLinkedSavingsId('')
    }
    if ((category === 'loan' || category === 'income_loan') && acc && acc.type !== 'loan') {
      setLinkedSavingsId('')
    }
  }, [category, linkedSavingsId, savingsAccounts])

  const handleSave = async () => {
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) return
    if (type === 'income' && category === 'income_other' && !note.trim()) {
      Alert.alert('', he.settings.incomeDetailRequired)
      return
    }

    if (
      (category === 'savings' || category === 'income_savings') &&
      nonLoanAccounts.length > 0 &&
      !linkedSavingsId
    ) {
      Alert.alert('', he.addTransaction.selectSavingsAccount)
      return
    }
    if ((category === 'loan' || category === 'income_loan') && loanAccounts.length > 0 && !linkedSavingsId) {
      Alert.alert('', he.addTransaction.selectLoanAccount)
      return
    }

    try {
      await saveTransaction({
        id: generateId(),
        amount: parsed,
        type,
        category,
        date,
        owner,
        note: note.trim(),
        created_at: new Date().toISOString(),
        linked_savings_id:
          categoryNeedsAccountLink && linkedSavingsId ? linkedSavingsId : undefined,
      })
      router.navigate('/')
    } catch (e) {
      console.error(e)
    }
  }

  const showAccountPicker = categoryNeedsAccountLink && linkOptions.length > 0

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>{he.addTransaction.title}</Text>

      {/* Type toggle */}
      <View style={styles.typeRow}>
        {TYPE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.id}
            onPress={() => setType(opt.id)}
            style={[
              styles.typeButtonBase,
              type === opt.id
                ? opt.id === 'expense'
                  ? styles.typeButtonExpenseActive
                  : styles.typeButtonIncomeActive
                : styles.typeButtonInactive,
            ]}
          >
            <Text style={[styles.typeButtonText, type === opt.id ? styles.typeButtonTextActive : styles.typeButtonTextInactive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Amount */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>{he.common.amount}</Text>
        <TextInput
          ref={inputRef}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.gray300}
          value={amount}
          onChangeText={setAmount}
          style={styles.amountInput}
        />
      </View>

      {/* Category */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{he.common.category}</Text>
        <CategoryGrid type={type} selected={category} onSelect={setCategory} />
      </View>

      {/* Account picker */}
      {showAccountPicker && (
        <View style={styles.card}>
          <Text style={styles.fieldLabelSpaced}>
            {category === 'savings' || category === 'income_savings'
              ? he.addTransaction.selectSavingsAccount
              : he.addTransaction.selectLoanAccount}
          </Text>
          <View style={styles.accountList}>
            {linkOptions.map((acc) => (
              <Pressable
                key={acc.id}
                onPress={() => setLinkedSavingsId(acc.id)}
                style={[
                  styles.accountRow,
                  linkedSavingsId === acc.id ? styles.accountRowSelected : styles.accountRowUnselected,
                ]}
              >
                <Text
                  style={[
                    styles.accountRowText,
                    linkedSavingsId === acc.id ? styles.accountRowTextSelected : styles.accountRowTextUnselected,
                  ]}
                >
                  {savingsTypeLabel(acc.type)} — {acc.name}
                </Text>
              </Pressable>
            ))}
          </View>
          {linkedSavingsId && (
            <Text style={styles.accountHint}>
              {type === 'expense'
                ? he.addTransaction.savingsExpenseHint
                : he.addTransaction.savingsIncomeHint}
            </Text>
          )}
        </View>
      )}

      {categoryNeedsAccountLink && linkOptions.length === 0 && (
        <Text style={styles.noAccountsWarning}>{he.addTransaction.noAccountsForCategory}</Text>
      )}

      {/* Owner */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{he.common.owner}</Text>
        <OwnerPicker selected={owner} onSelect={setOwner} />
      </View>

      {/* Date */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>{he.common.date}</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.gray300}
          style={styles.textInput}
        />
      </View>

      {/* Note */}
      <View style={[styles.card, styles.noteCard]}>
        <Text style={styles.fieldLabel}>{he.common.noteOptional}</Text>
        <TextInput
          placeholder={he.addTransaction.notePlaceholder}
          placeholderTextColor={colors.gray300}
          value={note}
          onChangeText={setNote}
          style={styles.textInput}
        />
      </View>

      {/* Save button */}
      <Pressable
        onPress={handleSave}
        disabled={!amount || parseFloat(amount) <= 0}
        style={[
          styles.saveButton,
          { opacity: !amount || parseFloat(amount) <= 0 ? 0.4 : 1 },
        ]}
      >
        <Text style={styles.saveButtonText}>{he.addTransaction.save}</Text>
      </Pressable>
    </ScrollView>
  )
}

const shadowSm = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 2,
  elevation: 2,
} as const

const shadowMd = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.12,
  shadowRadius: 4,
  elevation: 4,
} as const

const shadowLg = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 6,
} as const

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 96,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: 24,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  typeButtonBase: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonExpenseActive: {
    backgroundColor: colors.expense,
    ...shadowMd,
  },
  typeButtonIncomeActive: {
    backgroundColor: colors.income,
    ...shadowMd,
  },
  typeButtonInactive: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: colors.white,
  },
  typeButtonTextInactive: {
    color: colors.gray500,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...shadowSm,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.gray400,
    marginBottom: 4,
  },
  fieldLabelSpaced: {
    fontSize: 12,
    color: colors.gray400,
    marginBottom: 8,
  },
  amountInput: {
    width: '100%',
    fontSize: 30,
    fontWeight: '700',
    color: colors.gray800,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    color: colors.gray400,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  accountList: {
    gap: 6,
  },
  accountRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  accountRowSelected: {
    backgroundColor: colors.primary,
  },
  accountRowUnselected: {
    backgroundColor: colors.gray50,
  },
  accountRowText: {
    fontSize: 14,
  },
  accountRowTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  accountRowTextUnselected: {
    color: colors.gray700,
  },
  accountHint: {
    fontSize: 10,
    color: colors.gray400,
    marginTop: 8,
  },
  noAccountsWarning: {
    fontSize: 12,
    color: colors.amber800,
    backgroundColor: colors.amber50,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    lineHeight: 18,
  },
  textInput: {
    width: '100%',
    fontSize: 14,
    color: colors.gray700,
  },
  noteCard: {
    marginBottom: 24,
  },
  saveButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowLg,
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
})
