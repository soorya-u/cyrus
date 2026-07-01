import { get } from "@/store/config";
import { runningPid } from "@/utils/process";
import { print } from "@/utils/style";

export async function status(): Promise<void> {
	const pid = await runningPid();
	if (pid === null) {
		print.dim`Not running.`;
		return;
	}
	const name = await get("name");
	print.success`Running (pid ${pid})${name ? ` as "${name}"` : ""}.`;
}
