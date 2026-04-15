import { useState, useMemo, useEffect, useCallback } from 'react'
import { View, Text, Pressable, TextInput, ScrollView, Alert, StyleSheet } from 'react-native'
import { Link } from 'expo-router'
import { ChevronLeft, ChevronRight, SlidersHorizontal, ArrowUpDown, PiggyBank } from 'lucide-react-native'
import BudgetBar from '../../src/components/BudgetBar'
import SpendingChart from '../../src/components/SpendingChart'
import TransactionRow from '../../src/components/TransactionRow'
import {
  getTransactions,
  deleteTransaction,
  getRecurring,
  saveTransaction,
  getMonthNote,
  saveMonthNote,
  getSavingsAccounts,
} from '../../src/lib/store'
import {
  formatCurrency,
  getMonthKey,
  getMonthLabel,
  filterByMonth,
  formatTransactionListDate,
  deriveMonthlySpendingLimit,
} from '../../src/lib/utils'
import {
  categoriesForTypeFilter,
  getCategoryIcon,
  isExpenseCategory,
  OWNERS,
  type Owner,
  type RecurringTransaction,
  type Transaction,
  type TransactionType,
  type SavingsAccount,
} from '../../src/lib/types'
import { he, categoryLabel, ownerLabel } from '../../src/locales/he'
import { colors } from '../../src/lib/theme'

type SortField = 'date' | 'amount' | 'category'
type SortDir = 'asc' | 'desc'

const TYPE_FILTERS: { id: TransactionType | 'all'; label: string }[] = [
  { id: 'all', label: he.common.all },
  { id: 'expense', label: he.transactionType.expenses },
  { id: 'income', label: he.transactionType.incomePlural },
]

const SORT_OPTIONS: { id: SortField; label: string }[] = [
  { id: 'date', label: he.sortField.date },
  { id: 'amount', label: he.sortField.amount },
  { id: 'category', label: he.sortField.category },
]

/** primary @ 10% for badges / icon wells */
const PRIMARY_MUTED_BG = 'rgba(99, 102, 241, 0.1)'

