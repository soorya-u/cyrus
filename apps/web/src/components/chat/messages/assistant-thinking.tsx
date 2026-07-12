import type { ThoughtView } from "@cyrus/schemas/view";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function AssistantThinking({ thought }: { thought: ThoughtView }) {
	const [open, setOpen] = useState(Boolean(thought.streaming));

	useEffect(() => {
		if (thought.streaming) setOpen(true);
	}, [thought.streaming]);

	if (!thought.content.trim()) return null;

	return (
		<Collapsible className="mb-2" onOpenChange={setOpen} open={open}>
			<div className="flex items-center gap-2 py-1">
				<CollapsibleTrigger className="inline-flex items-center gap-1 font-medium text-[11px] text-muted-foreground transition-colors hover:text-foreground">
					{open ? (
						<ChevronDownIcon className="size-3.5" />
					) : (
						<ChevronRightIcon className="size-3.5" />
					)}
					<span>Thinking</span>
				</CollapsibleTrigger>
			</div>
			<CollapsibleContent>
				<div className="whitespace-pre-wrap pl-5 text-muted-foreground/80 text-sm leading-relaxed">
					{thought.content}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}
