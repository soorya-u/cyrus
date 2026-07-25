import { get } from "@/store/config";
import { isHealthy, runningPid } from "@/utils/process";
import { print } from "@/utils/style";

/**
 * Reports worker liveness and readiness.
 * Exit 0 only when the worker is running and healthy (ready + fresh heartbeat).
 * Used by process-compose readiness probes and scripts.
 */
export async function status(): Promise<void> {
	const pid = await runningPid();
	if (pid === null) {
		print.dim`Not running.`;
		process.exitCode = 1;
		return;
	}

	const name = await get("name");
	const nameSuffix = name ? ` as "${name}"` : "";

	if (!(await isHealthy())) {
		print.error`Running (pid ${pid})${nameSuffix}, but not ready.`;
		process.exitCode = 1;
		return;
	}

	print.success`Running (pid ${pid})${nameSuffix}.`;
}
