import { z } from "zod";

export const SessionDescriptionSchema = z.object({
	sdp: z.string().optional(),
	type: z.enum(["offer", "answer", "pranswer", "rollback"]),
});

export const IceCandidateSchema = z.object({
	candidate: z.string(),
	sdpMid: z.string().nullish(),
	sdpMLineIndex: z.number().nullish(),
	usernameFragment: z.string().nullish(),
});

export const DeviceRoleSchema = z.enum(["controller", "worker"]);

export const DeviceStateSchema = z.object({
	deviceId: z.string(),
	name: z.string(),
	role: DeviceRoleSchema,
});

export const DeviceInfoSchema = DeviceStateSchema.extend({
	connectionId: z.string(),
});

export const ClientMessageSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("offer"),
		to: z.string(),
		offer: SessionDescriptionSchema,
	}),
	z.object({
		type: z.literal("answer"),
		to: z.string(),
		answer: SessionDescriptionSchema,
	}),
	z.object({
		type: z.literal("ice-candidate"),
		to: z.string(),
		candidate: IceCandidateSchema,
	}),
]);

export const ServerEventSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("peer-joined"), peer: DeviceInfoSchema }),
	z.object({ type: z.literal("room-peers"), peers: z.array(DeviceInfoSchema) }),
	z.object({ type: z.literal("peer-left"), connectionId: z.string() }),
	z.object({
		type: z.literal("offer"),
		from: z.string(),
		offer: SessionDescriptionSchema,
	}),
	z.object({
		type: z.literal("answer"),
		from: z.string(),
		answer: SessionDescriptionSchema,
	}),
	z.object({
		type: z.literal("ice-candidate"),
		from: z.string(),
		candidate: IceCandidateSchema,
	}),
]);

export type DeviceState = z.infer<typeof DeviceStateSchema>;
export type DeviceInfo = z.infer<typeof DeviceInfoSchema>;
export type ClientMessage = z.infer<typeof ClientMessageSchema>;
export type ServerEvent = z.infer<typeof ServerEventSchema>;
