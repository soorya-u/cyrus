import { fsErrorFromUnknown } from "@cyrus/errors/fs";
import { orpcOk } from "@cyrus/errors/orpc";
import { Result } from "better-result";
import { listDir, listFiles, searchFiles } from "@/utils/fs";
import type { ControllerOs } from "./deps";

export function fsHandlers(os: ControllerOs) {
	return {
		listEntries: os.listEntries.handler(async ({ input }) => {
			const depth = input.depth ?? 1;
			const dirs = orpcOk(
				await Result.tryPromise({
					try: () => listDir(input.cwd, depth),
					catch: (error) => fsErrorFromUnknown(error, input.cwd),
				})
			);

			if (!input.includeFiles) return { dirs };

			const files = orpcOk(
				await Result.tryPromise({
					try: () => listFiles(input.cwd, depth),
					catch: (error) => fsErrorFromUnknown(error, input.cwd),
				})
			);

			return { dirs, files };
		}),
		searchEntries: os.searchEntries.handler(async ({ input }) => {
			const limit = input.limit ?? 80;
			return orpcOk(
				await Result.tryPromise({
					try: () => searchFiles(input.cwd, input.query, limit),
					catch: (error) => fsErrorFromUnknown(error, input.cwd),
				})
			);
		}),
	};
}
