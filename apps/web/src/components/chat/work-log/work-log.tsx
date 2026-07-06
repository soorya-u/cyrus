import type { GitDiff, ToolCall } from "@cyrus/hooks/types";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { DiffRow } from "@/components/chat/work-log/diff-row";
import { ToolRow } from "@/components/chat/work-log/tool-row";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";

export type WorkLogEntry = {
	activities?: ToolCall[];
	diffs?: GitDiff[];
	id: string;
	turnId?: string;
	type: "work";
};

export function WorkLog({ entry }: { entry: WorkLogEntry }) {
	const [open, setOpen] = useState(true);
	const tools: ToolCall[] = entry.activities ?? [];
	const diffs: GitDiff[] = entry.diffs ?? [];
	return (
		<Collapsible className="mb-3" onOpenChange={setOpen} open={open}>
			<div className="flex items-center gap-2 py-1">
				<CollapsibleTrigger className="inline-flex items-center gap-1 font-medium text-[11px] text-muted-foreground hover:text-foreground">
					{open ? (
						<ChevronDownIcon className="size-3.5" />
					) : (
						<ChevronRightIcon className="size-3.5" />
					)}
					<span>Turn activity</span>
					<span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
						{tools.length} tools · {diffs.length} diffs
					</span>
				</CollapsibleTrigger>
			</div>
			<CollapsibleContent className="flex flex-col gap-1.5 pl-1">
				{tools.map((t) => (
					<ToolRow key={t.id} tool={t} />
				))}
				{diffs.map((d) => (
					<DiffRow diff={d} key={d.id} />
				))}
			</CollapsibleContent>
		</Collapsible>
	);
}
