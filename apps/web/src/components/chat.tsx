"use client";

import {
	type FeedEntry,
	formatMessageTime,
	type GitDiff,
	type Message,
	relativeTime,
	type Thread,
	type ThreadStatus,
	type ToolCall,
	useThreadFeed,
} from "@cyrus/hooks";
import { PatchDiff } from "@pierre/diffs/react";
import {
	ArchiveIcon,
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	CopyIcon,
	GitBranchIcon,
	PlusIcon,
	SearchIcon,
	SendIcon,
	SquareIcon,
	TerminalIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/utils/cn";

/* ─── Thread status pill ─────────────────────────────────────────────── */

const STATUS_TONES: Record<
	ThreadStatus,
	{ label: string; dot: string; text: string; bg: string }
> = {
	running: {
		label: "Running",
		dot: "bg-orange-500",
		text: "text-orange-600 dark:text-orange-400",
		bg: "bg-orange-500/12",
	},
	ready: {
		label: "Ready",
		dot: "bg-emerald-500",
		text: "text-emerald-600 dark:text-emerald-400",
		bg: "bg-emerald-500/12",
	},
	starting: {
		label: "Starting",
		dot: "bg-blue-500",
		text: "text-blue-600 dark:text-blue-400",
		bg: "bg-blue-500/12",
	},
	error: {
		label: "Error",
		dot: "bg-red-500",
		text: "text-red-600 dark:text-red-400",
		bg: "bg-red-500/12",
	},
	idle: {
		label: "Idle",
		dot: "bg-neutral-400",
		text: "text-neutral-500 dark:text-neutral-400",
		bg: "bg-neutral-500/10",
	},
};

function ThreadStatusPill({
	status,
	compact = false,
}: {
	status: ThreadStatus;
	compact?: boolean;
}) {
	const tone = STATUS_TONES[status];
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium text-[10px]",
				tone.bg,
				tone.text
			)}
		>
			<span
				className={cn(
					"size-1.5 rounded-full",
					tone.dot,
					status === "running" && "animate-pulse"
				)}
			/>
			{!compact && tone.label}
		</span>
	);
}

/* ─── Sidebar ─────────────────────────────────────────────────────────── */

interface SidebarProps {
	activeId: string | null;
	onArchive: (id: string) => void;
	onNew: () => void;
	onRename: (id: string, title: string) => void;
	onSelect: (id: string) => void;
	threads: Thread[];
}

function ThreadRow({
	thread,
	isActive,
	onSelect,
	onArchive,
	onRename,
}: {
	thread: Thread;
	isActive: boolean;
	onSelect: (id: string) => void;
	onArchive: (id: string) => void;
	onRename: (id: string, title: string) => void;
}) {
	const [renaming, setRenaming] = useState(false);
	const [draft, setDraft] = useState(thread.title);
	const [confirmArchive, setConfirmArchive] = useState(false);
	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (renaming && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [renaming]);

	const isRunning = thread.status === "running";
	const timestamp = relativeTime(
		thread.latestUserMessageAt ?? thread.updatedAt ?? thread.createdAt
	);

	return (
		<li
			className={cn(
				"group/sub relative isolate flex w-full items-center rounded-md transition-colors",
				isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
			)}
		>
			<button
				className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-left"
				onClick={() => onSelect(thread.id)}
				onDoubleClick={() => {
					setDraft(thread.title);
					setRenaming(true);
				}}
				type="button"
			>
				<ThreadStatusPill compact status={thread.status} />
				{renaming ? (
					<input
						className="min-w-0 flex-1 truncate rounded border border-ring bg-transparent px-0.5 text-xs outline-none"
						onBlur={() => {
							onRename(thread.id, draft.trim() || thread.title);
							setRenaming(false);
						}}
						onChange={(e) => setDraft(e.target.value)}
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								onRename(thread.id, draft.trim() || thread.title);
								setRenaming(false);
							} else if (e.key === "Escape") {
								e.preventDefault();
								setRenaming(false);
							}
						}}
						ref={inputRef}
						value={draft}
					/>
				) : (
					<span className="min-w-0 flex-1 truncate text-xs">
						{thread.title}
					</span>
				)}
			</button>
			<div className="ml-auto flex shrink-0 items-center gap-1.5 pr-1.5">
				{thread.branch && (
					<Tooltip>
						<TooltipTrigger
							render={
								<span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/70">
									<GitBranchIcon className="size-3" />
								</span>
							}
						/>
						<TooltipPopup side="top">{thread.branch}</TooltipPopup>
					</Tooltip>
				)}
				{confirmArchive ? (
					<button
						className="inline-flex h-5 cursor-pointer items-center rounded-md bg-destructive/12 px-2 font-medium text-[10px] text-destructive hover:bg-destructive/18"
						onClick={(e) => {
							e.stopPropagation();
							onArchive(thread.id);
						}}
						type="button"
					>
						Confirm
					</button>
				) : (
					!isRunning && (
						<button
							aria-label={`Archive ${thread.title}`}
							className={cn(
								"inline-flex size-5 cursor-pointer items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground",
								"opacity-0 transition-opacity group-hover/sub:opacity-100 max-sm:opacity-100"
							)}
							onClick={(e) => {
								e.stopPropagation();
								setConfirmArchive(true);
							}}
							type="button"
						>
							<ArchiveIcon className="size-3.5" />
						</button>
					)
				)}
				<span
					className={cn(
						"text-[10px] tabular-nums",
						isActive ? "text-foreground/70" : "text-muted-foreground/50"
					)}
				>
					{timestamp}
				</span>
			</div>
		</li>
	);
}

