import type { ChildProcess } from "node:child_process";

export function waitForExit(proc: ChildProcess): Promise<number | null> {
	if (proc.exitCode !== null) {
		return Promise.resolve(proc.exitCode);
	}

	return new Promise((resolve) => {
		proc.once("exit", (code) => {
			resolve(code);
		});
	});
}
