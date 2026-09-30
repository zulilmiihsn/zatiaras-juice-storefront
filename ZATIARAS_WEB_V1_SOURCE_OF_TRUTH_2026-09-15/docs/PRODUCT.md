# PRODUCT.md — Zatiaras Web V1


**Human companion: `docs/human/01_Zatiaras_Web_V1_Business_Requirements_Document.pdf`**
**Baseline:** Reconciled v1.1
## Product definition

**Zatiaras Web V1** is the owned digital storefront and pickup-commerce layer for Zatiaras Juice.

It is not a company-profile website and not a replacement for marketplaces.

It exists to make Zatiaras easier to:
- discover,
- understand,
- order,
- pay,
- pick up,
- contact when something goes wrong,
- return to.

---

## Business role

Current customer touchpoints include:
- physical outlet,
- Instagram/social,
- Google/Maps,
- WhatsApp,
- GoFood,
- GrabFood,
- ShopeeFood.

The web becomes Zatiaras' **owned digital center**.

```text
Discovery
  ↓
Official Zatiaras Web
  ↓
Understand Product / Outlet
  ↓
Self-Order Pickup
  ↓
Payment
  ↓
ZatiarasPOS / Outlet
  ↓
Preparation
  ↓
Pickup
  ↓
Feedback / Support / Repeat
  ↓
First-Party Data
```

---

## Initial market

**City:** Samarinda

**Initial outlets:**
- Juanda
- Slamet Riyadi

Do not assume other branches are in V1 unless explicitly added.

---

## Current Samarinda pilot operational truth

As of the reconciled planning cut-off:

| Outlet | Status | Web pilot | Operating hours used as current planning truth |
|---|---|---|---|
| Juanda | Active | Yes | Mon-Sun 07:00-23:00 |
| Slamet Riyadi | Active | Yes | Mon-Sat 07:00-22:00; Sunday closed |

Addresses/pins must be sourced from the current managed Google Business Profile / approved operational record. Do not invent or infer street addresses.

## Users

### Customer
Needs:
- menu and price clarity,
- correct outlet selection,
- easy pickup ordering,
- safe payment,
- order status,
- human help for money/order problems.

### Outlet crew / cashier
Needs:
- clear paid-order queue,
- simple processing,
- ready/complete actions,
- availability control,
- pause/busy controls,
- simple exception handling.

### Owner / admin
Needs:
- web-order performance,
- failures/refunds,
- outlet/product performance,
- acquisition and repeat data.

---

## Product principles

1. **Owned, not isolated** — web complements WA, marketplaces, and walk-in.
2. **Pickup-first** — own delivery is not V1.
3. **Human support for uncertainty** — money/order exceptions go to a human.
4. **Operations before feature count** — do not outpace outlet capability.
5. **Product truth** — real product proof over artificial spectacle.
6. **Business measurement** — paid orders, contribution, repeat, and failures matter more than vanity traffic.

---

## V1 scope

- Public website
- Homepage
- Menu
- Product pages
- Branch pages
- Outlet selection
- Cart
- Guest checkout
- Pickup time
- Payment
- Order tracking
- WhatsApp exception handoff
- Feedback/service recovery
- Group-order request
- Outlet queue integration
- Availability
- Busy/pause mode
- Analytics
- Local SEO
- AI/search discoverability

---

## Explicit non-goals

- Native app
- Own courier fleet
- Exact omnichannel inventory
- Marketplace API integration
- Full CRM
- Loyalty/gamification
- AI chatbot
- Kiosk rollout
- ERP replacement
- Mandatory customer accounts

---

## Brand dependency

This product must use the official Zatiaras brand system.

Do not restate brand rules here. For any visual, UI, typography, imagery, logo, slogan, graphic-device, or touchpoint decision:

**Read `docs/BRAND_REFERENCES.md` and the referenced official PDF pages.**
