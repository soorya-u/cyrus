import { statSync } from "node:fs";
import { realpath } from "node:fs/promises";
import { relative, sep } from "node:path";
import { type GitError, GitNotRepositoryError } from "@cyrus/errors/git";
import type { GitFilesChanged } from "@cyrus/schemas/rtc/git";
import watcher, { type Event } from "@parcel/watcher";
import { Result } from "better-result";
import type { Repository } from "es-git";
import { openGitRepository, operationFailedFromUnknown } from "./open";

const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_MAX_WAIT_MS = 2000;
const GIT_DIR = ".git";
// Only these .git paths change what git status reports (HEAD moves, index
// rewrites, branch refs); everything else under .git is lock/object noise.
const GIT_STATE_PATHS = new Set([`${GIT_DIR}/HEAD`, `${GIT_DIR}/index`]);
const GIT_REFS_PREFIX = `${GIT_DIR}/refs/`;

export type FileWatchOptions = {
	signal?: AbortSignal;
	debounceMs?: number;
	/** Longest a continuous stream of changes may delay a signal. */
	maxWaitMs?: number;
};

function isDirectory(absolutePath: string): boolean | null {
	try {
		return statSync(absolutePath).isDirectory();
	} catch {
		return null;
	}
}

function isIgnored(
	repo: Repository,
	relativePath: string,
	event: Event
): boolean {
	// A deleted path can no longer be stat'ed, so check it both ways.
	const directory = event.type === "delete" ? null : isDirectory(event.path);
	if (directory === true) return repo.isPathIgnored(`${relativePath}/`);
	if (directory === false) return repo.isPathIgnored(relativePath);
	return (
		repo.isPathIgnored(relativePath) || repo.isPathIgnored(`${relativePath}/`)
	);
}

function isRelevant(
	repo: Repository | null,
	relativePath: string,
	event: Event
): boolean {
	if (!repo) return true;
	if (relativePath === GIT_DIR || relativePath.startsWith(`${GIT_DIR}/`)) {
		return (
			GIT_STATE_PATHS.has(relativePath) ||
			relativePath.startsWith(GIT_REFS_PREFIX)
		);
	}
	// Match the Explorer listing: ignore rules never hide a tracked file.
	if (repo.index().getByPath(relativePath) !== null) return true;
	return !isIgnored(repo, relativePath, event);
}

export async function watchGitDirectory(
	cwd: string,
	options: FileWatchOptions = {}
): Promise<
	Result<AsyncIteratorObject<GitFilesChanged, unknown, void>, GitError>
> {
	const {
		signal,
		debounceMs = DEFAULT_DEBOUNCE_MS,
		maxWaitMs = DEFAULT_MAX_WAIT_MS,
	} = options;

	const opened = await openGitRepository(cwd);
	if (opened.isErr() && !GitNotRepositoryError.is(opened.error)) {
		return Result.err(opened.error);
	}
	let repo: Repository | null = opened.isOk() ? opened.value : null;

	const root = await Result.tryPromise(() => realpath(cwd));
	if (root.isErr()) return Result.err(operationFailedFromUnknown(root.error));

	let closed = false;
	let pending = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let firstEventAt: number | undefined;
	let waiting: ((result: IteratorResult<GitFilesChanged>) => void) | undefined;
	let closing: Promise<void> | undefined;
	let unsubscribe: (() => Promise<void>) | undefined;
	let adopting = false;

	const adoptRepository = async () => {
		if (adopting) return;
		adopting = true;
		const adopted = await openGitRepository(cwd);
		adopting = false;
		if (adopted.isOk() && !closed) repo = adopted.value;
	};

	const deliver = () => {
		timer = undefined;
		firstEventAt = undefined;
		if (closed) return;
		if (waiting) {
			const resolve = waiting;
			waiting = undefined;
			resolve({ done: false, value: {} });
		} else {
			pending = true;
		}
	};

	const schedule = () => {
		const now = Date.now();
		firstEventAt ??= now;
		const untilMaxWait = Math.max(0, firstEventAt + maxWaitMs - now);
		clearTimeout(timer);
		timer = setTimeout(deliver, Math.min(debounceMs, untilMaxWait));
	};

	const onAbort = () => {
		close();
	};

	const close = (): Promise<void> => {
		closing ??= (async () => {
			closed = true;
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
			const resolve = waiting;
			waiting = undefined;
			resolve?.({ done: true, value: undefined });
			try {
				await unsubscribe?.();
			} catch {
				// The native watcher is already gone; nothing left to release.
			}
		})();
		return closing;
	};

	const subscription = await Result.tryPromise(() =>
		watcher.subscribe(
			root.value,
			(error, events) => {
				if (closed) return;
				if (error) {
					close();
					return;
				}
				let relevant: boolean;
				try {
					relevant = events.some((event) => {
						const relativePath = relative(root.value, event.path)
							.split(sep)
							.join("/");
						if (
							!repo &&
							(relativePath === GIT_DIR ||
								relativePath.startsWith(`${GIT_DIR}/`))
						) {
							adoptRepository();
						}
						return isRelevant(repo, relativePath, event);
					});
				} catch {
					// Unable to classify a change: refresh rather than miss it.
					relevant = true;
				}
				if (relevant) schedule();
			},
			// Dependency trees are ignored by every project and expensive to watch.
			{ ignore: ["**/node_modules"] }
		)
	);
	if (subscription.isErr()) {
		return Result.err(operationFailedFromUnknown(subscription.error));
	}
	unsubscribe = () => subscription.value.unsubscribe();

	if (signal?.aborted) await close();
	else signal?.addEventListener("abort", onAbort, { once: true });

	const iterator: AsyncIteratorObject<GitFilesChanged, unknown, void> = {
		next() {
			if (closed) return Promise.resolve({ done: true, value: undefined });
			if (pending) {
				pending = false;
				return Promise.resolve({ done: false, value: {} });
			}
			return new Promise((resolve) => {
				waiting = resolve;
			});
		},
		async return() {
			await close();
			return { done: true, value: undefined };
		},
		[Symbol.asyncIterator]() {
			return iterator;
		},
		async [Symbol.asyncDispose]() {
			await close();
		},
	};
	return Result.ok(iterator);
}
