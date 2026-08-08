import { useShellExecution } from "@cyrus/hooks/conversation/use-shell-execution";
import type { ShellExecutionView } from "@cyrus/schemas/view";
import { cn } from "cnfast";
import {
	ChevronDownIcon,
	ChevronRightIcon,
	DollarSignIcon,
	SquareIcon,
} from "lucide-react";
import { useState } from "react";
import {
	AnimatedSpan,
	TerminalOutput,
} from "@/components/chat/feed/terminal-output";
import { Show } from "@/components/helpers/show";

function ShellStatusDot({ execution }: { execution: ShellExecutionView }) {
	if (execution.status === "running") {
		return (
			<span className="size-2 shrink-0 animate-pulse rounded-full bg-foreground" />
		);
	}
	const failed = execution.status !== "exited" || execution.exitCode !== 0;
	return (
		<span
			className={cn(
				"size-2 shrink-0 rounded-full",
				failed ? "bg-red-500" : "bg-green-500"
			)}
		/>
	);
}

function shellSummaryLine(
	execution: ShellExecutionView
): { text: string; className: string } | null {
	switch (execution.status) {
		case "running":
			return null;
		case "exited":
			return execution.exitCode === 0
				? {
						className: "text-emerald-600 dark:text-emerald-400",
						text: "Process exited with code 0",
					}
				: {
						className: "text-red-600 dark:text-red-400",
						text: `Process exited with code ${execution.exitCode}`,
					};
		case "timeout":
			return {
				className: "text-red-600 dark:text-red-400",
				text: "Command timed out and was stopped",
			};
		case "cancelled":
			return {
				className: "text-muted-foreground",
				text: "Command was stopped",
			};
		case "spawn_error":
			return {
				className: "text-red-600 dark:text-red-400",
				text: "Failed to start command",
			};
		default: {
			const _exhaustive: never = execution.status;
			return _exhaustive;
		}
	}
}

/**
 * Renders a Shell execution (see CONTEXT.md) — the validated "Variant A"
 * design from issue #161: a custom accordion header ($ command + live status
 * dot + inline stop control + chevron) driving the real magicui sequencing
 * engine, right-aligned/narrower to read as user-authored.
 */
export function ShellExecutionRow({
	execution,
}: {
	execution: ShellExecutionView;
}) {
	const [open, setOpen] = useState(true);
	const { cancelShellExecution } = useShellExecution();
	const summary = shellSummaryLine(execution);

	return (
		<div className="mb-5 flex justify-end">
			<div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background">
				<div
					className={cn(
						"flex w-full items-center gap-2 p-3",
						open && "border-border border-b"
					)}
				>
					<button
						className="flex min-w-0 flex-1 items-center gap-1 text-left font-mono text-sm"
						onClick={() => setOpen((value) => !value)}
						type="button"
					>
						<DollarSignIcon className="size-3.5 shrink-0 text-muted-foreground" />
						<span className="truncate">{execution.command}</span>
					</button>
					<ShellStatusDot execution={execution} />
					{/* Stop control for this execution specifically — distinct from
					    the composer's Stop button, which only cancels the agent
					    turn. The two can be running at once. */}
					<Show when={execution.status === "running"}>
						<button
							className="flex size-4 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
							onClick={() =>
								cancelShellExecution(execution.threadId, execution.id)
							}
							title="Stop command"
							type="button"
						>
							<SquareIcon className="size-2.5 fill-current" />
						</button>
					</Show>
					<button
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
				</div>
				<Show when={open}>
					{/* sequence=true while running: lines arrive one at a time from the
					    live overlay, matching magicui's chained-reveal expectations.
					    Once finished, all lines are already present at mount (e.g. on
					    page load) — sequence=true would never fire its chained reveal
					    in that case, so sequence=false shows them immediately. */}
					<TerminalOutput
						className="max-h-80 overflow-auto"
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
						{summary ? (
							<AnimatedSpan className={summary.className}>
								{summary.text}
							</AnimatedSpan>
						) : null}
					</TerminalOutput>
				</Show>
			</div>
		</div>
	);
}
