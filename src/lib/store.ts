import AsyncStorage from '@react-native-async-storage/async-storage'
import type {
  Transaction,
  Budget,
  Goal,
  RecurringTransaction,
  SavingsAccount,
  SavingsType,
  Category,
  Owner,
  TransactionType,
} from './types'
import { getSupabase, isSupabaseConfigured } from './supabase'

const KEYS = {
  transactions: 'budget_transactions',
  budget: 'budget_config',
  goal: 'budget_goal',
  recurring: 'budget_recurring',
  monthNotes: 'budget_month_notes',
  savingsAccounts: 'budget_savings_accounts',
} as const

const MIGRATION_FLAG = 'budget_supabase_migrated_v1'

let _cachedHouseholdId: string | null = null

export function setActiveHouseholdId(id: string | null) {
  _cachedHouseholdId = id
}

function getHouseholdId(): string {
  if (!_cachedHouseholdId) throw new Error('household_id not set — user not logged in')
  return _cachedHouseholdId
}

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

async function write<T>(key: string, data: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(data))
}

function txToRow(t: Transaction): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: t.id,
    amount: t.amount,
    type: t.type,
    category: t.category,
    date: t.date,
    owner: t.owner,
    note: t.note,
    created_at: t.created_at,
    household_id: getHouseholdId(),
  }
  if (t.linked_savings_id) {
    row.linked_savings_id = t.linked_savings_id
  }
  return row
}

function rowToTransaction(row: Record<string, unknown>): Transaction {
  const base = {
    id: String(row.id),
    amount: Number(row.amount),
    type: row.type as TransactionType,
    category: row.category as Category,
    date: String(row.date),
    owner: row.owner as Owner,
    note: String(row.note ?? ''),
    created_at: String(row.created_at),
  }
  if (row.linked_savings_id) {
    return { ...base, linked_savings_id: String(row.linked_savings_id) }
  }
  return base
}

function recToRow(r: RecurringTransaction) {
  return {
    id: r.id,
    amount: r.amount,
    type: r.type,
    category: r.category,
    owner: r.owner,
    note: r.note,
    day_of_month: r.day_of_month,
    active: r.active,
    household_id: getHouseholdId(),
  }
}

function rowToRecurring(row: Record<string, unknown>): RecurringTransaction {
  return {
    id: String(row.id),
    amount: Number(row.amount),
    type: row.type as TransactionType,
    category: row.category as Category,
    owner: row.owner as Owner,
    note: String(row.note ?? ''),
    day_of_month: Number(row.day_of_month),
    active: Boolean(row.active),
  }
}

async function sbGetTransactions(): Promise<Transaction[]> {
  const { data, error } = await getSupabase()
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => rowToTransaction(row as Record<string, unknown>))
}

export async function getTransactions(): Promise<Transaction[]> {
  if (isSupabaseConfigured()) return sbGetTransactions()
  return read<Transaction[]>(KEYS.transactions, [])
}

export async function saveTransaction(tx: Transaction): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await getSupabase().from('transactions').upsert(txToRow(tx), { onConflict: 'id' })
    if (error) throw error

    if (tx.linked_savings_id) {
      await updateSavingsFromTransaction(tx)
    }
    return
  }
  const all = await read<Transaction[]>(KEYS.transactions, [])
  const idx = all.findIndex((t) => t.id === tx.id)
  if (idx >= 0) all[idx] = tx
  else all.unshift(tx)
  await write(KEYS.transactions, all)

  if (tx.linked_savings_id) {
    await updateSavingsFromTransaction(tx)
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  let existing: Transaction | null = null
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabase()
      .from('transactions')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (data) existing = rowToTransaction(data as Record<string, unknown>)
  } else {
    const all = await read<Transaction[]>(KEYS.transactions, [])
    existing = all.find((t) => t.id === id) ?? null
  }
  if (existing?.linked_savings_id) {
    await revertSavingsFromTransaction(existing)
  }
  if (isSupabaseConfigured()) {
    const { error } = await getSupabase().from('transactions').delete().eq('id', id)
    if (error) throw error
    return
  }
  const all = (await read<Transaction[]>(KEYS.transactions, [])).filter((t) => t.id !== id)
  await write(KEYS.transactions, all)
}

