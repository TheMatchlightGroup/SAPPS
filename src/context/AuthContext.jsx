import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null) // row from public.users
  const [loading, setLoading] = useState(true)

  // Load the caller's profile row; create it (as examiner) if it doesn't
  // exist yet. This replaces the auth.users trigger — profile creation now
  // happens here, on sign-in, where errors are visible.
  const loadProfile = useCallback(async (user) => {
    if (!user) {
      setProfile(null)
      return
    }

    // maybeSingle() returns null (no error) when the row doesn't exist yet.
    let { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, active')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Could not read profile row:', error.message)
      setProfile(null)
      return
    }

    if (!data) {
      // No profile yet — create one. Role defaults to 'examiner' in the DB,
      // which satisfies the self-insert policy. Never overwrites an existing
      // row, so admin roles set by hand are safe.
      const { error: insErr } = await supabase.from('users').insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email,
      })
      if (insErr) {
        console.error('Could not create profile row:', insErr.message)
        setProfile(null)
        return
      }
      const res = await supabase
        .from('users')
        .select('id, name, email, role, active')
        .eq('id', user.id)
        .single()
      data = res.data
    }

    setProfile(data ?? null)
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session?.user)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      await loadProfile(newSession?.user)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp = (email, password, name) =>
    supabase.auth.signUp({ email, password, options: { data: { name } } })

  const signOut = () => supabase.auth.signOut()

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
