import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Mail, MessageCircle, Phone } from "lucide-react";
import "./globals.css";

// Saeed's own contact details — kept in one place since they're used for the
// WhatsApp link (needs digits only), the tel: link, and the display text.
const WHATSAPP_NUMBER = "919714188814";
const PHONE_DISPLAY = "+91 97141 88814";
const EMAIL = "pakeezasaeed059@gmail.com";

export const metadata: Metadata = {
  title: "Pakeeza Perfumes — Attar & perfume price list",
  description:
    "Browse every attar and perfume Pakeeza Perfumes carries, grouped by brand, with prices for every available size.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <header className="bg-ink text-parchment">
          <div className="mx-auto max-w-5xl px-4 py-5 flex items-center justify-between">
            <span className="text-lg font-semibold tracking-tight">Pakeeza Perfumes</span>
            <span className="text-sm text-parchment/70 hidden sm:block">
              Attar &amp; perfume price list
            </span>
          </div>
        </header>
        {/* flex-1 makes this the one element that stretches to fill leftover
            height, so the footer below it lands at the bottom of the
            viewport on a short page (e.g. a brand with only a few attars)
            instead of floating right under the content with blank space
            beneath it. On a page tall enough to scroll, this has no visible
            effect — the footer just follows the content as normal. */}
        <main className="mx-auto max-w-5xl px-4 py-6 flex-1 w-full">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">
          <p>
            Prices are updated directly by Saeed. To place an order, message
            him on WhatsApp with what you'd like and how much.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
            <a
              href={`tel:+${WHATSAPP_NUMBER}`}
              className="flex items-center gap-1.5 hover:text-foreground"
            >
              <Phone className="h-4 w-4" />
              <span className="tabular">{PHONE_DISPLAY}</span>
            </a>
            <a
              href={`mailto:${EMAIL}`}
              className="flex items-center gap-1.5 hover:text-foreground"
            >
              <Mail className="h-4 w-4" />
              {EMAIL}
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
