import { useShellExecution } from "@cyrus/hooks/conversation/use-shell-execution";
import type { ShellExecutionView } from "@cyrus/schemas/view";
import { cn } from "cnfast";
import {
	ChevronDownIcon,
	ChevronRightIcon,
	DollarSignIcon,
	SquareIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import {
	AnimatedSpan,
	TerminalOutput,
} from "@/components/chat/feed/terminal-output";
import { Show } from "@/components/helpers/show";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";

function shellStatusTooltip(execution: ShellExecutionView): string | null {
	switch (execution.status) {
		case "running":
		case "cancelled":
			return null;
		case "exited":
			return `Exit code ${execution.exitCode}`;
		case "timeout":
			return "Command timed out";
		case "spawn_error":
			return "Failed to start command";
		default: {
			const _exhaustive: never = execution.status;
			return _exhaustive;
		}
	}
}

function ShellStatusDot({ execution }: { execution: ShellExecutionView }) {
	if (execution.status === "cancelled") return null;
	if (execution.status === "running") {
		return (
			<span className="size-2 shrink-0 animate-pulse rounded-full bg-foreground" />
		);
	}

	const failed = execution.status !== "exited" || execution.exitCode !== 0;
	const dot = (
		<span
			className={cn(
				"size-2 shrink-0 rounded-full",
				failed ? "bg-red-500" : "bg-green-500"
			)}
		/>
	);

	const tooltip = shellStatusTooltip(execution);
	if (!tooltip) return dot;

	return (
		<Tooltip>
			<TooltipTrigger render={dot} />
			<TooltipPopup side="top">{tooltip}</TooltipPopup>
		</Tooltip>
	);
}

function useShellFailureToast(execution: ShellExecutionView) {
	const previousStatusRef = useRef(execution.status);

	useEffect(() => {
		const previousStatus = previousStatusRef.current;
		previousStatusRef.current = execution.status;
		if (previousStatus === execution.status) return;

		if (execution.status === "timeout") {
			toast.error(`Command timed out: ${execution.command}`);
		} else if (execution.status === "spawn_error") {
			toast.error(`Failed to start command: ${execution.command}`);
		}
	}, [execution.status, execution.command]);
}

export function ShellExecutionRow({
	execution,
}: {
	execution: ShellExecutionView;
}) {
	const [open, setOpen] = useState(true);
	const { cancelShellExecution } = useShellExecution();
	useShellFailureToast(execution);
	const outputId = useId();

	const hasOutput = execution.lines.length > 0;
	const expanded = open && hasOutput;

	async function handleCancel() {
		const result = await cancelShellExecution(execution.threadId, execution.id);
		if (result.isErr()) toast.error("Could not stop the command");
	}

	return (
		<div className="mb-5 flex justify-end">
			<div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background">
				<div
					className={cn(
						"flex w-full items-center gap-2 p-3",
						expanded && "border-border border-b"
					)}
				>
					<button
						aria-controls={hasOutput ? outputId : undefined}
						aria-expanded={hasOutput ? open : undefined}
						className="flex min-w-0 flex-1 items-center gap-1 text-left font-mono text-sm"
						onClick={() => setOpen((value) => !value)}
						type="button"
					>
						<DollarSignIcon className="size-3.5 shrink-0 text-terminal" />
						<span className="truncate">{execution.command}</span>
					</button>
					<ShellStatusDot execution={execution} />
					<Show when={execution.status === "running"}>
						<button
							className="flex size-4 shrink-0 items-center justify-center text-red-500 hover:text-red-400"
							onClick={handleCancel}
							title="Stop command"
							type="button"
						>
							<SquareIcon className="size-2.5 fill-current" />
						</button>
					</Show>
					<Show when={hasOutput}>
						<button
							aria-controls={outputId}
							aria-expanded={open}
							aria-label={open ? "Collapse output" : "Expand output"}
							className="flex shrink-0 items-center"
							onClick={() => setOpen((value) => !value)}
							type="button"
						>
							<Show
								fallback={
									<ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
								}
								when={open}
							>
								<ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
							</Show>
						</button>
					</Show>
				</div>
				<Show when={expanded}>
					<TerminalOutput
						className="max-h-80 overflow-auto"
						id={outputId}
						sequence={execution.status === "running"}
					>
						{execution.lines.map((line, index) => (
							<AnimatedSpan
								className={
									line.stream === "stderr"
										? "text-amber-600 dark:text-amber-400"
										: "text-muted-foreground"
								}
								// biome-ignore lint/suspicious/noArrayIndexKey: lines only ever append, never reorder
								key={index}
							>
								{line.text}
							</AnimatedSpan>
						))}
					</TerminalOutput>
				</Show>
			</div>
		</div>
	);
}
