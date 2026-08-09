import { appendConversation } from "@cyrus/database/repositories/conversations";
import { resolveThreadGitCwd } from "@cyrus/database/repositories/git";
import { orpcOk, throwOrpc } from "@cyrus/errors/orpc";
import { randomId } from "@cyrus/utils/identity";
import { log } from "evlog";
import { cancelActiveShellExecution, runShellExecution } from "@/shell/run";
import type { ControllerDeps } from "./deps";

export function shellHandlers({ os }: ControllerDeps) {
	return {
		executeShellInput: os.executeShellInput.handler(
			async ({ input, context }) => {
				const { threadId, command } = input;
				const cwd = orpcOk(await resolveThreadGitCwd(threadId));
				const shellExecutionId = randomId();

				const started = await appendConversation(threadId, {
					threadId,
					shellExecutionId,
					event: { type: "shell_execution_start", command },
				});
				if (started.isErr()) throwOrpc(started.error);
				context.eventBus.publish(started.value.chunk);

				runShellExecution({
					command,
					context,
					cwd,
					shellExecutionId,
					threadId,
				}).catch((error) => {
					log.error({
						kind: "shell_execution_failed",
						error,
						shellExecutionId,
						threadId,
					});
				});

				return { shellExecutionId };
			}
		),

		cancelShellExecution: os.cancelShellExecution.handler(({ input }) => {
			cancelActiveShellExecution(input.threadId, input.shellExecutionId);
			return {};
		}),
	};
}
