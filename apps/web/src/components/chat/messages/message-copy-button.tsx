import { useClipboard } from "@mantine/hooks";
import { cn } from "cnfast";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";

export function MessageCopyButton({
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
	const { copied, copy } = useClipboard({ timeout: 1400 });

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
						onClick={() => copy(text)}
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
}
