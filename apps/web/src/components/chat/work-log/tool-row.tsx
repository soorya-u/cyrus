import type { ToolCallView } from "@cyrus/schemas/view";
import { extractToolFields } from "@cyrus/utils/tool-fields";
import { cn } from "cnfast";
import { CheckIcon, MinusIcon, TerminalIcon, XIcon } from "lucide-react";
import { DiffRow } from "@/components/chat/work-log/diff-row";
import { Show } from "@/components/helpers/show";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import {
	KIND_PRESENTATIONS,
	type ToolPresentation,
} from "@/constants/tool-presentations";

function deriveToolPresentation(tool: ToolCallView): ToolPresentation {
	const fields = extractToolFields(tool);

	if (fields.command) return KIND_PRESENTATIONS.execute(fields);

	const byKind = tool.kind ? KIND_PRESENTATIONS[tool.kind] : undefined;
	if (byKind) return byKind(fields);

	return {
		heading: tool.title,
		preview: fields.path ?? fields.query ?? fields.command,
		detail: fields.output,
		icon: TerminalIcon,
	};
}

function ToolStatusIcon({
	showFailed,
	showSuccess,
	showPending,
}: {
	showFailed: boolean;
	showSuccess: boolean;
	showPending: boolean;
}) {
	if (showFailed) return <XIcon className="size-3 text-destructive" />;
	if (showSuccess)
		return <CheckIcon className="size-3 text-green-600 dark:text-green-500" />;
	if (showPending) return <MinusIcon className="size-3 opacity-70" />;
	return null;
}

function ToolRowHeading({
	tool,
	presentation,
}: {
	tool: ToolCallView;
	presentation: ToolPresentation;
}) {
	const Icon = presentation.icon;
	const showSuccess = tool.status === "completed";
	const showFailed = tool.status === "failed";
	const showPending =
		tool.status === "pending" || tool.status === "in_progress";

	return (
		<>
			<span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground/65">
				<Icon className="size-3.5 stroke-[1.8] opacity-80" />
			</span>
			<div className="flex min-w-0 flex-1 items-center gap-1.5">
				<p className="flex min-w-0 items-baseline gap-1.5 text-[12px] leading-5">
					<span className="min-w-0 shrink truncate font-medium text-foreground/82">
						{presentation.heading}
					</span>
					<Show when={Boolean(presentation.preview)}>
						<span className="min-w-0 flex-1 truncate text-muted-foreground/55">
							{presentation.preview}
						</span>
					</Show>
				</p>
			</div>
			<span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground/55">
				<ToolStatusIcon
					showFailed={showFailed}
					showPending={showPending}
					showSuccess={showSuccess}
				/>
			</span>
		</>
	);
}

function ToolRowDetail({
	tool,
	presentation,
}: {
	tool: ToolCallView;
	presentation: ToolPresentation;
}) {
	const hasDiffs = Boolean(tool.diffs?.length);

	return (
		<Show
			fallback={
				<Show when={Boolean(presentation.detail?.trim())}>
					<pre className="wrap-break-word max-h-64 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-muted-foreground leading-relaxed">
						{presentation.detail}
					</pre>
				</Show>
			}
			when={hasDiffs}
		>
			{tool.diffs?.map((diff) => (
				<DiffRow diff={diff} key={diff.id} />
			))}
		</Show>
	);
}

export function ToolRow({ tool }: { tool: ToolCallView }) {
	const presentation = deriveToolPresentation(tool);
	const hasDiffs = Boolean(tool.diffs?.length);
	const canExpand = hasDiffs || Boolean(presentation.detail?.trim());

	if (!canExpand) {
		return (
			<div className="flex select-none items-center gap-1.5 rounded-md px-0.5 py-0.5 text-xs">
				<ToolRowHeading presentation={presentation} tool={tool} />
			</div>
		);
	}

	return (
		<Accordion className="text-xs" collapsible type="single">
			<AccordionItem className="border-b-0" value={tool.toolCallId}>
				<AccordionTrigger
					className={cn(
						"select-none items-center gap-1.5 rounded-md px-0.5 py-0.5 hover:bg-accent/20 hover:no-underline",
						"[&>svg]:size-3 [&>svg]:shrink-0 [&>svg]:translate-y-0 [&>svg]:text-muted-foreground/55 [&>svg]:opacity-70"
					)}
				>
					<ToolRowHeading presentation={presentation} tool={tool} />
				</AccordionTrigger>
				<AccordionContent className="ms-7 border-border/45 border-s ps-3 pt-0.5 pb-0">
					<ToolRowDetail presentation={presentation} tool={tool} />
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
