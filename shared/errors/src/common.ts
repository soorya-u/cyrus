import { isTaggedError } from "better-result";

export const errorModules = {
	repository: "repository",
	coordinator: "coordinator",
	git: "git",
} as const;

export type ErrorModule = (typeof errorModules)[keyof typeof errorModules];

export function errorTag<M extends ErrorModule>(
	module: M,
	entity: string
): `${M}.${string}` {
	return `${module}.${entity}`;
}

export function isModuleError(
	cause: unknown,
	module: ErrorModule
): cause is { readonly _tag: `${ErrorModule}.${string}` } {
	return (
		isTaggedError(cause) &&
		typeof cause._tag === "string" &&
		cause._tag.startsWith(`${module}.`)
	);
}
