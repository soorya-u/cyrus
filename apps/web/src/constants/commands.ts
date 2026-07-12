export const INSTALL_COMMANDS = {
	npm: "npm install -g @cyrus/cli && cyrusd start --bg",
	shell: "curl -fsSL https://cyrus.dev/install.sh | sh",
} as const;

export type InstallMethod = keyof typeof INSTALL_COMMANDS;

export const INSTALL_METHODS: readonly InstallMethod[] = ["npm", "shell"];
