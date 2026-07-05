import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Script from "next/script";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
});

const interSans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Nandscape — learn logic gates by building them",
  description:
    "Nandscape teaches digital logic through puzzles. Build every gate, starting from NAND alone.",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
  <html
    lang="en"
    suppressHydrationWarning
    className={`${spaceGrotesk.variable} ${interSans.variable} ${jetbrainsMono.variable}`}
  >
    <body className="font-body antialiased bg-surface text-ink">
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </body>
  </html>
  );
}