# ANALYTICS.md — Measurement Plan


**Human authority: BRD/PRD under `docs/human/`**
**Baseline:** Reconciled v1.1
## Objective

Measure whether Zatiaras Web creates profitable, reliable, repeatable customer behavior.

Traffic alone is not the north star.

---

## Core funnel

```text
Qualified Discovery
→ Menu/Product View
→ Add to Cart
→ Checkout
→ Payment Created
→ Payment Success
→ Order Confirmed
→ Order Completed
→ Repeat
```

---

## Suggested events

Discovery:
```text
page_view
outlet_view
menu_view
product_view
```

Commerce:
```text
add_to_cart
remove_from_cart
cart_view
checkout_started
pickup_slot_selected
payment_created
payment_success
payment_failed
order_confirmed
order_preparing
order_ready
order_completed
```

Exception:
```text
fulfillment_failed
whatsapp_support_clicked
refund_requested
refund_completed
feedback_submitted
```

Group order:
```text
group_order_started
group_order_submitted
group_order_approved
group_order_rejected
group_order_paid
```

---

## Dimensions

Where privacy-safe:
- outlet,
- product/menu ID,
- category,
- acquisition source,
- campaign/UTM,
- order value,
- order type,
- pickup slot,
- failure reason.

Never send sensitive payment/customer data to third-party analytics.

---

## Acquisition sources

Support attribution for:
- Google Search
- Google Maps/GBP
- Instagram/social
- Direct
- WhatsApp
- ChatGPT
- Gemini
- Claude
- Perplexity
- Copilot
- other identifiable referrals

---

## Primary KPIs

- paid web orders/day
- conversion rate
- AOV
- contribution/order
- web share of orders
- completion rate
- payment failure rate
- fulfillment failure rate
- refund rate
- prep/ready time
- repeat rate
- group-order volume/value

---

## Transaction truth

Third-party analytics:
- acquisition,
- funnel behavior,
- campaign attribution.

Transactional database:
- order truth,
- payment truth,
- revenue,
- refund,
- completion.

Do not use analytics revenue as accounting truth.
