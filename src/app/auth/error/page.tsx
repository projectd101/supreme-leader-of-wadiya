export default function AuthErrorPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#1c1712] text-[#ede6d6] font-mono px-6">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-3">Sign-in failed</h1>
        <p className="text-[#b7ab90] mb-6">
          Something went wrong while signing you in. This can happen if you
          closed the Google sign-in window, or the request expired.
        </p>
        <a
          href="/"
          className="inline-block px-5 py-2 border border-[#d4af37] text-[#d4af37] rounded hover:bg-[#d4af37] hover:text-[#1c1712] transition-colors"
        >
          Return to the throne room
        </a>
      </div>
    </main>
  );
}
