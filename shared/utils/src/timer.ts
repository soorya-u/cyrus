import { differenceInSeconds, isValid, parseISO } from "date-fns";
import { nowISO } from "./time";

function parseIsoDate(iso: string): Date | null {
	const date = parseISO(iso);
	return isValid(date) ? date : null;
}

export function formatElapsedTimer(
	startIso: string,
	endIso: string
): string | null {
	const start = parseIsoDate(startIso);
	const end = parseIsoDate(endIso);
	if (!(start && end)) return null;

	const seconds = Math.max(0, differenceInSeconds(end, start));
	if (seconds < 60) return `${seconds}s`;

	const minutes = Math.floor(seconds / 60);
	const remainder = seconds % 60;
	return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
}

export function formatElapsedTimerNow(startIso: string): string {
	return formatElapsedTimer(startIso, nowISO()) ?? "0s";
}
