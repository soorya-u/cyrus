import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
	component: AuthLayout,
});

function AuthLayout() {
	return (
		<div className="relative flex min-h-screen flex-col items-center justify-center bg-(--home-page-bg) px-6 text-foreground antialiased">
			{/* Overflow clipped on the grid layer only — parent overflow:hidden breaks backdrop-filter. */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 overflow-hidden"
				style={{
					backgroundImage:
						"linear-gradient(to right, var(--home-grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--home-grid-line) 1px, transparent 1px)",
					backgroundSize: "48px 48px",
					maskImage:
						"radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)",
					WebkitMaskImage:
						"radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)",
				}}
			/>
			<div className="relative z-1 flex w-full max-w-sm flex-col items-center gap-5">
				<Outlet />
			</div>
		</div>
	);
}
