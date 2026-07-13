import { z } from "zod";
import { ProjectQueryInputSchema } from "./threads";

export const GitFileStatusSchema = z.enum([
	"Added",
	"Deleted",
	"Modified",
	"Renamed",
	"Untracked",
]);

export type GitFileStatus = z.infer<typeof GitFileStatusSchema>;

export const GitFileChangeSchema = z.object({
	path: z.string(),
	status: GitFileStatusSchema,
	insertions: z.number(),
	deletions: z.number(),
});

export const GitStatusNotRepoSchema = z.object({
	isRepo: z.literal(false),
});

export const GitStatusRepoSchema = z.object({
	isRepo: z.literal(true),
	refName: z.string().nullable(),
	files: z.array(GitFileChangeSchema),
	insertions: z.number(),
	deletions: z.number(),
});

export const GitStatusOutputSchema = z.discriminatedUnion("isRepo", [
	GitStatusNotRepoSchema,
	GitStatusRepoSchema,
]);

export const GitPatchOutputSchema = z.object({
	patch: z.string(),
});

export const GitRefSchema = z.object({
	name: z.string(),
	current: z.boolean(),
});

export const GitRefsOutputSchema = z.object({
	isRepo: z.boolean(),
	refs: z.array(GitRefSchema),
});

export const ThreadGitQueryInputSchema = z.object({
	threadId: z.string().min(1),
});

export const GitPatchInputSchema = ThreadGitQueryInputSchema.extend({
	path: z.string().optional(),
});

export const GitRefsQueryInputSchema = ThreadGitQueryInputSchema.extend({
	query: z.string().optional(),
});

export const GitCheckoutInputSchema = ThreadGitQueryInputSchema.extend({
	refName: z.string().min(1),
});

export const GitCreateWorktreeInputSchema = ThreadGitQueryInputSchema.extend({
	refName: z.string().min(1),
	path: z.string().optional(),
});

export const GitCreateWorktreeOutputSchema = z.object({
	worktreePath: z.string(),
});

export const ProjectGitRefsQueryInputSchema = ProjectQueryInputSchema.extend({
	query: z.string().optional(),
});

export type GitFileChange = z.infer<typeof GitFileChangeSchema>;
export type GitStatusOutput = z.infer<typeof GitStatusOutputSchema>;
export type GitPatchOutput = z.infer<typeof GitPatchOutputSchema>;
export type GitRef = z.infer<typeof GitRefSchema>;
export type GitRefsOutput = z.infer<typeof GitRefsOutputSchema>;
export type GitPatchInput = z.infer<typeof GitPatchInputSchema>;
export type GitRefsQueryInput = z.infer<typeof GitRefsQueryInputSchema>;
export type GitCheckoutInput = z.infer<typeof GitCheckoutInputSchema>;
export type GitCreateWorktreeInput = z.infer<
	typeof GitCreateWorktreeInputSchema
>;
export type GitCreateWorktreeOutput = z.infer<
	typeof GitCreateWorktreeOutputSchema
>;
export type ProjectGitRefsQueryInput = z.infer<
	typeof ProjectGitRefsQueryInputSchema
>;
