# CONTRACTS.md — Domain Contracts & State Rules


**Human companion: `docs/human/04_Zatiaras_Web_V1_Software_Architecture_Technical_Design.pdf`**
**Baseline:** Reconciled v1.1
## Purpose

Define stable names and behavior that agents must not casually reinterpret.

---

# Core entities

```text
Outlet
MenuItem
MenuVariant
OutletMenuAvailability
PickupSlot
CustomerContact
Order
OrderItem
Payment
Refund
SupportCase
OrderEvent
AnalyticsEvent
```

Exact DB tables may differ.

---

# Outlet modes

Availability:

```text
AVAILABLE
LIMITED
SOLD_OUT
```

Load:

```text
NORMAL
BUSY
VERY_BUSY
PAUSED
```

---

# Order states

```text
DRAFT
PENDING_PAYMENT
PAID
CONFIRMED
PREPARING
READY
COMPLETED
FULFILLMENT_FAILED
REFUND_PENDING
REFUNDED
EXPIRED
CANCELLED
```

`CANCELLED` must not be used as a vague substitute for paid fulfillment failure.

---

# Allowed normal transitions

```text
DRAFT → PENDING_PAYMENT
PENDING_PAYMENT → PAID
PENDING_PAYMENT → EXPIRED
PAID → CONFIRMED
PAID → FULFILLMENT_FAILED
CONFIRMED → PREPARING
CONFIRMED → FULFILLMENT_FAILED
PREPARING → READY
READY → COMPLETED
FULFILLMENT_FAILED → REFUND_PENDING
REFUND_PENDING → REFUNDED
```

---

# Payment states

```text
CREATED
PENDING
PAID
FAILED
EXPIRED
REFUND_PENDING
REFUNDED
```

Rules:
- browser success is not authoritative,
- webhook/event must be verified,
- duplicate events are idempotent,
- amount/order identity must be checked.

---

# Group-order states

```text
REQUESTED
REVIEWING
APPROVED
REJECTED
PENDING_PAYMENT
CONFIRMED
SCHEDULED_PREPARATION
READY
COMPLETED
```

Threshold is configurable and currently OPEN.

---

# Support case categories

Potential:
- TASTE
- BITTER
- SWEETNESS
- WRONG_ORDER
- SPILL_OR_LEAK
- DELAY
- SERVICE
- CLEANLINESS
- STOCK_OR_FULFILLMENT
- PAYMENT
- OTHER

---

# API boundary principles

Public:
```text
GET outlets
GET menu
GET product
POST order
POST payment
GET order status
POST feedback
POST group-order request
```

Server-to-server:
```text
POST payment webhook
```

Staff/admin:
```text
GET outlet order queue
PATCH order preparing
PATCH order ready
PATCH order complete
POST order fulfillment issue
PATCH availability
PATCH outlet mode
POST refund action
```

Exact endpoint names may change.

---

# Brand contracts

No brand asset geometry is defined in this file.

For official logo, colors, typography, slogan, cup, graphic devices, and application rules:
**read `docs/BRAND_REFERENCES.md` and the linked PDFs.**
