import type {
	FeedEntry,
	GitDiff,
	Message,
	ToolCall,
} from "@cyrus/ui/hooks/types";
import { formatMessageTime } from "@cyrus/ui/hooks/use-relative-time";
import { memo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { AppText as Text } from "./app-text";

function renderMarkdown(text: string): React.ReactNode {
	const lines = text.split("\n");
	const out: React.ReactNode[] = [];
	let i = 0;
	let key = 0;
	while (i < lines.length) {
		const line = lines[i] ?? "";
		if (line.startsWith("```")) {
			const lang = line.slice(3).trim();
			const buf: string[] = [];
			i++;
			while (i < lines.length && !lines[i]?.startsWith("```")) {
				buf.push(lines[i] ?? "");
				i++;
			}
			i++;
			out.push(
				<View
					className="my-2 overflow-hidden rounded-[10px] border border-border bg-black/5 dark:bg-white/5"
					key={key++}
				>
					{lang ? (
						<View className="border-border border-b px-3 py-1.5">
							<Text
								className="text-[10px] text-foreground-tertiary uppercase"
								style={{ fontFamily: "monospace" }}
							>
								{lang}
							</Text>
						</View>
					) : null}
					<ScrollView
						contentContainerStyle={{
							paddingHorizontal: 12,
							paddingVertical: 10,
						}}
						horizontal
						showsHorizontalScrollIndicator={false}
					>
						<Text
							className="text-[12px] leading-[18px]"
							selectable
							style={{ fontFamily: "monospace", color: "#262626" }}
						>
							{buf.join("\n")}
						</Text>
					</ScrollView>
				</View>
			);
			continue;
		}
		if (line.startsWith("# ")) {
			out.push(
				<Text
					className="mt-3 mb-1.5 font-bold text-base text-foreground"
					key={key++}
				>
					{line.slice(2)}
				</Text>
			);
			i++;
			continue;
		}
		if (!line.trim()) {
			i++;
			continue;
		}
		out.push(
			<Text
				className="my-1.5 text-[15px] text-foreground leading-[22px]"
				key={key++}
			>
				{line}
			</Text>
		);
		i++;
	}
	return out;
}

function UserBubble({ message }: { message: Message }) {
	return (
		<View className="mb-5 items-end">
			<View className="max-w-[85%] gap-2 rounded-[20px] bg-primary px-3.5 py-2.5">
				<View className="text-primary-foreground">
					{renderMarkdown(message.content)}
				</View>
			</View>
			<View className="mt-1 flex-row items-center justify-end gap-1 pr-0.5">
				<Text
					className="text-foreground-tertiary text-xs"
					style={{ fontVariant: ["tabular-nums"] }}
				>
					{formatMessageTime(message.createdAt)}
				</Text>
			</View>
		</View>
	);
}

function AssistantBubble({ message }: { message: Message }) {
	return (
		<View className="mb-2 px-0.5">
			<View>{renderMarkdown(message.content)}</View>
			<View className="mt-1 flex-row items-center gap-1">
				<Text
					className="text-foreground-tertiary text-xs"
					style={{ fontVariant: ["tabular-nums"] }}
				>
					{formatMessageTime(message.createdAt)}
				</Text>
			</View>
		</View>
	);
}

function ToolRow({ tool }: { tool: ToolCall }) {
	const [open, setOpen] = useState(false);
	return (
		<View className="overflow-hidden rounded-[10px] border border-border bg-black/5 dark:bg-white/5">
			<Pressable
				className="flex-row items-center gap-2 px-2.5 py-1.5"
				onPress={() => setOpen((v) => !v)}
			>
				<Text className="text-[11px] text-foreground-tertiary">
					{open ? "▾" : "▸"}
				</Text>
				<Text
					className="font-bold text-[12px] text-foreground"
					style={{ fontFamily: "monospace" }}
				>
					{tool.name}
				</Text>
				<Text
					className="flex-1 text-[11px] text-foreground-secondary"
					numberOfLines={1}
				>
					{Object.entries(tool.args)
						.map(
							([k, v]) =>
								`${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`
						)
						.join(", ")}
				</Text>
				{tool.result ? (
					<Text className="text-[11px] text-emerald-600 dark:text-emerald-400">
						✓ {tool.result}
					</Text>
				) : null}
			</Pressable>
			{open ? (
				<View className="border-border border-t px-2.5 py-2">
					<Text className="text-[10px] text-foreground-tertiary">args</Text>
					<Text
						className="mt-0.5 text-[11px] text-foreground"
						selectable
						style={{ fontFamily: "monospace" }}
					>
						{JSON.stringify(tool.args, null, 2)}
					</Text>
					{tool.result ? (
						<View className="mt-1.5">
							<Text className="text-[10px] text-foreground-tertiary">
								result
							</Text>
							<Text
								className="mt-0.5 text-[11px] text-foreground"
								selectable
								style={{ fontFamily: "monospace" }}
							>
								{tool.result}
							</Text>
						</View>
					) : null}
				</View>
			) : null}
		</View>
	);
}

function DiffRow({ diff }: { diff: GitDiff }) {
	const [open, setOpen] = useState(false);
	return (
		<View className="overflow-hidden rounded-[10px] border border-border bg-card">
			<Pressable
				className="flex-row items-center gap-2 px-2.5 py-1.5"
				onPress={() => setOpen((v) => !v)}
			>
				<Text className="text-[11px] text-foreground-tertiary">
					{open ? "▾" : "▸"}
				</Text>
				<Text
					className="flex-1 text-[12px] text-foreground"
					numberOfLines={1}
					style={{ fontFamily: "monospace" }}
				>
					{diff.file}
				</Text>
				<Text
					className="text-[11px] text-emerald-600 dark:text-emerald-400"
					style={{ fontFamily: "monospace" }}
				>
					+{diff.additions}
				</Text>
				<Text
					className="text-[11px] text-red-600 dark:text-red-400"
					style={{ fontFamily: "monospace" }}
				>
					-{diff.deletions}
				</Text>
			</Pressable>
			{open ? (
				<ScrollView
					className="border-border border-t"
					contentContainerStyle={{ padding: 10 }}
					horizontal
					nestedScrollEnabled
				>
					<Text
						className="text-[11px] text-foreground leading-[18px]"
						selectable
						style={{ fontFamily: "monospace" }}
					>
						{diff.patch}
					</Text>
				</ScrollView>
			) : null}
		</View>
	);
}

function WorkLog({ entry }: { entry: FeedEntry }) {
	const [open, setOpen] = useState(true);
	const tools = entry.activities ?? [];
	const diffs = entry.diffs ?? [];
	return (
		<View className="mb-3">
			<Pressable
				className="flex-row items-center gap-1.5 py-1"
				onPress={() => setOpen((v) => !v)}
			>
				<Text className="text-[11px] text-foreground-tertiary">
					{open ? "▾" : "▸"}
				</Text>
				<Text className="font-bold text-[11px] text-foreground-secondary">
					Turn activity
				</Text>
				<View className="rounded-full bg-black/5 px-1.5 py-0.5 dark:bg-white/5">
					<Text
						className="text-[10px] text-foreground-tertiary"
						style={{ fontFamily: "monospace" }}
					>
						{tools.length} tools · {diffs.length} diffs
					</Text>
				</View>
			</Pressable>
			{open ? (
				<View className="gap-1.5 pl-1">
					{tools.map((t) => (
						<ToolRow key={t.id} tool={t} />
					))}
					{diffs.map((d) => (
						<DiffRow diff={d} key={d.id} />
					))}
				</View>
			) : null}
		</View>
	);
}

function FeedEntryView({ entry }: { entry: FeedEntry }) {
	if (entry.type === "message" && entry.message) {
		return entry.message.role === "user" ? (
			<UserBubble message={entry.message} />
		) : (
			<AssistantBubble message={entry.message} />
		);
	}
	if (entry.type === "work") {
		return <WorkLog entry={entry} />;
	}
	return null;
}

interface ThreadFeedProps {
	feed: FeedEntry[];
}

export const ThreadFeed = memo(function ThreadFeed({ feed }: ThreadFeedProps) {
	if (feed.length === 0) {
		return (
			<View className="flex-1 items-center justify-center px-6">
				<View className="max-w-[320px] items-center gap-2">
					<Text className="text-center font-bold text-foreground text-lg">
						No conversation yet
					</Text>
					<Text className="text-center text-foreground-secondary text-sm">
						Ask the agent to inspect the repo, run a command, or continue the
						active thread.
					</Text>
				</View>
			</View>
		);
	}
	return (
		<ScrollView
			className="flex-1"
			keyboardDismissMode="on-drag"
			showsVerticalScrollIndicator={false}
		>
			<View className="gap-2 px-4 pt-3 pb-4">
				{feed.map((entry) => (
					<FeedEntryView entry={entry} key={entry.id} />
				))}
			</View>
		</ScrollView>
	);
});
