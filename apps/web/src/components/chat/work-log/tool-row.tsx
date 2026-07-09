import type { ToolCallView } from "@cyrus/schemas/view";
import {
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	TerminalIcon,
} from "lucide-react";
import { useState } from "react";

function formatRaw(value: unknown): string {
	if (value === undefined) return "";
	return typeof value === "string" ? value : JSON.stringify(value);
}

function formatRawInputSummary(rawInput: unknown): string {
	if (rawInput && typeof rawInput === "object" && !Array.isArray(rawInput)) {
		return Object.entries(rawInput as Record<string, unknown>)
			.map(([key, value]) => `${key}: ${formatRaw(value)}`)
			.join(", ");
	}
	return formatRaw(rawInput);
}

export function ToolRow({ tool }: { tool: ToolCallView }) {
	const [open, setOpen] = useState(false);
	const rawOutput = formatRaw(tool.rawOutput);
	return (
		<div className="overflow-hidden rounded-md border border-border/60 bg-muted/30 text-xs">
			<button
				className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
				onClick={() => setOpen((v) => !v)}
				type="button"
			>
				{open ? (
					<ChevronDownIcon className="size-3" />
				) : (
					<ChevronRightIcon className="size-3" />
				)}
				<TerminalIcon className="size-3 text-muted-foreground" />
				<span className="font-mono">{tool.title}</span>
				<span className="truncate text-muted-foreground">
					{formatRawInputSummary(tool.rawInput)}
				</span>
				{rawOutput && (
					<span className="ml-auto inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
						<CheckIcon className="size-3" /> {rawOutput}
					</span>
				)}
			</button>
			{open && (
				<div className="border-border/60 border-t bg-background/60 px-2.5 py-2 font-mono text-[11px]">
					<div className="text-muted-foreground">rawInput</div>
					<pre className="mt-0.5 whitespace-pre-wrap">
						{formatRaw(tool.rawInput)}
					</pre>
					{rawOutput && (
						<>
							<div className="mt-1.5 text-muted-foreground">rawOutput</div>
							<pre className="mt-0.5 whitespace-pre-wrap">{rawOutput}</pre>
						</>
					)}
				</div>
			)}
		</div>
	);
}
