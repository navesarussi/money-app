import fs from 'fs'
import csv from 'csv-parser'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env.local from project root
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
  console.error('Current url:', url)
  console.error('Current key:', key ? 'exists' : 'missing')
  process.exit(1)
}

const supabase = createClient(url, key)

interface CSVRow {
  'שייך לתזרים חודש': string
  'שם העסק': string
  'אמצעי התשלום': string
  'אמצעי זיהוי התשלום': string
  'תאריך התשלום': string
  'חודש תאריך התשלום': string
  'שנת תאריך התשלום': string
  'תאריך החיוב בחשבון': string
  'סכום': string
  'מטבע חיוב': string
  'מספר התשלום': string
  'מספר תשלומים כולל': string
  'קטגוריה בתזרים': string
  'האם מוחרג מהתזרים?': string
  'הערות': string
  'סוג מקור': string
  'סכום מקורי': string
}

interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
  owner: string
  note: string
  created_at: string
}

function parseDate(dateStr: string): string {
  // Format is DD/MM/YYYY
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const [day, month, year] = parts
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return dateStr
}

function mapCategory(hebrewCategory: string): string {
  const categoryMap: Record<string, string> = {
    // Food related
    'סופר': 'food',
    'אוכל בחוץ ויציאות': 'food',
    'מסעדות ובילויים': 'fun',
    'פחיות וקפה': 'food',
    'גימלים': 'food',
    
    // Housing & bills
    'חשמל': 'bills',
    'תקשורת': 'bills',
    'ביטוח': 'bills',
    'בית': 'housing',
    'ציוד לבית': 'housing',
    'משק בית': 'housing',
    'ניקיון': 'housing',
    
    // Transport
    'רכב': 'transport',
    
    // Fun & entertainment
    'ספורט ופנאי': 'fun',
    'בילויים': 'fun',
    
    // Other
    'דיגיטל': 'bills',
    'הלוואה': 'other',
    'הלוואות': 'other',
    'כללי': 'other',
    'תרומה': 'other',
    'תרומות': 'other',
    'שיק': 'other',
    'תשלומים': 'other',
    'משיכות': 'other',
    'משיכות מזומן': 'other',
    'עמלות': 'other',
    'עמלות והשקעות': 'other',
    'העברות': 'other',
    'בריאות': 'other',
    'ביגוד': 'other',
    'ביגוד והנעלה': 'other',
    'גני ילדים וצהרונים': 'other',
    'חינוך': 'other',
    'חינוך וחוגים': 'other',
    'מתנות': 'other',
    'הוצאות משתנות': 'other',
    
    // Income
    'הכנסות קבועות': 'salary',
    'הכנסות משתנות': 'income_other',
  }
  
  return categoryMap[hebrewCategory] || 'other'
}

function determineOwner(paymentMethod: string): string {
  // Map payment methods to owners: 'me', 'partner', or 'shared'
  if (paymentMethod === 'leumiBank' || paymentMethod === 'leumicard') {
    return 'me'
  } else if (paymentMethod === 'pepperBank' || paymentMethod === 'cal' || paymentMethod === 'isracard') {
    return 'partner'
  }
  return 'shared'
}

async function importCSV() {
  const transactions: Transaction[] = []
  const csvPath = path.join(__dirname, '..', 'תזרים מרייזאפ.csv')

  console.log('Starting CSV import...')
  console.log('CSV file path:', csvPath)

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row: CSVRow) => {
        // Skip excluded transactions
        if (row['האם מוחרג מהתזרים?'] === 'true') {
          return
        }

        const amount = parseFloat(row['סכום'])
        if (isNaN(amount) || amount === 0) {
          return
        }

        const type: 'income' | 'expense' = amount > 0 ? 'income' : 'expense'
        const absoluteAmount = Math.abs(amount)
        
        const date = parseDate(row['תאריך התשלום'] || row['תאריך החיוב בחשבון'])
        const category = mapCategory(row['קטגוריה בתזרים'])
        const owner = determineOwner(row['אמצעי התשלום'])
        
        let note = row['שם העסק'] || ''
        if (row['הערות']) {
          note += ` - ${row['הערות']}`
        }
        // Add installment info if exists
        if (row['מספר תשלומים כולל'] && parseInt(row['מספר תשלומים כולל']) > 1) {
          const current = row['מספר התשלום'] || '?'
          const total = row['מספר תשלומים כולל']
          note += ` (תשלום ${current}/${total})`
        }

        transactions.push({
          id: nanoid(),
          amount: absoluteAmount,
          type,
          category,
          date,
          owner,
          note: note.trim(),
          created_at: new Date().toISOString()
        })
      })
      .on('end', async () => {
        console.log(`Parsed ${transactions.length} valid transactions`)
        
        // Insert in batches of 100
        const batchSize = 100
        let inserted = 0
        let errors = 0

        for (let i = 0; i < transactions.length; i += batchSize) {
          const batch = transactions.slice(i, i + batchSize)
          const { data, error } = await supabase
            .from('transactions')
            .insert(batch)

          if (error) {
            console.error(`Error inserting batch ${i / batchSize + 1}:`, error)
            errors += batch.length
          } else {
            inserted += batch.length
            console.log(`Inserted batch ${i / batchSize + 1}: ${batch.length} transactions`)
          }
        }

        console.log('\n=== Import Summary ===')
        console.log(`Total transactions: ${transactions.length}`)
        console.log(`Successfully inserted: ${inserted}`)
        console.log(`Errors: ${errors}`)
        
        resolve(true)
      })
      .on('error', reject)
  })
}

importCSV()
  .then(() => {
    console.log('Import completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Import failed:', error)
    process.exit(1)
  })
