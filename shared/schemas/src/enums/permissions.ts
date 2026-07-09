import { z } from "zod";

export const PermissionOptionKindSchema = z.enum([
	"allow_once",
	"allow_always",
	"reject_once",
	"reject_always",
]);

export type PermissionOptionKind = z.infer<typeof PermissionOptionKindSchema>;
