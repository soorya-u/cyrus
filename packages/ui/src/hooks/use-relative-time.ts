export function relativeTime(input: string | number | Date): string {
	const ts =
		input instanceof Date ? input.getTime() : new Date(input).getTime();
	if (Number.isNaN(ts)) {
		return "";
	}
	const now = Date.now();
	const diff = Math.max(0, now - ts);
	const sec = Math.floor(diff / 1000);
	if (sec < 5) {
		return "now";
	}
	if (sec < 60) {
		return `${sec}s`;
	}
	const min = Math.floor(sec / 60);
	if (min < 60) {
		return `${min}m`;
	}
	const hr = Math.floor(min / 60);
	if (hr < 24) {
		return `${hr}h`;
	}
	const day = Math.floor(hr / 24);
	if (day < 7) {
		return `${day}d`;
	}
	const wk = Math.floor(day / 7);
	if (wk < 4) {
		return `${wk}w`;
	}
	const mo = Math.floor(day / 30);
	if (mo < 12) {
		return `${mo}mo`;
	}
	const yr = Math.floor(day / 365);
	return `${yr}y`;
}

export function formatMessageTime(input: string | number | Date): string {
	const ts =
		input instanceof Date ? input.getTime() : new Date(input).getTime();
	if (Number.isNaN(ts)) {
		return "";
	}
	return new Intl.DateTimeFormat(undefined, {
		hour: "numeric",
		minute: "2-digit",
	}).format(ts);
}

export function formatShortTimestamp(
	input: string | number | Date,
	format: "relative" | "time" = "relative"
): string {
	return format === "relative" ? relativeTime(input) : formatMessageTime(input);
}

export function formatElapsed(
	startedAt: string | number | Date,
	now: string | number | Date
): string {
	const start =
		startedAt instanceof Date
			? startedAt.getTime()
			: new Date(startedAt).getTime();
	const end = now instanceof Date ? now.getTime() : new Date(now).getTime();
	if (Number.isNaN(start) || Number.isNaN(end)) {
		return "0s";
	}
	const diff = Math.max(0, end - start);
	const sec = Math.floor(diff / 1000);
	if (sec < 60) {
		return `${sec}s`;
	}
	const min = Math.floor(sec / 60);
	const rem = sec % 60;
	return `${min}m ${rem}s`;
}
