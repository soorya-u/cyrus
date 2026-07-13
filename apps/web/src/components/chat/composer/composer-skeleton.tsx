import { Skeleton } from "@/components/ui/skeleton";

export function ComposerSkeleton() {
	return (
		<div className="group rounded-[22px] p-px transition-colors duration-200">
			<div className="chat-composer-glass rounded-4xl border border-border transition-colors duration-200">
				<div className="relative px-3 pt-3.5 pb-2 sm:px-4 sm:pt-4">
					<Skeleton className="min-h-17.5 w-full rounded-2xl" />
				</div>
				<div className="flex min-w-0 flex-nowrap items-center justify-between gap-2 px-2.5 pb-2.5 sm:gap-0 sm:px-3 sm:pb-3">
					<Skeleton className="h-8 w-36 max-w-48 rounded-md sm:max-w-56" />
					<Skeleton className="size-8 shrink-0 rounded-full" />
				</div>
			</div>
		</div>
	);
}
