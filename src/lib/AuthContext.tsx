import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabase, isMissingTableError, isSupabaseConfigured } from './supabase'

const SUPABASE_AUTH_MIGRATION_REQUIRED = 'SUPABASE_AUTH_MIGRATION_REQUIRED'

export interface Profile {
  id: string
  household_id: string
  display_name: string
  role: 'owner' | 'partner'
}

interface AuthState {
  loading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  householdId: string | null
}

interface AuthContextValue extends AuthState {
  signUp: (email: string, password: string, displayName: string) => Promise<{ error?: string }>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  acceptInvitation: (householdId: string) => Promise<{ error?: string }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

function randomUuid(): string {
  const c = globalThis.crypto
  if (c?.randomUUID) return c.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0
    const v = ch === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (isMissingTableError(error)) return null
  if (error || !data) return null
  return {
    id: data.id,
    household_id: data.household_id,
    display_name: data.display_name,
    role: data.role,
  }
}

async function findPendingInvitation(email: string): Promise<{ household_id: string } | null> {
  const { data, error } = await getSupabase()
    .from('invitations')
    .select('household_id')
    .eq('email', email.toLowerCase().trim())
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle()
  if (isMissingTableError(error)) return null
  if (error || !data) return null
  return { household_id: data.household_id }
}

async function createHouseholdAndProfile(userId: string, displayName: string): Promise<Profile> {
  const sb = getSupabase()
  const householdId = randomUuid()
  // Do not chain .select() after insert: PostgREST RETURNING runs SELECT policies, and
  // households_select_own requires get_my_household_id() which is null until profiles exists.
  const { error: hErr } = await sb.from('households').insert({ id: householdId })
  if (hErr) {
    if (isMissingTableError(hErr)) throw new Error(SUPABASE_AUTH_MIGRATION_REQUIRED)
    throw new Error(hErr.message ?? 'Failed to create household')
  }

  const profile: Profile = {
    id: userId,
    household_id: householdId,
    display_name: displayName,
    role: 'owner',
  }
  const { error: pErr } = await sb.from('profiles').insert(profile)
  if (pErr) {
    if (isMissingTableError(pErr)) throw new Error(SUPABASE_AUTH_MIGRATION_REQUIRED)
    throw new Error(pErr.message)
  }
  return profile
}

function defaultDisplayNameFromUser(user: User): string {
  const meta = user.user_metadata?.display_name
  if (typeof meta === 'string' && meta.trim()) return meta.trim()
  const email = user.email ?? ''
  const local = email.split('@')[0]
  return local?.trim() || 'User'
}

/** Creates household + profile (or joins via invitation) when auth exists but profile row is missing. */
async function ensureProfileForUser(user: User): Promise<Profile | null> {
  const existing = await fetchProfile(user.id)
  if (existing) return existing

  const email = user.email ?? ''
  try {
    const invitation = email ? await findPendingInvitation(email) : null
    if (invitation) {
      return await joinHouseholdAsPartner(
        user.id,
        invitation.household_id,
        defaultDisplayNameFromUser(user),
        email
      )
    }
    return await createHouseholdAndProfile(user.id, defaultDisplayNameFromUser(user))
  } catch (e) {
    console.error('ensureProfileForUser failed', e)
    return null
  }
}

async function joinHouseholdAsPartner(
  userId: string,
  householdId: string,
  displayName: string,
  email: string
): Promise<Profile> {
  const sb = getSupabase()
  const profile: Profile = {
    id: userId,
    household_id: householdId,
    display_name: displayName,
    role: 'partner',
  }
  const { error: pErr } = await sb.from('profiles').insert(profile)
  if (pErr) {
    if (isMissingTableError(pErr)) throw new Error(SUPABASE_AUTH_MIGRATION_REQUIRED)
    throw new Error(pErr.message)
  }

  const { error: invErr } = await sb
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('email', email.toLowerCase().trim())
    .eq('household_id', householdId)
    .eq('status', 'pending')
  if (invErr && !isMissingTableError(invErr)) throw new Error(invErr.message)

  return profile
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    loading: true,
    session: null,
    user: null,
    profile: null,
    householdId: null,
  })

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState((s) => ({ ...s, loading: false }))
      return
    }
    const sb = getSupabase()

    const applySession = async (session: Session | null) => {
      try {
        if (session?.user) {
          let profile = await fetchProfile(session.user.id)
          if (!profile) {
            profile = await ensureProfileForUser(session.user)
          }
          setState({
            loading: false,
            session,
            user: session.user,
            profile,
            householdId: profile?.household_id ?? null,
          })
        } else {
          setState({ loading: false, session: null, user: null, profile: null, householdId: null })
        }
      } catch (e) {
        console.error('Auth bootstrap failed', e)
        setState({ loading: false, session: null, user: null, profile: null, householdId: null })
      }
    }

    sb.auth
      .getSession()
      .then(({ data: { session } }) => applySession(session))
      .catch((e) => {
        console.error('getSession failed', e)
        setState({ loading: false, session: null, user: null, profile: null, householdId: null })
      })

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      void applySession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const refreshProfile = async () => {
    if (!state.user) return
    const profile = await fetchProfile(state.user.id)
    setState((s) => ({
      ...s,
      profile,
      householdId: profile?.household_id ?? null,
    }))
  }

  /**
   * Accepts a pending invitation for the currently logged-in user.
   * Works even when the user already has a profile (with their own household).
   * Moves the user's profile to the invited household and marks the invitation as accepted.
   */
  const acceptInvitation = async (householdId: string): Promise<{ error?: string }> => {
    if (!state.user || !state.user.email) return { error: 'genericError' }
    const sb = getSupabase()
    const email = state.user.email.toLowerCase().trim()
    try {
      if (state.profile) {
        const { error: updateErr } = await sb
          .from('profiles')
          .update({ household_id: householdId, role: 'partner' })
          .eq('id', state.user.id)
        if (updateErr) throw new Error(updateErr.message)
      } else {
        const profile: Profile = {
          id: state.user.id,
          household_id: householdId,
          display_name: defaultDisplayNameFromUser(state.user),
          role: 'partner',
        }
        const { error: insertErr } = await sb.from('profiles').insert(profile)
        if (insertErr) throw new Error(insertErr.message)
      }

      const { error: invErr } = await sb
        .from('invitations')
        .update({ status: 'accepted' })
        .eq('email', email)
        .eq('household_id', householdId)
        .eq('status', 'pending')
      if (invErr && !isMissingTableError(invErr)) throw new Error(invErr.message)

      const profile = await fetchProfile(state.user.id)
      setState((s) => ({
        ...s,
        profile,
        householdId: profile?.household_id ?? null,
      }))
      return {}
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'genericError'
      return { error: msg }
    }
  }

  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<{ error?: string }> => {
    try {
      const sb = getSupabase()
      // Resolve invitation before signUp while the client may still be anon; after signUp the session
      // is authenticated and invitations_select_household does not match until profiles exists.
      const invitation = await findPendingInvitation(email)

      const { data, error } = await sb.auth.signUp({ email, password })
      if (error) {
        if (error.message.includes('already registered')) return { error: 'emailAlreadyUsed' }
        return { error: error.message }
      }
      if (!data.user) return { error: 'genericError' }

      let profile: Profile
      if (invitation) {
        profile = await joinHouseholdAsPartner(
          data.user.id,
          invitation.household_id,
          displayName,
          email
        )
      } else {
        profile = await createHouseholdAndProfile(data.user.id, displayName)
      }

      setState({
        loading: false,
        session: data.session,
        user: data.user,
        profile,
        householdId: profile.household_id,
      })
      return {}
    } catch (e: unknown) {
      if (e instanceof Error && e.message === SUPABASE_AUTH_MIGRATION_REQUIRED) {
        return { error: 'supabaseMigrationRequired' }
      }
      const msg = e instanceof Error ? e.message : 'genericError'
      return { error: msg }
    }
  }

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error?: string }> => {
    try {
      const sb = getSupabase()
      const { data, error } = await sb.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('Invalid login')) return { error: 'invalidCredentials' }
        // Hosted Supabase often requires email confirmation; GoTrue returns 422 + email_not_confirmed.
        const code = 'code' in error ? (error as { code?: string }).code : undefined
        if (code === 'email_not_confirmed') return { error: 'emailNotConfirmed' }
        if (/not confirmed/i.test(error.message)) return { error: 'emailNotConfirmed' }
        return { error: error.message }
      }
      return {}
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'genericError'
      return { error: msg }
    }
  }

  const signOut = async () => {
    await getSupabase().auth.signOut()
    setState({ loading: false, session: null, user: null, profile: null, householdId: null })
  }

  return (
    <AuthContext.Provider value={{ ...state, signUp, signIn, signOut, refreshProfile, acceptInvitation }}>
      {children}
    </AuthContext.Provider>
  )
}
