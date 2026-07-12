import type { ToolCallView } from "@cyrus/schemas/view";
import { asRecord, asTrimmedString } from "./guards";

export type ToolFields = {
	command: string | null;
	path: string | null;
	query: string | null;
	output: string | null;
};

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
