import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wadiya's Supreme Leader",
  description: "A new era approaches. The throne of Wadiya awaits its next Supreme Leader.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#1c1712] text-[#ede6d6]">
        {children}
      </body>
    </html>
  );
}
