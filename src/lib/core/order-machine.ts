import { ALLOWED_ORDER_TRANSITIONS, type OrderState } from './contracts';

export function canTransition(from: OrderState, to: OrderState): boolean {
	return ALLOWED_ORDER_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: OrderState, to: OrderState): void {
	if (!canTransition(from, to)) throw new Error(`illegal:${from}->${to}`);
}

// Payment vs fulfillment jangan blur. FR-ORDER-003.
export function isPaidException(state: OrderState): boolean {
	return state === 'FULFILLMENT_FAILED';
}
