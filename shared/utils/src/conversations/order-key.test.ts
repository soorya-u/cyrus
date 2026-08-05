import { describe, expect, test } from "vitest";
import { compareBySeqSub, compareOrderKey, orderKey } from "./order-key";

describe("orderKey", () => {
	test("defaults a missing sub to 0", () => {
		expect(orderKey({ seq: 3 })).toEqual({ seq: 3, sub: 0 });
	});
});

describe("compareOrderKey", () => {
	test("orders by seq first, then sub", () => {
		expect(
			compareOrderKey({ seq: 1, sub: 5 }, { seq: 2, sub: 0 })
		).toBeLessThan(0);
		expect(
			compareOrderKey({ seq: 2, sub: 0 }, { seq: 2, sub: 1 })
		).toBeLessThan(0);
		expect(compareOrderKey({ seq: 2, sub: 1 }, { seq: 2, sub: 1 })).toBe(0);
	});
});

describe("compareBySeqSub", () => {
	test("ignores createdAt — a reversed createdAt does not flip seq/sub order", () => {
		const earlierBySeq = {
			seq: 1,
			sub: 0,
			createdAt: "2026-01-01T00:00:05.000Z",
		};
		const laterBySeq = {
			seq: 2,
			sub: 0,
			createdAt: "2026-01-01T00:00:00.000Z",
		};

		expect(compareBySeqSub(earlierBySeq, laterBySeq)).toBeLessThan(0);
	});
});
