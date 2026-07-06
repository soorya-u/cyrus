import { cn } from "cnfast";
import type { ComponentProps } from "react";

function Kbd({ className, ...props }: ComponentProps<"kbd">) {
	return (
		<kbd
			className={cn(
				"inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted/50 px-1 font-medium font-sans text-[10px] text-muted-foreground",
				className
			)}
			{...props}
		/>
	);
}

function KbdGroup({ className, ...props }: ComponentProps<"span">) {
	return (
		<span
			className={cn("inline-flex items-center gap-1", className)}
			{...props}
		/>
	);
}

export { Kbd, KbdGroup };
