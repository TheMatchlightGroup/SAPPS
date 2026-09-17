import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null) // row from public.users
  const [loading, setLoading] = useState(true)

  // The user id whose profile is currently loaded — lets us skip redundant
  // reloads when auth events fire for the same signed-in user (e.g.
  // TOKEN_REFRESHED), which otherwise happen constantly.
  const loadedUserId = useRef(null)

  // Load the caller's profile row; create it (as examiner) if it doesn't
  // exist yet. This replaces the auth.users trigger — profile creation now
  // happens here, on sign-in, where errors are visible.
  const loadProfile = useCallback(async (user) => {
    if (!user) {
      loadedUserId.current = null
      setProfile(null)
      return
    }

    // maybeSingle() returns null (no error) when the row doesn't exist yet.
    let { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, active, must_change_password')
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
        .select('id, name, email, role, active, must_change_password')
        .eq('id', user.id)
        .single()
      data = res.data
    }

    loadedUserId.current = data ? user.id : null
    setProfile(data ?? null)
  }, [])

  useEffect(() => {
    let active = true

    // Initial boot: read the stored session, then load the profile.
    // `finally` guarantees the loading screen always clears, even if the
    // profile read fails — a network hiccup should degrade, not strand.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      loadProfile(data.session?.user).finally(() => {
        if (active) setLoading(false)
      })
    })

    // IMPORTANT: supabase-js holds an internal auth lock while it runs this
    // callback. Awaiting a Supabase query in here (the query needs that same
    // lock to fetch the access token) deadlocks the client — the classic
    // "app hangs on Loading… until you refresh" bug. So: do synchronous
    // state updates only, and defer any data fetching out of the callback
    // with setTimeout so the lock is released first.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)

      const uid = newSession?.user?.id ?? null
      if (uid === loadedUserId.current) return // same user; token refresh etc.

      setTimeout(() => {
        if (active) loadProfile(newSession?.user)
      }, 0)
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

  // Change the signed-in user's password. On success, clear the temp-password
  // flag on their profile row (via a security-definer RPC — users can't update
  // their own row directly) and reflect it locally so the banner disappears.
  const updatePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: error.message }
    const { error: rpcErr } = await supabase.rpc('complete_password_change')
    if (rpcErr) console.warn('Could not clear must_change_password flag:', rpcErr.message)
    setProfile((p) => (p ? { ...p, must_change_password: false } : p))
    return { error: null }
  }, [])

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
    updatePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