export default function Dashboard() {
  const now = new Date()
  const [monthOffset, setMonthOffset] = useState(0)
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([])
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const [ownerFilter, setOwnerFilter] = useState<Owner | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [monthNoteDraft, setMonthNoteDraft] = useState('')
  const [monthNoteSaving, setMonthNoteSaving] = useState(false)

  const currentMonth = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
    return getMonthKey(d)
  }, [monthOffset])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [txs, rec, sav] = await Promise.all([
          getTransactions(),
          getRecurring(),
          getSavingsAccounts(),
        ])
        if (!cancelled) {
          setAllTransactions(txs)
          setRecurring(rec)
          setSavingsAccounts(sav)
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [refreshKey])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const n = await getMonthNote(currentMonth)
        if (!cancelled) setMonthNoteDraft(n)
      } catch (e) {
        console.error(e)
      }
    })()
    return () => { cancelled = true }
  }, [currentMonth, refreshKey])

  const monthTransactions = useMemo(
    () => filterByMonth(allTransactions, currentMonth),
    [allTransactions, currentMonth]
  )

  const incomeFromTransactions = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)

  const expensesFromTransactions = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)

  const fixedIncomeMonthly = useMemo(
    () => recurring.filter((r) => r.type === 'income' && r.active).reduce((s, r) => s + r.amount, 0),
    [recurring]
  )
  const fixedExpenseMonthly = useMemo(
    () => recurring.filter((r) => r.type === 'expense' && r.active).reduce((s, r) => s + r.amount, 0),
    [recurring]
  )

  const income = incomeFromTransactions + fixedIncomeMonthly
  const expenses = expensesFromTransactions + fixedExpenseMonthly
  const balance = income - expenses

  const planningMonthlySavings = useMemo(
    () => savingsAccounts.filter((a) => a.type !== 'loan').reduce((s, a) => s + a.monthly_amount, 0),
    [savingsAccounts]
  )
  const planningMonthlyLoans = useMemo(
    () => savingsAccounts.filter((a) => a.type === 'loan').reduce((s, a) => s + a.monthly_amount, 0),
    [savingsAccounts]
  )
  const planningSavingsBalances = useMemo(
    () => savingsAccounts.filter((a) => a.type !== 'loan').reduce((s, a) => s + a.current_amount, 0),
    [savingsAccounts]
  )
  const hasPlanningLoanAccounts = useMemo(
    () => savingsAccounts.some((a) => a.type === 'loan'),
    [savingsAccounts]
  )

  const derivedMonthlyBudgetLimit = useMemo(
    () => deriveMonthlySpendingLimit(income, fixedExpenseMonthly, planningMonthlySavings, planningMonthlyLoans),
    [income, fixedExpenseMonthly, planningMonthlySavings, planningMonthlyLoans]
  )

  const categorySpend = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => {
      const key = isExpenseCategory(t.category) ? t.category : 'other'
      acc[key] = (acc[key] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)

  const categoryTransactionCounts = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => {
      const key = isExpenseCategory(t.category) ? t.category : 'other'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  const listTransactions = useMemo(() => {
    let list = [...monthTransactions]
    if (ownerFilter !== 'all') list = list.filter((t) => t.owner === ownerFilter)
    if (categoryFilter !== 'all') list = list.filter((t) => t.category === categoryFilter)
    if (typeFilter !== 'all') list = list.filter((t) => t.type === typeFilter)

    const dir = sortDir === 'desc' ? -1 : 1
    list.sort((a, b) => {
      switch (sortField) {
        case 'amount':
          return (a.amount - b.amount) * dir
        case 'category':
          return a.category.localeCompare(b.category) * dir
        case 'date':
        default:
          return (a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at)) * dir
      }
    })
    return list
  }, [monthTransactions, ownerFilter, categoryFilter, typeFilter, sortField, sortDir])

  const groupedByDate = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const tx of listTransactions) {
      const group = map.get(tx.date) || []
      group.push(tx)
      map.set(tx.date, group)
    }
    return [...map.entries()]
  }, [listTransactions])

  const handleDeleteTransaction = useCallback(async (id: string) => {
    try {
      await deleteTransaction(id)
      setRefreshKey((k) => k + 1)
    } catch (e) {
      console.error(e)
    }
  }, [])

  const handleSaveTransactionNote = useCallback(async (tx: Transaction, note: string) => {
    await saveTransaction({ ...tx, note })
    setRefreshKey((k) => k + 1)
  }, [])

  const handleSaveMonthNote = async () => {
    setMonthNoteSaving(true)
    try {
      await saveMonthNote(currentMonth, monthNoteDraft)
      setRefreshKey((k) => k + 1)
    } catch (e) {
      console.error(e)
      Alert.alert('', he.common.saveFailed)
    } finally {
      setMonthNoteSaving(false)
    }
  }

  const hasActiveFilters =
    ownerFilter !== 'all' || categoryFilter !== 'all' || typeFilter !== 'all' || sortField !== 'date'

  const clearFilters = () => {
    setOwnerFilter('all')
    setCategoryFilter('all')
    setTypeFilter('all')
    setSortField('date')
    setSortDir('desc')
  }

  const emptyListMessage = hasActiveFilters
    ? he.dashboard.noTransactionsFiltered
    : he.dashboard.noTransactionsMonth

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingText}>{he.common.loading}</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>{he.dashboard.title}</Text>
        <Pressable
          onPress={() => setShowFilters(!showFilters)}
          style={[
            styles.filterBtn,
            hasActiveFilters ? styles.filterBtnActive : styles.filterBtnInactive,
          ]}
        >
          <SlidersHorizontal size={14} color={hasActiveFilters ? colors.white : colors.gray500} />
          <Text style={[styles.filterBtnLabel, hasActiveFilters ? styles.textWhite : styles.textGray500]}>
            {he.dashboard.filters}
          </Text>
          {hasActiveFilters && <View style={styles.filterDot} />}
        </Pressable>
      </View>

      {/* Month selector */}
      <View style={styles.monthRow}>
        <Pressable onPress={() => setMonthOffset((o) => o - 1)} style={styles.monthNavBtn}>
          <ChevronLeft size={20} color={colors.gray500} />
        </Pressable>
        <Text style={styles.monthLabel}>
          {getMonthLabel(currentMonth)}
        </Text>
        <Pressable
          onPress={() => setMonthOffset((o) => o + 1)}
          disabled={monthOffset >= 0}
          style={[styles.monthNavBtn, monthOffset >= 0 && styles.monthNavBtnDisabled]}
        >
          <ChevronRight size={20} color={colors.gray500} />
        </Pressable>
      </View>

      {/* Month note */}
      <View style={styles.card}>
        <Text style={styles.monthNoteTitle}>{he.dashboard.monthNoteTitle}</Text>
        <TextInput
          multiline
          numberOfLines={3}
          value={monthNoteDraft}
          onChangeText={setMonthNoteDraft}
          placeholder={he.dashboard.monthNotePlaceholder}
          placeholderTextColor={colors.gray300}
          style={styles.monthNoteInput}
          textAlignVertical="top"
        />
        <Pressable
          disabled={monthNoteSaving}
          onPress={() => void handleSaveMonthNote()}
          style={[styles.monthNoteSaveBtn, monthNoteSaving && styles.disabledOpacity]}
        >
          <Text style={styles.monthNoteSaveLabel}>{he.dashboard.monthNoteSave}</Text>
        </Pressable>
      </View>

      {/* Filters panel */}
      {showFilters && (
        <View style={[styles.card, styles.filtersPanel]}>
          {/* Type filter */}
          <View>
            <Text style={styles.filterSectionLabel}>{he.common.type}</Text>
            <View style={styles.chipRow}>
              {TYPE_FILTERS.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => { setTypeFilter(t.id); setCategoryFilter('all') }}
                  style={[
                    styles.typeChip,
                    typeFilter === t.id
                      ? t.id === 'expense'
                        ? styles.bgExpense
                        : t.id === 'income'
                          ? styles.bgIncome
                          : styles.bgPrimary
                      : styles.bgGray50,
                  ]}
                >
                  <Text style={[styles.chipLabelXs, typeFilter === t.id ? styles.textWhite : styles.textGray500]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Owner filter */}
          <View>
            <Text style={styles.filterSectionLabel}>{he.common.owner}</Text>
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => setOwnerFilter('all')}
                style={[styles.ownerChip, ownerFilter === 'all' ? styles.bgPrimary : styles.bgGray50]}
              >
                <Text style={[styles.chipLabelXs, ownerFilter === 'all' ? styles.textWhite : styles.textGray500]}>
                  {he.common.all}
                </Text>
              </Pressable>
              {OWNERS.map((id) => (
                <Pressable
                  key={id}
                  onPress={() => setOwnerFilter(id)}
                  style={[styles.ownerChip, ownerFilter === id ? styles.bgPrimary : styles.bgGray50]}
                >
                  <Text style={[styles.chipLabelXs, ownerFilter === id ? styles.textWhite : styles.textGray500]}>
                    {ownerLabel(id)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Category filter */}
          <View>
            <Text style={styles.filterSectionLabel}>{he.common.category}</Text>
            <View style={styles.categoryChipWrap}>
              <Pressable
                onPress={() => setCategoryFilter('all')}
                style={[styles.categoryChip, categoryFilter === 'all' ? styles.bgPrimary : styles.bgGray50]}
              >
                <Text style={[styles.chipLabelXs, categoryFilter === 'all' ? styles.textWhite : styles.textGray500]}>
                  {he.common.all}
                </Text>
              </Pressable>
              {categoriesForTypeFilter(typeFilter).map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setCategoryFilter(c.id)}
                  style={[styles.categoryChip, categoryFilter === c.id ? styles.bgPrimary : styles.bgGray50]}
                >
                  <Text style={[styles.chipLabelMedium, categoryFilter === c.id ? styles.textWhite : styles.textGray500]}>
                    {c.icon} {categoryLabel(c.id)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Sort */}
          <View>
            <Text style={styles.filterSectionLabel}>{he.dashboard.sortBy}</Text>
            <View style={styles.chipRow}>
              {SORT_OPTIONS.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    if (sortField === s.id) {
                      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
                    } else {
                      setSortField(s.id)
                      setSortDir('desc')
                    }
                  }}
                  style={[styles.sortChip, sortField === s.id ? styles.bgPrimary : styles.bgGray50]}
                >
                  <Text style={[styles.chipLabelXs, sortField === s.id ? styles.textWhite : styles.textGray500]}>
                    {s.label}
                  </Text>
                  {sortField === s.id && (
                    <ArrowUpDown size={12} color={colors.white} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {hasActiveFilters && (
            <Pressable onPress={clearFilters} style={styles.clearFiltersBtn}>
              <Text style={styles.clearFiltersText}>{he.dashboard.clearFilters}</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Active filter badges */}
      {!showFilters && hasActiveFilters && (
        <View style={styles.badgesRow}>
          {typeFilter !== 'all' && (
            <View style={[styles.badgePill, typeFilter === 'expense' ? styles.bgExpense : styles.bgIncome]}>
              <Text style={styles.badgePillText}>
                {typeFilter === 'expense' ? he.transactionType.expenses : he.transactionType.incomePlural}
              </Text>
            </View>
          )}
          {ownerFilter !== 'all' && (
            <View style={[styles.badgePill, styles.badgeMuted]}>
              <Text style={styles.badgePrimaryText}>{ownerLabel(ownerFilter)}</Text>
            </View>
          )}
          {categoryFilter !== 'all' && (
            <View style={[styles.badgePill, styles.badgeMuted]}>
              <Text style={styles.badgePrimaryText}>
                {getCategoryIcon(categoryFilter)} {categoryLabel(categoryFilter)}
              </Text>
            </View>
          )}
          {sortField !== 'date' && (
            <View style={[styles.badgePill, styles.badgeSort]}>
              <Text style={styles.badgeSortText}>
                {he.dashboard.sortLabel}: {he.sortField[sortField]} {sortDir === 'asc' ? '↑' : '↓'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardCaption}>
            {he.dashboard.summaryIncome}
          </Text>
          <Text style={[styles.summaryCardAmount, styles.textIncome]}>{formatCurrency(income)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardCaption}>
            {he.dashboard.summaryExpenses}
          </Text>
          <Text style={[styles.summaryCardAmount, styles.textExpense]}>{formatCurrency(expenses)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardCaption}>
            {he.dashboard.summaryBalance}
          </Text>
          <Text style={[styles.summaryCardAmount, balance >= 0 ? styles.textIncome : styles.textExpense]}>
            {formatCurrency(balance)}
          </Text>
        </View>
      </View>

      {/* Planning card */}
      {savingsAccounts.length > 0 && (
        <View style={[styles.card, styles.planningCard]}>
          <View style={styles.planningHeaderRow}>
            <View style={styles.planningIconWell}>
              <PiggyBank size={20} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.planningBody}>
              <Text style={styles.planningTitle}>{he.dashboard.planningCardTitle}</Text>
              <View style={styles.planningRows}>
                <View style={styles.planningLine}>
                  <Text style={styles.planningLineLabel}>{he.dashboard.plannedMonthlySavings}</Text>
                  <Text style={styles.planningLineValueSky}>{formatCurrency(planningMonthlySavings)}</Text>
                </View>
                {hasPlanningLoanAccounts && (
                  <View style={styles.planningLine}>
                    <Text style={styles.planningLineLabel}>{he.dashboard.plannedLoanPayments}</Text>
                    <Text style={styles.planningLineValueExpense}>{formatCurrency(planningMonthlyLoans)}</Text>
                  </View>
                )}
                <View style={[styles.planningLine, styles.planningLineBorderTop]}>
                  <Text style={styles.planningLineLabel}>{he.dashboard.savingsBalancesInPlanning}</Text>
                  <Text style={styles.planningLineValueIncome}>{formatCurrency(planningSavingsBalances)}</Text>
                </View>
              </View>
              <Text style={styles.planningHint}>
                {he.dashboard.planningNotInTransactionsHint}
              </Text>
              <View style={styles.planningLinkWrap}>
                <Link href="/planning">
                  <Text style={styles.planningLinkText}>{he.dashboard.goToPlanning}</Text>
                </Link>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Fixed breakdown */}
      {(fixedIncomeMonthly > 0 || fixedExpenseMonthly > 0) && (
        <View style={styles.breakdownBlock}>
          <Text style={styles.breakdownLine}>
            <Text style={styles.breakdownMuted}>{he.dashboard.breakdownActual}: </Text>
            <Text style={styles.breakdownIncome}>{formatCurrency(incomeFromTransactions)}</Text>
            <Text style={styles.breakdownSep}> · </Text>
            <Text style={styles.breakdownExpense}>{formatCurrency(expensesFromTransactions)}</Text>
          </Text>
          <Text style={styles.breakdownLine}>
            <Text style={styles.breakdownMuted}>{he.dashboard.breakdownFixed}: </Text>
            <Text style={styles.breakdownIncome}>{formatCurrency(fixedIncomeMonthly)}</Text>
            <Text style={styles.breakdownSep}> · </Text>
            <Text style={styles.breakdownExpense}>{formatCurrency(fixedExpenseMonthly)}</Text>
          </Text>
          <Text style={styles.breakdownFootnote}>{he.dashboard.balanceIncludesFixedHint}</Text>
        </View>
      )}

      {/* Budget bar */}
      {(derivedMonthlyBudgetLimit > 0 || expensesFromTransactions > 0) && (
        <View style={styles.sectionMarginBottom}>
          <BudgetBar spent={expensesFromTransactions} limit={derivedMonthlyBudgetLimit} />
        </View>
      )}
      {derivedMonthlyBudgetLimit <= 0 && income > 0 && (
        <Text style={styles.budgetHintGray}>
          {he.dashboard.budgetAllAllocatedHint}
        </Text>
      )}
      {derivedMonthlyBudgetLimit <= 0 && income <= 0 && expenses > 0 && (
        <Text style={styles.budgetHintAmber}>
          {he.dashboard.budgetNoIncomeHint}
        </Text>
      )}

      {/* Spending chart */}
      <View style={styles.sectionMarginBottom}>
        <SpendingChart data={categorySpend} transactionCounts={categoryTransactionCounts} />
      </View>

      {/* Transaction list */}
      <View style={styles.sectionMarginBottom}>
        <Text style={styles.transactionsHeading}>{he.dashboard.transactionsHeading}</Text>
        {groupedByDate.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>{emptyListMessage}</Text>
            {!hasActiveFilters && (
              <Text style={styles.emptyCardSub}>{he.dashboard.tapToAdd}</Text>
            )}
          </View>
        ) : (
          <View style={styles.dateGroups}>
            {groupedByDate.map(([date, txs]) => (
              <View key={date}>
                <Text style={styles.dateGroupHeader}>
                  {formatTransactionListDate(date)}
                </Text>
                <View style={styles.txListCard}>
                  {txs.map((tx, i) => (
                    <View key={tx.id}>
                      {i > 0 && <View style={styles.txDivider} />}
                      <TransactionRow
                        tx={tx}
                        onDelete={handleDeleteTransaction}
                        onSaveNote={handleSaveTransactionNote}
                        savingsAccounts={savingsAccounts}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
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
  scrollView: {
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray800,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  filterBtnInactive: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
  },
  filterBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  textWhite: {
    color: colors.white,
  },
  textGray500: {
    color: colors.gray500,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  monthNavBtn: {
    padding: 6,
    borderRadius: 8,
  },
  monthNavBtnDisabled: {
    opacity: 0.3,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
    minWidth: 150,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  monthNoteTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray500,
    marginBottom: 8,
  },
  monthNoteInput: {
    width: '100%',
    backgroundColor: colors.gray50,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.gray800,
    minHeight: 76,
    marginBottom: 12,
  },
  monthNoteSaveBtn: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  monthNoteSaveLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  disabledOpacity: {
    opacity: 0.5,
  },
  filtersPanel: {
    gap: 12,
  },
  filterSectionLabel: {
    fontSize: 12,
    color: colors.gray400,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  ownerChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  categoryChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  sortChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chipLabelXs: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipLabelMedium: {
    fontSize: 12,
    fontWeight: '500',
  },
  bgPrimary: {
    backgroundColor: colors.primary,
  },
  bgIncome: {
    backgroundColor: colors.income,
  },
  bgExpense: {
    backgroundColor: colors.expense,
  },
  bgGray50: {
    backgroundColor: colors.gray50,
  },
  clearFiltersBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.white,
  },
  badgeMuted: {
    backgroundColor: PRIMARY_MUTED_BG,
  },
  badgePrimaryText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
  },
  badgeSort: {
    backgroundColor: colors.gray100,
  },
  badgeSortText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray600,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryCardCaption: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.gray400,
    marginBottom: 4,
  },
  summaryCardAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  textIncome: {
    color: colors.income,
  },
  textExpense: {
    color: colors.expense,
  },
  planningCard: {
    borderWidth: 1,
    borderColor: colors.sky100,
  },
  planningHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  planningIconWell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PRIMARY_MUTED_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planningBody: {
    flex: 1,
    gap: 10,
  },
  planningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray800,
  },
  planningRows: {
    gap: 6,
  },
  planningLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  planningLineBorderTop: {
    paddingTop: 2,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: colors.gray50,
  },
  planningLineLabel: {
    fontSize: 14,
    color: colors.gray500,
  },
  planningLineValueSky: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.sky600,
  },
  planningLineValueExpense: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.expense,
  },
  planningLineValueIncome: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.income,
  },
  planningHint: {
    fontSize: 11,
    color: colors.gray400,
    lineHeight: 18,
    paddingTop: 4,
  },
  planningLinkWrap: {
    paddingTop: 2,
  },
  planningLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  breakdownBlock: {
    marginBottom: 16,
    paddingHorizontal: 2,
    gap: 6,
  },
  breakdownLine: {
    fontSize: 11,
    color: colors.gray500,
    lineHeight: 18,
  },
  breakdownMuted: {
    color: colors.gray400,
  },
  breakdownIncome: {
    color: colors.income,
    fontWeight: '500',
  },
  breakdownExpense: {
    color: colors.expense,
    fontWeight: '500',
  },
  breakdownSep: {
    color: colors.gray300,
  },
  breakdownFootnote: {
    fontSize: 11,
    color: colors.gray400,
  },
  sectionMarginBottom: {
    marginBottom: 16,
  },
  budgetHintGray: {
    fontSize: 11,
    color: colors.gray600,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray100,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    lineHeight: 18,
  },
  budgetHintAmber: {
    fontSize: 11,
    color: colors.amber800,
    backgroundColor: colors.amber50,
    borderWidth: 1,
    borderColor: colors.amber100,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    lineHeight: 18,
  },
  transactionsHeading: {
    fontSize: 14,
    color: colors.gray500,
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyCardText: {
    fontSize: 14,
    color: colors.gray400,
  },
  emptyCardSub: {
    marginTop: 4,
    fontSize: 12,
    color: colors.gray400,
  },
  dateGroups: {
    gap: 16,
  },
  dateGroupHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  txListCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    paddingHorizontal: 12,
  },
  txDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.gray50,
  },
})
