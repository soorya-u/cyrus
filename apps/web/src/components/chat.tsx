"use client";

import type {
	FeedEntry,
	GitDiff,
	Message,
	Thread,
	ToolCall,
} from "@cyrus/hooks/types";
import { formatMessageTime } from "@cyrus/hooks/use-relative-time";
import { useThreadFeed } from "@cyrus/hooks/use-thread-feed";
import { PatchDiff } from "@pierre/diffs/react";
import {
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	GitBranchIcon,
	TerminalIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { MessageCopyButton } from "@/components/chat/message-copy-button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/utils/cn";

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

function UserMessage({ message }: { message: Message }) {
	return (
		<div className="group/user mb-5 flex flex-col items-end">
			<div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-primary-foreground">
				<div className="chat-markdown text-sm leading-relaxed">
					{renderMarkdown(message.content)}
				</div>
			</div>
			<div className="mt-1 flex w-full max-w-[85%] items-center justify-end gap-2 pe-1 text-xs tabular-nums opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover/user:opacity-100">
				<Tooltip>
					<TooltipTrigger
						render={
							<p className="text-muted-foreground text-xs tabular-nums" />
						}
					>
						{formatMessageTime(message.createdAt)}
					</TooltipTrigger>
					<TooltipPopup side="top">
						{formatMessageTime(message.createdAt)}
					</TooltipPopup>
				</Tooltip>
				<MessageCopyButton text={message.content} variant="ghost" />
			</div>
		</div>
	);
}

function AssistantMessage({ message }: { message: Message }) {
	return (
		<div className="group/assistant mb-2 px-0.5">
			<div className="chat-markdown text-foreground text-sm leading-relaxed">
				{renderMarkdown(message.content)}
			</div>
			<div className="mt-1.5 flex items-center gap-2 text-xs tabular-nums opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover/assistant:opacity-100">
				<MessageCopyButton text={message.content} variant="ghost" />
				<Tooltip>
					<TooltipTrigger
						render={
							<p className="text-muted-foreground text-xs tabular-nums" />
						}
					>
						{formatMessageTime(message.createdAt)}
					</TooltipTrigger>
					<TooltipPopup side="top">
						{formatMessageTime(message.createdAt)}
					</TooltipPopup>
				</Tooltip>
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

type WorkLogEntry = {
	activities?: ToolCall[];
	diffs?: GitDiff[];
	id: string;
	turnId?: string;
	type: "work";
};

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

export function ChatFeed({
	thread,
	className,
}: {
	thread: Thread;
	className?: string;
}) {
	const feed = useThreadFeed(thread);
	const endRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
	}, []);

	if (feed.length === 0) {
		return (
			<div
				className={cn(
					"flex flex-1 flex-col items-center justify-center px-6 pb-56 text-center",
					className
				)}
			>
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
		<ScrollArea className={cn("flex-1", className)}>
			<div className="mx-auto flex max-w-3xl flex-col px-4 pt-4 pb-56">
				{feed.map((entry) => (
					<FeedEntryView entry={entry} key={entry.id} />
				))}
				<div ref={endRef} />
			</div>
		</ScrollArea>
	);
}

/* ─── Diff panel (right) ──────────────────────────────────────────────── */

export function DiffPanel({
	thread,
	onClose,
}: {
	thread: Thread;
	onClose: () => void;
}) {
	const diffs = thread.diffs ?? [];
	const turns = thread.turns ?? [];

	let diffPanelContent: React.ReactNode;
	if (diffs.length === 0) {
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
