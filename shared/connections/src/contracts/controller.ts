import { eventIterator, oc } from "@orpc/contract";
import { ListAgentsOutputSchema } from "../schemas/agents";
import { ChatChunkSchema, ChatInputSchema } from "../schemas/rtc";

export const controllerContract = {
	listAgents: oc.output(ListAgentsOutputSchema),
	chat: oc.input(ChatInputSchema).output(eventIterator(ChatChunkSchema)),
	subscribe: oc.output(eventIterator(ChatChunkSchema)),
};

export type ControllerContract = typeof controllerContract;
