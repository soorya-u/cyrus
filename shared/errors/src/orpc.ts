import { ORPCError } from "@orpc/server";

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
