# SPEC_V1.md — Functional Product Specification


**Human companion: `docs/human/02_Zatiaras_Web_V1_Product_Requirements_Document.pdf`**
**Baseline:** Reconciled v1.1
## Status

Working source of truth for Zatiaras Web V1 functional behavior.

---

# FR-DISCOVERY — Public discovery

## FR-DISCOVERY-001 Homepage
Must communicate:
- Zatiaras Juice identity,
- core brand statement,
- Samarinda context,
- hero product,
- direct path to menu/order,
- outlet entry.

### Acceptance
- Critical information readable without animation
- Primary CTA obvious
- Mobile-first
- Brand implementation follows official PDFs referenced in `BRAND_REFERENCES.md`

## FR-DISCOVERY-002 Branch pages
Create indexable pages for:
- Juanda
- Slamet Riyadi

Must support:
- outlet name,
- city,
- verified address/location data,
- verified opening hours,
- pickup CTA,
- outlet-specific information,
- valid local-business structured data where appropriate.

Never invent address/hours.

Current planning truth for hours:
- Juanda: Mon-Sun 07:00-23:00
- Slamet Riyadi: Mon-Sat 07:00-22:00; Sunday closed

If operational data changes, update the source-of-truth before production release.

## FR-DISCOVERY-003 Product pages
Architecture must support dedicated product pages, including hero products.

Must support:
- product name,
- description,
- verified current price,
- image,
- availability context,
- order CTA.

---

# FR-MENU — Menu and product selection

## FR-MENU-001 Menu listing
Customer can browse current web-orderable menu.

## FR-MENU-002 Availability
Outlet-menu state:
- `AVAILABLE`
- `LIMITED`
- `SOLD_OUT`

Do not claim exact real-time stock in V1.

## FR-MENU-003 Product options
Architecture may support:
- variants,
- quantity,
- optional notes,
- sweetness/options only where operationally valid.

Do not expose options not supported by outlet SOP.

---

# FR-CART — Cart

## FR-CART-001
Customer can add, remove, update quantity, and see subtotal.

## FR-CART-002
Checkout cannot proceed with an empty cart.

## FR-CART-003
One cart/order belongs to one pickup outlet.

---

# FR-CHECKOUT — Guest checkout

## FR-CHECKOUT-001
No account required.

## FR-CHECKOUT-002
Minimum required data:
- name,
- WhatsApp number,
- outlet,
- pickup time,
- cart.

## FR-CHECKOUT-003
Customer chooses an available pickup time/slot.

Final slot-capacity algorithm is OPEN.

## FR-CHECKOUT-004
Before payment creation, server re-checks:
- outlet accepts web orders,
- items are orderable,
- operational availability.

V1 does not guarantee exact inventory reservation across external marketplaces.

---

# FR-PAYMENT

## FR-PAYMENT-001
Payment success is server-verified.

## FR-PAYMENT-002
Duplicate payment events must be idempotent.

## FR-PAYMENT-003
Unverified/unpaid order is not confirmed production work.

## FR-PAYMENT-004
Pending payment may expire after configurable timeout.

---

# FR-ORDER

## FR-ORDER-001 Normal lifecycle

```text
DRAFT
→ PENDING_PAYMENT
→ PAID
→ CONFIRMED
→ PREPARING
→ READY
→ COMPLETED
```

## FR-ORDER-002 Expired payment

```text
PENDING_PAYMENT
→ EXPIRED
```

## FR-ORDER-003 Fulfillment problem

```text
PAID or CONFIRMED
→ FULFILLMENT_FAILED
→ HUMAN_SUPPORT
→ SUBSTITUTE / RESCHEDULE / REFUND_PENDING
→ resumed fulfillment or REFUNDED
```

Do not blur payment status and fulfillment status.

## FR-ORDER-004 Tracking
Customer-facing statuses use plain Indonesian.

---

# FR-SUPPORT

## FR-SUPPORT-001
Paid-order exception provides one-tap WhatsApp handoff.

Safe context may include:
- order ID,
- outlet,
- paid status,
- order total.

Never include secrets.

## FR-SUPPORT-002
When true, explicitly reassure that payment is recorded.

## FR-SUPPORT-003
Resolution may be:
- substitute with consent,
- reschedule with consent,
- refund.

---

# FR-OUTLET

## FR-OUTLET-001
Outlet sees new paid/confirmed web orders.

## FR-OUTLET-002
Crew can:
- Proses Pesanan
- Siap Diambil
- Selesai

## FR-OUTLET-003
Crew can choose **Tidak Bisa Diproses** and a simple reason.

## FR-OUTLET-004
Crew/admin can update menu availability.

## FR-OUTLET-005
Outlet modes:
- `NORMAL`
- `BUSY`
- `VERY_BUSY`
- `PAUSED`

---

# FR-GROUP

## FR-GROUP-001
Public UI provides group-order entry.

## FR-GROUP-002
Orders above configurable threshold require approval before payment.

## FR-GROUP-003 Lifecycle

```text
REQUESTED
→ REVIEWING
→ APPROVED
→ PAYMENT
→ CONFIRMED
→ SCHEDULED_PREPARATION
→ READY
→ COMPLETED
```

---

# FR-FEEDBACK

Support structured feedback/complaint categories such as:
- taste,
- bitter,
- sweetness,
- wrong order,
- spill/leak,
- delay,
- service,
- cleanliness,
- other.

Internal feedback flow must not become review gating.

---

# FR-SEOAI

Public pages must support:
- server-readable HTML,
- metadata,
- canonical URLs,
- sitemap,
- branch/product pages,
- valid structured data,
- deliberate crawler accessibility.

See `SEO_AI_DISCOVERY.md`.

---

# Open product decisions

Do not guess:
- production database technology,
- payment provider,
- group-order threshold,
- pickup-slot capacity,
- final current menu/price,
- exact refund automation capability.
