import { HelloInputSchema, HelloOutputSchema } from "@cyrus/schemas/rtc/hello";
import { oc } from "@orpc/contract";

// TODO: worker-to-worker isn't needed yet; this contract is a stub
export const workerContract = {
	hello: oc.input(HelloInputSchema).output(HelloOutputSchema),
};

export type WorkerContract = typeof workerContract;
