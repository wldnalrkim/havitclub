import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Habit Club",
  description: "학생용 습관 관리 웹",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
