import { get } from "@/store/config";
import { isHealthy, readHealth } from "@/store/health";
import { runningPid } from "@/utils/process";
import { print } from "@/utils/style";

export async function status(): Promise<void> {
	if (await isHealthy()) {
		const health = await readHealth();
		const name = await get("name");
		const nameSuffix = name ? ` as "${name}"` : "";
		print.success`Running (pid ${health?.pid})${nameSuffix}.`;
		return;
	}

	const pid = await runningPid();
	if (pid === null) {
		print.dim`Not running.`;
		process.exitCode = 1;
		return;
	}

	const name = await get("name");
	const nameSuffix = name ? ` as "${name}"` : "";
	print.error`Running (pid ${pid})${nameSuffix}, but not ready.`;
	process.exitCode = 1;
}
