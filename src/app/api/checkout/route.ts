import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MIN_INCREMENT_CENTS = 100; // must beat current price by at least $1
const MIN_INCREMENT_PERCENT = 0.1; // or by 10%, whichever is greater

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must sign in first." }, { status: 401 });
  }

  const body = await request.json();
  const { seatId, characterImageId, bidAmountCents } = body as {
    seatId: string;
    characterImageId: string;
    bidAmountCents: number;
  };

  if (!seatId || !characterImageId || !bidAmountCents) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  // Fetch the seat to check it's dethronable and compute the real minimum bid
  const { data: seat, error: seatError } = await supabase
    .from("seats")
    .select("id, is_dethronable, current_price_cents")
    .eq("id", seatId)
    .single();

  if (seatError || !seat) {
    return NextResponse.json({ error: "That seat doesn't exist." }, { status: 404 });
  }

  if (!seat.is_dethronable) {
    return NextResponse.json(
      { error: "This seat cannot be claimed — only the Supreme Leader's seat is contestable." },
      { status: 400 }
    );
  }

  const minRequired = Math.max(
    seat.current_price_cents + MIN_INCREMENT_CENTS,
    Math.ceil(seat.current_price_cents * (1 + MIN_INCREMENT_PERCENT))
  );

  if (bidAmountCents < minRequired) {
    return NextResponse.json(
      {
        error: `You must bid at least $${(minRequired / 100).toFixed(2)} to take this seat.`,
        minRequiredCents: minRequired,
      },
      { status: 400 }
    );
  }

  // Create the pending payment record, snapshotting the price to beat at
  // this moment — this is what the webhook handler will re-check against
  // to resolve the race condition described in the spec.
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      user_id: user.id,
      seat_id: seatId,
      character_image_id: characterImageId,
      provider: "dodo_payments",
      provider_ref: "", // filled in once Dodo returns a session/order id
      amount_cents: bidAmountCents,
      amount_currency: "USD",
      price_to_beat_cents: seat.current_price_cents,
      status: "pending",
    })
    .select()
    .single();

  if (paymentError || !payment) {
    return NextResponse.json({ error: "Couldn't start checkout. Try again." }, { status: 500 });
  }

  // ---------------------------------------------------------------------
  // TODO: wire up real Dodo Payments checkout session creation here.
  //
  // Once DODO_PAYMENTS_API_KEY is set in your environment variables, this
  // should call Dodo's API to create a checkout session, e.g.:
  //
  //   const dodoResponse = await fetch("https://api.dodopayments.com/checkouts", {
  //     method: "POST",
  //     headers: {
  //       Authorization: `Bearer ${process.env.DODO_PAYMENTS_API_KEY}`,
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({
  //       amount: bidAmountCents,
  //       currency: "USD",
  //       success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/?claimed=1`,
  //       cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/?cancelled=1`,
  //       metadata: { payment_id: payment.id, seat_id: seatId },
  //     }),
  //   });
  //   const dodoSession = await dodoResponse.json();
  //
  // Then update the payment row with the real provider_ref:
  //   await supabase.from("payments").update({ provider_ref: dodoSession.id })
  //     .eq("id", payment.id);
  //
  // And return dodoSession.checkout_url below instead of the placeholder.
  // ---------------------------------------------------------------------

  if (!process.env.DODO_PAYMENTS_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Payments aren't connected yet — add DODO_PAYMENTS_API_KEY to your environment variables.",
        paymentId: payment.id,
      },
      { status: 501 }
    );
  }

  return NextResponse.json({
    error: "Dodo checkout integration not yet implemented — see TODO in /api/checkout/route.ts",
    paymentId: payment.id,
  }, { status: 501 });
}
