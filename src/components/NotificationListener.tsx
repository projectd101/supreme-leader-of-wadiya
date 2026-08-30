"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

type Notification = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

/**
 * Subscribes to real-time INSERTs on the notifications table for the
 * logged-in user only (RLS already restricts reads to auth.uid() = user_id,
 * and Realtime respects RLS on Postgres Changes subscriptions).
 */
export default function NotificationListener() {
  const [toast, setToast] = useState<Notification | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;

      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setToast(payload.new as Notification);
            // Auto-dismiss after a few seconds
            setTimeout(() => setToast(null), 6000);
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  if (!toast) return null;

  const message =
    toast.type === "dethroned"
      ? "You've been dethroned. Someone paid more for your seat."
      : toast.type === "seat_won"
        ? "You now sit on the throne."
        : "Something happened to your seat.";

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1c1712] border border-[#d4af37] text-[#ede6d6] px-5 py-3 rounded-lg shadow-lg text-sm max-w-sm text-center"
    >
      {message}
    </div>
  );
}
