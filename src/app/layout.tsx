import "./globals.css";
import type { Metadata } from "next";
import { themeBootstrap } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Pocket Rankings - Pokémon TCG Pocket competitive tracker",
  description:
    "Player leaderboard, deck tier list, country rankings, and tournament results for Pokémon TCG Pocket. Powered by the Limitless TCG API.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
