"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import ClaimModal from "./ClaimModal";

type Seat = {
  id: string;
  display_rank: number;
  seat_role: "supreme_leader" | "queen";
  is_dethronable: boolean;
  current_price_cents: number;
  current_price_currency: string;
  is_default_occupant: boolean;
  current_character_image_id: string | null;
};

const MIN_INCREMENT_CENTS = 100;
const MIN_INCREMENT_PERCENT = 0.1;

function minBidFor(currentPriceCents: number) {
  return Math.max(
    currentPriceCents + MIN_INCREMENT_CENTS,
    Math.ceil(currentPriceCents * (1 + MIN_INCREMENT_PERCENT))
  );
}

function formatPrice(cents: number, currency: string) {
  if (cents === 0) return "Unclaimed";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export default function ThroneBoard({ initialSeats }: { initialSeats: Seat[] }) {
  const [seats, setSeats] = useState<Seat[]>(initialSeats);
  const [claimingSeat, setClaimingSeat] = useState<Seat | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => setIsSignedIn(!!data.user));
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => setIsSignedIn(!!session?.user)
    );

    const channel = supabase
      .channel("seats-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "seats" },
        (payload) => {
          const updated = payload.new as Seat;
          setSeats((prev) =>
            prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const supremeLeader = seats.find((s) => s.seat_role === "supreme_leader");
  const queens = seats
    .filter((s) => s.seat_role === "queen")
    .sort((a, b) => a.display_rank - b.display_rank);

  const leftQueens = queens.slice(0, 2);
  const rightQueens = queens.slice(2, 4);

  function handleSupremeLeaderClick() {
    if (!supremeLeader) return;
    if (!isSignedIn) {
      alert("Sign in first to claim the throne.");
      return;
    }
    setClaimingSeat(supremeLeader);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-end justify-center gap-3 sm:gap-6">
        <div className="flex gap-3 sm:gap-5 mb-6 sm:mb-10">
          {leftQueens.map((q) => (
            <QueenSeat key={q.id} seat={q} />
          ))}
        </div>

        {supremeLeader && (
          <SupremeLeaderSeat seat={supremeLeader} onClick={handleSupremeLeaderClick} />
        )}

        <div className="flex gap-3 sm:gap-5 mb-6 sm:mb-10">
          {rightQueens.map((q) => (
            <QueenSeat key={q.id} seat={q} />
          ))}
        </div>
      </div>

      {claimingSeat && (
        <ClaimModal
          seatId={claimingSeat.id}
          currentPriceCents={claimingSeat.current_price_cents}
          minRequiredCents={minBidFor(claimingSeat.current_price_cents)}
          onClose={() => setClaimingSeat(null)}
        />
      )}
    </div>
  );
}

function SupremeLeaderSeat({
  seat,
  onClick,
}: {
  seat: Seat;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 relative z-10">
      <button
        onClick={onClick}
        className="relative w-[220px] h-[280px] cursor-pointer group"
        aria-label="Claim the Supreme Leader's throne"
      >
        <div className="arch-frame-outline" />
        <div
          className="arch-frame w-full h-full flex items-center justify-center relative transition-transform group-hover:scale-[1.02]"
          style={{
            background:
              "linear-gradient(180deg, #1c1006 0%, #0a0705 60%, #050302 100%)",
          }}
        >
          {seat.is_default_occupant ? (
            <span
              className="font-serif-italic text-base"
              style={{ color: "var(--parchment-dim)" }}
            >
              awaiting a ruler
            </span>
          ) : (
            <span className="text-sm" style={{ color: "var(--gold)" }}>
              Occupied
            </span>
          )}

          {seat.is_dethronable && (
            <span
              className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.2em] px-2 py-1 rounded-sm"
              style={{
                color: "var(--ember-bright)",
                border: "1px solid var(--ember)",
                background: "rgba(196,30,30,0.08)",
              }}
            >
              Contested
            </span>
          )}
        </div>
      </button>

      <p
        className="font-display text-sm tracking-[0.2em] uppercase font-bold"
        style={{ color: "var(--parchment)" }}
      >
        Supreme Leader
      </p>
      <button
        onClick={onClick}
        className="text-sm font-bold px-4 py-1.5 rounded cursor-pointer hover:opacity-90"
        style={{ color: "var(--void)", background: "var(--gold)" }}
      >
        {seat.is_default_occupant
          ? `Claim from ${formatPrice(minBidFor(0), seat.current_price_currency)}`
          : `Outbid at ${formatPrice(minBidFor(seat.current_price_cents), seat.current_price_currency)}`}
      </button>
    </div>
  );
}

function QueenSeat({ seat }: { seat: Seat }) {
  return (
    <div className="flex flex-col items-center gap-2 opacity-90">
      <div
        className="w-[92px] h-[130px] sm:w-[108px] sm:h-[150px] rounded-t-full flex items-center justify-center relative"
        style={{
          background: "linear-gradient(180deg, #140d08 0%, #0a0705 100%)",
          border: "1px solid var(--gold-dim)",
        }}
      >
        {seat.is_default_occupant ? (
          <span
            className="text-[10px] uppercase tracking-widest"
            style={{ color: "var(--parchment-dim)" }}
          >
            Vacant
          </span>
        ) : (
          <span className="text-xs" style={{ color: "var(--gold)" }}>
            Seated
          </span>
        )}
      </div>
      <p
        className="font-display text-[10px] tracking-[0.15em] uppercase font-bold"
        style={{ color: "var(--parchment-dim)" }}
      >
        Queen
      </p>
      <p className="text-[11px]" style={{ color: "var(--parchment-dim)" }}>
        {formatPrice(seat.current_price_cents, seat.current_price_currency)}
      </p>
    </div>
  );
}
