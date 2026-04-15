import { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Plus, Trash2, LogOut, UserPlus, Users, Mail } from 'lucide-react-native'
import {
  getBudget,
  saveBudget,
  getRecurring,
  saveRecurring,
  deleteRecurring,
  getTransactions,
  getSavingsAccounts,
} from '../../src/lib/store'
import { generateId, formatCurrency, getMonthKey, filterByMonth, deriveMonthlySpendingLimit } from '../../src/lib/utils'
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  OWNERS,
  getCategoryIcon,
  type RecurringTransaction,
  type TransactionType,
  type Owner,
  type Transaction,
  type SavingsAccount,
} from '../../src/lib/types'
import {
  loadUserCategories,
  saveUserCategories,
  type UserCategoryDef,
} from '../../src/lib/userCategories'
import { he, categoryLabel, ownerLabel } from '../../src/locales/he'
import { colors } from '../../src/lib/theme'
import { useAuth, type Profile } from '../../src/lib/AuthContext'
import { isSupabaseConfigured } from '../../src/lib/supabase'
import { getSupabase } from '../../src/lib/supabase'

function showAlertMessage(message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message)
    return
  }
  Alert.alert('', message)
}

function confirmDestructive(message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(message)) {
      onConfirm()
    }
    return
  }
  Alert.alert('', message, [
    { text: he.common.cancel, style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ])
}

export default function Settings() {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.screenTitle}>{he.settings.title}</Text>

      <SectionDivider label={he.settings.tabGeneral} />
      <View style={styles.sectionBlock}>
        <GeneralTab />
      </View>

      <SectionDivider label={he.settings.tabFixedExpenses} />
      <View style={styles.sectionBlock}>
        <RecurringTab type="expense" />
      </View>

      <SectionDivider label={he.settings.tabFixedIncome} />
      <View style={styles.sectionBlock}>
        <RecurringTab type="income" />
      </View>

      <SectionDivider label={he.settings.tabCategories} />
      <View style={styles.sectionBlock}>
        <CategoriesTab />
      </View>

      {isSupabaseConfigured() && (
        <>
          <SectionDivider label={he.auth.accountTab} />
          <View style={styles.sectionBlock}>
            <AccountTab />
          </View>
        </>
      )}
    </ScrollView>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <View style={styles.sectionDivider}>
      <Text style={styles.sectionDividerText}>{label}</Text>
      <View style={styles.sectionDividerLine} />
    </View>
  )
}

