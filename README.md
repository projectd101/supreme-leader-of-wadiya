# Wadiya's Supreme Leader

Real frontend, real Supabase backend, real Google OAuth. No fake activity or
fake numbers anywhere in this codebase, by design.

## Local setup

```bash
npm install
cp .env.local.example .env.local
```

Fill in `.env.local` with your Supabase project's URL and anon key
(Supabase Dashboard → Project Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=https://ogfvgncirtkdtkfpvcdg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon public key>
```

Then:

```bash
npm run dev
```

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it at vercel.com/new.
3. Add the same two environment variables (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) under Project Settings → Environment
   Variables.
4. Deploy.

## Google OAuth redirect URLs

In your Google Cloud OAuth client, and in Supabase Auth → URL Configuration,
make sure these are both registered once you have a real domain:

- `https://<your-project>.vercel.app/auth/callback`
- `http://localhost:3000/auth/callback` (for local dev)

## What's wired up

- **Auth**: Google OAuth via Supabase Auth (`AuthButton.tsx`). A profile row
  is auto-created in `public.users` on first sign-in via a DB trigger.
- **Throne board**: reads live `seats` data from Supabase
  (`ThroneBoard.tsx`), subscribed to real-time updates so seat changes show
  instantly to everyone watching.
- **Live viewer count**: `LiveViewerCount.tsx` uses Supabase Realtime
  Presence to show the actual number of connected browser tabs. This is a
  real number, not simulated — see project notes on why fake social proof
  was deliberately avoided.
- **Notifications**: `NotificationListener.tsx` subscribes to real-time
  inserts on the `notifications` table (e.g. "you've been dethroned"),
  scoped to the logged-in user via RLS.

## What's NOT wired up yet

- Payment checkout (Dodo Payments) and the webhook handler that actually
  flips a seat on confirmed payment.
- Face upload + AI compositing pipeline.
- Cosmetic item overlays (wallet/nukes/oil) — table exists, no data or UI
  yet.
