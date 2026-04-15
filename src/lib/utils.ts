import type { Transaction } from './types'
import { he } from '../locales/he'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
}

export function formatTransactionListDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = today.getTime() - d.getTime()
  const dayMs = 86400000
  if (diff < dayMs && diff >= 0) return he.dates.today
  if (diff < dayMs * 2 && diff >= dayMs) return he.dates.yesterday
  return d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function filterByMonth(transactions: Transaction[], monthKey: string): Transaction[] {
  return transactions.filter((t) => t.date.startsWith(monthKey))
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

export function deriveMonthlySpendingLimit(
  monthIncome: number,
  fixedMonthlyExpenses: number,
  plannedMonthlySavings: number,
  plannedMonthlyLoanPayments: number
): number {
  return Math.max(
    0,
    monthIncome - fixedMonthlyExpenses - plannedMonthlySavings - plannedMonthlyLoanPayments
  )
}
