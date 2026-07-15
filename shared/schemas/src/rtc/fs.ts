import { z } from "zod";

export type DirListing = Array<string | Record<string, DirListing>>;

const DirListingSchema: z.ZodType<DirListing> = z.lazy(() =>
	z.array(z.union([z.string(), z.record(z.string(), DirListingSchema)]))
);

export const ListEntriesInputSchema = z.object({
	cwd: z.string().min(1),
	depth: z.number().int().min(1).optional(),
	includeFiles: z.boolean().optional(),
});

export const ListEntriesOutputSchema = z.object({
	dirs: DirListingSchema,
	files: z.array(z.string()).optional(),
});

export type ListEntriesInput = z.infer<typeof ListEntriesInputSchema>;
export type ListEntriesOutput = z.infer<typeof ListEntriesOutputSchema>;

export const SearchEntriesInputSchema = z.object({
	cwd: z.string().min(1),
	query: z.string().min(1).max(256),
	limit: z.number().int().min(1).max(200).optional(),
});

export const SearchEntrySchema = z.object({
	path: z.string(),
	kind: z.enum(["file", "directory"]),
});

export const SearchEntriesOutputSchema = z.object({
	entries: z.array(SearchEntrySchema),
	truncated: z.boolean(),
});

export type SearchEntriesInput = z.infer<typeof SearchEntriesInputSchema>;
export type SearchEntriesOutput = z.infer<typeof SearchEntriesOutputSchema>;
export type SearchEntry = z.infer<typeof SearchEntrySchema>;
