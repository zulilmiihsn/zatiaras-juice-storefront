# ANALYTICS.md — Multi-City Measurement

**Cut-off:** 2026-09-25.

## Dimensions

All commerce/location events carry `city` and/or `outlet_id` (`outlet`) where known.
Funnels analyzable overall, per city, per outlet. Analytics never payment/accounting
truth. Never store precise GPS; browser coords used transiently for nearest-outlet
only.

## Events (see `src/lib/analytics/events.ts`)

Funnel (existing): page/outlet/menu/product views, add/remove/cart view,
checkout_started, pickup_slot_selected, payment__, order__, fulfillment_failed,
whatsapp_support_clicked, refund__, feedback_submitted, group_order__,
hero_order_clicked, outlet_select_clicked, menu_preview_clicked, product_clicked.

Location/outlet (new): location_suggested, location_suggestion_accepted,
location_suggestion_changed, browser_location_requested/granted/denied,
outlet_selector_opened, outlet_selected, outlet_changed,
cart_revalidation_started/completed, cart_price_changed_after_switch,
cart_item_unavailable_after_switch.

Sensitive keys (`whatsapp`, `name`, `phone`, `email`, `address`, `signature`,
`token`, `note`) are stripped by `sanitize()`.
