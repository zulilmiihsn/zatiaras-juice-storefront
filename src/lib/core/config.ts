// Open decisions. Agent dilarang invent nilai. Wajib inject eksplisit.
export interface OpenConfig {
	database?: 'd1' | 'postgres' | string;
	paymentProvider?: string;
	groupOrderThreshold?: number;
	pickupSlotCapacityRule?: string;
	menuPriceVerified?: boolean;
	refundAutomation?: string;
}

export function requireOpenConfig(cfg: OpenConfig, keys: (keyof OpenConfig)[]): void {
	const missing = keys.filter((k) => cfg[k] === undefined);
	if (missing.length > 0) throw new Error(`open_config_missing:${missing.join(',')}`);
}
