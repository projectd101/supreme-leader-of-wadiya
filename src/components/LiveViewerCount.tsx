"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

/**
 * Shows how many browser tabs are actually connected right now, using
 * Supabase Realtime Presence. This is a REAL count, not a simulated one —
 * see the product discussion: fake activity/viewer numbers are a deceptive
 * pattern we deliberately avoided. On a quiet day this will honestly show
 * a low number, and that's fine — it climbs for real once there's real
 * traffic.
 */
export default function LiveViewerCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Every tab gets a random-ish key so the same person with two tabs open
    // counts as one presence per tab (arguably fine — "2 tabs watching" is
    // still an honest signal of activity, not a fabricated one).
    const channel = supabase.channel("throne-room", {
      config: { presence: { key: crypto.randomUUID() } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const total = Object.values(state).reduce(
          (sum, entries) => sum + entries.length,
          0
        );
        setCount(total);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <p
      className="text-[10px] tracking-[0.3em] uppercase flex items-center justify-center gap-2"
      style={{ color: "var(--gold-dim)" }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ background: "var(--ember-bright)" }}
        aria-hidden
      />
      {count === null ? "Connecting…" : `${count} watching the throne now`}
    </p>
  );
}
