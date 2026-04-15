import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'budget_user_categories'

export interface UserCategoryDef {
  id: string
  label: string
  icon: string
  kind: 'expense' | 'income'
}

let cache: UserCategoryDef[] | null = null

export function invalidateUserCategoriesCache(): void {
  cache = null
}

export async function initUserCategories(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as UserCategoryDef[]) : []
    cache = Array.isArray(parsed) ? parsed : []
  } catch {
    cache = []
  }
}

export function loadUserCategories(): UserCategoryDef[] {
  if (cache) return cache
  cache = []
  return cache
}

export async function saveUserCategories(list: UserCategoryDef[]): Promise<void> {
  cache = list
  await AsyncStorage.setItem(KEY, JSON.stringify(list))
}

export function getUserCategoryMeta(id: string): UserCategoryDef | undefined {
  return loadUserCategories().find((c) => c.id === id)
}

export function isUserExpenseCategory(id: string): boolean {
  return getUserCategoryMeta(id)?.kind === 'expense'
}

export function isUserIncomeCategory(id: string): boolean {
  return getUserCategoryMeta(id)?.kind === 'income'
}
