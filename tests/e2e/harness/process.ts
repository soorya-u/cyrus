import type { ChildProcess } from "node:child_process";

export function waitForExit(proc: ChildProcess): Promise<number | null> {
	if (proc.exitCode !== null) {
		return Promise.resolve(proc.exitCode);
	}

	return new Promise((resolve, reject) => {
		const onExit = (code: number | null) => {
			proc.off("error", onError);
			resolve(code);
		};
		const onError = (error: Error) => {
			proc.off("exit", onExit);
			reject(error);
		};
		proc.once("exit", onExit);
		proc.once("error", onError);
	});
}
