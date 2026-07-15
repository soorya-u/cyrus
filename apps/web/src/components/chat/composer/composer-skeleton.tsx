import { Skeleton } from "@/components/ui/skeleton";

/**
 * Full composer rectangle — height mirrors the empty glass shell:
 * pt-3.5 + editor min-h-17.5 + pb-2 + footer h-8 + pb-2.5 (= 8.375rem).
 * sm: pt-4 + … + pb-3 (= 8.625rem).
 */
export function ComposerSkeleton() {
	return (
		<div className="group rounded-[22px] p-px" role="status">
			<span className="sr-only">Loading composer</span>
			<Skeleton className="h-[8.375rem] w-full rounded-4xl border border-border sm:h-[8.625rem]" />
		</div>
	);
}
