import type { MessageView } from "@cyrus/schemas/view";
import { formatMessageTime } from "@cyrus/utils/time";
import { renderMarkdown } from "@/components/chat/markdown/markdown-components";
import { MessageCopyButton } from "@/components/chat/messages/message-copy-button";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
	Message,
	MessageContent,
	MessageFooter,
} from "@/components/ui/message";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";

export function AssistantMessage({ message }: { message: MessageView }) {
	return (
		<Message align="start" className="mb-2">
			<MessageContent>
				<Bubble variant="ghost">
					<BubbleContent className="chat-markdown text-foreground">
						{renderMarkdown(message.content)}
					</BubbleContent>
				</Bubble>
				<MessageFooter className="opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover/message:opacity-100">
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
				</MessageFooter>
			</MessageContent>
		</Message>
	);
}
