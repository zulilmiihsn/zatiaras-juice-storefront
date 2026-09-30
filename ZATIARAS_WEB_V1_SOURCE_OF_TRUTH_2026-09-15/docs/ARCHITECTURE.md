# ARCHITECTURE.md — Software Architecture V1


**Human companion: `docs/human/04_Zatiaras_Web_V1_Software_Architecture_Technical_Design.pdf`**
**Baseline:** Reconciled v1.1
## Objective

Keep the system simple enough for a small business, but structured enough for:
- public discovery,
- direct pickup commerce,
- payment verification,
- outlet operations,
- first-party data,
- future integrations.

---

# High-level architecture

```text
Customer / Search / AI
        ↓
Zatiaras Web
SvelteKit + TypeScript
        ↓
Zatiaras Core API
Cloudflare runtime
        ↓
Transactional Data Store
        ↕
ZatiarasPOS / Outlet UI

External:
- Payment Gateway
- WhatsApp
- Analytics

Not integrated V1:
- GoFood
- GrabFood
- ShopeeFood
```

---

# Frontend

Working direction:
- SvelteKit
- TypeScript
- SSR/prerender hybrid
- mobile-first

Public discovery pages favor SSR/prerender.

---

# Runtime

Working direction:
- Cloudflare Workers ecosystem

Potential supporting services:
- R2 when needed
- queues when justified
- rate limiting/security controls

Do not add infrastructure without a clear requirement.

---

# Core service boundary

Business rules should not be duplicated across web and POS.

Core responsibilities:
- outlets,
- menu/orderability,
- order creation,
- payment state,
- fulfillment state,
- availability,
- outlet load,
- support/refund records,
- analytics events.

---

# Persistence

**OPEN:** D1 vs PostgreSQL/other existing POS-compatible store.

Do not lock by assumption.

Avoid dual source of truth.

---

# Payment

Use provider adapter boundary.

Concept:

```text
PaymentService
├── createPayment()
├── getPaymentStatus()
├── handleWebhook()
└── refund()
```

Provider selection remains OPEN.

---

# Availability

V1 does not implement exact omnichannel inventory.

Use:
- orderability,
- availability state,
- outlet load,
- pickup-slot rules,
- manual override.

---

# Brand dependency

Architecture does not own visual identity rules.

For brand implementation:
- see `docs/BRAND_REFERENCES.md`,
- use the official PDF source files,
- use official assets in repository.

---

# Security baseline

- server-side secrets,
- verify payment signatures,
- webhook idempotency,
- authorization for staff/admin actions,
- validate server input,
- rate-limit abuse-prone endpoints,
- protect private order data,
- avoid sensitive payment logs.

---

# Deferred

Not V1:
- marketplace inventory integration,
- AI in transaction path,
- own courier routing,
- microservice sprawl,
- Kubernetes/Kafka-style complexity.
