import type { Thread } from "@cyrus/hooks/types";
import { useMockThreads } from "@cyrus/hooks/use-mock-threads";
import { deriveFeed } from "@cyrus/hooks/use-thread-feed";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { AppText as Text } from "./app-text";
import { ThreadComposer } from "./thread-composer";
import { ThreadFeed } from "./thread-feed";
import { ThreadList } from "./thread-list";

export function MobileChatApp() {
	const { threads, createThread, sendMessage, stopThread } = useMockThreads();
	const [activeId, setActiveId] = useState<string | null>(null);
	const [draft, setDraft] = useState("");

	const activeThread: Thread | null = useMemo(
		() => threads.find((t) => t.id === activeId) ?? null,
		[threads, activeId]
	);

	function handleSend() {
		const text = draft.trim();
		if (!text) {
			return;
		}
		if (!activeId) {
			const id = createThread();
			setActiveId(id);
			sendMessage(id, text);
			setDraft("");
			return;
		}
		sendMessage(activeId, text);
		setDraft("");
	}

	if (!activeThread) {
		return (
			<View className="flex-1 bg-screen">
				<View className="flex-row items-center justify-between px-4 pt-4 pb-2">
					<Text className="font-bold text-2xl text-foreground">Threads</Text>
					<Pressable
						className="flex-row items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 active:opacity-70"
						onPress={() => {
							const id = createThread();
							setActiveId(id);
						}}
					>
						<Text className="font-bold text-primary-foreground text-sm">
							+ New
						</Text>
					</Pressable>
				</View>
				<ThreadList onSelect={(id) => setActiveId(id)} threads={threads} />
			</View>
		);
	}

	const feed = deriveFeed(activeThread);
	const busy = activeThread.status === "running";

	return (
		<View className="flex-1 bg-screen">
			<View className="flex-row items-center gap-2 border-border border-b px-3 py-2.5">
				<Pressable
					className="size-8 items-center justify-center rounded-full active:opacity-60"
					hitSlop={8}
					onPress={() => setActiveId(null)}
				>
					<Text className="text-foreground text-xl">←</Text>
				</Pressable>
				<View className="flex-1">
					<Text
						className="font-bold text-base text-foreground"
						numberOfLines={1}
					>
						{activeThread.title}
					</Text>
					{activeThread.branch ? (
						<Text
							className="text-[11px] text-foreground-tertiary"
							numberOfLines={1}
							style={{ fontFamily: "monospace" }}
						>
							{activeThread.branch}
						</Text>
					) : null}
				</View>
				<View className="flex-row items-center gap-2">
					<View
						className={`rounded-full px-2 py-0.5 ${busy ? "bg-orange-500/14" : "bg-emerald-500/14"}`}
					>
						<Text
							className={`font-bold text-[10px] ${busy ? "text-orange-600 dark:text-orange-400" : "text-emerald-600 dark:text-emerald-400"}`}
						>
							{busy ? "Running" : "Ready"}
						</Text>
					</View>
				</View>
			</View>

			<ThreadFeed feed={feed} />

			<ThreadComposer
				busy={busy}
				onChange={setDraft}
				onSend={handleSend}
				onStop={() => activeId && stopThread(activeId)}
				value={draft}
			/>
		</View>
	);
}

export default MobileChatApp;
