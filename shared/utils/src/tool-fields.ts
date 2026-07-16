import type { ToolCallView } from "@cyrus/schemas/view";

export type ToolFields = {
	command: string | null;
	path: string | null;
	query: string | null;
	output: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function asTrimmedString(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export function extractToolFields(tool: ToolCallView): ToolFields {
	const rawInput = asRecord(tool.rawInput);
	return {
		command:
			asTrimmedString(rawInput?.command) ??
			asTrimmedString(rawInput?.executable),
		path:
			asTrimmedString(rawInput?.path) ??
			asTrimmedString(rawInput?.filePath) ??
			asTrimmedString(rawInput?.relativePath),
		query:
			asTrimmedString(rawInput?.query) ??
			asTrimmedString(rawInput?.pattern) ??
			asTrimmedString(rawInput?.searchTerm),
		output: asTrimmedString(tool.rawOutput),
	};
}
