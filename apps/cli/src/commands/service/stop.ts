import { Result } from "better-result";
import { clearPid, isAlive, runningPid } from "@/utils/process";
import { print } from "@/utils/style";

export async function stop(): Promise<void> {
	const pid = await runningPid();
	if (pid === null) {
		print.dim`No worker is running — nothing to stop.`;
		return;
	}

	Result.try(() => process.kill(pid, "SIGTERM"));

	for (let i = 0; i < 20 && isAlive(pid); i++) {
		await Bun.sleep(50);
	}
	await clearPid();
	print.success`✓ stopped (pid ${pid}).`;
}
