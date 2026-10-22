import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  );
}
