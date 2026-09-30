# UX.md — Customer Journey & Interaction Specification


**Human companion: `docs/human/03_Zatiaras_Web_V1_UX_Customer_Journey_Interface_Specification.pdf`**
**Baseline:** Reconciled v1.1
## UX objective

Customer-facing:
**fast, appetizing, intuitive, trustworthy.**

Outlet-facing:
**extremely simple, explicit, low cognitive load.**

---

# Customer journey

```text
Google / Maps / Instagram / AI / Direct
↓
Homepage / Branch / Product
↓
Choose Outlet
↓
Menu
↓
Product
↓
Cart
↓
Pickup Time
↓
Guest Checkout
↓
Payment
↓
Payment Verified
↓
Confirmed
↓
Preparing
↓
Ready
↓
Pickup
↓
Completed
↓
Feedback / Repeat
```

---

# Paid-order exception

```text
PAID
↓
Outlet cannot fulfill
↓
Friendly exception screen
↓
"Pembayaranmu sudah tercatat."
↓
Chat Zatiaras via WhatsApp
↓
Human recovery
↓
Substitute / reschedule / refund
```

---

# Group order

```text
Group-order entry
↓
Request
↓
Outlet reviews capacity
↓
Approved
↓
Payment
↓
Scheduled preparation
↓
Pickup / completion
```

---

# Information architecture

```text
/
├── menu
│   └── [product]
├── samarinda
│   ├── juanda
│   └── slamet-riyadi
├── locations
├── cart
├── checkout
├── order/[id]
├── track
├── feedback
└── about
```

---

# Screen inventory

Customer:
- C01 Homepage
- C02 Menu
- C03 Product Detail
- C04 Cart
- C05 Checkout
- C06 Payment Pending
- C07 Payment Success
- C08 Order Tracking
- C09 Paid Fulfillment Problem
- C10 Feedback
- C11 Branch Page
- C12 Group Order

Outlet:
- O01 New Orders
- O02 Preparing
- O03 Ready
- O04 Availability
- O05 Outlet Load
- O06 Cannot Process

---

# Staff usability constraints

Assume:
- limited technical confidence,
- noisy/fast outlet environment,
- repetitive task pressure.

Use:
- large tap targets,
- plain Indonesian,
- minimal nested navigation,
- obvious primary action,
- explicit state,
- simple error recovery.

---

# Visual / brand dependency

This file does **not** duplicate the brand system.

For:
- logo usage,
- typography,
- colors,
- slogan,
- product photography,
- graphic devices,
- campaign composition,
- digital application patterns,

read `docs/BRAND_REFERENCES.md` and open the relevant official PDF pages.

---

# Motion behavior

Motion is a product/UX decision but must remain consistent with the official brand language.

Allowed:
- controlled brand/discovery motion,
- subtle scroll-linked product depth,
- lightweight micro-interactions.

Avoid:
- scroll hijacking,
- mandatory WebGL,
- long intros,
- motion-heavy checkout.

For the actual visual language, consult the official brand PDFs via `BRAND_REFERENCES.md`.

---

# Accessibility

Must:
- support reduced motion,
- preserve content without animation,
- support keyboard/focus states,
- use semantic controls,
- maintain readable contrast,
- avoid color-only status meaning.

---

# Mobile-first rule

Critical functionality must work on mobile without desktop-only dependencies.