async function sbGetBudget(): Promise<Budget> {
  const hid = getHouseholdId()
  const { data, error } = await getSupabase()
    .from('budget_config')
    .select('*')
    .eq('household_id', hid)
    .maybeSingle()
  if (error) throw error
  if (!data) return { monthly_limit: 0, category_limits: {} }
  const cl = data.category_limits as Record<string, number> | null
  return {
    monthly_limit: Number(data.monthly_limit),
    category_limits: (cl ?? {}) as Budget['category_limits'],
  }
}

export async function getBudget(): Promise<Budget> {
  if (isSupabaseConfigured()) return sbGetBudget()
  return read<Budget>(KEYS.budget, { monthly_limit: 0, category_limits: {} })
}

export async function saveBudget(b: Budget): Promise<void> {
  if (isSupabaseConfigured()) {
    const hid = getHouseholdId()
    const { error } = await getSupabase().from('budget_config').upsert({
      id: `default_${hid}`,
      monthly_limit: b.monthly_limit,
      category_limits: b.category_limits,
      household_id: hid,
    })
    if (error) throw error
    return
  }
  await write(KEYS.budget, b)
}

async function sbGetGoal(): Promise<Goal | null> {
  const hid = getHouseholdId()
  const { data, error } = await getSupabase()
    .from('savings_goal')
    .select('*')
    .eq('household_id', hid)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const name = String(data.name ?? '').trim()
  const target = Number(data.target_amount)
  if (!name || target <= 0) return null
  return {
    name,
    target_amount: target,
    current_amount: Number(data.current_amount),
  }
}

export async function getGoal(): Promise<Goal | null> {
  if (isSupabaseConfigured()) return sbGetGoal()
  return read<Goal | null>(KEYS.goal, null)
}

export async function saveGoal(g: Goal): Promise<void> {
  if (isSupabaseConfigured()) {
    const hid = getHouseholdId()
    const { error } = await getSupabase().from('savings_goal').upsert({
      id: `main_${hid}`,
      name: g.name,
      target_amount: g.target_amount,
      current_amount: g.current_amount,
      household_id: hid,
    })
    if (error) throw error
    return
  }
  await write(KEYS.goal, g)
}

async function sbGetRecurring(): Promise<RecurringTransaction[]> {
  const { data, error } = await getSupabase().from('recurring_transactions').select('*')
  if (error) throw error
  return (data ?? []).map((row) => rowToRecurring(row as Record<string, unknown>))
}

export async function getRecurring(): Promise<RecurringTransaction[]> {
  if (isSupabaseConfigured()) return sbGetRecurring()
  return read<RecurringTransaction[]>(KEYS.recurring, [])
}

export async function saveRecurring(item: RecurringTransaction): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await getSupabase()
      .from('recurring_transactions')
      .upsert(recToRow(item), { onConflict: 'id' })
    if (error) throw error
    return
  }
  const all = await read<RecurringTransaction[]>(KEYS.recurring, [])
  const idx = all.findIndex((r) => r.id === item.id)
  if (idx >= 0) all[idx] = item
  else all.unshift(item)
  await write(KEYS.recurring, all)
}

export async function deleteRecurring(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await getSupabase().from('recurring_transactions').delete().eq('id', id)
    if (error) throw error
    return
  }
  const all = (await read<RecurringTransaction[]>(KEYS.recurring, [])).filter((r) => r.id !== id)
  await write(KEYS.recurring, all)
}

function isMissingMonthNotesTable(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false
  const e = err as { code?: string; message?: string }
  if (e.code === 'PGRST205') return true
  const m = e.message ?? ''
  return m.includes('month_notes') && (m.includes('schema cache') || m.includes('Could not find'))
}

let monthNotesUseLocalFallback = false

async function readMonthNotesMap(): Promise<Record<string, string>> {
  return read<Record<string, string>>(KEYS.monthNotes, {})
}

