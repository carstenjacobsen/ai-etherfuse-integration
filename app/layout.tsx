import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stellar Wallet — EtherFuse & DeFindex",
  description: "Stellar wallet with MXN on/off-ramp via EtherFuse and yield earning via DeFindex",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
