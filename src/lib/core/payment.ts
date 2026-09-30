// ARCHITECTURE.md adapter boundary. Provider OPEN, jangan lock asumsi.
import type { PaymentState } from './contracts';

export interface PaymentRequest {
	orderId: string;
	amount: number;
}

export interface WebhookEvent {
	providerEventId: string;
	orderId: string;
	amount: number;
	state: PaymentState;
	signatureValid: boolean;
}

export interface PaymentService {
	createPayment(req: PaymentRequest): Promise<{ paymentId: string }>;
	getPaymentStatus(paymentId: string): Promise<PaymentState>;
	handleWebhook(evt: WebhookEvent): Promise<'applied' | 'duplicate' | 'rejected'>;
	refund(orderId: string, amount: number): Promise<void>;
}

// Browser success bukan otoritas. FR-PAYMENT-001.
export function verifyServerPayment(args: {
	expectedAmount: number;
	expectedOrderId: string;
	evt: WebhookEvent;
	seenEventIds: Set<string>;
}): 'applied' | 'duplicate' | 'rejected' {
	if (!args.evt.signatureValid) return 'rejected';
	if (args.seenEventIds.has(args.evt.providerEventId)) return 'duplicate';
	if (args.evt.orderId !== args.expectedOrderId) return 'rejected';
	if (args.evt.amount !== args.expectedAmount) return 'rejected';
	args.seenEventIds.add(args.evt.providerEventId);
	return 'applied';
}