async function getMonthNoteLocal(monthKey: string): Promise<string> {
  const map = await readMonthNotesMap()
  return map[monthKey] ?? ''
}

async function saveMonthNoteLocal(monthKey: string, trimmed: string): Promise<void> {
  const map = { ...(await readMonthNotesMap()) }
  if (trimmed === '') {
    delete map[monthKey]
  } else {
    map[monthKey] = trimmed
  }
  await write(KEYS.monthNotes, map)
}

async function sbGetMonthNote(monthKey: string): Promise<string> {
  const hid = getHouseholdId()
  const { data, error } = await getSupabase()
    .from('month_notes')
    .select('note')
    .eq('month_key', monthKey)
    .eq('household_id', hid)
    .maybeSingle()
  if (error) throw error
  return String(data?.note ?? '')
}

async function sbSaveMonthNote(monthKey: string, note: string): Promise<void> {
  const hid = getHouseholdId()
  const { error } = await getSupabase().from('month_notes').upsert(
    { month_key: monthKey, note, household_id: hid },
    { onConflict: 'month_key,household_id' }
  )
  if (error) throw error
}

export async function getMonthNote(monthKey: string): Promise<string> {
  if (!isSupabaseConfigured() || monthNotesUseLocalFallback) {
    return getMonthNoteLocal(monthKey)
  }
  try {
    return await sbGetMonthNote(monthKey)
  } catch (e) {
    if (isMissingMonthNotesTable(e)) {
      monthNotesUseLocalFallback = true
      console.warn(
        '[budget] month_notes table missing in Supabase. Using AsyncStorage. Run supabase/migrations/002_month_notes.sql in SQL Editor.'
      )
      return getMonthNoteLocal(monthKey)
    }
    throw e
  }
}

export async function saveMonthNote(monthKey: string, note: string): Promise<void> {
  const trimmed = note.trim()
  if (!isSupabaseConfigured() || monthNotesUseLocalFallback) {
    await saveMonthNoteLocal(monthKey, trimmed)
    return
  }
  try {
    if (trimmed === '') {
      const hid = getHouseholdId()
      const { error } = await getSupabase()
        .from('month_notes')
        .delete()
        .eq('month_key', monthKey)
        .eq('household_id', hid)
      if (error) throw error
      return
    }
    await sbSaveMonthNote(monthKey, trimmed)
  } catch (e) {
    if (isMissingMonthNotesTable(e)) {
      monthNotesUseLocalFallback = true
      console.warn(
        '[budget] month_notes table missing in Supabase. Using AsyncStorage. Run supabase/migrations/002_month_notes.sql in SQL Editor.'
      )
      await saveMonthNoteLocal(monthKey, trimmed)
      return
    }
    throw e
  }
}

/* ── Savings accounts ─────────────────────────────────── */

function savingsToRow(s: SavingsAccount) {
  return {
    id: s.id,
    type: s.type,
    name: s.name,
    target_amount: s.target_amount,
    current_amount: s.current_amount,
    monthly_amount: s.monthly_amount,
    interest_rate: s.interest_rate,
    note: s.note,
    created_at: s.created_at,
    household_id: getHouseholdId(),
  }
}

function rowToSavings(row: Record<string, unknown>): SavingsAccount {
  return {
    id: String(row.id),
    type: String(row.type) as SavingsType,
    name: String(row.name ?? ''),
    target_amount: Number(row.target_amount),
    current_amount: Number(row.current_amount),
    monthly_amount: Number(row.monthly_amount),
    interest_rate: Number(row.interest_rate),
    note: String(row.note ?? ''),
    created_at: String(row.created_at),
  }
}

let savingsUseLocalFallback = false

export async function getSavingsAccounts(): Promise<SavingsAccount[]> {
  if (!isSupabaseConfigured() || savingsUseLocalFallback) {
    return read<SavingsAccount[]>(KEYS.savingsAccounts, [])
  }
  try {
    const { data, error } = await getSupabase()
      .from('savings_accounts')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map((r) => rowToSavings(r as Record<string, unknown>))
  } catch (e) {
    if (isMissingSavingsTable(e)) {
      savingsUseLocalFallback = true
      console.warn('[budget] savings_accounts table missing — using AsyncStorage fallback')
      return read<SavingsAccount[]>(KEYS.savingsAccounts, [])
    }
    throw e
  }
}

