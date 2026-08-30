import { createClient } from "@/lib/supabase/server";
import AuthButton from "@/components/AuthButton";
import ThroneBoard from "@/components/ThroneBoard";
import LiveViewerCount from "@/components/LiveViewerCount";
import NotificationListener from "@/components/NotificationListener";

export default async function Home() {
  const supabase = await createClient();

  const { data: seats, error } = await supabase
    .from("seats")
    .select(
      "id, display_rank, seat_role, is_dethronable, current_price_cents, current_price_currency, is_default_occupant, current_character_image_id"
    )
    .order("display_rank", { ascending: true });

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient torchlight — two warm radial glows that flicker independently */}
      <div
        aria-hidden
        className="torch-glow-left pointer-events-none fixed -top-24 left-[8%] w-[500px] h-[500px] rounded-full blur-[110px]"
        style={{ background: "radial-gradient(circle, var(--ember) 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="torch-glow-right pointer-events-none fixed -top-16 right-[8%] w-[460px] h-[460px] rounded-full blur-[110px]"
        style={{ background: "radial-gradient(circle, var(--gold) 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% 0%, transparent 0%, var(--void) 75%), radial-gradient(ellipse 140% 100% at 50% 100%, var(--void-deep) 0%, var(--void) 60%)",
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="flex items-center justify-between px-6 sm:px-10 py-5">
          <span
            className="font-display font-bold text-lg tracking-[0.15em]"
            style={{ color: "var(--parchment)" }}
          >
            WADIYA
          </span>
          <AuthButton />
        </header>

        <main className="flex-1 flex flex-col items-center px-6 pt-6 pb-20 gap-16">
          {/* Hero: declarative, imperial, addressed to the reader directly */}
          <div className="text-center max-w-xl mt-4">
            <p
              className="text-[10px] tracking-[0.5em] uppercase mb-5"
              style={{ color: "var(--gold)" }}
            >
              By Decree of the State
            </p>
            <h1
              className="font-display font-black uppercase leading-[1.05] mb-6"
              style={{
                color: "var(--parchment)",
                fontSize: "clamp(2.4rem, 6vw, 4rem)",
                textShadow: "0 0 40px rgba(232,185,35,0.15)",
              }}
            >
              The seat is empty.
              <br />
              <span style={{ color: "var(--ember-bright)" }}>Take it.</span>
            </h1>
            <p
              className="font-serif-italic text-lg leading-relaxed"
              style={{ color: "var(--parchment-dim)" }}
            >
              Every ruler of Wadiya reigns until someone pays more to replace
              them. Your face, your flag, your name on the throne — until the
              next challenger arrives.
            </p>
          </div>

          {error || !seats ? (
            <p className="text-sm" style={{ color: "var(--ember-bright)" }}>
              The palace gates are shut. Try refreshing.
            </p>
          ) : (
            <ThroneBoard initialSeats={seats} />
          )}

          <LiveViewerCount />
        </main>

        <NotificationListener />

        <footer
          className="text-center text-[10px] tracking-[0.3em] uppercase py-6"
          style={{ color: "var(--gold-dim)" }}
        >
          Construction of the palace is underway
        </footer>
      </div>
    </div>
  );
}
