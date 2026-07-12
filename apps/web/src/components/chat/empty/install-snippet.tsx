import { cn } from "cnfast";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	INSTALL_COMMANDS,
	INSTALL_METHODS,
	type InstallMethod,
} from "@/constants/commands";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

export function InstallSnippet({ className }: { className?: string }) {
	const [method, setMethod] = useState<InstallMethod>("npm");
	const { copied, copy } = useCopyToClipboard();
	const command = INSTALL_COMMANDS[method];

	return (
		<div
			className={cn(
				"w-full max-w-md overflow-hidden rounded-xl border border-border bg-muted/30 text-left",
				className
			)}
		>
			<div className="flex items-center justify-between gap-2 border-border/60 border-b px-3 py-2">
				<div className="flex items-center gap-1">
					{INSTALL_METHODS.map((option) => (
						<button
							aria-pressed={method === option}
							className={cn(
								"rounded-md px-2 py-1 font-medium text-xs transition-colors",
								method === option
									? "bg-background text-foreground shadow-xs"
									: "text-muted-foreground hover:text-foreground"
							)}
							key={option}
							onClick={() => setMethod(option)}
							type="button"
						>
							{option === "npm" ? "npm" : "shell"}
						</button>
					))}
				</div>
				<Button
					aria-label="Copy install command"
					className="size-7 shrink-0"
					onClick={() => {
						copy(command).catch(() => undefined);
					}}
					size="icon-xs"
					type="button"
					variant="ghost"
				>
					{copied ? (
						<CheckIcon className="size-3.5 text-primary" />
					) : (
						<CopyIcon className="size-3.5" />
					)}
				</Button>
			</div>
			<pre className="overflow-x-auto px-3 py-3 font-mono text-[11px] text-foreground/90 leading-relaxed">
				{command}
			</pre>
		</div>
	);
}
