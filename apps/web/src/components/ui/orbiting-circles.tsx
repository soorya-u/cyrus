import { cn } from "cnfast";
import type React from "react";
import { Children, type CSSProperties, type ReactNode } from "react";

export type OrbitingCirclesProps = React.HTMLAttributes<HTMLDivElement> & {
	className?: string;
	children?: ReactNode;
	reverse?: boolean;
	duration?: number;
	delay?: number;
	radius?: number;
	path?: boolean;
	iconSize?: number;
	speed?: number;
};

export function OrbitingCircles({
	className,
	children,
	reverse,
	duration = 20,
	radius = 160,
	path = true,
	iconSize = 30,
	speed = 1,
	...props
}: OrbitingCirclesProps) {
	const calculatedDuration = duration / speed;
	const childCount = Children.count(children);

	return (
		<>
			{path && (
				<svg
					className="pointer-events-none absolute inset-0 size-full"
					version="1.1"
					xmlns="http://www.w3.org/2000/svg"
				>
					<title>Orbit path</title>
					<circle
						className="stroke-1 stroke-black/10 dark:stroke-white/10"
						cx="50%"
						cy="50%"
						fill="none"
						r={radius}
					/>
				</svg>
			)}
			{Children.map(children, (child, index) => {
				const angle = (360 / childCount) * index;
				return (
					<div
						className={cn(
							"absolute top-1/2 left-1/2 flex size-(--icon-size) transform-gpu animate-orbit items-center justify-center rounded-full",
							{ "[animation-direction:reverse]": reverse },
							className
						)}
						style={
							{
								"--duration": calculatedDuration,
								"--radius": radius,
								"--angle": angle,
								"--icon-size": `${iconSize}px`,
							} as CSSProperties
						}
						{...props}
					>
						{child}
					</div>
				);
			})}
		</>
	);
}
