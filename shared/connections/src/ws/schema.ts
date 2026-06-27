import { z } from "zod";

const SessionDescriptionSchema = z.object({
	sdp: z.string().optional(),
	type: z.enum(["offer", "answer", "pranswer", "rollback"]),
});

const IceCandidateSchema = z.object({
	candidate: z.string(),
	sdpMid: z.string().nullish(),
	sdpMLineIndex: z.number().nullish(),
	usernameFragment: z.string().nullish(),
});

const DeviceRoleSchema = z.enum(["controller", "worker"]);

export const DeviceStateSchema = z.object({
	deviceId: z.string(),
	name: z.string(),
	role: DeviceRoleSchema,
});

const DeviceInfoSchema = DeviceStateSchema.extend({
	connectionId: z.string(),
});

export const OfferInputSchema = z.object({
	to: z.string(),
	offer: SessionDescriptionSchema,
});

export const AnswerInputSchema = z.object({
	to: z.string(),
	answer: SessionDescriptionSchema,
});

export const IceCandidateInputSchema = z.object({
	to: z.string(),
	candidate: IceCandidateSchema,
});

const ServerEventSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("peer-joined"), peer: DeviceInfoSchema }),
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
export type ServerEvent = z.infer<typeof ServerEventSchema>;
