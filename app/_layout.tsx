import { useEffect } from 'react'
import { I18nManager, ActivityIndicator, View, StyleSheet } from 'react-native'
import { Slot, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { migrateLocalToSupabaseIfNeeded, syncStaleLocalDataToSupabase, setActiveHouseholdId } from '../src/lib/store'
import { initUserCategories } from '../src/lib/userCategories'
import { AuthProvider, useAuth } from '../src/lib/AuthContext'
import { isSupabaseConfigured } from '../src/lib/supabase'
import { colors } from '../src/lib/theme'

function RootGate() {
  const { loading, session, profile, householdId } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    setActiveHouseholdId(householdId)
    if (householdId) {
      ;(async () => {
        await migrateLocalToSupabaseIfNeeded()
        await syncStaleLocalDataToSupabase()
      })().catch(console.error)
    }
  }, [householdId])

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!isSupabaseConfigured()) {
      if (inAuthGroup) router.replace('/(tabs)')
      return
    }

    if (!session || !profile) {
      if (!inAuthGroup) router.replace('/(auth)/login')
    } else {
      if (inAuthGroup) router.replace('/(tabs)')
    }
  }, [loading, session, profile, segments])

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return <Slot />
}

export default function RootLayout() {
  useEffect(() => {
    if (!I18nManager.isRTL) {
      I18nManager.allowRTL(true)
      I18nManager.forceRTL(true)
    }
  }, [])

  useEffect(() => {
    initUserCategories().catch(console.error)
  }, [])

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootGate />
    </AuthProvider>
  )
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
})
