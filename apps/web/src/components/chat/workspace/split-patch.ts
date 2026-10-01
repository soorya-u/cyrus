const FILE_START = /^(?=diff --git )/m;
const NEW_PATH = /^\+\+\+ b\/(.+)$/m;
const RENAME_TO = /^rename to (.+)$/m;
const HEADER_NEW_PATH = /^diff --git a\/.+ b\/(.+)$/;

function newPathOf(segment: string): string | null {
	const rename = segment.match(RENAME_TO);
	if (rename?.[1]) return rename[1];
	const marker = segment.match(NEW_PATH);
	if (marker?.[1]) return marker[1];
	const header = segment.split("\n", 1)[0] ?? "";
	return header.match(HEADER_NEW_PATH)?.[1] ?? null;
}

/** Splits a multi-file unified patch into one patch per file, keyed by new path. */
export function splitPatchByFile(patch: string): Map<string, string> {
	const files = new Map<string, string>();
	for (const segment of patch.split(FILE_START)) {
		if (!segment.startsWith("diff --git ")) continue;
		const path = newPathOf(segment);
		if (path) files.set(path, segment);
	}
	return files;
}
