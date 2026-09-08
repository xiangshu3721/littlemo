import type { Metadata, Viewport } from "next";
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const sans = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-sans-face",
});

const serif = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-display-face",
});

export const metadata: Metadata = {
  title: "碎碎念",
  description: "像聊天一样记下这一刻的情绪。",
  appleWebApp: {
    capable: true,
    title: "碎碎念",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F4EFE6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className={`${sans.variable} ${serif.variable} ${sans.className} h-full overflow-hidden`}>
      <body className="h-full overflow-hidden">
        {/*
          THESIS: A private chat with yourself, not a mood dashboard. Refuses scores, streaks, and therapist-bot chrome.
          OWN-WORLD: Pressed letter-paper on a dusk desk. Ink brown, clay-teal, Noto Serif titles, grain in the sheet.
          STORY: Open, dump a feeling, get a quiet reply. Calendar later if you want it.
          FIRST VIEWPORT: 430px paper column. Header avatar + serif name. Empty: “去记下这一刻”. Sticky composer.
          FORM: Elevated letter-paper journal. Seed skipped: brief-pinned. Key: brief-ui-2026-09.
          FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
        */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
