const WINDOWS_PLATFORM_RE = /^win(dows)?/i;
const WINDOWS_DRIVE_PATH_RE = /^[a-zA-Z]:/;
const ROOT_PATH_RE = /^[a-zA-Z]:[/\\]?$/;
const TRAILING_UNIX_SEPARATORS_RE = /\/+$/g;
const TRAILING_WINDOWS_SEPARATORS_RE = /[\\/]+$/g;
const WINDOWS_DRIVE_ONLY_RE = /^[a-zA-Z]:$/;
const TRAILING_UNIX_SEPARATOR_RE = /\/$/;
const TRAILING_PATH_SEPARATOR_RE = /[\\/]$/;
const UNIX_PATH_SEGMENTS_RE = /\/+/;
const PATH_SEGMENTS_RE = /[\\/]+/;
const RELATIVE_PATH_SEGMENTS_RE = /[\\/]+/;
const PATH_TITLE_SEGMENTS_RE = /[/\\]/;
const MAC_PLATFORM_RE = /mac/i;

function isWindowsPlatform(platform: string): boolean {
	return WINDOWS_PLATFORM_RE.test(platform);
}

function isWindowsDrivePath(value: string): boolean {
	return WINDOWS_DRIVE_PATH_RE.test(value);
}

function isUncPath(value: string): boolean {
	return value.startsWith("\\\\");
}

function isWindowsAbsolutePath(value: string): boolean {
	return isWindowsDrivePath(value) || isUncPath(value);
}

function isRootPath(value: string): boolean {
	return value === "/" || value === "\\" || ROOT_PATH_RE.test(value);
}

function getAbsolutePathKind(value: string): "unix" | "windows" | null {
	if (isWindowsDrivePath(value) || isUncPath(value)) {
		return "windows";
	}
	if (value.startsWith("/")) {
		return "unix";
	}
	return null;
}

function trimTrailingPathSeparators(value: string): string {
	if (value.length === 0 || isRootPath(value)) {
		return value;
	}
	const trimmed =
		getAbsolutePathKind(value) === "unix"
			? value.replace(TRAILING_UNIX_SEPARATORS_RE, "")
			: value.replace(TRAILING_WINDOWS_SEPARATORS_RE, "");
	if (trimmed.length === 0) {
		return value;
	}
	return WINDOWS_DRIVE_ONLY_RE.test(trimmed) ? `${trimmed}\\` : trimmed;
}

function preferredPathSeparator(value: string): "/" | "\\" {
	const absolutePathKind = getAbsolutePathKind(value);
	if (absolutePathKind === "windows") return "\\";
	if (absolutePathKind === "unix") return "/";
	return value.includes("\\") ? "\\" : "/";
}

export function hasTrailingPathSeparator(value: string): boolean {
	return (
		getAbsolutePathKind(value) === "unix"
			? TRAILING_UNIX_SEPARATOR_RE
			: TRAILING_PATH_SEPARATOR_RE
	).test(value);
}

export function isExplicitRelativeProjectPath(value: string): boolean {
	return (
		value === "." ||
		value === ".." ||
		value.startsWith("./") ||
		value.startsWith("../") ||
		value.startsWith(".\\") ||
		value.startsWith("..\\")
	);
}

function splitPathSegments(value: string, separator: "/" | "\\"): string[] {
	return value
		.split(separator === "/" ? UNIX_PATH_SEGMENTS_RE : PATH_SEGMENTS_RE)
		.filter(Boolean);
}

function getLastPathSeparatorIndex(value: string): number {
	if (getAbsolutePathKind(value) === "unix") {
		return value.lastIndexOf("/");
	}
	return Math.max(value.lastIndexOf("/"), value.lastIndexOf("\\"));
}

function splitAbsolutePath(value: string): {
	root: string;
	separator: "/" | "\\";
	segments: string[];
} | null {
	if (isWindowsDrivePath(value)) {
		const root = `${value.slice(0, 2)}\\`;
		const segments = splitPathSegments(value.slice(root.length), "\\");
		return { root, separator: "\\", segments };
	}
	if (isUncPath(value)) {
		const segments = splitPathSegments(value, "\\");
		const [server, share, ...rest] = segments;
		if (!(server && share)) return null;
		return {
			root: `\\\\${server}\\${share}\\`,
			separator: "\\",
			segments: rest,
		};
	}
	if (value.startsWith("/")) {
		return {
			root: "/",
			separator: "/",
			segments: splitPathSegments(value.slice(1), "/"),
		};
	}
	return null;
}

export function isFilesystemBrowseQuery(value: string, platform = ""): boolean {
	const allowWindowsPaths = isWindowsPlatform(platform);
	return (
		value.startsWith("./") ||
		value.startsWith("../") ||
		value.startsWith(".\\") ||
		value.startsWith("..\\") ||
		value.startsWith("/") ||
		value === "~" ||
		value.startsWith("~/") ||
		(allowWindowsPaths && isWindowsAbsolutePath(value))
	);
}

