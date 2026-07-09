import { z } from "zod";

export type DirListing = Array<string | Record<string, DirListing>>;

const DirListingSchema: z.ZodType<DirListing> = z.lazy(() =>
	z.array(z.union([z.string(), z.record(z.string(), DirListingSchema)]))
);

export const ListDirInputSchema = z.object({
	cwd: z.string().min(1),
	depth: z.number().int().min(1).optional(),
});

export const ListDirOutputSchema = z.object({
	dirs: DirListingSchema,
});

export type ListDirInput = z.infer<typeof ListDirInputSchema>;
export type ListDirOutput = z.infer<typeof ListDirOutputSchema>;
