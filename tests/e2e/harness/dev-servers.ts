export const WRANGLER_DEV_COMMAND = [
	"bunx",
	"wrangler@4.104.0",
	"dev",
	"--config",
	"wrangler.json",
	"--port",
	"8787",
	"--ip",
	"127.0.0.1",
	"--log-level",
	"warn",
	"--show-interactive-dev-session",
	"false",
] as const;

export const WEB_DEV_COMMAND = [
	"bun",
	"run",
	"dev",
	"--",
	"--host",
	"127.0.0.1",
	"--port",
	"5173",
] as const;
