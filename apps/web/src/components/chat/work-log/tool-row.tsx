import type { ToolCallView } from "@cyrus/schemas/view";
import { extractToolFields } from "@cyrus/utils/tool-fields";
import { cn } from "cnfast";
import {
	CheckIcon,
	ChevronDownIcon,
	MinusIcon,
	TerminalIcon,
	XIcon,
} from "lucide-react";
import { type KeyboardEvent, useState } from "react";
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
	if (showSuccess) return <CheckIcon className="size-3" />;
	if (showPending) return <MinusIcon className="size-3 opacity-70" />;
	return null;
}

// TODO(soorya): decide fallback UX for tools with no parsable fields
export function ToolRow({ tool }: { tool: ToolCallView }) {
	const [open, setOpen] = useState(false);
	const presentation = deriveToolPresentation(tool);
	const Icon = presentation.icon;
	const canExpand = Boolean(presentation.detail?.trim());
	const showSuccess = tool.status === "completed";
	const showFailed = tool.status === "failed";
	const showPending =
		tool.status === "pending" || tool.status === "in_progress";

	return (
		<div
			className={cn(
				"flex flex-col rounded-md px-0.5 py-0.5 text-xs transition-colors",
				canExpand &&
					"cursor-pointer hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-inset"
			)}
			{...(canExpand
				? {
						role: "button" as const,
						tabIndex: 0,
						onClick: () => setOpen((value) => !value),
						onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								setOpen((value) => !value);
							}
						},
					}
				: {})}
		>
			<div className="flex select-none items-center gap-1.5">
				<span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground/65">
					<Icon className="size-3.5 stroke-[1.8] opacity-80" />
				</span>
				<div className="flex min-w-0 flex-1 items-center gap-1.5">
					<p className="flex min-w-0 items-baseline gap-1.5 text-[12px] leading-5">
						<span className="min-w-0 shrink truncate font-medium text-foreground/82">
							{presentation.heading}
						</span>
						{presentation.preview && (
							<span className="min-w-0 flex-1 truncate text-muted-foreground/55">
								{presentation.preview}
							</span>
						)}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-px text-muted-foreground/55">
					{canExpand && (
						<ChevronDownIcon
							className={cn(
								"size-3 shrink-0 opacity-70 transition-transform duration-200",
								open && "rotate-180"
							)}
						/>
					)}
					<span className="flex size-4 items-center justify-center">
						<ToolStatusIcon
							showFailed={showFailed}
							showPending={showPending}
							showSuccess={showSuccess}
						/>
					</span>
				</div>
			</div>
			{open && canExpand && presentation.detail && (
				<div className="ms-7 mt-1 border-border/45 border-s ps-3 pt-0.5">
					<pre className="wrap-break-word max-h-64 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-muted-foreground leading-relaxed">
						{presentation.detail}
					</pre>
				</div>
			)}
		</div>
	);
}
