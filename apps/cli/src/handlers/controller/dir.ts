import { ORPCError } from "@orpc/server";
import { Result } from "better-result";
import { listDir } from "@/utils/dir";
import { toMessage } from "@/utils/error";
import type { ControllerOs } from "./deps";

export function dirHandlers(os: ControllerOs) {
	return {
		listDir: os.listDir.handler(async ({ input }) =>
			(
				await Result.tryPromise(() => listDir(input.cwd, input.depth ?? 1))
			).match({
				ok: (dirs) => ({ dirs }),
				err: (error) => {
					throw new ORPCError("NOT_FOUND", { message: toMessage(error) });
				},
			})
		),
	};
}
