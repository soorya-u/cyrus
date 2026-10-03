import { TaggedError } from "better-result";
import { errorModules, errorTag } from "./common";

const tags = {
	workerRunning: errorTag(errorModules.upgrade, "worker_running"),
	unmanagedInstall: errorTag(errorModules.upgrade, "unmanaged_install"),
	unsupportedPlatform: errorTag(errorModules.upgrade, "unsupported_platform"),
	download: errorTag(errorModules.upgrade, "download"),
	integrity: errorTag(errorModules.upgrade, "integrity"),
	swap: errorTag(errorModules.upgrade, "swap"),
} as const;

export class UpgradeWorkerRunningError extends TaggedError(tags.workerRunning)<{
	pid: number;
}>() {
	get message() {
		return `Worker is running (pid ${this.pid}). Run \`cyrusd stop\`, then \`cyrusd upgrade\`.`;
	}
	get orpcCode() {
		return "CONFLICT" as const;
	}
}

export class UpgradeUnmanagedInstallError extends TaggedError(
	tags.unmanagedInstall
)<{
	path: string;
	channel: "npm" | "other";
	reinstall: string;
}>() {
	get message() {
		if (this.channel === "npm")
			return "This cyrusd was installed with npm. Run `npm install -g @soorya-u/cyrusd@latest` to upgrade it.";
		return `This cyrusd (${this.path}) was not installed by the Cyrus installer, so it will not be overwritten. Reinstall with: ${this.reinstall}`;
	}
	get orpcCode() {
		return "PRECONDITION_FAILED" as const;
	}
}

export class UpgradeUnsupportedPlatformError extends TaggedError(
	tags.unsupportedPlatform
)<{
	os: string;
	arch: string;
}>() {
	get message() {
		return `No cyrusd release is published for ${this.os}/${this.arch}.`;
	}
	get orpcCode() {
		return "PRECONDITION_FAILED" as const;
	}
}

export class UpgradeDownloadError extends TaggedError(tags.download)<{
	url: string;
	detail?: string;
}>() {
	get message() {
		return `Could not download ${this.url}${this.detail ? `: ${this.detail}` : ""}`;
	}
	get orpcCode() {
		return "INTERNAL_SERVER_ERROR" as const;
	}
}

export class UpgradeIntegrityError extends TaggedError(tags.integrity)<{
	asset: string;
	detail: string;
}>() {
	get message() {
		return `Refusing to install ${this.asset}: ${this.detail}`;
	}
	get orpcCode() {
		return "INTERNAL_SERVER_ERROR" as const;
	}
}

export class UpgradeSwapError extends TaggedError(tags.swap)<{
	path: string;
	detail?: string;
}>() {
	get message() {
		return `Could not replace ${this.path}${this.detail ? `: ${this.detail}` : ""}`;
	}
	get orpcCode() {
		return "INTERNAL_SERVER_ERROR" as const;
	}
}

export type UpgradeError =
	| UpgradeWorkerRunningError
	| UpgradeUnmanagedInstallError
	| UpgradeUnsupportedPlatformError
	| UpgradeDownloadError
	| UpgradeIntegrityError
	| UpgradeSwapError;