export function ChatSidebar({
	threads,
	activeId,
	onSelect,
	onNew,
	onArchive,
	onRename,
}: SidebarProps) {
	const [query, setQuery] = useState("");
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) {
			return threads;
		}
		return threads.filter((t) => t.title.toLowerCase().includes(q));
	}, [threads, query]);

	return (
		<aside className="flex h-full w-64 shrink-0 flex-col border-border border-r bg-card">
			<div className="flex items-center justify-between border-border border-b px-3 py-2.5">
				<div className="flex flex-col leading-tight">
					<span className="font-semibold text-sm">Cyrus</span>
					<span className="text-[10px] text-muted-foreground">
						t3code style UI
					</span>
				</div>
				<button
					aria-label="New thread"
					className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
					onClick={onNew}
					type="button"
				>
					<PlusIcon className="size-4" />
				</button>
			</div>
			<div className="px-2 py-2">
				<div className="relative">
					<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
					<input
						className="h-8 w-full rounded-md border border-input bg-background pr-2 pl-7 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search threads"
						value={query}
					/>
				</div>
			</div>
			<ScrollArea className="flex-1 px-1.5">
				<ul className="flex flex-col gap-0.5 py-1">
					{filtered.map((t) => (
						<ThreadRow
							isActive={activeId === t.id}
							key={t.id}
							onArchive={onArchive}
							onRename={onRename}
							onSelect={onSelect}
							thread={t}
						/>
					))}
					{filtered.length === 0 && (
						<li className="px-2 py-6 text-center text-[11px] text-muted-foreground/60">
							No threads
						</li>
					)}
				</ul>
			</ScrollArea>
			<Separator />
		</aside>
	);
}

/* ─── Markdown (react-markdown) ───────────────────────────────────────── */

const MARKDOWN_COMPONENTS = {
	pre: ({ children, ...props }: React.ComponentProps<"pre">) => (
		<pre
			className="my-2 overflow-x-auto rounded-md border border-border/70 bg-muted/40 p-3 font-mono text-[11px] leading-relaxed"
			{...props}
		>
			{children}
		</pre>
	),
	code: ({ children, className, ...props }: React.ComponentProps<"code">) => {
		const isInline = !className;
		return isInline ? (
			<code
				className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[0.85em] text-foreground"
				{...props}
			>
				{children}
			</code>
		) : (
			<code className={cn("font-mono", className)} {...props}>
				{children}
			</code>
		);
	},
	h1: ({ children }: React.ComponentProps<"h1">) => (
		<h1 className="mt-3 mb-1.5 font-bold text-base">{children}</h1>
	),
	h2: ({ children }: React.ComponentProps<"h2">) => (
		<h2 className="mt-2 mb-1 font-bold text-sm">{children}</h2>
	),
	h3: ({ children }: React.ComponentProps<"h3">) => (
		<h3 className="mt-2 mb-1 font-semibold text-sm">{children}</h3>
	),
	p: ({ children }: React.ComponentProps<"p">) => (
		<p className="my-1.5 leading-relaxed">{children}</p>
	),
	ul: ({ children }: React.ComponentProps<"ul">) => (
		<ul className="my-1.5 list-disc pl-5">{children}</ul>
	),
	ol: ({ children }: React.ComponentProps<"ol">) => (
		<ol className="my-1.5 list-decimal pl-5">{children}</ol>
	),
	li: ({ children }: React.ComponentProps<"li">) => (
		<li className="my-0.5">{children}</li>
	),
	a: ({ children, href }: React.ComponentProps<"a">) => (
		<a
			className="text-primary underline underline-offset-2"
			href={href}
			rel="noreferrer"
			target="_blank"
		>
			{children}
		</a>
	),
	blockquote: ({ children }: React.ComponentProps<"blockquote">) => (
		<blockquote className="my-2 border-border border-l-2 pl-3 text-muted-foreground">
			{children}
		</blockquote>
	),
	hr: () => <hr className="my-3 border-border" />,
	table: ({ children }: React.ComponentProps<"table">) => (
		<table className="my-2 w-full border-collapse text-xs">{children}</table>
	),
	th: ({ children }: React.ComponentProps<"th">) => (
		<th className="border border-border bg-muted/40 px-2 py-1 text-left font-semibold">
			{children}
		</th>
	),
	td: ({ children }: React.ComponentProps<"td">) => (
		<td className="border border-border px-2 py-1">{children}</td>
	),
} as const;

