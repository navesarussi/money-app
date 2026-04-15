# מסמך דרישות — Couple Budget

**מקור האמת היחיד** לפרויקט (תכונות, התנהגות, מודלים, הקמה, ייבוא, וקישור חיסכון/הלוואות).  
כל שאר קבצי ה-Markdown בפרויקט הוסרו לטובת מסמך זה.

עודכן לאחרונה: 15 באפריל 2026

---

## תוכן עניינים

1. [סקירה ומטרה](#1-סקירה-ומטרה)
2. [הקמה והרצה](#2-הקמה-והרצה)
3. [אחסון נתונים (Supabase ו-AsyncStorage)](#3-אחסון-נתונים-supabase-ו-asyncstorage)
4. [ניווט ומסכים](#4-ניווט-ומסכים)
5. [מודלים ו-enums](#5-מודלים-ו-enums)
6. [מסד נתונים ומיגרציות](#6-מסד-נתונים-ומיגרציות)
7. [עיצוב, לוקאליזציה ומבנה קבצים](#7-עיצוב-לוקאליזציה-ומבנה-קבצים)
8. [ייבוא CSV מ-Riseup](#8-ייבוא-csv-מ-riseup)
9. [קישור עסקאות לחיסכון והלוואות](#9-קישור-עסקאות-לחיסכון-והלוואות)
10. [סקריפטים (`npm`)](#10-סקריפטים-npm)
11. [אימות משתמשים והזמנת בן/בת זוג](#11-אימות-משתמשים-והזמנת-בןבת-זוג)
12. [שיקולים עתידיים](#12-שיקולים-עתידיים)
13. [תוכנית השקה לחנות האפליקציות (App Store)](#13-תוכנית-השקה-לחנות-האפליקציות-app-store)

---

## 1. סקירה ומטרה

**Couple Budget** (שם החבילה: `couple-budget`) הוא אפליקציית React Native (Expo) שרצה על iOS, Android ו-Web לניהול תקציב משק בית משותף בין שני בני זוג. הממשק בעברית (`src/locales/he.ts`); תמיכה מלאה באנגלית ומעבר שפה — ראו [סעיף 13](#13-תוכנית-השקה-לחנות-האפליקציות-app-store) (לפני השקה לחנות).

### Tech stack

| שכבה | בחירה |
|------|--------|
| UI | React Native + Expo SDK 52 + TypeScript |
| Build | Metro (via Expo) |
| Styling | React Native StyleSheet with theme tokens (`src/lib/theme.ts`) |
| Routing | Expo Router v4 (file-based, tab navigation) |
| Backend / DB | Supabase (PostgreSQL) כשמוגדרים משתני סביבה |
| גיבוי ללא Supabase | AsyncStorage באותם מפתחות לוגיים |
| Icons | lucide-react-native |

תרשימי הוצאות לפי קטגוריה: יישום מותאם (פסים).

---

## 2. הקמה והרצה

### דרישות מקדימות

- Node.js 18+
- npm
- פרויקט Supabase (לשימוש מלא עם ענן)

### התקנה

```bash
cd money
npm install
```

### משתני סביבה

קובץ `.env.local` בשורש הפרויקט:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

ללא משתנים אלה האפליקציה עובדת מול **AsyncStorage** בלבד (אותה לוגיקה ב-`src/lib/store.ts`).

### מיגרציות DB

ב-Supabase SQL Editor (או CLI), להריץ לפי הסדר:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_month_notes.sql`
3. `supabase/migrations/003_savings_accounts.sql`
4. `supabase/migrations/004_add_linked_savings.sql`
5. `supabase/migrations/005_auth_households.sql` — **נדרש** להתחברות, משקי בית והזמנות; בלעדיו בקשות ל-`/rest/v1/households` ו-`/rest/v1/invitations` יחזירו 404.
6. `supabase/migrations/006_profiles_select_own.sql` — מדיניות RLS: כל משתמש יכול לקרוא את הפרופיל שלו עצמו.
7. `supabase/migrations/007_invitations_select_pending_jwt_email.sql` — מדיניות RLS: משתמש מאומת יכול לקרוא הזמנות ממתינות שנשלחו לאימייל שלו (גם לפני שיש לו פרופיל).
8. `supabase/migrations/008_profiles_select_invitation_inviter.sql` — מדיניות RLS: משתמש יכול לקרוא את הפרופיל של מי שהזמין אותו (כדי להציג את שמו בממשק קבלת ההזמנה).
9. `supabase/migrations/009_month_notes_household_key.sql` — תיקון: שינוי המפתח הראשי של `month_notes` מ-`month_key` בלבד ל-`(month_key, household_id)`, כדי שלכל משק בית יהיו הערות חודשיות נפרדות ו-RLS לא יחסום upsert.

### הרצת פיתוח

```bash
npx expo start        # starts Expo dev server (scan QR with Expo Go on iPhone)
npx expo start --web  # opens web version in browser
npm run ios           # shortcut for expo start --ios
npm run web           # shortcut for expo start --web
```

הפרויקט פרטי; אין רישיון שימוש ציבורי.

---

## 3. אחסון נתונים (Supabase ו-AsyncStorage)

- אם `EXPO_PUBLIC_SUPABASE_URL` ו-`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` מוגדרים — כל ה-CRUD העיקרי הולך ל-Supabase.
- אחרת — הנתונים נשמרים ב-`AsyncStorage` תחת המפתחות הבאים (עקביים עם `src/lib/store.ts`):

| מפתח | תוכן |
|------|------|
| `budget_transactions` | מערך עסקאות |
| `budget_config` | תקציב |
| `budget_goal` | יעד חיסכון (מסך הגדרות) |
| `budget_recurring` | תשלומים חוזרים |
| `budget_month_notes` | הערות לפי חודש (גיבוי מקומי גם כש-Supabase קיים אם נדרש) |
| `budget_savings_accounts` | חשבונות חיסכון/הלוואות (מצב מקומי) |

בעת טעינת האפליקציה רצים `migrateLocalToSupabaseIfNeeded` ו-`syncStaleLocalDataToSupabase` (ראו `app/_layout.tsx`) כדי לסנכרן מקומי → Supabase כשהוגדר.

**אימות משתמשים:** מובנה באמצעות Supabase Auth (email + password). כל משתמש שייך ל-**household** (משק בית). המשתמש הראשון שנרשם יוצר household חדש, ויכול לשלוח הזמנה (invite) לבן/בת הזוג שמצטרף/ת לאותו household. כל הנתונים (עסקאות, תקציב, חיסכון וכו׳) שייכים ל-household ומוגנים ב-RLS.

---

## 4. ניווט ומסכים

### סרגל תחתון (קבוע)

| פריט | נתיב | אייקון |
|------|------|--------|
| דשבורד | `/` | LayoutDashboard |
| הוספה | `/add` | PlusCircle |
| תכנון וחיסכון | `/planning` | PiggyBank |
| הגדרות | `/settings` | Settings |

**הערה:** הנתיב `/history` הוסר (היה redirect ל-`/`). רשימת העסקאות והפילטרים נמצאים ב**דשבורד** (לא מסך היסטוריה נפרד). הניווט מתבצע באמצעות Expo Router tabs.

### דשבורד (`/`)

- בחירת חודש (אחורה ללא הגבלה; קדימה עד החודש הנוכחי).
- סיכום: הכנסות, הוצאות, מאזן.
- פס תקציב חודשי (כשמוגדר תקרה > 0).
- תרשים הוצאות לפי קטגוריה (פסים).
- התקדמות יעד חיסכון (אם מוגדר).
- הערת חודש (נשמרת ב-`month_notes` ב-Supabase או במפתח המקומי).
- רשימת עסקאות לחודש עם פאנל סינון/מיון (סוג, בעלים, קטגוריה; מיון לפי תאריך/סכום/קטגוריה).
- מצבי ריק מתאימים.

### הוספת עסקה (`/add`)

- סוג: הכנסה / הוצאה.
- סכום, קטגוריה (לפי סוג), בעלים, תאריך, הערה.
- אופציונלי: קישור לחשבון חיסכון/הלוואה (`linked_savings_id`) — ראו [סעיף 9](#9-קישור-עסקאות-לחיסכון-והלוואות).

### תכנון וחיסכון (`/planning`)

- ניהול חשבונות חיסכון (חירום, מטרה, השקעות, פנסיה) והלוואות.
- יעדים, יתרות, סכומים חודשיים, ריבית להלוואות.
- סיכומי נכסים/חובות/שווי נטו לפי המימוש בקוד.

### הגדרות (`/settings`)

לשוניות:

1. **כללי** — תקציב חודשי, יעד חיסכון (שם + יעד + נצבר).
2. **הוצאות קבועות** — תבניות חוזרות להוצאה.
3. **הכנסות קבועות** — תבניות חוזרות להכנסה.

---

## 5. מודלים ו-enums

### Transaction

```typescript
interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense'
  category: Category
  date: string            // YYYY-MM-DD
  owner: 'me' | 'partner' | 'shared'
  note: string
  created_at: string      // ISO
  linked_savings_id?: string
}
```

### RecurringTransaction

```typescript
interface RecurringTransaction {
  id: string
  amount: number
  type: 'income' | 'expense'
  category: Category
  owner: Owner
  note: string
  day_of_month: number    // 1–28
  active: boolean
}
```

### Budget / Goal

כפי שבשימוש באפליקציה — `Budget` עם `monthly_limit` ו-`category_limits`; `Goal` עם `name`, `target_amount`, `current_amount`.

### SavingsAccount

```typescript
type SavingsType = 'emergency' | 'goal' | 'investment' | 'pension' | 'loan'

interface SavingsAccount {
  id: string
  type: SavingsType
  name: string
  target_amount: number
  current_amount: number
  monthly_amount: number
  interest_rate: number
  note: string
  created_at: string
}
```

### קטגוריות

**הוצאה:** `housing`, `food`, `transport`, `bills`, `fun`, `savings`, `other`  
**הכנסה:** `salary`, `income_other`

### בעלים (Owner)

`me` | `partner` | `shared` — תוויות בעברית ב-`locales/he`.

---

## 6. מסד נתונים ומיגרציות

### טבלאות עיקריות (עקב README/מיגרציות)

- `transactions` — עסקאות; עמודה `linked_savings_id` (אופציונלי) לקישור ל-`savings_accounts`.
- `recurring_transactions`
- `budget_config`
- `savings_goal` (יעד במסך הגדרות; קיים במקביל לחשבונות חיסכון מפורטים)
- `savings_accounts`
- `month_notes`

לפרטים מלאים — קבצי ה-SQL בתיקיית `supabase/migrations/`.

---

## 7. עיצוב, לוקאליזציה ומבנה קבצים

### פורמט ומטבע

- מטבע: ILS, עיצוב עם `Intl.NumberFormat` לפי הלוקאל הפעיל (כיום עברית; לאחר מימוש שפות — ראו [13.6](#136-לוקאליזציה--עברית-ואנגלית)).
- תוויות חודשים/תאריכים לפי המימוש ב-`utils` והלוקאל הנבחר.

### עיצוב (עקרונות)

- צבעי primary / income / expense / משטחים — כפי ב-`index.css` והרכיבים.
- כרטיסים מעוגלים, מרווחים עקביים, ניווט תחתון קבוע.

### מבנה תיקיות (מצב נוכחי)

```
app/
├── _layout.tsx              (root layout — RTL, init, status bar)
└── (tabs)/
    ├── _layout.tsx          (tab navigator with bottom bar)
    ├── index.tsx            (Dashboard — "/")
    ├── add.tsx              (AddTransaction — "/add")
    ├── planning.tsx         (Planning — "/planning")
    └── settings.tsx         (Settings — "/settings")

src/
├── global.css               (Tailwind base imports for NativeWind)
├── locales/he.ts
├── lib/
│   ├── types.ts
│   ├── store.ts             (AsyncStorage + Supabase)
│   ├── supabase.ts
│   ├── utils.ts
│   └── userCategories.ts
└── components/
    ├── BudgetBar.tsx
    ├── SpendingChart.tsx
    ├── CategoryGrid.tsx
    ├── OwnerPicker.tsx
    └── TransactionRow.tsx
```

```
scripts/
├── import-csv.ts
├── verify-import.ts
└── cleanup-transactions.ts
```

---

## 8. ייבוא CSV מ-Riseup

### תהליך

1. לשים את קובץ הייצוא בשורש הפרויקט בשם **`תזרים מרייזאפ.csv`** (כפי שמצופה ב-`scripts/import-csv.ts`).
2. `npm run import-csv`
3. `npm run verify-import`

### מיפוי קטגוריות (Riseup → האפליקציה)

| אפליקציה | Riseup (דוגמאות) |
|----------|------------------|
| Food | סופר, אוכל בחוץ ויציאות (חלק), פחיות וקפה, גימלים |
| Housing | בית, ציוד לבית, משק בית, ניקיון |
| Transport | רכב |
| Bills | חשמל, תקשורת, ביטוח, דיגיטל (מנויים) |
| Fun | מסעדות ובילויים, ספורט ופנאי |
| Other | הלוואות, כללי, תרומות, שיק, תשלומים, משיכות מזומן, עמלות, העברות, בריאות, ביגוד, חינוך, מתנות, הוצאות משתנות, הכנסות קבועות/משתנות, וכו' |

### מיפוי בעלים (אמצעי תשלום → Owner)

- `leumiBank` / `leumicard` → **me**
- `pepperBank` / `cal` / `isracard` → **partner**
- אחר → **shared**

### שדות שנשמרים לכל תנועה

סכום (חיובי), סוג, קטגוריה, תאריך, בעלים, הערה (שם עסק, הערות מקור, תשלומים e.g. "תשלום 3/12").

### תיעוד מריצת ייבוא שבוצע (צילום מצב היסטורי)

המספרים הבאים מתארים ייבוא אחד שבוצע בהצלחה; ריצות עתידיות ישנו סטטיסטיקה.

| מדד | ערך |
|-----|-----|
| סך תנועות בקובץ | ~3,076 |
| נשללו ("מוחרג מהתזרים") | 115 |
| יובאו | 2,961 |
| טווח תאריכים | 30/01/2024 – 28/02/2026 |

**פיננסי (במסד לאחר הייבוא):**

- הכנסות: 279 תנועות, סך כל ההכנסות **₪331,831.87**
- הוצאות: 1,000 תנועות, סך כל ההוצאות **₪121,256.96**
- מאזן כולל (לפי הסיכום): **₪210,574.91**

**פילוח בעלים (אותה ריצה):**

- Me: 466 תנועות; הכנסות ₪75,848.14; הוצאות ₪62,169.04; מאזן +₪13,679.10
- Partner: 534 תנועות; הכנסות ₪37,807.87; הוצאות ₪53,388.33; מאזן −₪15,580.46

**הוצאות לפי קטגוריה (דירוג):** Other, Food, Transport, Bills, Fun (סכומים מפורטים בייבוא המקורי).

### טיפים והערות

- תנועות שסומנו ב-Riseup כ"מוחרג מהתזרים" **לא** יובאו.
- תשלומים מפוצלים מיובאים כתנועות נפרדות; מידע על תשלום X/Y מופיע בהערה.
- לייבוא מחדש: לרוץ `npm run cleanup` ואז `npm run import-csv` (מוחק תנועות — להשתמש בזהירות).

---

## 9. קישור עסקאות לחיסכון והלוואות

תכונה זו מקשרת עסקה לשורה ב-`savings_accounts` דרך `linked_savings_id`, ומעדכנת יתרות דרך `updateSavingsFromTransaction` ב-`src/lib/store.ts`. במחיקת עסקה מקושרת מתבצעת הפיכת השינוי ביתרה (אותה לוגיקה, בכיוון הפוך) לפני מחיקת השורה.

### חשבונות חיסכון (לא הלוואה)

- **הוצאה מקושרת** — מגדילה את `current_amount` (הפקדה לחיסכון).
- **הכנסה מקושרת** — מקטינה את `current_amount` (משיכה מהחיסכון).

### הלוואות (`current_amount` = יתרת חוב נותרת)

- **הוצאה מקושרת** — מקטינה חוב (תשלום).
- **הכנסה מקושרת** — מגדילה חוב (לקיחת הלוואה נוספת).

### שימוש בממשק

- יצירת חשבון במסך **תכנון וחיסכון**.
- ב**הוספת עסקה** — בחירת חשבון ברשימת הקישור; שמירה מעדכנת יתרה.

### מגבלות נוכחיות

- **עריכת עסקה** — מוגבלת (למשל הערה בלבד במקרים מסוימים); לתיקון קישור שגוי: מחיקה והוספה מחדש.

### טכני

- טבלה: `transactions`, עמודה: `linked_savings_id` (טקסט, אופציונלי), FK לוגי ל-`savings_accounts.id`.
- מיגרציה: `004_add_linked_savings.sql`.

---

## 10. סקריפטים (`npm`)

| פקודה | תיאור |
|--------|--------|
| `npm start` | Expo dev server (QR code for Expo Go) |
| `npm run web` | Expo dev server — web browser |
| `npm run ios` | Expo dev server — iOS |
| `npm run import-csv` | ייבוא מ-`תזרים מרייזאפ.csv` |
| `npm run verify-import` | אימות וסטטיסטיקות אחרי ייבוא |
| `npm run cleanup` | מחיקת כל העסקאות מהמסד (Supabase) |

---

## 11. אימות משתמשים והזמנת בן/בת זוג

### זרימה

1. **הרשמה** — משתמש חדש נרשם עם email + password דרך Supabase Auth. בעת הרשמה נוצר **household** חדש ופרופיל (`profiles`) שמקושר אליו.
2. **הזמנת בן/בת זוג** — המשתמש יוצר **invitation** עם כתובת email של בן/בת הזוג. ההזמנה נשמרת בטבלת `invitations` עם סטטוס `pending`.
3. **הצטרפות (משתמש חדש)** — בן/בת הזוג נרשם/ת עם אותו email שאליו נשלחה ההזמנה. בהרשמה, המערכת מזהה שיש הזמנה פתוחה ומצרפת את המשתמש החדש ל-household הקיים (במקום ליצור חדש).
4. **הצטרפות (משתמש קיים)** — אם לבן/בת הזוג כבר יש חשבון קיים עם household משלו, הוא/היא מתחברים ורואים בלשונית **חשבון** → **הזמנות ממתינות** כרטיס עם כפתור **קבלת הזמנה**. לחיצה על הכפתור מעדכנת את הפרופיל שלהם ל-household המזמין ומסמנת את ההזמנה כ-`accepted`.
5. **התחברות** — email + password. Session נשמר ב-AsyncStorage (secure storage של Supabase).

### טבלאות חדשות

- `households` — `id` (uuid, PK), `created_at`
- `profiles` — `id` (uuid, PK, FK → auth.users.id), `household_id` (FK → households.id), `display_name`, `role` ('owner'|'partner'), `created_at`
- `invitations` — `id` (uuid, PK), `household_id` (FK), `invited_by` (FK → profiles.id), `email`, `status` ('pending'|'accepted'|'expired'), `created_at`

### שינויים בטבלאות קיימות

- כל הטבלאות מקבלות עמודה `household_id` (FK → households.id), ברירת מחדל NULL (לתאימות אחורה).
- RLS policies מתעדכנות: משתמש מאומת רואה רק שורות ששייכות ל-household שלו.

### מסכי Auth

- **Login** — email + password, אפשרות הצגת/הסתרת סיסמה (toggle), לינק ל-Register
- **Register** — display name + email + password, אפשרות הצגת/הסתרת סיסמה (toggle), לינק ל-Login
- **Invite Partner** — טופס שמופיע במסך ההגדרות (שולח invite)

### Routing

- אם אין session → מסך Login/Register
- אם יש session → מסכי האפליקציה (tabs)

---

## 12. שיקולים עתידיים

- יצירה אוטומטית של עסקאות מתשלומים חוזרים בתחילת חודש.
- מגבולות תקציב לפי קטגוריה (מודל קיים חלקית).
- ייצוא/ייבוא JSON גיבוי.
- PWA (אופליין, התקנה).
- מטבעות מרובים.
- דף אנליטיקה (מגמות, השוואת חודשים).
- קטגוריות מותאמות אישית.
- חיפוש טקסט חופשי בהערות.
- עריכה מלאה של עסקאות קיימות.

---

## 13. תוכנית השקה לחנות האפליקציות (App Store)

מסמך זה משלים את סעיפים [1](#1-סקירה-ומטרה)–[12](#12-שיקולים-עתידיים) ומגדיר **מה חייב להסתיים** לפני פרסום ב-**Apple App Store** (ובהמשך ניתן להרחיב ל-Google Play באותה בסיס).  
**עקרון:** אין מימוש קוד במסמך זה — רק דרישות, תלויות, וקריטריוני קבלה. כל תכונה חדשה שמופיעה כאן נכנסת למקור האמת הזה ודורשת עדכון PRD לפני פיתוח (ראו [כללי שינוי](#1312-ניהול-שינויים-במסמך-הדרישות)).

### 13.1 יעדים ותוצרים

| יעד | תיאור |
|-----|--------|
| בטיחות ופרטיות | סודות לא בקוד; RLS ומדיניות Supabase מלאה; מסמכי פרטיות/תנאים בהתאם לשימוש בנתונים ובפרסום |
| מונטיזציה | מנוי **Premium** (ללא פרסומות + יתרונות מוגדרים); משתמשים שאינם Premium רואים **פרסומות** במיקומים מוגדרים |
| איכות | סגירת **באגים קריטיים** (קריסות, אובדן נתונים, סינכרון שגוי, Auth) לפני שליחה לבדיקה |
| ארכיטקטורה | שכבות ברורות (UI / use cases / גישה לנתונים) בלי "ביג באנג" — ראו [13.5](#135-clean-architecture-מומלץ-לפרויקט) |
| שפות | מעבר **עברית ⟷ אנגלית** לכל מחרוזות ה-UI (מטבע/פורמט מספרים לפי לוקאל נבחר) |
| אספקה | **CI/CD** עם בדיקות אוטומטיות, ניתוח סטטי/איכות (**Sonar** או שווה ערך), סריקת תלויות (**Snyk**), ובניית גרסאות (מומלץ: **EAS Build** ל-Expo) |

### 13.2 רשימת בדיקה — App Store (אפל)

| תחום | משימות |
|------|--------|
| חשבון מפתח | Apple Developer Program; יצירת מזהה אפליקציה (Bundle ID) עקבי עם `app.json` / EAS |
| חתימה והפצה | פרופילי Provisioning; **EAS Submit** או העלאה ידנית ל-App Store Connect; הגדרת **App Store Connect API Key** ל-CI אם רלוונטי |
| מטא-דאטה | שם תצוגה, תיאור, מילות מפתח, קטגוריה, גיל מינימלי, מדיניות פרטיות (URL), תמיכה (אימייל/אתר) |
| נכסים | אייקון 1024×1024; צילומי מסך לכל גודל נדרש; וידאו אופציונלי |
| הרשאות | כל שימוש במצלמה/מיקום/התראות/מעקב — טקסטי `Info.plist` מדויקים (לא סתם placeholders) |
| מעקב ופרסום | אם יש פרסומות או מדיה חיצונית — **App Tracking Transparency (ATT)** ומילוי שאלון הפרטיות ב-App Store Connect בהתאם |
| בדיקה | TestFlight לפני production; רשימת מכשירים מינימלית (דגמי iOS נתמכים) |
| עמידה בהנחיות | [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — במיוחד ניהול חשבון, מנויים, פרסום, ונתונים פיננסיים |

### 13.3 אבטחה

| נושא | דרישה |
|------|--------|
| סודות | אין מפתחות Supabase או API בסיס קוד; שימוש ב-`.env` / משתני CI מוצפנים; מפתחות publishable בלבד בלקוח כפי שמוגדר היום |
| אחסון מקומי | בדיקה ש-Session/טוקנים דרך Supabase עומדים בהמלצות (למשל secure storage היכן שרלוונטי לפלטפורמה) |
| רשת | `https` בלבד; אימות תעודות כברירת מחדל; אין לוגים עם PII ב-production |
| Supabase | **RLS** על כל הטבלאות הרלוונטיות; מדיניות מבוססת `household_id` + `auth.uid()`; ביקורת מדיניות invitations |
| תלויות | סריקת CVE (Snyk) ב-PR ובשחרור; תיקון או החרגה מתועדת |
| אימות | הגנה מפני הרשמה חוזרת לשליחת spam invites; rate limiting בצד שרת אם נדרש (Edge Functions / Supabase) |

### 13.4 Premium ופרסומות (לא-Premium)

**הגדרת מוצר (לעדכון לפני פיתוח):**

- **Premium:** מנוי (חודשי/שנתי) דרך **StoreKit** (iOS). יתרונות מוצעים: ללא פרסומות, ואופציונלי תכונות עתידיות שייפורטו כאן לפני מימוש.
- **לא-Premium:** הצגת יחידות פרסום (banner/native לפי SDK שנבחר) במסכים שיוגדרו (למשל אחרי טעינת דשבורד / בתחתית רשימה) — **בלי** לחסום זרימות קריטיות (הוספת עסקה, התחברות).

| משימה | קריטריון קבלה |
|--------|----------------|
| שילוב IAP | רכישה, שחזור רכישות, מנוי פעיל/לא, טיפול בשגיאות רשת |
| שילוב Ads SDK | טעינה עצלה; כיבוי מלא כש-Premium פעיל; אין קריסות בגלל מודעות |
| שרת/DB | שדה או טבלה ל-`premium_until` / סטטוס מנוי מסונכרן עם קבלה מאפל (או אימות Edge) — למניעת רמאות בסיסי |
| תאימות App Store | תיאור מנוי, מחיר, ביטול — בהתאם להנחיות מנויים וחשבונות |

*הערה טכנית:* ב-Expo נדרשות often **config plugins** או build מותאם ל-native modules של IAP/Ads — יש לתעד את הבחירה בפרויקט לפני יישום.

### 13.5 Clean Architecture — מומלץ לפרויקט

לא חובה "קטגוריות" מלאות כמו ב-Android טהור, אבל **כן** מומלץ לפני/במקביל להשקה:

| שכבה | תוכן |
|------|------|
| **Presentation** | מסכים (`app/`), רכיבים (`src/components/`), hooks דקים |
| **Application** | מקרי שימוש (למשל "הוסף עסקה", "סנכרן household") — פונקציות טהורות שמתארחות ב-store או בשירות נפרד |
| **Domain** | טיפוסים (`src/lib/types.ts`), כללי ולידציה שאינם תלויים ב-UI |
| **Data** | `store.ts`, קריאות Supabase, מיגרציות — ממשקים ברורים כדי לא לערבב לוגיקה במסכים |

**סף:** אין ריפקטור מלא חובה לשחרור ראשון; חובה **לא** להוסיף לוגיקה עסקית חדשה ישירות במסכים ללא שכבת שירות/פונקציה משותפת.

### 13.6 לוקאליזציה — עברית ואנגלית

| דרישה | פירוט |
|--------|--------|
| מקור מחרוזות | כל הטקסטים מ-`src/locales/he.ts` (וקובץ `en.ts` חדש) או מערכת i18n (למשל `i18n-js`) — **אין** מחרוזות קשיחות במסכים |
| החלפת שפה | בורר בהגדרות; שמירה ב-AsyncStorage; טעינה באתחול ב-`_layout` |
| כיוון | תמיכה ב-RTL לעברית ו-LTR לאנגלית (כבר קיים בסיס RTL — לוודא מעבר חלק) |
| מספרים ותאריכים | `Intl` לפי לוקאל נבחר (`he-IL` / `en-US` או `en-IL`) |
| בדיקות | Snapshot או בדיקות smoke לשני הלוקאלים ב-CI |

### 13.7 באגים קריטיים — תהליך סגירה

לפני הגשה ל-App Store:

1. **רישום** — כל באג עם עדיפות (P0 קריטי = קריסה, אובדן נתונים, דליפה בין משקי בית, כשל Auth).
2. **אימות** — שחזור על מכשיר אמיתי + Supabase.
3. **סגירה** — P0 = אפס לפני שליחה לבדיקה; P1 = לפי החלטת מוצר (מומלץ לסגור לפני V1).

המגבלות המתועדות ב-[סעיף 9](#9-קישור-עסקאות-לחיסכון-והלוואות) (למשל עריכת עסקה מקושרת) — אם נשארות, יש להציג הודעת UI ברורה או לתקן לפני השקה.

### 13.8 CI/CD ובדיקות אוטומטיות

| רכיב | דרישה |
|------|--------|
| **Pipeline** | GitHub Actions (או שווה ערך): על כל PR — `npm ci`, TypeScript (`tsc --noEmit`), לינטר (ESLint לאחר הוספה), בדיקות יחידה |
| **SonarCloud** (או SonarQube) | ניתוח איכות קוד, כפילויות, חולשות אבטחה בסיסיות; חסימת PR אם איכות מתחת לסף שיוגדר |
| **Snyk** | `snyk test` / אינטגרציה ל-repo; סריקת תלויות; דוח ב-PR |
| **EAS** | פרופילי `preview` / `production`; build מספרי; תיוג גרסאות ב-Git |
| **חתימה iOS** | אישורי Apple ב-EAS Credentials; לא שמירת סיסמאות ב-repo |

בדיקות E2E (אופציונלי ל-V1, מומלץ לאחר מכן): Maestro או Detox למסלולי Login → דשבורד → הוספת עסקה.

### 13.9 מסמכים משפטיים ותמיכה

- **מדיניות פרטיות** — מה נאסף (נתוני תקציב, מזהים, פרסום), מי מעבד (Supabase, ספק פרסום), זכויות משתמש.
- **תנאי שימוש** — הגבלת אחריות, מנויים, ביטולים.
- **דף תמיכה / אימייל** — כפי שיופיע ב-App Store Connect.

### 13.10 סדר ביצוע מוצע (פאזות)

| פאזה | תוכן |
|------|------|
| **A — בסיס השקה** | בדיקות אוטומטיות מינימליות, ESLint+tsc ב-CI, Snyk, Sonar; סגירת P0; i18n HE/EN |
| **B — מונטיזציה** | StoreKit + מצב Premium; Ads ללא-Premium; בדיקות TestFlight |
| **C — חנות** | נכסים, מטא-דאטה, פרטיות, ATT אם נדרש; הגשה לבדיקת אפל |
| **D — אחרי V1** | E2E, הרחבת כיסוי בדיקות, אופטימיזציות ארכיטקטורה |

### 13.11 הגדרת "מוכן לחנות" (Definition of Done)

- [ ] אין באגי P0 פתוחים  
- [ ] CI ירוק: בנייה, tsc, לינט, Snyk ללא חומרה קריטית (או החרגות מאושרות)  
- [ ] Sonar עומד בסף הפרויקט  
- [ ] Premium + פרסומות מתנהגים לפי סעיף [13.4](#134-premium-ופרסומות-לא-premium)  
- [ ] עברית ואנגלית נבדקות ידנית  
- [ ] מדיניות פרטיות ותנאים זמינים ב-URL  
- [ ] גרסה ב-TestFlight עברה "מסלול משתמש" מלא לפחות פעם אחת  

### 13.12 ניהול שינויים במסמך הדרישות

כל תוספת היקפית (תכונות Premium נוספות, שינוי מדיניות פרסום, שינוי זרימת Auth) תתועד **במסמך זה** לפני מימוש בקוד, בהתאם לכללי הפרויקט.

---

*מסמך זה מרכז את תוכן `README.md`, `IMPORT_SUMMARY.md`, ו-`docs/SAVINGS_LINKING.md` שהוסרו. סעיף [13](#13-תוכנית-השקה-לחנות-האפליקציות-app-store) נוסף כתוכנית השקה ומוזג למקור האמת.*
