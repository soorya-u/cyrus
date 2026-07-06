import { z } from "zod";

export const ProjectSchema = z.object({
	id: z.string(),
	cwd: z.string(),
	name: z.string().optional(),
});

export const ListProjectsOutputSchema = z.object({
	projects: z.array(ProjectSchema),
});

export const CreateProjectInputSchema = z.object({
	name: z.string().min(1),
	cwd: z.string(),
});

export const CreateProjectOutputSchema = z.object({
	project: ProjectSchema,
});

export const RenameProjectInputSchema = z.object({
	projectId: z.string(),
	name: z.string().min(1),
});

export const DeleteProjectInputSchema = z.object({
	projectId: z.string(),
});

export type Project = z.infer<typeof ProjectSchema>;
export type ListProjectsOutput = z.infer<typeof ListProjectsOutputSchema>;
