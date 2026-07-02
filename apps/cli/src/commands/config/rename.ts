import { set } from "@/store/config";
import { print } from "@/utils/style";

export async function rename(name: string): Promise<void> {
	await set("name", name);
	print.success`✓ renamed to "${name}"`;
	print.dim`Restart the worker (cyrusd stop && cyrusd start) for the new name to take effect.`;
}
