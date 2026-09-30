// CONTRACTS.md baseline reconciled v1.1. Jangan reinterpretasi sembarangan.
export const AVAILABILITY = ['AVAILABLE', 'LIMITED', 'SOLD_OUT'] as const;
export type Availability = (typeof AVAILABILITY)[number];

export const OUTLET_LOAD = ['NORMAL', 'BUSY', 'VERY_BUSY', 'PAUSED'] as const;
export type OutletLoad = (typeof OUTLET_LOAD)[number];

export const ORDER_STATES = [
	'DRAFT',
	'PENDING_PAYMENT',
	'PAID',
	'CONFIRMED',
	'PREPARING',
	'READY',
	'COMPLETED',
	'FULFILLMENT_FAILED',
	'REFUND_PENDING',
	'REFUNDED',
	'EXPIRED',
	'CANCELLED'
] as const;
export type OrderState = (typeof ORDER_STATES)[number];

// FR-ORDER-001/002/003. CANCELLED bukan pengganti vague paid failure.
export const ALLOWED_ORDER_TRANSITIONS: Record<OrderState, OrderState[]> = {
	DRAFT: ['PENDING_PAYMENT'],
	PENDING_PAYMENT: ['PAID', 'EXPIRED'],
	PAID: ['CONFIRMED', 'FULFILLMENT_FAILED'],
	CONFIRMED: ['PREPARING', 'FULFILLMENT_FAILED'],
	PREPARING: ['READY'],
	READY: ['COMPLETED'],
	COMPLETED: [],
	FULFILLMENT_FAILED: ['REFUND_PENDING'],
	REFUND_PENDING: ['REFUNDED'],
	REFUNDED: [],
	EXPIRED: [],
	CANCELLED: []
};

export const PAYMENT_STATES = [
	'CREATED',
	'PENDING',
	'PAID',
	'FAILED',
	'EXPIRED',
	'REFUND_PENDING',
	'REFUNDED'
] as const;
export type PaymentState = (typeof PAYMENT_STATES)[number];

export const GROUP_ORDER_STATES = [
	'REQUESTED',
	'REVIEWING',
	'APPROVED',
	'REJECTED',
	'PENDING_PAYMENT',
	'CONFIRMED',
	'SCHEDULED_PREPARATION',
	'READY',
	'COMPLETED'
] as const;
export type GroupOrderState = (typeof GROUP_ORDER_STATES)[number];

export const SUPPORT_CATEGORIES = [
	'TASTE',
	'BITTER',
	'SWEETNESS',
	'WRONG_ORDER',
	'SPILL_OR_LEAK',
	'DELAY',
	'SERVICE',
	'CLEANLINESS',
	'STOCK_OR_FULFILLMENT',
	'PAYMENT',
	'OTHER'
] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

// Core entities. Tabel DB boleh beda.
export const CITY_NAMES = ['Samarinda', 'Berau', 'Balikpapan'] as const;
export type City = (typeof CITY_NAMES)[number];

export const OUTLET_IDS = [
	'juanda',
	'slamet-riyadi',
	'merah-delima',
	'kutilang',
	'gatot-subroto'
] as const;
export type OutletId = (typeof OUTLET_IDS)[number];

export const FULFILLMENT_METHODS = ['PICKUP'] as const; // future: 'DELIVERY'
export type FulfillmentMethod = (typeof FULFILLMENT_METHODS)[number];

export const LOCATION_SOURCES = ['remembered', 'ip', 'manual', 'browser-geolocation'] as const;
export type LocationSource = (typeof LOCATION_SOURCES)[number];

export interface CityInfo {
	id: string; // 'samarinda' | 'berau' | 'balikpapan'
	name: City;
	tagline?: string;
}

export interface Outlet {
	id: OutletId;
	name: string;
	city: City;
	cityId: string;
	address: string; // VERIFY via GBP, jangan invent
	hours: string; // planning truth, update sebelum rilis bila berubah
	load: OutletLoad;
	acceptsWebOrders: boolean;
	mapsUrl?: string;
	phone?: string;
	verified: boolean; // false = alamat/jam/koordinat belum terverifikasi penuh
}

export interface MenuItem {
	id: string;
	name: string;
	description: string;
	price: number; // VERIFY menu/price truth sebelum freeze
	image?: string;
}

export interface MenuVariant {
	id: string;
	menuItemId: string;
	name: string;
	priceDelta: number;
}

export interface OutletMenuAvailability {
	outletId: OutletId;
	menuItemId: string;
	state: Availability;
	orderable: boolean;
}

// Outlet-aware offering: harga/availabilitas resolve lewat outlet, bukan global.
export interface OutletMenuOffering {
	outletId: OutletId;
	menuItemId: string;
	price: number;
	availability: Availability;
	isOrderable: boolean;
	note?: string;
}

export interface PickupSlot {
	id: string;
	outletId: OutletId;
	label: string;
	capacityRule: string; // OPEN, configurable
}

export interface CustomerContact {
	name: string;
	whatsapp: string;
}

export interface OrderItem {
	menuItemId: string;
	name?: string;
	variantId?: string;
	qty: number;
	note?: string;
	unitPrice: number;
}

export interface Order {
	id: string;
	outletId: OutletId;
	fulfillmentMethod?: FulfillmentMethod;
	contact: CustomerContact;
	items: OrderItem[];
	pickupSlotId: string;
	state: OrderState;
	total: number;
}

export interface Payment {
	id: string;
	orderId: string;
	state: PaymentState;
	amount: number;
	providerEventId: string;
}

export interface Refund {
	id: string;
	orderId: string;
	amount: number;
	reason: string;
	decidedBy: string;
}

export interface SupportCase {
	id: string;
	orderId: string;
	category: SupportCategory;
	note?: string;
}

export interface OrderEvent {
	id: string;
	orderId: string;
	from: OrderState;
	to: OrderState;
	at: string;
}

export interface AnalyticsEvent {
	name: string;
	params: Record<string, string | number | boolean>;
}
