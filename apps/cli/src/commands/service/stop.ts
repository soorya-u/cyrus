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

	for (let i = 0; i < 20 && isAlive(pid); i++) await Bun.sleep(50);

	if (isAlive(pid)) {
		print.error`Worker (pid ${pid}) did not stop in time.`;
		process.exit(1);
	}
	await clearPid();
	print.success`✓ stopped (pid ${pid}).`;
}
