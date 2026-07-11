export function getAcpPlatform(): string {
	const os = process.platform;
	const arch = process.arch;
	if (os === "darwin" && arch === "arm64") return "darwin-aarch64";
	if (os === "darwin" && arch === "x64") return "darwin-x86_64";
	if (os === "linux" && arch === "arm64") return "linux-aarch64";
	if (os === "linux" && arch === "x64") return "linux-x86_64";
	if (os === "win32" && arch === "arm64") return "windows-aarch64";
	if (os === "win32" && arch === "x64") return "windows-x86_64";
	return "unknown";
}
