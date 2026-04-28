'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const OWNER_EMAIL = 'garrick@gamesqlaw.com';

function isOwnerEmail(email?: string | null) {
  return email?.toLowerCase() === OWNER_EMAIL;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;

    const timeout = window.setTimeout(() => {
      if (!mounted) return;
      setLoading(false);
      setMessage('Session check timed out. You can sign in again below.');
    }, 4000);

    async function loadSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) {
          setAuthed(false);
          setMessage(error.message);
        } else if (data.session && isOwnerEmail(data.session.user.email)) {
          setAuthed(true);
        } else if (data.session) {
          setAuthed(false);
          setMessage('This Mission Control account is restricted to Garrick’s GAMESQ login.');
          await supabase.auth.signOut();
        } else {
          setAuthed(false);
        }
      } catch (error) {
        if (!mounted) return;
        setAuthed(false);
        setMessage(error instanceof Error ? error.message : 'Unable to check session.');
      } finally {
        if (mounted) {
          window.clearTimeout(timeout);
          setLoading(false);
        }
      }
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session && isOwnerEmail(session.user.email)) {
        setAuthed(true);
        setMessage('');
      } else {
        setAuthed(false);
        if (session) {
          setMessage('This Mission Control account is restricted to Garrick’s GAMESQ login.');
          void supabase.auth.signOut();
        }
      }
      setLoading(false);
      window.clearTimeout(timeout);
    });

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn() {
    setMessage('');
    if (!isOwnerEmail(email)) {
      setMessage('Use garrick@gamesqlaw.com for Mission Control.');
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage('Check your email for the sign-in link.');
  }

  async function signOut() {
    await supabase.auth.signOut();
    setAuthed(false);
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-white/70">Loading Mission Control…</div>;
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-8">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur">
          <p className="text-sm uppercase tracking-[0.32em] text-gam-peach">GAMESQ, PLC</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Mission Control Sign-In</h1>
          <p className="mt-3 text-sm text-white/65">Use Garrick’s GAMESQ email so the app gate and Supabase policies both restrict Mission Control to the owner account.</p>
          <div className="mt-5 space-y-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="garrick@gamesqlaw.com"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
            />
            <button onClick={signIn} className="w-full rounded-2xl bg-gam-orange px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110">
              Email me a sign-in link
            </button>
            {message ? <p className="text-sm text-white/65">{message}</p> : null}
          </div>
        </div>
      </main>
    );
  }

  return (
    <div>
      <div className="flex justify-end px-6 pt-4">
        <button onClick={signOut} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/70">
          Sign out
        </button>
      </div>
      {children}
    </div>
  );
}
