"use client";

import { useMockThreads } from "@cyrus/hooks/use-mock-threads";
import { useEffect, useState } from "react";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatSidebarLayout } from "@/components/chat/chat-sidebar-layout";
import { Composer } from "@/components/chat/composer";
import type { SettingsSectionId } from "@/components/chat/settings-sidebar-nav";
import { SETTINGS_NAV_ITEMS } from "@/components/chat/settings-sidebar-nav";
import { SidebarInset } from "@/components/ui/sidebar";
import { cn } from "@/utils/cn";
import { COLLAPSED_SIDEBAR_TITLEBAR_INSET_CLASS } from "@/workspace-titlebar";
import { ChatFeed, DiffPanel } from "./chat";

type WebChatAppProps = {
	workerId?: string;
	projectId?: string;
	initialThreadId?: string;
};

function SettingsPanel({ section }: { section: SettingsSectionId }) {
	const active = SETTINGS_NAV_ITEMS.find((item) => item.id === section);
	return (
		<div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
			<div className="max-w-md space-y-2">
				<h2 className="font-medium text-lg">{active?.label ?? "Settings"}</h2>
				<p className="text-muted-foreground text-sm">
					Settings UI placeholder — wire to real configuration when backend is
					ready.
				</p>
			</div>
		</div>
	);
}

export function WebChatApp({
	workerId,
	projectId,
	initialThreadId,
}: WebChatAppProps = {}) {
	const {
		projects,
		threads,
		createThread,
		renameThread,
		archiveThread,
		sendMessage,
	} = useMockThreads();
	const [activeId, setActiveId] = useState<string | null>(
		initialThreadId ?? threads[0]?.id ?? null
	);
	const [diffOpen, setDiffOpen] = useState(false);
	const [sidebarPanel, setSidebarPanel] = useState<"threads" | "settings">(
		"threads"
	);
	const [settingsSection, setSettingsSection] =
		useState<SettingsSectionId>("general");

	useEffect(() => {
		if (initialThreadId) {
			setActiveId(initialThreadId);
		}
	}, [initialThreadId]);

	const activeThread = threads.find((thread) => thread.id === activeId) ?? null;
	const busy = activeThread?.status === "running";

	function handleNew(projectIdForThread: string) {
		const id = createThread(projectIdForThread);
		setActiveId(id);
		setSidebarPanel("threads");
	}

	function handleSend(text: string) {
		if (!activeId) {
			const id = createThread(projectId ?? "p-cyrus");
			setActiveId(id);
			sendMessage(id, text);
			return;
		}
		sendMessage(activeId, text);
	}

	const contextLabel =
		workerId && projectId
			? `${workerId.slice(0, 8)}… / ${projectId.slice(0, 8)}…`
			: null;

	function getHeaderTitle() {
		if (sidebarPanel === "settings") {
			return "Settings";
		}
		if (activeThread) {
			return activeThread.title;
		}
		return "No thread selected";
	}

	const headerTitle = getHeaderTitle();

	return (
		<ChatSidebarLayout
			sidebar={
				<ChatSidebar
					activeId={activeId}
					onArchive={(id) => {
						archiveThread(id);
						if (activeId === id) {
							setActiveId(null);
						}
					}}
					onCloseSettings={() => setSidebarPanel("threads")}
					onNew={handleNew}
					onOpenSettings={() => setSidebarPanel("settings")}
					onRename={renameThread}
					onSelect={(id) => {
						setActiveId(id);
						setSidebarPanel("threads");
					}}
					onSelectSettingsSection={setSettingsSection}
					panel={sidebarPanel}
					projects={projects}
					settingsSection={settingsSection}
					threads={threads}
				/>
			}
		>
			<SidebarInset className="h-svh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground md:h-dvh">
				<div className="flex min-h-0 min-w-0 flex-1 flex-col">
					<div
						className={cn(
							"surface-subheader px-3 transition-[padding-left] duration-200 ease-linear motion-reduce:transition-none",
							COLLAPSED_SIDEBAR_TITLEBAR_INSET_CLASS
						)}
					>
						{sidebarPanel === "settings" && (
							<span className="font-medium text-sm">Settings</span>
						)}
						{sidebarPanel !== "settings" && activeThread && (
							<>
								<span className="truncate font-medium text-sm">
									{activeThread.title}
								</span>
								{activeThread.branch && (
									<span className="ml-2 inline-flex items-center gap-1 rounded-md bg-muted/70 px-1.5 py-0.5 text-[11px] text-muted-foreground">
										<span className="size-1.5 rounded-full bg-emerald-500" />
										{activeThread.branch}
									</span>
								)}
								{contextLabel && (
									<span className="ml-2 truncate font-mono text-[10px] text-muted-foreground/70">
										{contextLabel}
									</span>
								)}
							</>
						)}
						{sidebarPanel !== "settings" && !activeThread && (
							<span className="text-muted-foreground text-sm">
								{headerTitle}
							</span>
						)}
						{sidebarPanel !== "settings" && (
							<div className="ml-auto flex items-center gap-1">
								<button
									className={
										diffOpen
											? "inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 font-medium text-primary-foreground text-xs"
											: "inline-flex h-7 items-center gap-1 rounded-md bg-muted/70 px-2 font-medium text-foreground text-xs hover:bg-muted"
									}
									onClick={() => setDiffOpen((value) => !value)}
									type="button"
								>
									Diffs
								</button>
							</div>
						)}
					</div>

					<div className="flex min-h-0 flex-1">
						{sidebarPanel === "settings" ? (
							<SettingsPanel section={settingsSection} />
						) : (
							<>
								<div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
									<ChatFeed className="min-h-0" thread={activeThread} />
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
							</>
						)}
					</div>
				</div>
			</SidebarInset>
		</ChatSidebarLayout>
	);
}
