import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "نُسُج | عقلك الثاني",
  description:
    "مساحة معرفة شخصية تجمع أفكارك ومصادرك وتحولها إلى روابط ومشاريع بمساعدة الذكاء الاصطناعي.",
  applicationName: "نُسُج",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f4f1ea",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
