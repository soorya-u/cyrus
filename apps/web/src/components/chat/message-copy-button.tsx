"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { memo, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/utils/cn";

const COPY_TOAST_TIMEOUT_MS = 1000;

export const MessageCopyButton = memo(function MessageCopyButton({
	text,
	size = "xs",
	variant = "outline",
	className,
}: {
	text: string;
	size?: "xs" | "icon-xs";
	variant?: "outline" | "ghost";
	className?: string;
}) {
	const ref = useRef<HTMLButtonElement>(null);
	const { copied, copy } = useCopyToClipboard();

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						aria-label="Copy message"
						className={cn(
							"text-muted-foreground hover:text-foreground",
							className
						)}
						disabled={copied}
						onClick={() => {
							copy(text).then(() => {
								toast.success("Copied!", { duration: COPY_TOAST_TIMEOUT_MS });
							});
						}}
						ref={ref}
						size={size}
						type="button"
						variant={variant}
					/>
				}
			>
				{copied ? (
					<CheckIcon className="size-3 text-primary" />
				) : (
					<CopyIcon className="size-3" />
				)}
			</TooltipTrigger>
			<TooltipPopup>
				<p>Copy to clipboard</p>
			</TooltipPopup>
		</Tooltip>
	);
});
