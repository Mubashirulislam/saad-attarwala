import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Mail, MessageCircle, Phone } from "lucide-react";
import "./globals.css";

// Saad's own contact details — kept in one place since they're used for the
// WhatsApp link (needs digits only), the tel: link, and the display text.
const WHATSAPP_NUMBER = "918369225605";
const PHONE_DISPLAY = "+91 83692 25605";
const EMAIL = "msaadhaq878734@gmail.com";

export const metadata: Metadata = {
  title: "Saad Attarwala — Attar & Perfume Price List",
  description:
    "Browse every attar and perfume Saad Attarwala carries, grouped by brand, with prices for every available size.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <header className="bg-ink text-parchment">
          <div className="mx-auto max-w-5xl px-4 py-5 flex items-center justify-between">
            <span className="text-lg font-semibold tracking-tight">Saad Attarwala</span>
            <span className="text-sm text-parchment/70 hidden sm:block">
              Attar &amp; perfume price list
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">
          <p>
            Prices are updated directly by Saad. To place an order, message
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
