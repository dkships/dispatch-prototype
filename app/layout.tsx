import type { Metadata } from "next";
import "./globals.css";

const description =
  "A Wizard-of-Oz test for non-emergency patient transport dispatch: one-click driver reassignment with a suggested driver, measured against today's 14-click flow. Synthetic data.";

export const metadata: Metadata = {
  title: "Dispatch assistant prototype",
  description,
  robots: { index: false, follow: false },
  openGraph: {
    title: "Dispatch assistant prototype",
    description,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Dispatch assistant prototype", description },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
