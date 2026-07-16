import { ORPCError } from "@orpc/server";
import type { Result } from "better-result";

export type OrpcErrorCode = ConstructorParameters<typeof ORPCError>[0];

export type OrpcCapable = {
	readonly message: string;
	readonly orpcCode: OrpcErrorCode;
};

declare const emptyPayloadBrand: unique symbol;
export type EmptyPayload = { [emptyPayloadBrand]?: never };

export function throwOrpc(error: OrpcCapable): never {
	throw new ORPCError(error.orpcCode, { message: error.message });
}

/** Unwrap a Result at an oRPC handler boundary; throws ORPCError on Err. */
export function orpcOk<T>(result: Result<T, OrpcCapable>): T {
	if (result.isErr()) throwOrpc(result.error);
	return result.value;
}
