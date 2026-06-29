import { eventIterator, oc } from "@orpc/contract";
import {
	ChatChunkSchema,
	ChatInputSchema,
	HelloInputSchema,
	HelloOutputSchema,
} from "../schemas/rtc";

export const controllerContract = {
	hello: oc.input(HelloInputSchema).output(HelloOutputSchema),
	chat: oc.input(ChatInputSchema).output(eventIterator(ChatChunkSchema)),
	subscribe: oc.output(eventIterator(ChatChunkSchema)),
};

export type ControllerContract = typeof controllerContract;
