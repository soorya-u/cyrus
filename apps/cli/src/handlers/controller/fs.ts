import { ORPCError } from "@orpc/server";
import { Result } from "better-result";
import { toMessage } from "@/utils/error";
import { listDir, listFiles, searchFiles } from "@/utils/fs";
import type { ControllerOs } from "./deps";

export function fsHandlers(os: ControllerOs) {
	return {
		listEntries: os.listEntries.handler(async ({ input }) => {
			const depth = input.depth ?? 1;
			const dirsResult = await Result.tryPromise(() =>
				listDir(input.cwd, depth)
			);
			if (dirsResult.isErr()) {
				throw new ORPCError("NOT_FOUND", {
					message: toMessage(dirsResult.error),
				});
			}

			if (!input.includeFiles) return { dirs: dirsResult.value };

			const filesResult = await Result.tryPromise(() =>
				listFiles(input.cwd, depth)
			);
			if (filesResult.isErr()) {
				throw new ORPCError("NOT_FOUND", {
					message: toMessage(filesResult.error),
				});
			}

			return { dirs: dirsResult.value, files: filesResult.value };
		}),
		searchEntries: os.searchEntries.handler(async ({ input }) => {
			const limit = input.limit ?? 80;
			const result = await Result.tryPromise(() =>
				searchFiles(input.cwd, input.query, limit)
			);
			if (result.isErr()) {
				throw new ORPCError("NOT_FOUND", {
					message: toMessage(result.error),
				});
			}
			return result.value;
		}),
	};
}