function renderMarkdown(text: string): React.ReactNode {
	return (
		<ReactMarkdown
			components={MARKDOWN_COMPONENTS as never}
			remarkPlugins={[remarkGfm, remarkBreaks]}
		>
			{text}
		</ReactMarkdown>
	);
}

/* ─── Message bubble ──────────────────────────────────────────────────── */

function MessageCopyButton({ text }: { text: string }) {
	const { copied, copy } = useCopyToClipboard();
	return (
		<button
			aria-label="Copy message"
			className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
			onClick={() => {
				copy(text);
			}}
			type="button"
		>
			{copied ? (
				<CheckIcon className="size-3" />
			) : (
				<CopyIcon className="size-3" />
			)}
			{copied ? "Copied" : "Copy"}
		</button>
	);
}

function UserMessage({ message }: { message: Message }) {
	return (
		<div className="mb-5 flex flex-col items-end">
			<div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-primary-foreground">
				<div className="chat-markdown text-sm leading-relaxed">
					{renderMarkdown(message.content)}
				</div>
			</div>
			<div className="mt-1 flex items-center gap-1 pr-0.5">
				<span className="text-[10px] text-muted-foreground tabular-nums">
					{formatMessageTime(message.createdAt)}
				</span>
				<MessageCopyButton text={message.content} />
			</div>
		</div>
	);
}

function AssistantMessage({ message }: { message: Message }) {
	return (
		<div className="mb-2 px-0.5">
			<div className="chat-markdown text-foreground text-sm leading-relaxed">
				{renderMarkdown(message.content)}
			</div>
			<div className="mt-1 flex items-center gap-1">
				<MessageCopyButton text={message.content} />
				<span className="text-[10px] text-muted-foreground tabular-nums">
					{formatMessageTime(message.createdAt)}
				</span>
			</div>
		</div>
	);
}

/* ─── Work log (tool calls + diffs) ───────────────────────────────────── */

function ToolRow({ tool }: { tool: ToolCall }) {
	const [open, setOpen] = useState(false);
	return (
		<div className="overflow-hidden rounded-md border border-border/60 bg-muted/30 text-xs">
			<button
				className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
				onClick={() => setOpen((v) => !v)}
				type="button"
			>
				{open ? (
					<ChevronDownIcon className="size-3" />
				) : (
					<ChevronRightIcon className="size-3" />
				)}
				<TerminalIcon className="size-3 text-muted-foreground" />
				<span className="font-mono">{tool.name}</span>
				<span className="truncate text-muted-foreground">
					{Object.entries(tool.args)
						.map(
							([k, v]) =>
								`${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`
						)
						.join(", ")}
				</span>
				{tool.result && (
					<span className="ml-auto inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
						<CheckIcon className="size-3" /> {tool.result}
					</span>
				)}
			</button>
			{open && (
				<div className="border-border/60 border-t bg-background/60 px-2.5 py-2 font-mono text-[11px]">
					<div className="text-muted-foreground">args</div>
					<pre className="mt-0.5 whitespace-pre-wrap">
						{JSON.stringify(tool.args, null, 2)}
					</pre>
					{tool.result && (
						<>
							<div className="mt-1.5 text-muted-foreground">result</div>
							<pre className="mt-0.5 whitespace-pre-wrap">{tool.result}</pre>
						</>
					)}
				</div>
			)}
		</div>
	);
}

