import type { PromptInputBlock } from "@cyrus/schemas/rtc/chat";
import type { MessageView } from "@cyrus/schemas/view";
import { formatMessageTime } from "@cyrus/utils/time";
import { FileIcon, LinkIcon } from "lucide-react";
import { MessageCopyButton } from "@/components/chat/messages/message-copy-button";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
	Message,
	MessageContent,
	MessageFooter,
} from "@/components/ui/message";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";

const HTTP_URI_PATTERN = /^https?:\/\//i;

function UserMessageResourceChip({
	block,
}: {
	block: Extract<PromptInputBlock, { type: "resource" }>;
}) {
	const isUrl = HTTP_URI_PATTERN.test(block.uri);
	const label = block.name ?? block.uri;

	return (
		<span className="inline-flex max-w-[min(100%,14rem)] shrink-0 items-center gap-1 rounded-md border border-primary-foreground/25 bg-primary-foreground/15 py-0.5 pr-1.5 pl-1.5 align-middle text-primary-foreground text-xs leading-none">
			{isUrl ? (
				<LinkIcon className="size-3 shrink-0 opacity-80" />
			) : (
				<FileIcon className="size-3 shrink-0 opacity-80" />
			)}
			<span className="truncate font-mono text-[11px]">{label}</span>
		</span>
	);
}

function UserMessageBody({ message }: { message: MessageView }) {
	const blocks = message.blocks;

	if (!blocks || blocks.length === 0) {
		return (
			<span className="wrap-break-word whitespace-pre-wrap">
				{message.content}
			</span>
		);
	}

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{blocks.map((block) => {
				if (block.type === "text") {
					const text = block.text.trim();
					if (!text) return null;
					return (
						<span
							className="wrap-break-word whitespace-pre-wrap"
							key={`text:${text}`}
						>
							{text}
						</span>
					);
				}

				return (
					<UserMessageResourceChip
						block={block}
						key={`resource:${block.uri}:${block.name ?? ""}`}
					/>
				);
			})}
		</div>
	);
}

export function UserMessage({ message }: { message: MessageView }) {
	return (
		<Message align="end" className="mb-5">
			<MessageContent>
				<Bubble variant="default">
					<BubbleContent>
						<UserMessageBody message={message} />
					</BubbleContent>
				</Bubble>
				<MessageFooter className="opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover/message:opacity-100">
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
				</MessageFooter>
			</MessageContent>
		</Message>
	);
}
