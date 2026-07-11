import { set } from "@/store/config";
import { runningPid } from "@/utils/process";
import { print } from "@/utils/style";

export async function rename(name: string): Promise<void> {
	await set("name", name);
	print.success`✓ renamed to "${name}"`;
	if ((await runningPid()) !== null)
		print.dim`Restart the worker (cyrusd stop && cyrusd start) for the new name to take effect.`;
}