export async function saveSavingsAccount(item: SavingsAccount): Promise<void> {
  if (!isSupabaseConfigured() || savingsUseLocalFallback) {
    const all = await read<SavingsAccount[]>(KEYS.savingsAccounts, [])
    const idx = all.findIndex((s) => s.id === item.id)
    if (idx >= 0) all[idx] = item
    else all.push(item)
    await write(KEYS.savingsAccounts, all)
    return
  }
  try {
    const { error } = await getSupabase()
      .from('savings_accounts')
      .upsert(savingsToRow(item), { onConflict: 'id' })
    if (error) throw error
  } catch (e) {
    if (isMissingSavingsTable(e)) {
      savingsUseLocalFallback = true
      const all = await read<SavingsAccount[]>(KEYS.savingsAccounts, [])
      const idx = all.findIndex((s) => s.id === item.id)
      if (idx >= 0) all[idx] = item
      else all.push(item)
      await write(KEYS.savingsAccounts, all)
      return
    }
    throw e
  }
}

export async function deleteSavingsAccount(id: string): Promise<void> {
  if (!isSupabaseConfigured() || savingsUseLocalFallback) {
    const all = (await read<SavingsAccount[]>(KEYS.savingsAccounts, [])).filter((s) => s.id !== id)
    await write(KEYS.savingsAccounts, all)
    return
  }
  try {
    const { error } = await getSupabase().from('savings_accounts').delete().eq('id', id)
    if (error) throw error
  } catch (e) {
    if (isMissingSavingsTable(e)) {
      savingsUseLocalFallback = true
      const all = (await read<SavingsAccount[]>(KEYS.savingsAccounts, [])).filter((s) => s.id !== id)
      await write(KEYS.savingsAccounts, all)
      return
    }
    throw e
  }
}

function isMissingSavingsTable(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false
  const e = err as { code?: string; message?: string }
  if (e.code === 'PGRST205') return true
  const m = e.message ?? ''
  return m.includes('savings_accounts') && (m.includes('schema cache') || m.includes('Could not find'))
}

export async function migrateLocalToSupabaseIfNeeded(): Promise<void> {
  if (!isSupabaseConfigured()) return
  if (!_cachedHouseholdId) return
  const flag = await AsyncStorage.getItem(MIGRATION_FLAG)
  if (flag) return

  const supabase = getSupabase()
  const { count, error: countErr } = await supabase.from('transactions').select('*', { count: 'exact', head: true })
  if (countErr) {
    console.error(countErr)
    return
  }
  if (count !== null && count > 0) {
    await AsyncStorage.setItem(MIGRATION_FLAG, '1')
    return
  }

  const localTxs = await read<Transaction[]>(KEYS.transactions, [])
  const localBudget = await read<Budget>(KEYS.budget, { monthly_limit: 0, category_limits: {} })
  const localGoal = await read<Goal | null>(KEYS.goal, null)
  const localRec = await read<RecurringTransaction[]>(KEYS.recurring, [])

  const hasLocalData =
    localTxs.length > 0 ||
    localBudget.monthly_limit > 0 ||
    Object.keys(localBudget.category_limits).length > 0 ||
    (localGoal != null && localGoal.name.trim() !== '' && localGoal.target_amount > 0) ||
    localRec.length > 0

  if (!hasLocalData) {
    await AsyncStorage.setItem(MIGRATION_FLAG, '1')
    return
  }

  const hid = getHouseholdId()
  try {
    if (localTxs.length > 0) {
      const { error } = await supabase.from('transactions').insert(localTxs.map(txToRow))
      if (error) throw error
    }
    await supabase.from('budget_config').upsert({
      id: `default_${hid}`,
      monthly_limit: localBudget.monthly_limit,
      category_limits: localBudget.category_limits,
      household_id: hid,
    })
    if (localGoal && localGoal.name.trim() && localGoal.target_amount > 0) {
      await supabase.from('savings_goal').upsert({
        id: `main_${hid}`,
        name: localGoal.name,
        target_amount: localGoal.target_amount,
        current_amount: localGoal.current_amount,
        household_id: hid,
      })
    }
    if (localRec.length > 0) {
      const { error } = await supabase.from('recurring_transactions').insert(localRec.map(recToRow))
      if (error) throw error
    }
    await AsyncStorage.setItem(MIGRATION_FLAG, '1')
  } catch (e) {
    console.error('migrateLocalToSupabaseIfNeeded:', e)
  }
}

