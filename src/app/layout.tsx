import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "IEEE ISITCom Student Branch",
  description: "IEEE Student Branch of ISITCom Hammam Sousse",
  openGraph: {
    siteName: "IEEE ISITCom Student Branch",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={spaceGrotesk.variable}>
      <body>
        {children}
      </body>
    </html>
  );
}
