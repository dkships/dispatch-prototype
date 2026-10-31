import type { Metadata } from "next";
import "./globals.css";

const description =
  "A Wizard-of-Oz test for patient transport dispatch: today's 14-click reassignment, a 1-click panel, and the same panel with a suggested driver, so the AI's value is measured apart from the UX fix. Synthetic data.";

export const metadata: Metadata = {
  title: "Dispatch assistant prototype",
  description,
  robots: { index: false, follow: false },
  openGraph: {
    title: "Dispatch assistant prototype",
    description,
    type: "website",
  },
  twitter: { card: "summary", title: "Dispatch assistant prototype", description },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
