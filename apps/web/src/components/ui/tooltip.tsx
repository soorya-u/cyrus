import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;

function TooltipTrigger(props: TooltipPrimitive.Trigger.Props) {
	return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipPopup({
	className,
	align = "center",
	sideOffset = 4,
	side = "top",
	anchor,
	children,
	...props
}: TooltipPrimitive.Popup.Props & {
	align?: TooltipPrimitive.Positioner.Props["align"];
	side?: TooltipPrimitive.Positioner.Props["side"];
	sideOffset?: TooltipPrimitive.Positioner.Props["sideOffset"];
	anchor?: TooltipPrimitive.Positioner.Props["anchor"];
}) {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Positioner
				align={align}
				anchor={anchor}
				className="pointer-events-none z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom,transform] data-instant:transition-none"
				data-slot="tooltip-positioner"
				side={side}
				sideOffset={sideOffset}
			>
				<TooltipPrimitive.Popup
					className={cn(
						"relative flex h-(--popup-height,auto) w-(--popup-width,auto) origin-(--transform-origin) text-balance rounded-md border bg-popover not-dark:bg-clip-padding text-popover-foreground text-xs shadow-md/5 transition-[width,height,scale,opacity] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-md)-1px)] data-ending-style:scale-98 data-starting-style:scale-98 data-ending-style:opacity-0 data-starting-style:opacity-0 data-instant:duration-0",
						className
					)}
					data-slot="tooltip-popup"
					{...props}
				>
					<TooltipPrimitive.Viewport
						className="relative size-full overflow-clip px-(--viewport-inline-padding) py-1 [--viewport-inline-padding:--spacing(2)] data-instant:transition-none"
						data-slot="tooltip-viewport"
					>
						{children}
					</TooltipPrimitive.Viewport>
				</TooltipPrimitive.Popup>
			</TooltipPrimitive.Positioner>
		</TooltipPrimitive.Portal>
	);
}

export { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger };
