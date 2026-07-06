import type { Message } from "@cyrus/hooks/types";
import { formatMessageTime } from "@cyrus/utils/time";
import { renderMarkdown } from "@/components/chat/markdown/markdown-components";
import { MessageCopyButton } from "@/components/chat/messages/message-copy-button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";

export function AssistantMessage({ message }: { message: Message }) {
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
