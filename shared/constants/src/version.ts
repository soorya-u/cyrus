import { version } from "~/package.json" with { type: "json" };

export const RELEASE_VERSION: string = version;

export const MIN_PEER_VERSION = {
	controller: "0.0.0",
	worker: "0.0.0",
} as const;

const CORE_VERSION = /^(\d+)\.(\d+)\.(\d+)/;

function core(value: string): [number, number, number] | null {
	const match = CORE_VERSION.exec(value);
	if (!match) return null;
	return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function meetsMinimumVersion(
	declared: string,
	minimum: string
): boolean {
	const have = core(declared);
	const need = core(minimum);
	if (!(have && need)) return false;
	for (let i = 0; i < 3; i++) {
		const diff = (have[i] as number) - (need[i] as number);
		if (diff !== 0) return diff > 0;
	}
	return true;
}
