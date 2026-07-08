import {
	differenceInDays,
	differenceInHours,
	differenceInMinutes,
	differenceInMonths,
	differenceInSeconds,
	differenceInWeeks,
	differenceInYears,
	format,
	formatISO,
	isValid,
} from "date-fns";

export function nowISO(): string {
	return formatISO(new Date());
}

function parseTimeInput(input: string | number | Date): Date | null {
	const date = input instanceof Date ? input : new Date(input);
	return isValid(date) ? date : null;
}

export function relativeTime(input: string | number | Date): string {
	const date = parseTimeInput(input);
	if (!date) {
		return "";
	}

	const now = new Date();
	const seconds = differenceInSeconds(now, date);
	if (seconds < 5) {
		return "now";
	}
	if (seconds < 60) {
		return `${seconds}s`;
	}

	const minutes = differenceInMinutes(now, date);
	if (minutes < 60) {
		return `${minutes}m`;
	}

	const hours = differenceInHours(now, date);
	if (hours < 24) {
		return `${hours}h`;
	}

	const days = differenceInDays(now, date);
	if (days < 7) {
		return `${days}d`;
	}

	const weeks = differenceInWeeks(now, date);
	if (weeks < 4) {
		return `${weeks}w`;
	}

	const months = differenceInMonths(now, date);
	if (months < 12) {
		return `${months}mo`;
	}

	return `${differenceInYears(now, date)}y`;
}

export function formatMessageTime(input: string | number | Date): string {
	const date = parseTimeInput(input);
	if (!date) {
		return "";
	}

	return format(date, "p");
}
