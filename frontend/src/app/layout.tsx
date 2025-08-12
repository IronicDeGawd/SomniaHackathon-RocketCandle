import type { Metadata } from "next";
import { Orbitron } from "next/font/google";
import "./styles.css";
import "./globals.css";
import { Providers } from "./providers";
import FloatingBackground from "@/components/ui/FloatingBackground";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-orbitron",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://market-buster-somnia.vercel.app/"),
  title: "Rocket Candle - Farcaster Mini App",
  description:
    "Launch rockets through candlestick barriers, destroy enemies, and earn RocketFUEL tokens in this physics-based puzzle game",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Rocket Candle - Farcaster Mini App",
    description:
      "Launch rockets through candlestick barriers, destroy enemies, and earn RocketFUEL tokens in this physics-based puzzle game",
    images: ["/logo.png"],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Rocket Candle - Farcaster Mini App",
    description:
      "Launch rockets through candlestick barriers, destroy enemies, and earn RocketFUEL tokens in this physics-based puzzle game",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, orientation=landscape"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta
          name="fc:miniapp"
          content='{"version":"1","name":"Rocket Candle","iconUrl":"https://market-buster-somnia.vercel.app/logo.png","homeUrl":"https://market-buster-somnia.vercel.app","imageUrl":"https://market-buster-somnia.vercel.app/logo.png","button":{"text":"🚀 Play Now","action":"play"}}'
        />
      </head>
      <body className={`${orbitron.variable} font-orbitron`}>
        <FloatingBackground />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
