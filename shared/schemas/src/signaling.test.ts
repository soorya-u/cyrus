import { describe, expect, test } from "vitest";
import {
	DeviceInfoSchema,
	DeviceRoleSchema,
	DeviceStateSchema,
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
				version: "0.1.0",
			})
		).toEqual({
			id: "device-1",
			name: "Laptop",
			role: "worker",
			version: "0.1.0",
		});
	});

	test("rejects unknown device roles", () => {
		expect(() =>
			DeviceInfoSchema.parse({
				id: "device-1",
				name: "Laptop",
				role: "observer",
				version: "0.1.0",
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

describe("DeviceStateSchema version", () => {
	test("reads a peer that predates the handshake as 0.0.0", () => {
		expect(
			DeviceStateSchema.parse({ name: "Laptop", role: "worker" }).version
		).toBe("0.0.0");
	});

	test("rejects a version that is not major.minor.patch", () => {
		expect(() =>
			DeviceStateSchema.parse({
				name: "Laptop",
				role: "worker",
				version: "new",
			})
		).toThrow();
	});
});
