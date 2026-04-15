import {
  getUserCategoryMeta,
  isUserExpenseCategory,
  isUserIncomeCategory,
  loadUserCategories,
} from './userCategories'

export type TransactionType = 'income' | 'expense'
export type Owner = 'me' | 'partner' | 'shared'

/** קטגוריות הוצאה */
export type ExpenseCategory =
  | 'housing'
  | 'food'
  | 'transport'
  | 'bills'
  | 'fun'
  | 'savings'
  | 'loan'
  | 'other'

/** קטגוריות הכנסה — income_savings / income_loan לקישור למשיכה או לקיחת הלוואה (מובדלים מ־savings/loan בהוצאה) */
export type IncomeCategory = 'salary' | 'income_other' | 'income_savings' | 'income_loan'

export type Category = ExpenseCategory | IncomeCategory

export const EXPENSE_CATEGORIES: readonly { id: ExpenseCategory; icon: string }[] = [
  { id: 'housing', icon: '🏠' },
  { id: 'food', icon: '🍕' },
  { id: 'transport', icon: '🚗' },
  { id: 'bills', icon: '📄' },
  { id: 'fun', icon: '🎉' },
  { id: 'savings', icon: '🐷' },
  { id: 'loan', icon: '💳' },
  { id: 'other', icon: '📦' },
] as const

export const INCOME_CATEGORIES: readonly { id: IncomeCategory; icon: string }[] = [
  { id: 'salary', icon: '💼' },
  { id: 'income_other', icon: '📝' },
  { id: 'income_savings', icon: '🐷' },
  { id: 'income_loan', icon: '💳' },
] as const

export function isExpenseCategory(c: string): boolean {
  if (EXPENSE_CATEGORIES.some((x) => x.id === c)) return true
  return isUserExpenseCategory(c)
}

export function isIncomeCategory(c: string): boolean {
  if (INCOME_CATEGORIES.some((x) => x.id === c)) return true
  return isUserIncomeCategory(c)
}

export function getCategoryIcon(id: Category | string): string {
  const e = EXPENSE_CATEGORIES.find((c) => c.id === id)
  if (e) return e.icon
  const i = INCOME_CATEGORIES.find((c) => c.id === id)
  if (i) return i.icon
  return getUserCategoryMeta(id)?.icon ?? '📦'
}

/** לסינון דשבורד: כל הקטגוריות הרלוונטיות לפי סוג עסקה */
export function categoriesForTypeFilter(
  type: TransactionType | 'all'
): readonly { id: string; icon: string }[] {
  if (type === 'expense') {
    const extra = loadUserCategories()
      .filter((u) => u.kind === 'expense')
      .map((u) => ({ id: u.id, icon: u.icon }))
    return [...EXPENSE_CATEGORIES, ...extra]
  }
  if (type === 'income') {
    const extra = loadUserCategories()
      .filter((u) => u.kind === 'income')
      .map((u) => ({ id: u.id, icon: u.icon }))
    return [...INCOME_CATEGORIES, ...extra]
  }
  return [...categoriesForTypeFilter('expense'), ...categoriesForTypeFilter('income')]
}

export const OWNERS: readonly Owner[] = ['me', 'partner', 'shared'] as const

export interface Transaction {
  id: string
  amount: number
  type: TransactionType
  /** קטגוריה מובנית או מזהה קטגוריה מותאמת אישית */
  category: Category | string
  date: string
  owner: Owner
  note: string
  created_at: string
  /** ID of linked savings account (optional) */
  linked_savings_id?: string
}

export interface RecurringTransaction {
  id: string
  amount: number
  type: TransactionType
  category: Category | string
  owner: Owner
  note: string
  day_of_month: number
  active: boolean
}

export interface Budget {
  monthly_limit: number
  category_limits: Partial<Record<string, number>>
}

export interface Goal {
  name: string
  target_amount: number
  current_amount: number
}

export type SavingsType =
  | 'emergency'
  | 'goal'
  | 'investment'
  | 'pension'
  | 'loan'

export const SAVINGS_TYPES: readonly { id: SavingsType; icon: string; color: string }[] = [
  { id: 'emergency', icon: '🛡️', color: 'text-orange-500' },
  { id: 'goal', icon: '🎯', color: 'text-primary' },
  { id: 'investment', icon: '📈', color: 'text-income' },
  { id: 'pension', icon: '🏦', color: 'text-blue-500' },
  { id: 'loan', icon: '💳', color: 'text-expense' },
] as const

export function getSavingsTypeInfo(type: SavingsType) {
  return SAVINGS_TYPES.find((t) => t.id === type) ?? SAVINGS_TYPES[0]
}

export interface SavingsAccount {
  id: string
  type: SavingsType
  name: string
  target_amount: number
  current_amount: number
  /** monthly contribution / payment amount */
  monthly_amount: number
  /** interest rate % (for loans) */
  interest_rate: number
  note: string
  created_at: string
}
