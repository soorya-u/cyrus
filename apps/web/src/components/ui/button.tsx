import { cn } from "@/utils/cn";

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	size?: "default" | "sm" | "lg" | "icon";
	variant?:
		| "default"
		| "outline"
		| "ghost"
		| "secondary"
		| "destructive"
		| "link";
}

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
	default: "bg-primary text-primary-foreground hover:bg-primary/90",
	outline:
		"border border-input bg-background hover:bg-accent hover:text-accent-foreground",
	ghost: "hover:bg-accent hover:text-accent-foreground",
	secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
	destructive:
		"bg-destructive text-destructive-foreground hover:bg-destructive/90",
	link: "underline-offset-4 hover:underline text-primary",
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
	default: "h-10 px-4 py-2",
	sm: "h-9 px-3",
	lg: "h-11 px-8",
	icon: "h-10 w-10",
};

export function Button({
	className,
	variant = "default",
	size = "default",
	...props
}: ButtonProps) {
	return (
		<button
			className={cn(
				"inline-flex items-center justify-center rounded-md font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
				variants[variant],
				sizes[size],
				className
			)}
			{...props}
		/>
	);
}
