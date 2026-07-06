import type { ToolCall } from "@cyrus/hooks/types";
import {
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	TerminalIcon,
} from "lucide-react";
import { useState } from "react";

export function ToolRow({ tool }: { tool: ToolCall }) {
	const [open, setOpen] = useState(false);
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
				<span className="font-mono">{tool.name}</span>
				<span className="truncate text-muted-foreground">
					{Object.entries(tool.args)
						.map(
							([k, v]) =>
								`${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`
						)
						.join(", ")}
				</span>
				{tool.result && (
					<span className="ml-auto inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
						<CheckIcon className="size-3" /> {tool.result}
					</span>
				)}
			</button>
			{open && (
				<div className="border-border/60 border-t bg-background/60 px-2.5 py-2 font-mono text-[11px]">
					<div className="text-muted-foreground">args</div>
					<pre className="mt-0.5 whitespace-pre-wrap">
						{JSON.stringify(tool.args, null, 2)}
					</pre>
					{tool.result && (
						<>
							<div className="mt-1.5 text-muted-foreground">result</div>
							<pre className="mt-0.5 whitespace-pre-wrap">{tool.result}</pre>
						</>
					)}
				</div>
			)}
		</div>
	);
}
