"use client";

import { useMockThreads } from "@cyrus/hooks";
import { useState } from "react";
import { ChatFeed, ChatSidebar, Composer, DiffPanel } from "./chat";

export function WebChatApp() {
	const { threads, createThread, renameThread, archiveThread, sendMessage } =
		useMockThreads();
	const [activeId, setActiveId] = useState<string | null>(
		threads[0]?.id ?? null
	);
	const [diffOpen, setDiffOpen] = useState(false);

	const activeThread = threads.find((t) => t.id === activeId) ?? null;
	const busy = activeThread?.status === "running";

	function handleNew() {
		const id = createThread();
		setActiveId(id);
	}

	function handleSend(text: string) {
		if (!activeId) {
			const id = createThread();
			setActiveId(id);
			sendMessage(id, text);
			return;
		}
		sendMessage(activeId, text);
	}

	return (
		<div className="flex h-svh w-full overflow-hidden bg-background text-foreground">
			<ChatSidebar
				activeId={activeId}
				onArchive={(id) => {
					archiveThread(id);
					if (activeId === id) {
						setActiveId(null);
					}
				}}
				onNew={handleNew}
				onRename={renameThread}
				onSelect={setActiveId}
				threads={threads}
			/>
			<div className="flex min-w-0 flex-1 flex-col">
				<div className="flex h-10 min-h-10 shrink-0 items-center gap-2 border-border/60 border-b bg-background px-3">
					{activeThread ? (
						<>
							<span className="truncate font-medium text-sm">
								{activeThread.title}
							</span>
							{activeThread.branch && (
								<span className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-1.5 py-0.5 text-[11px] text-muted-foreground">
									<span className="size-1.5 rounded-full bg-emerald-500" />
									{activeThread.branch}
								</span>
							)}
						</>
					) : (
						<span className="text-muted-foreground text-sm">
							No thread selected
						</span>
					)}
					<div className="ml-auto flex items-center gap-1">
						<button
							className={
								diffOpen
									? "inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 font-medium text-primary-foreground text-xs"
									: "inline-flex h-7 items-center gap-1 rounded-md bg-muted/70 px-2 font-medium text-foreground text-xs hover:bg-muted"
							}
							onClick={() => setDiffOpen((v) => !v)}
							type="button"
						>
							Diffs
						</button>
					</div>
				</div>
				<div className="flex min-h-0 flex-1">
					<div className="flex min-w-0 flex-1 flex-col">
						<ChatFeed thread={activeThread} />
						<Composer
							busy={Boolean(busy)}
							onSend={handleSend}
							onStop={() => {
								/* noop */
							}}
						/>
					</div>
					{diffOpen && (
						<div className="w-[420px] shrink-0">
							<DiffPanel
								onClose={() => setDiffOpen(false)}
								thread={activeThread}
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
