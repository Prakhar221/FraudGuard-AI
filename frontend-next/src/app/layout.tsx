import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FraudGuard AI | Command Center",
  description: "Real-Time Financial Fraud Detection Framework",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