function GeneralTab() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([])
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([])
  const [ready, setReady] = useState(false)

  const previewMonthKey = useMemo(() => getMonthKey(new Date()), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [txs, rec, sav] = await Promise.all([
          getTransactions(),
          getRecurring(),
          getSavingsAccounts(),
        ])
        if (cancelled) return
        setTransactions(txs)
        setRecurring(rec)
        setSavingsAccounts(sav)
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const budgetPreview = useMemo(() => {
    const monthTxs = filterByMonth(transactions, previewMonthKey)
    const incomeFromTx = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const fixedIn = recurring.filter((r) => r.type === 'income' && r.active).reduce((s, r) => s + r.amount, 0)
    const monthIncome = incomeFromTx + fixedIn
    const fixedOut = recurring.filter((r) => r.type === 'expense' && r.active).reduce((s, r) => s + r.amount, 0)
    const savingsM = savingsAccounts.filter((a) => a.type !== 'loan').reduce((s, a) => s + a.monthly_amount, 0)
    const loanM = savingsAccounts.filter((a) => a.type === 'loan').reduce((s, a) => s + a.monthly_amount, 0)
    const derived = deriveMonthlySpendingLimit(monthIncome, fixedOut, savingsM, loanM)
    return { monthIncome, fixedOut, savingsM, loanM, derived }
  }, [transactions, recurring, savingsAccounts, previewMonthKey])

  const handleSave = async () => {
    try {
      const existing = await getBudget()
      await saveBudget({ ...existing, monthly_limit: 0 })
      router.navigate('/')
    } catch (e) {
      console.error(e)
    }
  }

  if (!ready) {
    return <Text style={generalStyles.loadingText}>{he.common.loading}</Text>
  }

  const hasBudgetInputs =
    budgetPreview.monthIncome > 0 ||
    budgetPreview.fixedOut > 0 ||
    budgetPreview.savingsM > 0 ||
    budgetPreview.loanM > 0

  return (
    <View>
      <View style={generalStyles.card}>
        <Text style={generalStyles.sectionTitle}>{he.settings.budgetAutoSectionTitle}</Text>
        <Text style={generalStyles.sectionBody}>{he.settings.budgetAutoSectionBody}</Text>
        {!hasBudgetInputs ? (
          <Text style={generalStyles.emptyHint}>{he.settings.budgetAutoEmpty}</Text>
        ) : (
          <View style={generalStyles.previewGap}>
            <View style={generalStyles.rowBetween}>
              <Text style={generalStyles.rowLabel}>{he.settings.budgetAutoIncome}</Text>
              <Text style={[generalStyles.rowValue, generalStyles.textIncome]}>
                {formatCurrency(budgetPreview.monthIncome)}
              </Text>
            </View>
            <View style={generalStyles.rowBetween}>
              <Text style={generalStyles.rowLabel}>{he.settings.budgetAutoFixedExpenses}</Text>
              <Text style={[generalStyles.rowValue, generalStyles.textExpense]}>
                {formatCurrency(budgetPreview.fixedOut)}
              </Text>
            </View>
            <View style={generalStyles.rowBetween}>
              <Text style={generalStyles.rowLabel}>{he.settings.budgetAutoSavings}</Text>
              <Text style={[generalStyles.rowValue, generalStyles.textSky]}>
                {formatCurrency(budgetPreview.savingsM)}
              </Text>
            </View>
            <View style={generalStyles.rowBetween}>
              <Text style={generalStyles.rowLabel}>{he.settings.budgetAutoLoans}</Text>
              <Text style={[generalStyles.rowValue, generalStyles.textExpense]}>
                {formatCurrency(budgetPreview.loanM)}
              </Text>
            </View>
            <View style={[generalStyles.rowBetween, generalStyles.resultRow]}>
              <Text style={generalStyles.resultLabel}>{he.settings.budgetAutoResult}</Text>
              <Text style={[generalStyles.resultValue, generalStyles.textPrimary]}>
                {formatCurrency(budgetPreview.derived)}
              </Text>
            </View>
          </View>
        )}
      </View>

      <Pressable onPress={handleSave} style={generalStyles.saveButton}>
        <Text style={generalStyles.saveButtonText}>{he.settings.saveSettings}</Text>
      </Pressable>
    </View>
  )
}

