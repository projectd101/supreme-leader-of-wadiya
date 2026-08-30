import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Supabase redirects here after Google OAuth completes, with a `code` param.
// We exchange it for a real session, then send the user back to the throne
// board. This route must exactly match the "Redirect URL" configured in
// Supabase Auth settings and Google Cloud OAuth client.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong (denied consent, expired code, etc.)
  return NextResponse.redirect(`${origin}/auth/error`);
}
