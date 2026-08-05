export type OrderKey = { seq: number; sub: number };

export function orderKey(entity: { seq: number; sub?: number }): OrderKey {
	return { seq: entity.seq, sub: entity.sub ?? 0 };
}

export function compareOrderKey(left: OrderKey, right: OrderKey): number {
	return left.seq - right.seq || left.sub - right.sub;
}

export function compareBySeqSub(
	left: { seq: number; sub?: number },
	right: { seq: number; sub?: number }
): number {
	return compareOrderKey(orderKey(left), orderKey(right));
}