export async function syncStaleLocalDataToSupabase(): Promise<void> {
  if (!isSupabaseConfigured()) return
  if (!_cachedHouseholdId) return
  const supabase = getSupabase()
  const hid = getHouseholdId()

  const { count: recCount, error: recErr } = await supabase
    .from('recurring_transactions')
    .select('*', { count: 'exact', head: true })
  if (recErr) {
    console.error(recErr)
    return
  }
  const localRec = await read<RecurringTransaction[]>(KEYS.recurring, [])
  if ((recCount === 0 || recCount === null) && localRec.length > 0) {
    const { error } = await supabase
      .from('recurring_transactions')
      .upsert(localRec.map(recToRow), { onConflict: 'id' })
    if (error) console.error('syncStaleLocalDataToSupabase recurring:', error)
  }

  const localGoal = await read<Goal | null>(KEYS.goal, null)
  if (localGoal && localGoal.name.trim() && localGoal.target_amount > 0) {
    const { data: remoteGoal } = await supabase
      .from('savings_goal')
      .select('*')
      .eq('household_id', hid)
      .maybeSingle()
    const remoteEmpty =
      !remoteGoal ||
      !String(remoteGoal.name ?? '').trim() ||
      Number(remoteGoal.target_amount) <= 0
    if (remoteEmpty) {
      const { error } = await supabase.from('savings_goal').upsert({
        id: `main_${hid}`,
        name: localGoal.name,
        target_amount: localGoal.target_amount,
        current_amount: localGoal.current_amount,
        household_id: hid,
      })
      if (error) console.error('syncStaleLocalDataToSupabase goal:', error)
    }
  }
}

async function updateSavingsFromTransaction(tx: Transaction): Promise<void> {
  if (!tx.linked_savings_id) return

  const accounts = await getSavingsAccounts()
  const account = accounts.find((a) => a.id === tx.linked_savings_id)
  if (!account) return

  const isLoan = account.type === 'loan'
  let newAmount = account.current_amount

  if (isLoan) {
    if (tx.type === 'expense') {
      newAmount -= tx.amount
    } else {
      newAmount += tx.amount
    }
    if (newAmount < 0) {
      newAmount = 0
    }
  } else {
    if (tx.type === 'expense') {
      newAmount += tx.amount
    } else {
      newAmount -= tx.amount
    }
    if (newAmount < 0) {
      newAmount = 0
    }
  }

  await saveSavingsAccount({
    ...account,
    current_amount: newAmount,
  })
}

/** Reverses balance changes from updateSavingsFromTransaction when a linked transaction is removed. */
async function revertSavingsFromTransaction(tx: Transaction): Promise<void> {
  if (!tx.linked_savings_id) return

  const accounts = await getSavingsAccounts()
  const account = accounts.find((a) => a.id === tx.linked_savings_id)
  if (!account) return

  const isLoan = account.type === 'loan'
  let newAmount = account.current_amount

  if (isLoan) {
    if (tx.type === 'expense') {
      newAmount += tx.amount
    } else {
      newAmount -= tx.amount
    }
    if (newAmount < 0) {
      newAmount = 0
    }
  } else {
    if (tx.type === 'expense') {
      newAmount -= tx.amount
    } else {
      newAmount += tx.amount
    }
    if (newAmount < 0) {
      newAmount = 0
    }
  }

  await saveSavingsAccount({
    ...account,
    current_amount: newAmount,
  })
}