function DiffRow({ diff }: { diff: GitDiff }) {
	const [open, setOpen] = useState(false);
	return (
		<div className="overflow-hidden rounded-md border border-border/60 bg-card text-xs">
			<button
				className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
				onClick={() => setOpen((v) => !v)}
				type="button"
			>
				{open ? (
					<ChevronDownIcon className="size-3" />
				) : (
					<ChevronRightIcon className="size-3" />
				)}
				<GitBranchIcon className="size-3 text-muted-foreground" />
				<span className="truncate font-mono">{diff.file}</span>
				<span className="ml-auto inline-flex items-center gap-2 font-mono text-[11px] tabular-nums">
					<span className="text-emerald-600 dark:text-emerald-400">
						+{diff.additions}
					</span>
					<span className="text-red-600 dark:text-red-400">
						-{diff.deletions}
					</span>
				</span>
			</button>
			{open && (
				<div className="diff-render-surface max-h-80 overflow-auto border-border/60 border-t">
					<PatchDiff
						className="h-full min-h-0 overflow-auto"
						options={{
							diffStyle: "unified",
							lineDiffType: "none",
							overflow: "scroll",
							theme: "github-dark",
							themeType: "dark" as const,
							stickyHeader: true,
						}}
						patch={diff.patch}
					/>
				</div>
			)}
		</div>
	);
}

interface WorkLogEntry {
	activities?: ToolCall[];
	diffs?: GitDiff[];
	id: string;
	turnId?: string;
	type: "work";
}

function WorkLog({ entry }: { entry: WorkLogEntry }) {
	const [open, setOpen] = useState(true);
	const tools: ToolCall[] = entry.activities ?? [];
	const diffs: GitDiff[] = entry.diffs ?? [];
	return (
		<Collapsible className="mb-3" onOpenChange={setOpen} open={open}>
			<div className="flex items-center gap-2 py-1">
				<CollapsibleTrigger className="inline-flex items-center gap-1 font-medium text-[11px] text-muted-foreground hover:text-foreground">
					{open ? (
						<ChevronDownIcon className="size-3.5" />
					) : (
						<ChevronRightIcon className="size-3.5" />
					)}
					<span>Turn activity</span>
					<span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
						{tools.length} tools · {diffs.length} diffs
					</span>
				</CollapsibleTrigger>
			</div>
			<CollapsibleContent className="flex flex-col gap-1.5 pl-1">
				{tools.map((t) => (
					<ToolRow key={t.id} tool={t} />
				))}
				{diffs.map((d) => (
					<DiffRow diff={d} key={d.id} />
				))}
			</CollapsibleContent>
		</Collapsible>
	);
}

/* ─── Chat feed ───────────────────────────────────────────────────────── */

function FeedEntryView({ entry }: { entry: FeedEntry }) {
	if (entry.type === "message" && entry.message) {
		return entry.message.role === "user" ? (
			<UserMessage message={entry.message} />
		) : (
			<AssistantMessage message={entry.message} />
		);
	}
	if (entry.type === "work") {
		return <WorkLog entry={entry as WorkLogEntry} />;
	}
	return null;
}

export function ChatFeed({ thread }: { thread: Thread | null }) {
	const feed = useThreadFeed(thread);
	const endRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
	}, []);

	if (!thread) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
				<div className="max-w-sm space-y-1.5">
					<TerminalIcon className="mx-auto size-7 text-muted-foreground/50" />
					<p className="font-medium text-sm">No thread selected</p>
					<p className="text-muted-foreground text-xs">
						Create a new thread from the sidebar to start a coding session.
					</p>
				</div>
			</div>
		);
	}
	if (feed.length === 0) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
				<div className="max-w-sm space-y-1.5">
					<p className="font-medium text-sm">No conversation yet</p>
					<p className="text-muted-foreground text-xs">
						Ask the agent to inspect the repo, run a command, or continue the
						active thread.
					</p>
				</div>
			</div>
		);
	}
	return (
		<ScrollArea className="flex-1">
			<div className="mx-auto flex max-w-3xl flex-col px-4 py-4">
				{feed.map((entry) => (
					<FeedEntryView entry={entry} key={entry.id} />
				))}
				<div ref={endRef} />
			</div>
		</ScrollArea>
	);
}

/* ─── Composer ────────────────────────────────────────────────────────── */

