import type { Thread, ThreadStatus } from "@cyrus/hooks/types";
import { relativeTime } from "@cyrus/hooks/use-relative-time";
import { memo, useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { AppText as Text } from "./app-text";

const STATUS_TONES: Record<
	ThreadStatus,
	{ bg: string; fg: string; label: string }
> = {
	running: {
		bg: "bg-orange-500/14",
		fg: "text-orange-600 dark:text-orange-400",
		label: "Running",
	},
	ready: {
		bg: "bg-emerald-500/14",
		fg: "text-emerald-600 dark:text-emerald-400",
		label: "Ready",
	},
	starting: {
		bg: "bg-blue-500/14",
		fg: "text-blue-600 dark:text-blue-400",
		label: "Starting",
	},
	error: {
		bg: "bg-red-500/14",
		fg: "text-red-600 dark:text-red-400",
		label: "Error",
	},
	idle: {
		bg: "bg-neutral-500/10",
		fg: "text-neutral-600 dark:text-neutral-400",
		label: "Idle",
	},
};

interface ThreadRowProps {
	isLast: boolean;
	onPress: () => void;
	thread: Thread;
}

export const ThreadRow = memo(function ThreadRow({
	thread,
	isLast,
	onPress,
}: ThreadRowProps) {
	const tone = STATUS_TONES[thread.status];
	const timestamp = relativeTime(
		thread.latestUserMessageAt ?? thread.updatedAt ?? thread.createdAt
	);
	const subtitle = thread.branch;
	return (
		<Pressable
			accessibilityLabel={thread.title}
			accessibilityRole="button"
			className="bg-card active:opacity-70"
			onPress={onPress}
		>
			<View
				className="flex-row gap-3 px-4 py-2.5"
				style={{
					borderBottomWidth: isLast ? 0 : 1,
					borderBottomColor: "rgba(0,0,0,0.06)",
				}}
			>
				<View
					className={`mt-0.5 size-[30px] items-center justify-center rounded-[9px] ${tone.bg}`}
				>
					<Text className={`font-bold text-[13px] ${tone.fg}`}>●</Text>
				</View>
				<View className="flex-1 gap-[3px]">
					<View className="flex-row items-center justify-between gap-2">
						<Text
							className="flex-1 font-bold text-base text-foreground leading-5"
							numberOfLines={1}
						>
							{thread.title}
						</Text>
						<View className="flex-row items-center gap-2">
							<View className={`rounded-full px-1.5 py-0.5 ${tone.bg}`}>
								<Text className={`font-bold text-[10px] ${tone.fg}`}>
									{tone.label}
								</Text>
							</View>
							<Text
								className="text-foreground-tertiary text-xs"
								style={{ fontVariant: ["tabular-nums"] }}
							>
								{timestamp}
							</Text>
						</View>
					</View>
					{subtitle ? (
						<View className="mt-px flex-row items-center gap-1.5">
							<Text
								className="text-[10px] text-foreground-tertiary"
								numberOfLines={1}
								style={{ fontFamily: "monospace" }}
							>
								{subtitle}
							</Text>
						</View>
					) : null}
				</View>
			</View>
		</Pressable>
	);
});

interface ThreadListProps {
	onSelect: (id: string) => void;
	threads: Thread[];
}

export function ThreadList({ threads, onSelect }: ThreadListProps) {
	const groups = useMemo(() => {
		const byProject = new Map<string, Thread[]>();
		for (const t of threads) {
			const key = t.branch ?? "general";
			const arr = byProject.get(key) ?? [];
			arr.push(t);
			byProject.set(key, arr);
		}
		return Array.from(byProject.entries()).map(([key, list]) => ({
			key,
			title: key === "general" ? "General" : key,
			threads: list,
		}));
	}, [threads]);

	return (
		<View className="flex-1 bg-screen">
			<ScrollView
				className="flex-1"
				keyboardDismissMode="on-drag"
				showsVerticalScrollIndicator={false}
			>
				<View className="gap-5 px-4 pt-2 pb-6">
					{groups.map((group) => (
						<View
							className="overflow-hidden rounded-[20px] bg-card"
							key={group.key}
							style={{ borderCurve: "continuous" }}
						>
							<View className="flex-row items-center gap-2.5 px-4 pt-3 pb-2">
								<Text
									className="flex-1 font-bold text-foreground-secondary text-xs uppercase"
									style={{ letterSpacing: 0.5 }}
								>
									{group.title}
								</Text>
							</View>
							{group.threads.map((thread, i) => (
								<ThreadRow
									isLast={i === group.threads.length - 1}
									key={thread.id}
									onPress={() => onSelect(thread.id)}
									thread={thread}
								/>
							))}
						</View>
					))}
					{threads.length === 0 && (
						<View className="items-center pt-16">
							<Text className="font-bold text-foreground text-lg">
								No threads yet
							</Text>
							<Text className="mt-1 text-center text-foreground-secondary text-sm">
								Create a task to start a new coding session.
							</Text>
						</View>
					)}
				</View>
			</ScrollView>
		</View>
	);
}
