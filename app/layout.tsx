import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BookRight — Booking for Artists",
  description: "Simple booking and consent forms for tattoo artists, hairstylists, nail techs, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
