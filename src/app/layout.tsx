import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const ppNeueMontreal = localFont({
  variable: "--font-pp-neue-montreal",
  display: "swap",
  src: [
    { path: "../../public/fonts/ppneuemontreal-book.otf", weight: "400", style: "normal" },
    { path: "../../public/fonts/ppneuemontreal-medium.otf", weight: "500", style: "normal" },
    { path: "../../public/fonts/ppneuemontreal-bold.otf", weight: "700", style: "normal" },
  ],
});

const ppEditorialNew = localFont({
  variable: "--font-pp-editorial-new",
  display: "swap",
  src: [{ path: "../../public/fonts/pp-editorial-new-regular.otf", weight: "400", style: "normal" }],
});

export const metadata: Metadata = {
  title: "Timeless — Agentes que testean tu app",
  description:
    "Crea agentes de IA que prueban funcionalidades de tu aplicación en navegadores en la nube. Míralos en vivo.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${ppNeueMontreal.variable} ${ppEditorialNew.variable}`}>
      <body>{children}</body>
    </html>
  );
}
