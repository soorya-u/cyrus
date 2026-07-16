import { TaggedError } from "better-result";
import { errorModules, errorTag, isModuleError } from "./common";

const tags = {
	invalidHost: errorTag(errorModules.connection, "invalid_host"),
	signalingFailed: errorTag(errorModules.connection, "signaling_failed"),
	dialFailed: errorTag(errorModules.connection, "dial_failed"),
	dataChannelFailed: errorTag(errorModules.connection, "data_channel_failed"),
	iceFailed: errorTag(errorModules.connection, "ice_failed"),
} as const;

export class ConnectionInvalidHostError extends TaggedError(tags.invalidHost)<{
	message: string;
	detail?: string;
}>() {
	get orpcCode() {
		return "BAD_REQUEST" as const;
	}
}

export class ConnectionSignalingFailedError extends TaggedError(
	tags.signalingFailed
)<{
	message: string;
	detail?: string;
}>() {
	get orpcCode() {
		return "INTERNAL_SERVER_ERROR" as const;
	}
}

export class ConnectionDialFailedError extends TaggedError(tags.dialFailed)<{
	message: string;
	detail?: string;
}>() {
	get orpcCode() {
		return "INTERNAL_SERVER_ERROR" as const;
	}
}

export class ConnectionDataChannelFailedError extends TaggedError(
	tags.dataChannelFailed
)<{
	message: string;
	detail?: string;
}>() {
	get orpcCode() {
		return "INTERNAL_SERVER_ERROR" as const;
	}
}

export class ConnectionIceFailedError extends TaggedError(tags.iceFailed)<{
	message: string;
	detail?: string;
}>() {
	get orpcCode() {
		return "INTERNAL_SERVER_ERROR" as const;
	}
}

export type ConnectionError =
	| ConnectionInvalidHostError
	| ConnectionSignalingFailedError
	| ConnectionDialFailedError
	| ConnectionDataChannelFailedError
	| ConnectionIceFailedError;

export function isConnectionError(cause: unknown): cause is ConnectionError {
	return isModuleError(cause, errorModules.connection);
}

export function invalidHostError(
	message: string,
	detail?: string
): ConnectionInvalidHostError {
	return new ConnectionInvalidHostError({ message, detail });
}

export function signalingFailedError(
	message: string,
	detail?: string
): ConnectionSignalingFailedError {
	return new ConnectionSignalingFailedError({ message, detail });
}

export function dialFailedError(
	message: string,
	detail?: string
): ConnectionDialFailedError {
	return new ConnectionDialFailedError({ message, detail });
}

export function dataChannelFailedError(
	message: string,
	detail?: string
): ConnectionDataChannelFailedError {
	return new ConnectionDataChannelFailedError({ message, detail });
}

export function iceFailedError(
	message: string,
	detail?: string
): ConnectionIceFailedError {
	return new ConnectionIceFailedError({ message, detail });
}

export function connectionErrorMessageFromUnknown(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		typeof error.message === "string"
	) {
		return error.message;
	}
	return String(error);
}
