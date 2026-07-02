import { mkdirSync } from "node:fs";

export type Project = {
	id: string;
	cwd: string;
	name?: string;
};

export const DEFAULT_PROJECT_ID = "default";

const DEFAULT_CWD = "/tmp/cyrus-agent-test";

mkdirSync(DEFAULT_CWD, { recursive: true });

const projects = new Map<string, Project>([
	[
		DEFAULT_PROJECT_ID,
		{
			id: DEFAULT_PROJECT_ID,
			cwd: DEFAULT_CWD,
			name: "Default",
		},
	],
]);

export function listProjects(): Project[] {
	return [...projects.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function getProject(projectId: string): Project | undefined {
	return projects.get(projectId);
}

export function resolveProjectCwd(projectId: string): string {
	const project = getProject(projectId);
	if (!project) {
		throw new Error(`project not found: ${projectId}`);
	}
	mkdirSync(project.cwd, { recursive: true });
	return project.cwd;
}
