import { type ContractRouterClient, eventIterator, oc } from "@orpc/contract";
import { z } from "zod";
import {
	AnswerInputSchema,
	DeviceInfoSchema,
	DeviceStateSchema,
	IceCandidateInputSchema,
	OfferInputSchema,
	ServerEventSchema,
} from "../schemas/signaling";

// skip output validation for HibernationEventIterators; wrapping breaks hibernation
function hibernationSafe<S extends ReturnType<typeof eventIterator>>(
	schema: S
): S {
	const std = schema["~standard"];
	return {
		...schema,
		"~standard": {
			...std,
			validate(value: unknown) {
				if (
					typeof value === "object" &&
					value !== null &&
					"hibernationCallback" in value
				) {
					return { value };
				}
				return std.validate(value);
			},
		},
	} as S;
}

export const signalingContract = {
	offer: oc.input(OfferInputSchema),
	answer: oc.input(AnswerInputSchema),
	iceCandidate: oc.input(IceCandidateInputSchema),
	listPeers: oc.output(z.array(DeviceInfoSchema)),
	onSignalingEvent: oc
		.input(DeviceStateSchema)
		.output(hibernationSafe(eventIterator(ServerEventSchema))),
};

export type SignalingContract = typeof signalingContract;
export type SignalingClient = ContractRouterClient<SignalingContract>;
