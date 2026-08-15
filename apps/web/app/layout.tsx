import type {Metadata, Viewport} from "next";
import {Inter, JetBrains_Mono} from "next/font/google";
import "./globals.css";
import {ThemeProvider} from "@/components/theme-provider";
import {siteUrl} from "@/lib/site-url";

const interSans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  // Resolves every relative canonical/OG URL the child pages produce (see
  // lib/seo/metadata.ts). Without it Next emits relative og:url values,
  // which crawlers can't follow.
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Nandscape: Learn Computer Science by Building It",
    // Child pages that set a plain string title opt out of this via their
    // own absolute title; the template is the fallback for anything that
    // doesn't (see buildContentMetadata, which always supplies a full one).
    template: "%s",
  },
  description:
    "Nandscape teaches computer science through interactive tools and puzzles, starting with digital logic: build real circuits and watch them run.",
  alternates: { canonical: "/" },
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
      className={`${interSans.variable} ${jetbrainsMono.variable}`}
    >
    <body className="font-body antialiased bg-surface text-ink">
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
    </body>
    </html>
  );
}