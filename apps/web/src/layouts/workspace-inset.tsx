import { cn } from "cnfast";
import type { PropsWithChildren } from "react";
import { SidebarInset } from "@/components/ui/sidebar";

export function WorkspaceInset({
	children,
	className,
}: PropsWithChildren & {
	className?: string;
}) {
	return (
		<SidebarInset
			className={cn(
				"h-svh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground md:h-dvh",
				className
			)}
		>
			<div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
		</SidebarInset>
	);
}
