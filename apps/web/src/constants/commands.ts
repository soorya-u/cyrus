export const INSTALL_COMMANDS = {
	npm: "npm install -g @soorya-u/cyrusd && cyrusd start --bg",
	bash: "curl -fsSL https://cyrus.soorya.dev/install.sh | bash",
	powershell: "irm https://cyrus.soorya.dev/install.ps1 | iex",
} as const;

export type InstallMethod = keyof typeof INSTALL_COMMANDS;

export const INSTALL_METHODS: readonly InstallMethod[] = [
	"npm",
	"bash",
	"powershell",
];

export const INSTALL_LABELS: Record<InstallMethod, string> = {
	npm: "npm",
	bash: "Bash",
	powershell: "PowerShell",
};
