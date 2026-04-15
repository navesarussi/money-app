import type { Category, Owner, SavingsType } from '../lib/types'
import { getUserCategoryMeta } from '../lib/userCategories'

/** מחרוזות ממשק — עברית בלבד */
export const he = {
  appTitle: 'התקציב שלנו',

  nav: {
    dashboard: 'לוח בקרה',
    add: 'הוספה',
    planning: 'תכנון',
    settings: 'הגדרות',
  },

  common: {
    loading: 'טוען…',
    all: 'הכל',
    cancel: 'ביטול',
    save: 'שמירה',
    saveFailed: 'השמירה נכשלה. נסה שוב.',
    add: 'הוסף',
    type: 'סוג',
    category: 'קטגוריה',
    owner: 'מי',
    amount: 'סכום (₪)',
    date: 'תאריך',
    description: 'תיאור',
    dayOfMonth: 'יום בחודש',
    noteOptional: 'הערה (אופציונלי)',
    monthlyTotal: 'סך חודשי',
  },

  dates: {
    today: 'היום',
    yesterday: 'אתמול',
  },

  transactionType: {
    expense: 'הוצאה',
    income: 'הכנסה',
    expenses: 'הוצאות',
    incomePlural: 'הכנסות',
  },

  dashboard: {
    title: 'לוח בקרה',
    filters: 'סינון',
    sortBy: 'מיון לפי',
    sortLabel: 'מיון',
    clearFilters: 'נקה את כל הסינונים',
    summaryIncome: 'הכנסות',
    summaryExpenses: 'הוצאות',
    summaryBalance: 'מאזן',
    /** פירוט תחת סיכום התזרים */
    breakdownActual: 'בפועל בעסקאות בחודש',
    breakdownFixed: 'קבועות חודשיות (מההגדרות)',
    balanceIncludesFixedHint: 'המאזן והסכומים למעלה כוללים גם קבועות מהגדרות.',
    transactionsHeading: 'עסקאות בחודש זה',
    noTransactionsFiltered: 'אין עסקאות שמתאימות לסינון',
    noTransactionsMonth: 'אין עסקאות החודש',
    tapToAdd: 'לחץ על + להוספת עסקה',
    monthNoteTitle: 'הערה על החודש',
    monthNotePlaceholder: 'למשל מטרות, תזכורות או הקשר לחודש זה…',
    monthNoteSave: 'שמור הערת חודש',
    /** סיכום מתוך מסך תכנון — לא מחובר אוטומטית לעסקאות */
    planningCardTitle: 'תכנון חיסכון',
    plannedMonthlySavings: 'הפקדות חודשיות מתוכננות',
    plannedLoanPayments: 'החזרי הלוואות מתוכננים',
    savingsBalancesInPlanning: 'סך יתרות בחסכונות (בתכנון)',
    goToPlanning: 'למסך התכנון והחיסכון ←',
    planningNotInTransactionsHint:
      'ההפקדות המתוכננות לא נרשמות אוטומטית כעסקאות. כדי לראותן במאזן החודשי — הוסיפו הוצאה/העברה בעסקאות.',
    budgetAllAllocatedHint:
      'אין מסגרת הוצאות נוספת לחודש: סכום ההכנסות שווה או קטן מהחיסכון וההלוואות המתוכננים.',
    budgetNoIncomeHint: 'לא מחושבת מסגרת הוצאות — הוסיפו הכנסות (עסקאות או קבועות) כדי לראות תקרה.',
  },

  sortField: {
    date: 'תאריך',
    amount: 'סכום',
    category: 'קטגוריה',
  },

  addTransaction: {
    title: 'הוספת עסקה',
    notePlaceholder: 'למה זה היה?',
    save: 'שמור עסקה',
    selectSavingsAccount: 'בחר חסכון',
    selectLoanAccount: 'בחר הלוואה',
    chooseAccount: 'בחר חשבון…',
    noAccountsForCategory:
      'אין חשבונות מסוג זה. הוסיפו במסך התכנון והחיסכון.',
    savingsExpenseHint: 'הסכום יתווסף לחיסכון (הפקדה) או יקטין את החוב (תשלום הלוואה)',
    savingsIncomeHint: 'הסכום יופחת מהחיסכון (משיכה) או יגדיל את החוב (לקיחת הלוואה)',
  },

  settings: {
    title: 'הגדרות',
    tabGeneral: 'כללי',
    tabFixedExpenses: 'הוצאות קבועות',
    tabFixedIncome: 'הכנסות קבועות',
    tabCategories: 'קטגוריות',
    budgetAutoSectionTitle: 'מסגרת הוצאות חודשית (אוטומטית)',
    budgetAutoSectionBody:
      'התקרה לפי הכנסות החודש, בניכוי הוצאות קבועות מההגדרות, הפקדות חיסכון והחזרי הלוואות מהתכנון. בלוח הבקרה הפס משווה את זה להוצאות **בעסקאות** (לא כולל קבועות — כבר נוכו מהמסגרת).',
    budgetAutoIncome: 'הכנסות החודש (עסקאות + קבועות)',
    budgetAutoFixedExpenses: 'הוצאות קבועות (מההגדרות)',
    budgetAutoSavings: 'הפקדות חיסכון מתוכננות',
    budgetAutoLoans: 'החזרי הלוואות מתוכננים',
    budgetAutoResult: 'מסגרת להוצאות משתנות',
    budgetAutoEmpty:
      'אין עדיין נתונים מספיקים (הכנסות או תכנון). הוסיפו הכנסות קבועות/עסקאות והגדירו חיסכון במסך התכנון.',
    saveSettings: 'שמור הגדרות',
    noFixedExpenses: 'אין עדיין הוצאות קבועות',
    noFixedIncome: 'אין עדיין הכנסות קבועות',
    recurringDay: (day: number, owner: string) => `יום ${day} · ${owner}`,
    recurringNoteExpense: 'למשל שכירות, אינטרנט…',
    recurringNoteIncome: 'פרט מקור אם בחרת «אחר»',
    incomeDetailRequired: 'במצב «אחר» יש למלא תיאור',
    categoriesSectionTitle: 'קטגוריות מותאמות אישית',
    categoriesSectionHint: 'קטגוריות שתוסיפו יופיעו בבחירת קטגוריה בהוספת עסקה ובהוצאות/הכנסות קבועות.',
    categoryNameLabel: 'שם הקטגוריה',
    categoryIconLabel: 'אימוג׳י',
    categoryKindExpense: 'הוצאה',
    categoryKindIncome: 'הכנסה',
    categoryAdd: 'הוספת קטגוריה',
    categoryDeleteConfirm: 'למחוק את הקטגוריה?',
    categoryNamePlaceholder: 'למשל: חיות מחמד',
  },

  transaction: {
    deleteConfirm: 'למחוק את העסקה?',
    editNote: 'עריכת הערה',
    addNote: 'הוספת הערה',
    notePlaceholder: 'הערה לעסקה…',
  },

  spendingChart: {
    title: 'הוצאות לפי קטגוריה',
    empty: 'אין הוצאות החודש',
    txCount: (n: number) => (n === 1 ? 'עסקה אחת' : `${n} עסקאות`),
  },

  budget: {
    title: 'מסגרת הוצאות משתנות',
    autoDerived: 'מול הוצאות בעסקאות בלבד · מחושב: הכנסות − קבועות − חיסכון − הלוואות',
    noRoomButVariableSpent:
      'לפי ההגדרות אין מסגרת להוצאות משתנות, אך יש הוצאות שנרשמו בעסקאות בחודש זה.',
    percentUsed: 'בשימוש',
    spent: 'הוצאתי',
    left: 'נשארו',
    overBy: 'חריגה של',
  },

  categories: {
    housing: 'דיור',
    food: 'מזון',
    transport: 'תחבורה',
    bills: 'חשבונות',
    fun: 'בילויים',
    savings: 'חיסכון',
    loan: 'הלוואה',
    salary: 'משכורת',
    income_other: 'אחר (לפרט)',
    income_savings: 'חיסכון',
    income_loan: 'הלוואה',
    other: 'אחר',
  } satisfies Record<Category, string>,

  owners: {
    me: 'אני',
    partner: 'בן/בת זוג',
    shared: 'משותף',
  } satisfies Record<Owner, string>,

  planning: {
    title: 'תכנון וחיסכון',
    totalAssets: 'סך נכסים',
    totalDebts: 'סך חובות',
    netWorth: 'הון נקי',
    addNew: 'הוסף חדש',
    noAccounts: 'אין עדיין חסכונות או הלוואות',
    tapToAdd: 'לחץ על «הוסף חדש» כדי להתחיל',
    target: 'יעד',
    current: 'מצב נוכחי',
    monthly: 'הפקדה חודשית',
    monthlyPayment: 'החזר חודשי',
    interestRate: 'ריבית %',
    remaining: 'יתרה לסילוק',
    progress: 'התקדמות',
    deleteConfirm: 'למחוק את הפריט?',
    name: 'שם',
    namePlaceholder: 'למשל: חיסכון לחירום, חופשה בחו״ל…',
    type: 'סוג',
    note: 'הערה',
    notePlaceholder: 'פרטים נוספים (אופציונלי)',
    editTitle: 'עריכת פריט',
    addTitle: 'הוספת פריט חדש',
    estimatedMonths: (n: number) => n === 1 ? 'חודש אחד ליעד' : `${n} חודשים ליעד`,
    loanRemaining: (n: number) => n === 1 ? 'חודש אחד לסילוק' : `${n} חודשים לסילוק`,
    budgetLinkHint:
      'מסגרת ההוצאות המשתנות בלוח הבקרה מחושבת מההכנסות בחודש, בניכוי הוצאות קבועות מההגדרות, הפקדות לחיסכון וההחזרים להלוואות שהגדרת כאן.',
  },

  savingsType: {
    emergency: 'חיסכון חירום',
    goal: 'חיסכון למטרה',
    investment: 'השקעות',
    pension: 'פנסיה / קופ״ג',
    loan: 'הלוואה',
  } satisfies Record<SavingsType, string>,

  auth: {
    login: 'התחברות',
    register: 'הרשמה',
    email: 'אימייל',
    password: 'סיסמה',
    displayName: 'שם תצוגה',
    loginButton: 'כניסה',
    registerButton: 'יצירת חשבון',
    noAccount: 'אין לך חשבון?',
    hasAccount: 'כבר יש לך חשבון?',
    loginLink: 'התחבר',
    registerLink: 'הירשם',
    logout: 'התנתקות',
    logoutConfirm: 'להתנתק מהחשבון?',
    invitePartner: 'הזמנת בן/בת זוג',
    invitePartnerHint:
      'האפליקציה לא שולחת מייל אוטומטי. הזן/י את האימייל של בן/בת הזוג — זה רושם הזמנה במערכת. אחר כך הודע/י להם בעצמך (ווטסאפ, מייל וכו׳) להירשם לאפליקציה עם בדיוק אותה כתובת אימייל, כדי שיוצמדו למשק הבית שלך.',
    inviteEmail: 'אימייל של בן/בת הזוג',
    sendInvite: 'שמירת הזמנה',
    inviteSent:
      'ההזמנה נשמרה במערכת. אין שליחת מייל מהאפליקציה — ודא/י שבן/בת הזוג נרשמים עם אותו אימייל.',
    invitePending: 'ממתין להצטרפות',
    inviteAlreadyExists: 'כבר קיימת הזמנה לכתובת הזו',
    partnerJoined: 'בן/בת הזוג הצטרפו לתזרים!',
    householdMembers: 'חברי משק הבית',
    you: 'את/ה',
    partner: 'בן/בת זוג',
    emailRequired: 'יש למלא אימייל',
    passwordRequired: 'יש למלא סיסמה',
    nameRequired: 'יש למלא שם תצוגה',
    passwordMinLength: 'הסיסמה חייבת להכיל לפחות 6 תווים',
    genericError: 'אירעה שגיאה. נסה שוב.',
    invalidCredentials: 'האימייל או הסיסמה שגויים',
    emailNotConfirmed:
      'יש לאשר את כתובת האימייל מהקישור שנשלח אליך בתיבת הדואר לפני ההתחברות.',
    emailAlreadyUsed: 'האימייל כבר בשימוש',
    supabaseMigrationRequired:
      'חסרות טבלאות household בשרת. הרץ את הקובץ supabase/migrations/005_auth_households.sql ב-SQL Editor של Supabase.',
    displayNamePlaceholder: 'למשל: שם פרטי',
    passwordPlaceholderRegister: 'לפחות 6 תווים',
    welcomeTitle: 'התקציב שלנו',
    welcomeSubtitle: 'ניהול תקציב משותף בקלות',
    accountTab: 'חשבון',
    showPasswordA11y: 'הצג סיסמה',
    hidePasswordA11y: 'הסתר סיסמה',
    pendingInvitationsTitle: 'הזמנות ממתינות',
    pendingInvitationFrom: 'הזמנה להצטרף למשק בית',
    acceptInvitation: 'קבלת הזמנה',
    acceptInvitationConfirm: 'האם לעבור למשק הבית שהוזמנת אליו? פעולה זו תחליף את משק הבית הנוכחי שלך.',
    inviteAccepted: 'הצטרפת בהצלחה למשק הבית!',
    inviteAcceptError: 'אירעה שגיאה בקבלת ההזמנה. נסה שוב.',
  },
} as const

export function categoryLabel(id: Category | string): string {
  const map = he.categories as Record<string, string>
  if (map[id as string]) return map[id as string]
  return getUserCategoryMeta(id)?.label ?? id
}

export function ownerLabel(id: Owner): string {
  return he.owners[id]
}

export function savingsTypeLabel(id: SavingsType): string {
  return he.savingsType[id]
}
