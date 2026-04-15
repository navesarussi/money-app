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

async function cleanupTransactions() {
  console.log('🗑️  Deleting all transactions from database...\n')

  const { error } = await supabase
    .from('transactions')
    .delete()
    .neq('id', '') // This will match all rows

  if (error) {
    console.error('Error deleting transactions:', error)
    process.exit(1)
  }

  console.log('✅ All transactions deleted successfully!')
  console.log('You can now run "npm run import-csv" to import fresh data.')
}

cleanupTransactions()
  .catch(console.error)
  .finally(() => process.exit(0))
