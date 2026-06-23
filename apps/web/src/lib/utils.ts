export type ClassValue =
	| string
	| number
	| boolean
	| undefined
	| null
	| ClassValue[]
	| { [key: string]: unknown };

export function clsx(...inputs: ClassValue[]): string {
	const classes: string[] = [];
	for (const input of inputs) {
		if (!input) {
			continue;
		}
		if (typeof input === "string" || typeof input === "number") {
			classes.push(String(input));
		} else if (Array.isArray(input)) {
			const inner = clsx(...input);
			if (inner) {
				classes.push(inner);
			}
		} else if (typeof input === "object") {
			for (const key in input) {
				if (input[key]) {
					classes.push(key);
				}
			}
		}
	}
	return classes.join(" ");
}

const WHITESPACE_RE = /\s+/;

export function twMerge(classString: string): string {
	// minimal merge: keep last occurrence of conflicting utilities
	const parts = classString.trim().split(WHITESPACE_RE);
	const seen = new Map<string, string>();
	for (const p of parts) {
		const prefix = p.split("-")[0];
		seen.set(prefix, p);
	}
	return Array.from(seen.values()).join(" ");
}

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(...inputs));
}
