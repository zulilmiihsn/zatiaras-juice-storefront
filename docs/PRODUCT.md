# PRODUCT.md — Zatiaras Web V1 (multi-city)

**Cut-off:** 2026-09-25. Supersedes Samarinda-only product assumptions (DEC-002 SUPERSEDED).

## Product definition

Zatiaras Web V1 is a mobile-first, multi-city, multi-outlet owned digital storefront and
public discovery web application for Zatiaras Juice.

It allows customers to discover products and locations, select a Zatiaras outlet, browse
the relevant menu, build an order, pay, track order progress, receive human support if
fulfillment fails, and pick up the order.

V1 fulfillment is pickup-first. The architecture remains compatible with future delivery
without pretending delivery currently exists.

## Primary customer job

"I want juice. Help me quickly find a suitable Zatiaras outlet, understand the available
menu, order, pay safely, know what is happening, and receive my order without unnecessary friction."

## Geography (V1 launch scope)

- Samarinda: Juanda (Jl. Ir. H. Juanda samping Ami Ali Parfum — official team repo),
  Slamet Riyadi (07:00–22:00 Mon–Sat, Sunday closed — owner-confirmed; street
  address `VERIFY_VIA_GBP`).
- Berau: Merah Delima (Jl. Merah Delima depan Klinik Berlian Bakti, 08:00–22:00 WITA,
  +62813-4988-2015 — triple-corroborated: official team repo + live site + GoFood receipt).
- Balikpapan: Kutilang, Gatot Subroto (hours same as Juanda 07:00–23:00 daily —
  owner-confirmed; street addresses/coords `VERIFY_VIA_GBP` / `VERIFY_VIA_OPS`).

City/outlet are discovery context, fulfillment context, pricing context, availability
context, pickup-capacity context, and analytics dimensions.

## Channel role

Owned digital center complementing outlet, social, Maps, WhatsApp, marketplaces.
Flow: Discovery → Web → Outlet understanding → Self-order pickup → Payment → Outlet
fulfillment → Pickup → Support/Feedback → Repeat → First-party data.

## V1 scope

Public site, brand homepage, menu + product pages, city + branch pages, outlet selection
(with IP suggestion + remembered outlet + manual + explicit browser-geo), outlet-aware
cart, guest checkout, pickup slot, server-verified payment, tracking, WhatsApp exception
handoff, feedback, group-order request (outlet-aware, approval-gated), crew queue,
availability + busy/pause, multi-city SEO, analytics with city/outlet dimensions.

## Non-goals

Native app, courier fleet, exact omnichannel inventory, marketplace API integration,
full CRM, loyalty, AI chatbot, kiosk, ERP, mandatory accounts.
