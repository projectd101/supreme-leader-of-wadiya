"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export default function AuthButton() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    // Keep this in sync if the user signs in/out in another tab, or the
    // session refreshes.
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  if (loading) {
    return (
      <div
        className="w-24 h-9 rounded-sm animate-pulse"
        style={{ background: "#1c1006" }}
        aria-hidden
      />
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span
          className="text-sm hidden sm:inline"
          style={{ color: "var(--parchment-dim)" }}
        >
          {user.user_metadata?.full_name ?? user.email}
        </span>
        <button
          onClick={signOut}
          className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-sm transition-colors"
          style={{ color: "var(--gold)", border: "1px solid var(--gold-dim)" }}
        >
          Step down
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={signInWithGoogle}
      className="text-xs uppercase tracking-widest px-4 py-2 rounded-sm font-bold transition-colors hover:opacity-80"
      style={{
        color: "var(--void)",
        background: "var(--gold)",
      }}
    >
      Enter the Palace
    </button>
  );
}
