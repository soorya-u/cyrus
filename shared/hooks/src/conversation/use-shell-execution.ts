import { shellErrorMessageFromUnknown } from "@cyrus/errors/shell";
import { Result } from "better-result";
import { useRtc } from "../contexts/rtc";

function toError(cause: unknown): Error {
	return new Error(shellErrorMessageFromUnknown(cause));
}

export function useShellExecution() {
	const { connection: workerConnection } = useRtc();

	async function executeShellInput(
		threadId: string,
		command: string
	): Promise<Result<void, Error>> {
		const result = await Result.tryPromise({
			try: () =>
				workerConnection.client.executeShellInput({ threadId, command }),
			catch: toError,
		});
		return result.map(() => undefined);
	}

	async function cancelShellExecution(
		threadId: string,
		shellExecutionId: string
	): Promise<Result<void, Error>> {
		const result = await Result.tryPromise({
			try: () =>
				workerConnection.client.cancelShellExecution({
					threadId,
					shellExecutionId,
				}),
			catch: toError,
		});
		return result.map(() => undefined);
	}

	return { executeShellInput, cancelShellExecution };
}
