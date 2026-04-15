import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(url, key)

async function verifyData() {
  console.log('🔍 Verifying imported data...\n')

  // Get total count
  const { count, error: countError } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('Error counting transactions:', countError)
    return
  }

  console.log(`✅ Total transactions in database: ${count}\n`)

  // Get transactions by type
  const { data: expenses } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'expense')

  const { data: incomes } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'income')

  const totalExpenses = expenses?.reduce((sum, t) => sum + Number(t.amount), 0) || 0
  const totalIncome = incomes?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

  console.log(`💰 Income transactions: ${incomes?.length || 0}`)
  console.log(`   Total income: ₪${totalIncome.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`)
  console.log()
  console.log(`💸 Expense transactions: ${expenses?.length || 0}`)
  console.log(`   Total expenses: ₪${totalExpenses.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`)
  console.log()
  console.log(`📊 Net: ₪${(totalIncome - totalExpenses).toLocaleString('he-IL', { minimumFractionDigits: 2 })}`)
  console.log()

  // Get breakdown by owner
  const { data: byOwner } = await supabase
    .from('transactions')
    .select('owner, type, amount')

  const ownerStats: Record<string, { income: number; expense: number; count: number }> = {}
  
  byOwner?.forEach(t => {
    if (!ownerStats[t.owner]) {
      ownerStats[t.owner] = { income: 0, expense: 0, count: 0 }
    }
    ownerStats[t.owner].count++
    if (t.type === 'income') {
      ownerStats[t.owner].income += Number(t.amount)
    } else {
      ownerStats[t.owner].expense += Number(t.amount)
    }
  })

  console.log('👥 Breakdown by owner:')
  Object.entries(ownerStats).forEach(([owner, stats]) => {
    console.log(`   ${owner}: ${stats.count} transactions`)
    console.log(`      Income: ₪${stats.income.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`)
    console.log(`      Expense: ₪${stats.expense.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`)
    console.log(`      Net: ₪${(stats.income - stats.expense).toLocaleString('he-IL', { minimumFractionDigits: 2 })}`)
    console.log()
  })

  // Get breakdown by category (top 10)
  const { data: byCategory } = await supabase
    .from('transactions')
    .select('category, type, amount')

  const categoryStats: Record<string, number> = {}
  
  byCategory?.forEach(t => {
    if (!categoryStats[t.category]) {
      categoryStats[t.category] = 0
    }
    if (t.type === 'expense') {
      categoryStats[t.category] += Number(t.amount)
    }
  })

  const topCategories = Object.entries(categoryStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  console.log('📁 Top 10 expense categories:')
  topCategories.forEach(([category, total], index) => {
    console.log(`   ${index + 1}. ${category}: ₪${total.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`)
  })
  console.log()

  // Get date range
  const { data: dates } = await supabase
    .from('transactions')
    .select('date')
    .order('date', { ascending: true })
    .limit(1)

  const { data: datesLast } = await supabase
    .from('transactions')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)

  console.log('📅 Date range:')
  console.log(`   From: ${dates?.[0]?.date || 'N/A'}`)
  console.log(`   To: ${datesLast?.[0]?.date || 'N/A'}`)
  console.log()

  console.log('✨ Verification complete!')
}

verifyData()
  .catch(console.error)
  .finally(() => process.exit(0))
