import { describe, expect, test } from "bun:test";
import {
	DeviceInfoSchema,
	DeviceRoleSchema,
	OfferInputSchema,
	ServerEventSchema,
} from "./signaling";

describe("signaling schemas", () => {
	test("accepts declared device metadata", () => {
		expect(DeviceRoleSchema.parse("controller")).toBe("controller");
		expect(
			DeviceInfoSchema.parse({
				id: "device-1",
				name: "Laptop",
				role: "worker",
			})
		).toEqual({
			id: "device-1",
			name: "Laptop",
			role: "worker",
		});
	});

	test("rejects unknown device roles", () => {
		expect(() =>
			DeviceInfoSchema.parse({
				id: "device-1",
				name: "Laptop",
				role: "observer",
			})
		).toThrow();
	});

	test("parses offer input and relayed offer events", () => {
		const offer = {
			sdp: "v=0",
			type: "offer",
		} as const;

		expect(OfferInputSchema.parse({ to: "worker-1", offer })).toEqual({
			to: "worker-1",
			offer,
		});
		expect(
			ServerEventSchema.parse({
				type: "offer",
				from: "controller-1",
				offer,
			})
		).toEqual({
			type: "offer",
			from: "controller-1",
			offer,
		});
	});

	test("rejects malformed ICE candidates", () => {
		expect(() =>
			ServerEventSchema.parse({
				type: "ice-candidate",
				from: "controller-1",
				candidate: { sdpMid: "0" },
			})
		).toThrow();
	});
});
