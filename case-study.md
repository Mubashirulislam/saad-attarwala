# Pakeeza Perfumes

**A WhatsApp price list, rebuilt as a real storefront and back office.**

Pakeeza Perfumes sells attars and perfume oils entirely through WhatsApp. We gave Saeed a public catalog customers can browse and search themselves, and a private tool to run the whole business — catalog, orders, and sales — without touching code.

| | |
|---|---|
| **Client** | Pakeeza Perfumes (Saeed Pakeeza) |
| **Location** | Navsari, Gujarat, India |
| **Year** | 2026 |
| **Timeline** | 10 days |
| **Case study** | 04 |

---

## The Problem

Every price, typed from memory. Every order, lost in a chat thread.

Saeed's catalog lives across five brands and well over a hundred attars, each sold in its own ladder of sizes — some brands stop at 12ml, others go up to 100ml. None of that was written down anywhere a customer could see.

Every inquiry meant Saeed typing out prices from memory or scrolling back through an old photo of a price list. Stock changed daily; the numbers customers had didn't. And once an order was placed, there was no record of it beyond the WhatsApp thread it lived in — no way to tell, a week later, whether it had been paid, shipped, or forgotten.

## The Solution

Two apps, one database, nothing Saeed has to touch a line of code for.

A public catalog for customers, and a private admin for Saeed — sharing one Supabase project, deployed as two separate apps on two separate domains.

The catalog groups every attar by brand and pivots each brand's own size ladder into columns, so a 3–12ml brand and a 30–100ml brand still sit in one readable table. Customers search it, sort it by price, and message Saeed directly from what they find — no account, no cart, no friction before the conversation that was already going to happen on WhatsApp anyway.

The admin side is where the business actually runs: add a brand, an attar, a size and price, mark something out of stock the moment it sells out, and it's live on the public site in under a second. Building an order means typing an attar's name the way a customer would say it — the same search customers use, just for Saeed. Every order then moves through a real lifecycle instead of a chat history:

`awaiting payment → paid → shipped → delivered`

On top of that, Saeed can run a time-boxed percentage sale — on one brand or the whole catalog — with a start date and an end date. Prices update themselves on the public site the moment the sale opens, and revert themselves the moment it ends.

## Stack & Timeline

- **Stack**: Next.js · TypeScript · Supabase · Tailwind CSS
- **Structure**: Two apps, one shared database
- **Zeitraum**: 10 days, design to deploy
- **Live**: pakeeza-perfume-web.vercel.app

## Results

Three weeks in.

- **180+** — attars listed and priced across 5 brands, all searchable in one catalog
- **40+** — orders tracked start to finish instead of scattered across chats
- **<60s** — to send a customer their order confirmation, down from ~10 minutes of typing it by hand

*First three weeks post-launch. No paid ads, no marketing push — just a link Saeed started sending instead of a price list photo.*

---

## Bereit, etwas aufzubauen?

**Got a business still running out of a chat app?**

If it's held together by memory and old screenshots, it's usually a two-week build away from not being that anymore.

[Get in touch →](https://lautrix.de/kontakt) · [See more work](https://lautrix.de/work)

**Further work**
- [01 · Web — Sweet Mudi](https://lautrix.de/work/sweet-mudi)
- [02 · Tool — Freiberechner](https://lautrix.de/work/freiberechner)
- [03 · PWA — Hazri](https://lautrix.de/work/hazri)

---
*Lautrix — Mubashir · Case study 04 · Pakeeza Perfumes*
