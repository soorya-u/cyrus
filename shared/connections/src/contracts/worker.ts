import { oc } from "@orpc/contract";
import { HelloInputSchema, HelloOutputSchema } from "../schemas/rtc/hello";

// TODO: worker-to-worker isn't needed yet; this contract is a stub
export const workerContract = {
	hello: oc.input(HelloInputSchema).output(HelloOutputSchema),
};

export type WorkerContract = typeof workerContract;
