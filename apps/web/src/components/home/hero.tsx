import { AGENTS } from "@/constants/agents";
import { ProviderButton } from "../auth/provider-button";

export function Hero() {
	return (
		<section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden py-20">
			{/* Background grid */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0"
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

			{/* Floating harness marks */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 z-1"
			>
				{AGENTS.map((agent) => (
					<span
						className="absolute grid h-24 w-24 place-items-center rounded-[24px] border backdrop-blur-[10px]"
						key={agent.key}
						style={{
							...agent.style,
							borderColor: "var(--home-mark-border)",
							animation: "floatDrift 9s ease-in-out infinite",
							boxShadow:
								"0 20px 48px -16px rgba(0,0,0,0.45), 0 2px 0 0 var(--home-mark-shadow-inset) inset",
						}}
						title={agent.title}
					>
						<img
							alt=""
							className={
								agent.invertInLight
									? "size-13.5 object-contain invert dark:invert-0"
									: "size-13.5 object-contain"
							}
							height={54}
							src={agent.src}
							width={54}
						/>
					</span>
				))}
			</div>

			{/* Content */}
			<div className="relative mx-auto max-w-310 px-8 text-center">
				<h1
					className="mx-auto mb-5.5 max-w-[20ch] font-medium leading-[1.05] tracking-[-0.035em]"
					style={
						{
							fontSize: "clamp(38px, 5.6vw, 76px)",
							textWrap: "balance",
						} as React.CSSProperties
					}
				>
					The open-source
					<br />
					distributed control plane
					<br />
					for Agentic Systems.
				</h1>

				<p
					className="mx-auto mb-9 max-w-160 text-muted-foreground leading-[1.55] tracking-[-0.005em]"
					style={{ fontSize: "clamp(16px, 1.4vw, 19px)" }}
				>
					Orchestrate Claude Code, Codex, OpenCode and Cursor from one surface.
					Bring your own subscription. Fork the whole thing.
				</p>

				<div className="mb-14 flex flex-col items-center gap-4">
					<ProviderButton
						callbackUrl={`${window.location.origin}/threads`}
						className="inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-[10px] bg-foreground px-5.5 py-3.5 font-semibold text-[15px] text-background transition-transform hover:-translate-y-px hover:bg-white active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
						provider="github"
						variant="default"
					/>
				</div>
			</div>
		</section>
	);
}