export function Composer({
	onSend,
	onStop,
	busy,
}: {
	onSend: (text: string) => void;
	onStop?: () => void;
	busy: boolean;
}) {
	const [value, setValue] = useState("");
	const taRef = useRef<HTMLTextAreaElement | null>(null);

	useEffect(() => {
		const ta = taRef.current;
		if (!ta) {
			return;
		}
		ta.style.height = "auto";
		ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
	}, []);

	function submit() {
		const text = value.trim();
		if (!text) {
			return;
		}
		onSend(text);
		setValue("");
	}

	return (
		<div className="shrink-0 border-border border-t bg-background px-3 py-2.5">
			<div className="mx-auto max-w-3xl">
				<div className="flex items-end gap-2 rounded-xl border border-input bg-card px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-ring">
					<textarea
						className="max-h-48 min-h-[36px] flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
						onChange={(e) => setValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								submit();
							}
						}}
						placeholder="Ask the repo agent, or run a command…"
						ref={taRef}
						rows={1}
						value={value}
					/>
					{busy ? (
						<button
							className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-destructive px-2.5 font-medium text-destructive-foreground text-xs hover:bg-destructive/90"
							onClick={() => onStop?.()}
							type="button"
						>
							<SquareIcon className="size-3.5" /> Stop
						</button>
					) : (
						<button
							className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 font-medium text-primary-foreground text-xs transition-colors hover:bg-primary/90 disabled:opacity-40"
							disabled={!value.trim()}
							onClick={submit}
							type="button"
						>
							<SendIcon className="size-3.5" /> Send
						</button>
					)}
				</div>
				<p className="mt-1 px-1 text-[10px] text-muted-foreground">
					<kbd className="rounded border border-border bg-muted px-1">
						Enter
					</kbd>{" "}
					to send ·{" "}
					<kbd className="rounded border border-border bg-muted px-1">
						Shift+Enter
					</kbd>{" "}
					for newline
				</p>
			</div>
		</div>
	);
}

/* ─── Diff panel (right) ──────────────────────────────────────────────── */

export function DiffPanel({
	thread,
	onClose,
}: {
	thread: Thread | null;
	onClose: () => void;
}) {
	const diffs = thread?.diffs ?? [];
	const turns = thread?.turns ?? [];

	let diffPanelContent: React.ReactNode;
	if (!thread) {
		diffPanelContent = (
			<p className="py-8 text-center text-muted-foreground/70 text-xs">
				Select a thread to inspect turn diffs.
			</p>
		);
	} else if (diffs.length === 0) {
		diffPanelContent = (
			<p className="py-8 text-center text-muted-foreground/70 text-xs">
				No diffs produced yet.
			</p>
		);
	} else {
		diffPanelContent = turns
			.map((turn) => ({
				turn,
				ds: diffs.filter((d) => d.turnId === turn.id),
			}))
			.filter((g) => g.ds.length > 0)
			.map(({ turn, ds }) => {
				const additions = ds.reduce((n, d) => n + d.additions, 0);
				const deletions = ds.reduce((n, d) => n + d.deletions, 0);
				return (
					<div className="flex flex-col gap-1.5" key={turn.id}>
						<div className="flex items-center gap-2 font-medium text-[11px] text-muted-foreground">
							<span>Turn {turn.index}</span>
							<span className="font-mono tabular-nums">
								+{additions} / -{deletions}
							</span>
						</div>
						{ds.map((d) => (
							<div
								className="diff-render-surface overflow-hidden rounded-md border border-border/60 bg-card"
								key={d.id}
							>
								<PatchDiff
									className="h-full min-h-0 overflow-auto"
									options={{
										diffStyle: "unified",
										lineDiffType: "none",
										overflow: "scroll",
										theme: "github-dark",
										themeType: "dark" as const,
										stickyHeader: true,
									}}
									patch={d.patch}
								/>
							</div>
						))}
					</div>
				);
			});
	}

	return (
		<div className="flex h-full w-full flex-col border-border border-l bg-card">
			<div className="flex items-center gap-2 border-border border-b px-3 py-2">
				<GitBranchIcon className="size-3.5 text-muted-foreground" />
				<span className="font-medium text-sm">Diffs</span>
				<span className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[11px] text-muted-foreground">
					{diffs.length} files
				</span>
				<button
					aria-label="Close diff panel"
					className="ml-auto inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
					onClick={onClose}
					type="button"
				>
					<ChevronDownIcon className="size-4" />
				</button>
			</div>
			<ScrollArea className="flex-1">
				<div className="flex flex-col gap-2 p-3">{diffPanelContent}</div>
			</ScrollArea>
		</div>
	);
}

/* ─── Re-exports for compat ───────────────────────────────────────────── */

export type { GitDiff, Message, Thread, ToolCall } from "@cyrus/hooks";
