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

export function UserMessage({ message }: { message: MessageView }) {
	return (
		<Message align="end" className="mb-5">
			<MessageContent>
				<Bubble variant="default">
					<BubbleContent className="chat-markdown">
						{renderMarkdown(message.content)}
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
