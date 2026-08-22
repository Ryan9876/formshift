import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const WEB_AUTH_RETURN_KEY = 'formshift:web-auth-return';

export const supabase = url && key ? createClient(url, key, {
  auth: {
    ...(Platform.OS === 'web' ? {} : { storage: AsyncStorage }),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web'
  }
}) : null;

type AuthState = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  access: 'unknown' | 'pending' | 'active' | 'suspended' | 'revoked';
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [access, setAccess] = useState<AuthState['access']>('unknown');
  const [authError, setAuthError] = useState<string | null>(null);
  const bootstrapAttemptedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); }).catch(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false); });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !session || typeof window === 'undefined') return;
    const pending = window.sessionStorage.getItem(WEB_AUTH_RETURN_KEY);
    if (!pending) return;
    window.sessionStorage.removeItem(WEB_AUTH_RETURN_KEY);
    const current = `${window.location.pathname}${window.location.search}`;
    if (pending !== current) window.location.replace(pending);
  }, [session]);

  useEffect(() => {
    if (!supabase || !session) { setAccess('unknown'); bootstrapAttemptedFor.current = null; return; }
    let cancelled = false;
    const refreshAccess = async () => {
      const { data, error } = await supabase.from('account_access').select('status').eq('user_id', session.user.id).maybeSingle();
      let next = error || !data ? 'pending' : data.status as AuthState['access'];
      if (next === 'pending' && bootstrapAttemptedFor.current !== session.user.id) {
        bootstrapAttemptedFor.current = session.user.id;
        const { error: bootstrapError } = await supabase.rpc('bootstrap_formshift_owner');
        if (!bootstrapError) {
          const refreshed = await supabase.from('account_access').select('status').eq('user_id', session.user.id).maybeSingle();
          if (!refreshed.error && refreshed.data) next = refreshed.data.status as AuthState['access'];
        }
      }
      if (!cancelled) setAccess(next);
    };
    void refreshAccess();
    return () => { cancelled = true; };
  }, [session]);

  const value = useMemo<AuthState>(() => ({
    configured: !!supabase,
    loading,
    session,
    access,
    error: authError,
    signInWithGoogle: async () => {
      setAuthError(null);
      if (!supabase) { const error = new Error('Supabase is not configured'); setAuthError(error.message); throw error; }
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.sessionStorage.setItem(WEB_AUTH_RETURN_KEY, currentWebReturnPath());
        }
        const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined' ? `${window.location.origin}/` : Linking.createURL('/');
        const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' } });
        if (error) throw error;
        if (Platform.OS !== 'web' && data.url) {
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
          if (result.type === 'success' && result.url) {
            const parsed = new URL(result.url);
            const fragment = new URLSearchParams(parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash);
            const errorDescription = parsed.searchParams.get('error_description') ?? fragment.get('error_description');
            if (errorDescription) throw new Error(errorDescription);

            const code = parsed.searchParams.get('code');
            if (code) {
              const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
              if (exchangeError) throw exchangeError;
            } else {
              const accessToken = parsed.searchParams.get('access_token') ?? fragment.get('access_token');
              const refreshToken = parsed.searchParams.get('refresh_token') ?? fragment.get('refresh_token');
              if (!accessToken || !refreshToken) throw new Error('Google sign-in returned without a usable FormShift session.');
              const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
              if (sessionError) throw sessionError;
            }
          }
        }
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : 'Authentication failed');
        throw error;
      }
    },
    signOut: async () => { setAuthError(null); if (supabase) await supabase.auth.signOut(); }
  }), [access, authError, loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function currentWebReturnPath() {
  if (typeof window === 'undefined') return '/';
  const params = new URLSearchParams(window.location.search);
  for (const key of ['_vercel_share', 'code', 'error', 'error_code', 'error_description']) params.delete(key);
  const search = params.toString();
  return `${window.location.pathname}${search ? `?${search}` : ''}`;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be within AuthProvider');
  return value;
}
