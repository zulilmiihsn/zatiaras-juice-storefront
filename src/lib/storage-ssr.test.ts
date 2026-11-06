import { describe, expect, it } from 'vitest';
import { clearEvents, listEvents, track } from './analytics/events';
import { listGroups } from './group/logic';
import { readRememberedOutlet, rememberOutlet } from './location/suggest';
import { createMockPayment, getMockMeta, mockWebhook } from './payment/mock-provider';
import { failReason, listOrders, moveOrder, saveOrder, seedDemo } from './stores/orders';
import { listFeedback, saveFeedback } from './support';

describe('browser storage during SSR', () => {
	it('never reads the Node localStorage getter, even when the global exists', () => {
		const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
		Object.defineProperty(globalThis, 'localStorage', {
			configurable: true,
			get() {
				throw new Error('SSR must not access Node localStorage');
			}
		});

		try {
			expect(listEvents()).toEqual([]);
			expect(() => track('page_view')).not.toThrow();
			expect(() => clearEvents()).not.toThrow();
			expect(listGroups()).toEqual([]);
			expect(readRememberedOutlet()).toEqual({});
			expect(() => rememberOutlet('juanda')).not.toThrow();
			expect(createMockPayment('test').paymentId).toBe('mock-test');
			expect(getMockMeta('test')).toBeUndefined();
			expect(mockWebhook({ orderId: 'test', amount: 100, ok: true })).toBe('applied');
			expect(listOrders()).toEqual([]);
			expect(() => saveOrder({} as Parameters<typeof saveOrder>[0])).not.toThrow();
			expect(() => moveOrder('test', 'PAID')).toThrow('ssr_no_store');
			expect(failReason('test')).toBe('');
			expect(seedDemo()).toEqual([]);
			expect(listFeedback()).toEqual([]);
			expect(() => saveFeedback({} as Parameters<typeof saveFeedback>[0])).not.toThrow();
		} finally {
			if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
			else Reflect.deleteProperty(globalThis, 'localStorage');
		}
	});
});