function RecurringTab({ type }: { type: TransactionType }) {
  const [items, setItems] = useState<RecurringTransaction[]>([])
  const [showForm, setShowForm] = useState(false)

  const refresh = () => {
    getRecurring()
      .then((all) => setItems(all.filter((r) => r.type === type)))
      .catch(console.error)
  }

  useEffect(() => { refresh() }, [type])

  const handleDelete = async (id: string) => {
    try {
      await deleteRecurring(id)
      refresh()
    } catch (e) {
      console.error(e)
    }
  }

  const totalMonthly = items.filter((i) => i.active).reduce((s, i) => s + i.amount, 0)
  const emptyMsg = type === 'income' ? he.settings.noFixedIncome : he.settings.noFixedExpenses

  return (
    <View>
      <View style={recurringStyles.headerRow}>
        <View>
          <Text style={recurringStyles.monthlyLabel}>{he.common.monthlyTotal}</Text>
          <Text
            style={[
              recurringStyles.totalAmount,
              type === 'income' ? recurringStyles.textIncome : recurringStyles.textExpense,
            ]}
          >
            {formatCurrency(totalMonthly)}
          </Text>
        </View>
        <Pressable onPress={() => setShowForm(true)} style={recurringStyles.addButton}>
          <Plus size={14} color={colors.white} />
          <Text style={recurringStyles.addButtonText}>{he.common.add}</Text>
        </Pressable>
      </View>

      {showForm && (
        <RecurringForm
          type={type}
          onSave={() => { refresh(); setShowForm(false) }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {items.length === 0 && !showForm ? (
        <Text style={recurringStyles.emptyText}>{emptyMsg}</Text>
      ) : (
        <View style={recurringStyles.listGap}>
          {items.map((item) => (
            <View key={item.id} style={recurringStyles.itemRow}>
              <View style={recurringStyles.itemIconWrap}>
                <Text style={recurringStyles.itemIcon}>{getCategoryIcon(item.category)}</Text>
              </View>
              <View style={recurringStyles.itemBody}>
                <View style={recurringStyles.itemTitleRow}>
                  <Text style={recurringStyles.itemTitle} numberOfLines={1}>
                    {item.note || categoryLabel(item.category)}
                  </Text>
                  <Text
                    style={[
                      recurringStyles.itemAmount,
                      type === 'income' ? recurringStyles.textIncome : recurringStyles.textExpense,
                    ]}
                  >
                    {formatCurrency(item.amount)}
                  </Text>
                </View>
                <View style={recurringStyles.itemMetaRow}>
                  <Text style={recurringStyles.itemMeta}>
                    {he.settings.recurringDay(item.day_of_month, ownerLabel(item.owner))}
                  </Text>
                  <Pressable onPress={() => handleDelete(item.id)} style={recurringStyles.deleteHit}>
                    <Trash2 size={14} color={colors.gray300} />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function CategoriesTab() {
  const [items, setItems] = useState<UserCategoryDef[]>([])
  const [label, setLabel] = useState('')
  const [icon, setIcon] = useState('\uD83D\uDCC1')
  const [kind, setKind] = useState<'expense' | 'income'>('expense')

  useEffect(() => {
    setItems(loadUserCategories())
  }, [])

  const persist = async (next: UserCategoryDef[]) => {
    await saveUserCategories(next)
    setItems(next)
  }

  const handleAdd = () => {
    const trimmed = label.trim()
    if (!trimmed) return
    const id = `u_${generateId()}`
    void persist([
      ...items,
      { id, label: trimmed, icon: icon.trim() || '\uD83D\uDCC1', kind },
    ])
    setLabel('')
    setIcon('\uD83D\uDCC1')
  }

  const handleDelete = (id: string) => {
    confirmDestructive(he.settings.categoryDeleteConfirm, he.settings.categoryDeleteConfirm, () => {
      void persist(items.filter((x) => x.id !== id))
    })
  }

  return (
    <View style={categoriesStyles.rootGap}>
      <View style={categoriesStyles.card}>
        <Text style={categoriesStyles.sectionTitle}>{he.settings.categoriesSectionTitle}</Text>
        <Text style={categoriesStyles.sectionHint}>{he.settings.categoriesSectionHint}</Text>

        <View style={categoriesStyles.formBlock}>
          <View>
            <Text style={categoriesStyles.fieldLabel}>{he.settings.categoryNameLabel}</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder={he.settings.categoryNamePlaceholder}
              placeholderTextColor={colors.gray300}
              style={categoriesStyles.inputFull}
            />
          </View>
          <View>
            <Text style={categoriesStyles.fieldLabel}>{he.settings.categoryIconLabel}</Text>
            <TextInput
              value={icon}
              onChangeText={setIcon}
              maxLength={4}
              style={categoriesStyles.inputIcon}
            />
          </View>
          <View>
            <Text style={categoriesStyles.fieldLabelType}>{he.common.type}</Text>
            <View style={categoriesStyles.kindRow}>
              <Pressable
                onPress={() => setKind('expense')}
                style={[
                  categoriesStyles.kindButton,
                  kind === 'expense' ? categoriesStyles.kindButtonExpenseActive : categoriesStyles.kindButtonInactive,
                ]}
              >
                <Text
                  style={[
                    categoriesStyles.kindButtonText,
                    kind === 'expense' ? categoriesStyles.kindButtonTextOnAccent : categoriesStyles.kindButtonTextMuted,
                  ]}
                >
                  {he.settings.categoryKindExpense}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setKind('income')}
                style={[
                  categoriesStyles.kindButton,
                  kind === 'income' ? categoriesStyles.kindButtonIncomeActive : categoriesStyles.kindButtonInactive,
                ]}
              >
                <Text
                  style={[
                    categoriesStyles.kindButtonText,
                    kind === 'income' ? categoriesStyles.kindButtonTextOnAccent : categoriesStyles.kindButtonTextMuted,
                  ]}
                >
                  {he.settings.categoryKindIncome}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Pressable
          onPress={handleAdd}
          disabled={!label.trim()}
          style={[categoriesStyles.addCategoryButton, !label.trim() && categoriesStyles.addCategoryButtonDisabled]}
        >
          <Text style={categoriesStyles.addCategoryButtonText}>{he.settings.categoryAdd}</Text>
        </Pressable>
      </View>

      {items.length > 0 && (
        <View style={categoriesStyles.listGap}>
          <Text style={categoriesStyles.listHeader}>{he.common.category}</Text>
          {items.map((c) => (
            <View key={c.id} style={categoriesStyles.listItem}>
              <View style={categoriesStyles.listIconWrap}>
                <Text style={categoriesStyles.listIcon}>{c.icon}</Text>
              </View>
              <View style={categoriesStyles.listItemBody}>
                <Text style={categoriesStyles.listItemTitle} numberOfLines={1}>{c.label}</Text>
                <Text style={categoriesStyles.listItemKind}>
                  {c.kind === 'expense' ? he.settings.categoryKindExpense : he.settings.categoryKindIncome}
                </Text>
              </View>
              <Pressable onPress={() => handleDelete(c.id)} style={categoriesStyles.listDeleteHit}>
                <Trash2 size={16} color={colors.gray300} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function AccountTab() {
  const { profile, user, signOut, householdId, acceptInvitation } = useAuth()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [members, setMembers] = useState<Profile[]>([])
  const [pendingInvites, setPendingInvites] = useState<{ email: string }[]>([])
  const [incomingInvitations, setIncomingInvitations] = useState<{ household_id: string; invited_by_name: string }[]>([])
  const [acceptLoading, setAcceptLoading] = useState(false)
  const [acceptError, setAcceptError] = useState('')

  useEffect(() => {
    if (!householdId) return
    const sb = getSupabase()

    sb.from('profiles')
      .select('*')
      .eq('household_id', householdId)
      .then(({ data }) => {
        if (data) {
          setMembers(
            data.map((d: Record<string, unknown>) => ({
              id: String(d.id),
              household_id: String(d.household_id),
              display_name: String(d.display_name),
              role: String(d.role) as 'owner' | 'partner',
            }))
          )
        }
      })

    sb.from('invitations')
      .select('email, status')
      .eq('household_id', householdId)
      .eq('status', 'pending')
      .then(({ data }) => {
        if (data) setPendingInvites(data.map((d: Record<string, unknown>) => ({ email: String(d.email) })))
      })
  }, [householdId])

  useEffect(() => {
    if (!user?.email) return
    const sb = getSupabase()
    const email = user.email.toLowerCase().trim()

    sb.from('invitations')
      .select('household_id, invited_by')
      .eq('email', email)
      .eq('status', 'pending')
      .then(async ({ data }) => {
        if (!data || data.length === 0) return
        const inviterIds = data.map((d: Record<string, unknown>) => String(d.invited_by))
        const { data: profileData } = await sb
          .from('profiles')
          .select('id, display_name')
          .in('id', inviterIds)
        const nameMap: Record<string, string> = {}
        if (profileData) {
          for (const p of profileData as Array<{ id: string; display_name: string }>) {
            nameMap[p.id] = p.display_name
          }
        }
        setIncomingInvitations(
          data.map((d: Record<string, unknown>) => ({
            household_id: String(d.household_id),
            invited_by_name: nameMap[String(d.invited_by)] ?? '',
          }))
        )
      })
  }, [user?.email])

  const handleInvite = async () => {
    setInviteError('')
    setInviteSuccess(false)
    const trimmed = inviteEmail.trim().toLowerCase()
    if (!trimmed) { setInviteError(he.auth.emailRequired); return }
    if (!householdId || !profile) return

    setInviteLoading(true)
    try {
      const sb = getSupabase()
      const { data: existing } = await sb
        .from('invitations')
        .select('id')
        .eq('household_id', householdId)
        .eq('email', trimmed)
        .eq('status', 'pending')
        .maybeSingle()

      if (existing) {
        setInviteError(he.auth.inviteAlreadyExists)
        setInviteLoading(false)
        return
      }

      const { error } = await sb.from('invitations').insert({
        household_id: householdId,
        invited_by: profile.id,
        email: trimmed,
        status: 'pending',
      })
      if (error) throw error
      setInviteSuccess(true)
      setInviteEmail('')
      setPendingInvites((prev) => [...prev, { email: trimmed }])
    } catch (e) {
      console.error(e)
      setInviteError(he.auth.genericError)
    } finally {
      setInviteLoading(false)
    }
  }

  const handleAcceptInvitation = (invHouseholdId: string) => {
    confirmDestructive(
      he.auth.acceptInvitationConfirm,
      he.auth.acceptInvitation,
      async () => {
        setAcceptLoading(true)
        setAcceptError('')
        const result = await acceptInvitation(invHouseholdId)
        setAcceptLoading(false)
        if (result.error) {
          setAcceptError(he.auth.inviteAcceptError)
        } else {
          setIncomingInvitations([])
          showAlertMessage(he.auth.inviteAccepted)
        }
      }
    )
  }

  const handleLogout = () => {
    confirmDestructive(he.auth.logoutConfirm, he.auth.logout, () => {
      void signOut()
    })
  }

  const hasPartner = members.length >= 2

  return (
    <View style={accountStyles.root}>
      <View style={accountStyles.card}>
        <View style={accountStyles.sectionHeader}>
          <Users size={18} color={colors.primary} />
          <Text style={accountStyles.sectionTitle}>{he.auth.householdMembers}</Text>
        </View>
        {members.map((m) => (
          <View key={m.id} style={accountStyles.memberRow}>
            <View style={accountStyles.memberAvatar}>
              <Text style={accountStyles.memberAvatarText}>
                {m.display_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={accountStyles.memberInfo}>
              <Text style={accountStyles.memberName}>{m.display_name}</Text>
              <Text style={accountStyles.memberRole}>
                {m.id === profile?.id ? he.auth.you : he.auth.partner}
              </Text>
            </View>
          </View>
        ))}
        {pendingInvites.length > 0 && (
          <View style={accountStyles.pendingSection}>
            {pendingInvites.map((inv) => (
              <View key={inv.email} style={accountStyles.pendingRow}>
                <Mail size={14} color={colors.amber500} />
                <Text style={accountStyles.pendingEmail}>{inv.email}</Text>
                <Text style={accountStyles.pendingStatus}>{he.auth.invitePending}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {incomingInvitations.length > 0 && (
        <View style={accountStyles.card}>
          <View style={accountStyles.sectionHeader}>
            <Mail size={18} color={colors.amber500} />
            <Text style={accountStyles.sectionTitle}>{he.auth.pendingInvitationsTitle}</Text>
          </View>
          {incomingInvitations.map((inv) => (
            <View key={inv.household_id} style={accountStyles.incomingInvRow}>
              <View style={accountStyles.incomingInvInfo}>
                <Text style={accountStyles.incomingInvText}>{he.auth.pendingInvitationFrom}</Text>
                {inv.invited_by_name ? (
                  <Text style={accountStyles.incomingInvBy}>{inv.invited_by_name}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => handleAcceptInvitation(inv.household_id)}
                disabled={acceptLoading}
                style={[accountStyles.acceptButton, acceptLoading && accountStyles.inviteButtonDisabled]}
              >
                {acceptLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={accountStyles.acceptButtonText}>{he.auth.acceptInvitation}</Text>
                )}
              </Pressable>
            </View>
          ))}
          {acceptError ? <Text style={accountStyles.errorText}>{acceptError}</Text> : null}
        </View>
      )}

      {!hasPartner && (
        <View style={accountStyles.card}>
          <View style={accountStyles.sectionHeader}>
            <UserPlus size={18} color={colors.primary} />
            <Text style={accountStyles.sectionTitle}>{he.auth.invitePartner}</Text>
          </View>
          <Text style={accountStyles.inviteHint}>{he.auth.invitePartnerHint}</Text>

          <TextInput
            style={accountStyles.input}
            value={inviteEmail}
            onChangeText={setInviteEmail}
            placeholder="partner@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textAlign="left"
          />

          {inviteError ? <Text style={accountStyles.errorText}>{inviteError}</Text> : null}
          {inviteSuccess ? <Text style={accountStyles.successText}>{he.auth.inviteSent}</Text> : null}

          <Pressable
            onPress={handleInvite}
            disabled={inviteLoading}
            style={[accountStyles.inviteButton, inviteLoading && accountStyles.inviteButtonDisabled]}
          >
            {inviteLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={accountStyles.inviteButtonText}>{he.auth.sendInvite}</Text>
            )}
          </Pressable>
        </View>
      )}

      <Pressable onPress={handleLogout} style={accountStyles.logoutButton}>
        <LogOut size={16} color={colors.red500} />
        <Text style={accountStyles.logoutText}>{he.auth.logout}</Text>
      </Pressable>
    </View>
  )
}

function RecurringForm({
  type,
  onSave,
  onCancel,
}: {
  type: TransactionType
  onSave: () => void
  onCancel: () => void
}) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string>(type === 'expense' ? 'bills' : 'salary')
  const [owner, setOwner] = useState<Owner>('shared')
  const [note, setNote] = useState('')
  const [day, setDay] = useState('1')

  const categoryButtons = useMemo(() => {
    const builtIn = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
    const extra = loadUserCategories()
      .filter((u) => u.kind === type)
      .map((u) => ({ id: u.id, icon: u.icon }))
    return [...builtIn, ...extra]
  }, [type])

  const handleSubmit = async () => {
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) return
    if (type === 'income' && category === 'income_other' && !note.trim()) {
      showAlertMessage(he.settings.incomeDetailRequired)
      return
    }

    try {
      await saveRecurring({
        id: generateId(),
        amount: parsed,
        type,
        category,
        owner,
        note: note.trim(),
        day_of_month: Math.min(Math.max(parseInt(day) || 1, 1), 28),
        active: true,
      })
      onSave()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <View style={recurringFormStyles.formCard}>
      <View style={recurringFormStyles.rowGap}>
        <View style={recurringFormStyles.flexHalf}>
          <Text style={recurringFormStyles.fieldLabel}>{he.common.amount}</Text>
          <TextInput
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.gray300}
            value={amount}
            onChangeText={setAmount}
            style={recurringFormStyles.inputWhite}
          />
        </View>
        <View style={recurringFormStyles.flexHalf}>
          <Text style={recurringFormStyles.fieldLabel}>{he.common.dayOfMonth}</Text>
          <TextInput
            keyboardType="numeric"
            placeholder="1"
            placeholderTextColor={colors.gray300}
            value={day}
            onChangeText={setDay}
            style={recurringFormStyles.inputWhite}
          />
        </View>
      </View>

      <View>
        <Text style={recurringFormStyles.fieldLabel}>{he.common.category}</Text>
        <View style={recurringFormStyles.categoryChips}>
          {categoryButtons.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => setCategory(cat.id)}
              style={[
                recurringFormStyles.categoryChip,
                category === cat.id ? recurringFormStyles.categoryChipActive : recurringFormStyles.categoryChipInactive,
              ]}
            >
              <Text>{cat.icon}</Text>
              <Text
                style={[
                  recurringFormStyles.categoryChipLabel,
                  category === cat.id ? recurringFormStyles.categoryChipLabelActive : recurringFormStyles.categoryChipLabelInactive,
                ]}
              >
                {categoryLabel(cat.id)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <Text style={recurringFormStyles.fieldLabel}>{he.common.owner}</Text>
        <View style={recurringFormStyles.ownerRow}>
          {OWNERS.map((id) => (
            <Pressable
              key={id}
              onPress={() => setOwner(id)}
              style={[
                recurringFormStyles.ownerButton,
                owner === id ? recurringFormStyles.ownerButtonActive : recurringFormStyles.ownerButtonInactive,
              ]}
            >
              <Text
                style={[
                  recurringFormStyles.ownerButtonText,
                  owner === id ? recurringFormStyles.ownerButtonTextActive : recurringFormStyles.ownerButtonTextInactive,
                ]}
              >
                {ownerLabel(id)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <Text style={recurringFormStyles.fieldLabel}>{he.common.description}</Text>
        <TextInput
          placeholder={type === 'expense' ? he.settings.recurringNoteExpense : he.settings.recurringNoteIncome}
          placeholderTextColor={colors.gray300}
          value={note}
          onChangeText={setNote}
          style={recurringFormStyles.inputWhite}
        />
      </View>

      <View style={recurringFormStyles.actionsRow}>
        <Pressable onPress={onCancel} style={recurringFormStyles.cancelButton}>
          <Text style={recurringFormStyles.cancelButtonText}>{he.common.cancel}</Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!amount || parseFloat(amount) <= 0}
          style={[
            recurringFormStyles.submitButton,
            (!amount || parseFloat(amount) <= 0) && recurringFormStyles.submitButtonDisabled,
          ]}
        >
          <Text style={recurringFormStyles.submitButtonText}>{he.common.save}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const shadowSm = {
  shadowColor: colors.black,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 2,
  elevation: 2,
} as const

const shadowLg = {
  shadowColor: colors.primaryDark,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 6,
} as const

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 96,
  },
  screenTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: 24,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionDividerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.3,
    flexShrink: 0,
  },
  sectionDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray100,
  },
  sectionBlock: {
    marginBottom: 24,
  },
})

const generalStyles = StyleSheet.create({
  loadingText: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.gray400,
    paddingVertical: 32,
  },
  card: {
    marginBottom: 24,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.gray100,
    ...shadowSm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray800,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 12,
    color: colors.gray500,
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyHint: {
    fontSize: 12,
    color: colors.amber800,
    backgroundColor: colors.amber50,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    lineHeight: 18,
  },
  previewGap: {
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: {
    fontSize: 14,
    color: colors.gray500,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  textIncome: {
    color: colors.income,
  },
  textExpense: {
    color: colors.expense,
  },
  textSky: {
    color: colors.sky600,
  },
  textPrimary: {
    color: colors.primary,
  },
  resultRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  resultLabel: {
    fontSize: 14,
    color: colors.gray700,
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  saveButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    ...shadowLg,
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
})

const recurringStyles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthlyLabel: {
    fontSize: 12,
    color: colors.gray400,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  textIncome: {
    color: colors.income,
  },
  textExpense: {
    color: colors.expense,
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
  addButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.gray400,
    fontSize: 14,
    paddingVertical: 32,
  },
  listGap: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.gray50,
    borderRadius: 12,
    padding: 12,
  },
  itemIconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
  },
  itemIcon: {
    fontSize: 20,
  },
  itemBody: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  itemTitle: {
    fontWeight: '500',
    color: colors.gray800,
    fontSize: 14,
    flex: 1,
  },
  itemAmount: {
    fontWeight: '600',
    fontSize: 14,
  },
  itemMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemMeta: {
    fontSize: 12,
    color: colors.gray400,
  },
  deleteHit: {
    padding: 4,
  },
})

const categoriesStyles = StyleSheet.create({
  rootGap: {
    gap: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.gray100,
    ...shadowSm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray800,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: colors.gray500,
    lineHeight: 18,
    marginBottom: 16,
  },
  formBlock: {
    gap: 12,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.gray400,
    marginBottom: 4,
  },
  fieldLabelType: {
    fontSize: 12,
    color: colors.gray400,
    marginBottom: 6,
  },
  inputFull: {
    width: '100%',
    backgroundColor: colors.gray50,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.gray800,
  },
  inputIcon: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.gray800,
    width: 80,
  },
  kindRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kindButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  kindButtonInactive: {
    backgroundColor: colors.gray50,
  },
  kindButtonExpenseActive: {
    backgroundColor: colors.expense,
    ...shadowSm,
  },
  kindButtonIncomeActive: {
    backgroundColor: colors.income,
    ...shadowSm,
  },
  kindButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  kindButtonTextOnAccent: {
    color: colors.white,
  },
  kindButtonTextMuted: {
    color: colors.gray600,
  },
  addCategoryButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  addCategoryButtonDisabled: {
    opacity: 0.4,
  },
  addCategoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  listGap: {
    gap: 8,
  },
  listHeader: {
    fontSize: 12,
    color: colors.gray400,
    paddingHorizontal: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.gray50,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  listIconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
  },
  listIcon: {
    fontSize: 20,
  },
  listItemBody: {
    flex: 1,
  },
  listItemTitle: {
    fontWeight: '500',
    color: colors.gray800,
    fontSize: 14,
  },
  listItemKind: {
    fontSize: 11,
    color: colors.gray400,
  },
  listDeleteHit: {
    padding: 8,
  },
})

const recurringFormStyles = StyleSheet.create({
  formCard: {
    backgroundColor: colors.gray50,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  rowGap: {
    flexDirection: 'row',
    gap: 8,
  },
  flexHalf: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.gray400,
    marginBottom: 4,
  },
  inputWhite: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.gray800,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    ...shadowSm,
  },
  categoryChipInactive: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  categoryChipLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryChipLabelActive: {
    color: colors.white,
  },
  categoryChipLabelInactive: {
    color: colors.gray600,
  },
  ownerRow: {
    flexDirection: 'row',
    gap: 6,
  },
  ownerButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  ownerButtonActive: {
    backgroundColor: colors.primary,
    ...shadowSm,
  },
  ownerButtonInactive: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  ownerButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ownerButtonTextActive: {
    color: colors.white,
  },
  ownerButtonTextInactive: {
    color: colors.gray600,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray500,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
})

const accountStyles = StyleSheet.create({
  root: { gap: 16 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.gray100,
    ...shadowSm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray800,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 18,
  },
  memberInfo: { flex: 1 },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray800,
  },
  memberRole: {
    fontSize: 12,
    color: colors.gray400,
  },
  pendingSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    gap: 6,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingEmail: {
    flex: 1,
    fontSize: 13,
    color: colors.gray600,
  },
  pendingStatus: {
    fontSize: 11,
    color: colors.amber500,
    fontWeight: '600',
  },
  inviteHint: {
    fontSize: 13,
    color: colors.gray500,
    lineHeight: 20,
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    color: colors.gray800,
  },
  errorText: {
    color: colors.red500,
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
  successText: {
    color: colors.income,
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  inviteButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  inviteButtonDisabled: { opacity: 0.6 },
  inviteButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  incomingInvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  incomingInvInfo: {
    flex: 1,
  },
  incomingInvText: {
    fontSize: 14,
    color: colors.gray700,
    fontWeight: '500',
  },
  incomingInvBy: {
    fontSize: 13,
    color: colors.gray500,
    marginTop: 2,
  },
  acceptButton: {
    backgroundColor: colors.income,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.red100,
    backgroundColor: colors.white,
  },
  logoutText: {
    color: colors.red500,
    fontSize: 15,
    fontWeight: '600',
  },
})