export function isUnsupportedWindowsProjectPath(
	value: string,
	platform: string
): boolean {
	return isWindowsAbsolutePath(value) && !isWindowsPlatform(platform);
}

export function normalizeProjectPathForDispatch(value: string): string {
	return trimTrailingPathSeparators(value.trim());
}

export function resolveProjectPathForDispatch(
	value: string,
	cwd?: string | null
): string {
	const trimmedValue = value.trim();
	if (!(isExplicitRelativeProjectPath(trimmedValue) && cwd)) {
		return normalizeProjectPathForDispatch(trimmedValue);
	}

	const absoluteBase = splitAbsolutePath(normalizeProjectPathForDispatch(cwd));
	if (!absoluteBase) {
		return normalizeProjectPathForDispatch(trimmedValue);
	}

	const nextSegments = [...absoluteBase.segments];
	for (const segment of trimmedValue.split(RELATIVE_PATH_SEGMENTS_RE)) {
		if (segment.length === 0 || segment === ".") continue;
		if (segment === "..") {
			nextSegments.pop();
			continue;
		}
		nextSegments.push(segment);
	}

	const joinedPath = nextSegments.join(absoluteBase.separator);
	return normalizeProjectPathForDispatch(
		joinedPath.length === 0
			? absoluteBase.root
			: `${absoluteBase.root}${joinedPath}`
	);
}

export function inferProjectTitleFromPath(value: string): string {
	const normalized = normalizeProjectPathForDispatch(value);
	const absolutePath = splitAbsolutePath(normalized);
	if (absolutePath) {
		return absolutePath.segments.findLast(Boolean) ?? normalized;
	}
	const segments = normalized.split(PATH_TITLE_SEGMENTS_RE);
	return segments.findLast(Boolean) ?? normalized;
}

export function appendBrowsePathSegment(
	currentPath: string,
	segment: string
): string {
	const separator = preferredPathSeparator(currentPath);
	return `${getBrowseDirectoryPath(currentPath)}${segment}${separator}`;
}

export function getBrowseLeafPathSegment(currentPath: string): string {
	const lastSeparatorIndex = getLastPathSeparatorIndex(currentPath);
	return currentPath.slice(lastSeparatorIndex + 1);
}

export function getBrowseDirectoryPath(currentPath: string): string {
	if (hasTrailingPathSeparator(currentPath)) {
		return currentPath;
	}
	const lastSeparatorIndex = getLastPathSeparatorIndex(currentPath);
	return lastSeparatorIndex < 0
		? currentPath
		: currentPath.slice(0, lastSeparatorIndex + 1);
}

export function ensureBrowseDirectoryPath(currentPath: string): string {
	const trimmed = currentPath.trim();
	if (trimmed.length === 0 || hasTrailingPathSeparator(trimmed)) {
		return trimmed;
	}
	return `${trimmed}${preferredPathSeparator(trimmed)}`;
}

export function getBrowseParentPath(currentPath: string): string | null {
	const trimmed = trimTrailingPathSeparators(currentPath);
	const absolutePath = splitAbsolutePath(trimmed);
	if (absolutePath) {
		if (absolutePath.segments.length === 0) return null;
		if (absolutePath.segments.length === 1) return absolutePath.root;
		const parentSegments = absolutePath.segments
			.slice(0, -1)
			.join(absolutePath.separator);
		return `${absolutePath.root}${parentSegments}${absolutePath.separator}`;
	}

	const separator = preferredPathSeparator(currentPath);
	const lastSeparatorIndex = getLastPathSeparatorIndex(trimmed);
	if (lastSeparatorIndex < 0) return null;
	if (lastSeparatorIndex === 2 && WINDOWS_DRIVE_PATH_RE.test(trimmed)) {
		return `${trimmed.slice(0, 2)}${separator}`;
	}
	return trimmed.slice(0, lastSeparatorIndex + 1);
}

export function canNavigateUp(currentPath: string): boolean {
	return (
		hasTrailingPathSeparator(currentPath) &&
		getBrowseParentPath(currentPath) !== null
	);
}

export function joinBrowseEntryPath(
	directoryPath: string,
	name: string
): string {
	if (directoryPath === "/") {
		return `/${name}`;
	}
	if (hasTrailingPathSeparator(directoryPath)) {
		return `${directoryPath}${name}`;
	}
	const separator = preferredPathSeparator(directoryPath);
	return `${directoryPath}${separator}${name}`;
}

export function isMacPlatform(platform: string): boolean {
	return MAC_PLATFORM_RE.test(platform);
}
