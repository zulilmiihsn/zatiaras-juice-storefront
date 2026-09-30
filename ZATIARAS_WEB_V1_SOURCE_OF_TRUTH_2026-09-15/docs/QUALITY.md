# QUALITY.md — Definition of Correct


**Human companion: `docs/human/05_Zatiaras_Web_V1_QA_Validation_Rollout_Plan.pdf`**
**Baseline:** Reconciled v1.1
## Functional gates

Before release, prove:
- menu browse works,
- outlet selection works,
- cart works,
- guest checkout works,
- invalid checkout is blocked,
- payment is server-verified,
- duplicate webhook does not duplicate order,
- paid order reaches outlet queue,
- crew can process → ready → complete,
- paid exception exposes human support,
- sold-out item cannot be newly ordered,
- paused outlet cannot accept new web order.

---

## Performance targets

Working mobile targets at p75:

```text
LCP ≤ 2.5 s
INP ≤ 200 ms
CLS ≤ 0.1
```

---

## Accessibility

Must include:
- semantic HTML,
- keyboard-operable controls,
- visible focus,
- meaningful labels,
- readable contrast,
- reduced-motion support,
- no status communicated only by color.

---

## Brand quality gate

Brand correctness is evaluated against the official PDFs.

Before merging UI:
1. read `docs/BRAND_REFERENCES.md`,
2. inspect the referenced PDF pages,
3. verify official assets are used.

Do not encode unofficial substitute brand rules here.

---

## SEO quality gate

Public pages:
- meaningful HTML,
- useful title/description,
- canonical,
- sitemap inclusion,
- crawlable internal links,
- no critical content trapped in canvas/animation,
- valid structured data when used.

---

## Payment quality gate

Test:
- success,
- failure,
- expiry,
- duplicate webhook,
- delayed webhook,
- mismatched amount,
- invalid signature,
- paid fulfillment failure,
- refund path.

---

## Staff UAT

Representative outlet staff must be able to:
- identify new web order,
- understand paid status,
- start processing,
- mark ready,
- complete,
- update availability,
- pause web ordering,
- trigger cannot-process flow.

Normal operation should not require a developer explanation.

---

## Customer usability

Validate:
- understand site purpose,
- find menu/price,
- select outlet,
- complete checkout,
- understand payment,
- understand pickup status,
- reach human support.

---

## Go / no-go

Do not launch broadly if:
- payment truth unreliable,
- duplicate orders occur,
- staff cannot operate queue,
- paid exception has no recovery,
- branch/menu info is materially wrong,
- mobile checkout is broken,
- critical analytics are absent.
