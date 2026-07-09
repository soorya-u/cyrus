import type { MessageView } from "@cyrus/schemas/view";
import { formatMessageTime } from "@cyrus/utils/time";
import { renderMarkdown } from "@/components/chat/markdown/markdown-components";
import { MessageCopyButton } from "@/components/chat/messages/message-copy-button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";

export function UserMessage({ message }: { message: MessageView }) {
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
