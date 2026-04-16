import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pocket Rankings - Pokémon TCG Pocket competitive tracker",
  description:
    "Player leaderboard, deck tier list, country rankings, and tournament results for Pokémon TCG Pocket. Powered by the Limitless TCG API.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
