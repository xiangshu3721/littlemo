import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import "./globals.css";

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
  themeColor: "#F6F0E3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full overflow-hidden">
      <body className="h-full overflow-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
