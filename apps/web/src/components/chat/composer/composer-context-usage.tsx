import type { ContextUsage } from "@cyrus/schemas/rtc/catalog";
import { cn } from "cnfast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";

const tokenFormatter = new Intl.NumberFormat("en", {
	compactDisplay: "short",
	maximumFractionDigits: 1,
	notation: "compact",
});

export function ComposerContextUsage({
	usage,
}: {
	usage: ContextUsage | null | undefined;
}) {
	if (!usage || (usage.used === undefined && usage.limit === undefined))
		return null;

	const used = usage.used ?? 0;
	const limit = usage.limit;
	const hasLimit = limit !== undefined && limit > 0;
	const ratio = hasLimit ? Math.min(used / limit, 1) : 0;
	const percent = Math.round(ratio * 100);
	const overloaded = hasLimit && percent > 90;

	// Match ComposerPrimaryAction: sm:h-8 sm:w-8 (32px)
	const size = 32;
	const stroke = 3;
	const radius = (size - stroke) / 2;
	const circumference = 2 * Math.PI * radius;
	const dashOffset = circumference * (1 - ratio);
	const strokeColor = overloaded
		? "var(--color-destructive)"
		: "var(--color-muted-foreground)";

	const label = hasLimit
		? `Context ${tokenFormatter.format(used)} / ${tokenFormatter.format(limit)} tokens`
		: `Context ${tokenFormatter.format(used)} tokens`;

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<button
						aria-label={label}
						className={cn(
							"relative inline-flex size-8 shrink-0 cursor-default items-center justify-center rounded-full",
							"text-muted-foreground outline-none transition-colors",
							"hover:bg-accent hover:text-foreground",
							"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
						)}
						type="button"
					/>
				}
			>
				<svg
					aria-hidden="true"
					className="absolute inset-0 size-full -rotate-90 transform-gpu p-0.5"
					viewBox={`0 0 ${size} ${size}`}
				>
					{hasLimit ? (
						<>
							<circle
								cx={size / 2}
								cy={size / 2}
								fill="none"
								r={radius}
								stroke="color-mix(in oklab, var(--color-muted-foreground) 35%, transparent)"
								strokeWidth={stroke}
							/>
							<circle
								className="transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
								cx={size / 2}
								cy={size / 2}
								fill="none"
								r={radius}
								stroke={strokeColor}
								strokeDasharray={circumference}
								strokeDashoffset={dashOffset}
								strokeLinecap="round"
								strokeWidth={stroke}
							/>
						</>
					) : null}
				</svg>
				<span
					className={cn(
						"relative font-medium text-[9px] tabular-nums leading-none",
						overloaded ? "text-destructive" : "text-muted-foreground"
					)}
				>
					{tokenFormatter.format(used)}
				</span>
			</TooltipTrigger>
			<TooltipPopup side="top">{label}</TooltipPopup>
		</Tooltip>
	);
}
