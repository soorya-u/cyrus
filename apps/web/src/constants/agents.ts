export const AGENTS = [
	{
		key: "claude",
		src: "/icons/agents/claude.svg",
		invertInLight: false,
		title: "Claude Code",
		style: {
			top: "8%",
			left: "7%",
			animationDelay: "0s",
			transform: "rotate(-8deg)",
			background:
				"radial-gradient(circle at 30% 25%, rgba(217,119,87,0.22), var(--home-mark-card-bg) 65%)",
		},
	},
	{
		key: "codex",
		src: "/icons/agents/openai.svg",
		invertInLight: true,
		title: "Codex",
		style: {
			top: "6%",
			right: "7%",
			animationDelay: "-2.5s",
			transform: "rotate(6deg)",
			background:
				"radial-gradient(circle at 30% 25%, rgba(255,255,255,0.08), var(--home-mark-card-bg) 65%)",
		},
	},
	{
		key: "opencode",
		src: "/icons/agents/opencode.svg",
		invertInLight: false,
		title: "OpenCode",
		style: {
			bottom: "32%",
			left: "5%",
			animationDelay: "-5s",
			transform: "rotate(4deg)",
			background:
				"radial-gradient(circle at 30% 25%, rgba(255,255,255,0.06), var(--home-mark-card-bg) 65%)",
		},
	},
	{
		key: "cursor",
		src: "/icons/agents/cursor.svg",
		invertInLight: true,
		title: "Cursor",
		style: {
			bottom: "30%",
			right: "5%",
			animationDelay: "-7s",
			transform: "rotate(-5deg)",
			background:
				"radial-gradient(circle at 30% 25%, rgba(255,255,255,0.08), var(--home-mark-card-bg) 65%)",
		},
	},
] as const;
