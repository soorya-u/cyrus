import { useGitStatus } from "@cyrus/hooks/connection/use-git";
import { useListAgents } from "@cyrus/hooks/connection/use-list-agents";
import type { Thread } from "@cyrus/schemas/rtc/threads";
import { cn } from "cnfast";
import { useEffect, useRef, useState } from "react";
import { ComposerBranchToolbar } from "@/components/chat/composer/composer-branch-toolbar";
import { ComposerSkeleton } from "@/components/chat/composer/composer-skeleton";
import { ComposerUnavailable } from "@/components/chat/composer/composer-unavailable";
import { ComposerFooterControls } from "@/components/chat/composer/footer-controls";
import { ComposerPrimaryAction } from "@/components/chat/composer/primary-action";

export function Composer({
	projectId,
	threadId,
	thread,
	onSend,
	onStop,
	busy = false,
	stopping = false,
}: {
	projectId: string;
	threadId: string;
	thread: Thread;
	onSend: (text: string) => void;
	onStop?: () => void;
	busy?: boolean;
	stopping?: boolean;
}) {
	const agentsQuery = useListAgents();
	const agents = agentsQuery.data?.agents ?? [];
	const agentsReady = agentsQuery.isSuccess;
	const agentsLoading = agentsQuery.isLoading;
	const hasAgents = agents.length > 0;

	const gitStatus = useGitStatus(threadId);
	const isGitRepo = gitStatus.data?.isRepo === true;
	const [value, setValue] = useState("");
	const [sending, setSending] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	useEffect(() => {
		if (busy) setSending(false);
	}, [busy]);

	useEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		if (value.length >= 0) {
			textarea.style.height = "auto";
			textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
		}
	}, [value]);

	function submit() {
		const text = value.trim();
		if (!text || busy || stopping || sending || !hasAgents) return;

		setSending(true);
		onSend(text);
		setValue("");
	}

	function renderComposerBody() {
		if (agentsLoading) {
			return <ComposerSkeleton />;
		}

		if (agentsQuery.isError) {
			return (
				<div className="group rounded-[22px] p-px transition-colors duration-200">
					<div className="chat-composer-glass rounded-4xl border border-border px-4 py-5 text-center transition-colors duration-200">
						<p className="font-medium text-destructive text-sm">
							Could not load agents
						</p>
						<p className="mt-1 text-muted-foreground text-xs">
							Check that the worker is connected and try again.
						</p>
					</div>
				</div>
			);
		}

		if (agentsReady && !hasAgents) {
			return <ComposerUnavailable />;
		}

		return (
			<div className="group rounded-[22px] p-px transition-colors duration-200">
				<div className="chat-composer-glass rounded-4xl border border-border transition-colors duration-200 has-focus-visible:border-ring/45">
					<div className="relative px-3 pt-3.5 pb-2 sm:px-4 sm:pt-4">
						<div className="relative">
							<textarea
								className="block max-h-50 min-h-17.5 w-full resize-none overflow-y-auto whitespace-pre-wrap bg-transparent text-[16px] text-foreground leading-relaxed outline-none placeholder:text-muted-foreground/35 sm:text-[14px]"
								onChange={(event) => setValue(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === "Enter" && !event.shiftKey) {
										event.preventDefault();
										submit();
									}
								}}
								placeholder="Ask anything, @tag files/folders, $use skills, or / for commands"
								ref={textareaRef}
								rows={1}
								value={value}
							/>
						</div>
					</div>

					<div
						className="flex min-w-0 flex-nowrap items-center justify-between gap-2 overflow-visible px-2.5 pb-2.5 sm:gap-0 sm:px-3 sm:pb-3"
						data-chat-composer-footer="true"
					>
						<ComposerFooterControls
							agents={agents}
							projectId={projectId}
							threadId={threadId}
						/>
						<div
							className="flex shrink-0 flex-nowrap items-center justify-end gap-2"
							data-chat-composer-actions="right"
						>
							<ComposerPrimaryAction
								busy={busy}
								canSend={value.trim().length > 0}
								onStop={onStop}
								sending={sending}
								stopping={stopping}
							/>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className="pointer-events-none absolute inset-x-0 bottom-0 z-20 pt-1.5 sm:pt-2"
			data-chat-composer-overlay="true"
		>
			<div
				aria-hidden="true"
				className="chat-composer-horizontal-inset pointer-events-none absolute inset-x-0 top-1.5 bottom-0 z-0 sm:top-2"
			>
				<div className="relative mx-auto h-full w-full max-w-3xl overflow-clip rounded-t-4xl">
					<div className="chat-composer-shared-blur absolute -inset-8" />
				</div>
			</div>

			<div className="chat-composer-horizontal-inset">
				<div className="pointer-events-auto relative isolate z-10">
					<form
						className="mx-auto w-full min-w-0 max-w-3xl"
						data-chat-composer-form="true"
						onSubmit={(event) => {
							event.preventDefault();
							submit();
						}}
					>
						{renderComposerBody()}
					</form>
				</div>
			</div>

			<div
				className={cn(
					"chat-composer-horizontal-inset chat-composer-lower-chrome relative z-10",
					isGitRepo
						? "bg-transparent! pb-[calc(env(safe-area-inset-bottom)+0.25rem)] dark:bg-transparent!"
						: "pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pb-[calc(env(safe-area-inset-bottom)+1rem)]"
				)}
			>
				{isGitRepo ? <ComposerBranchToolbar thread={thread} /> : null}
			</div>
		</div>
	);
}
