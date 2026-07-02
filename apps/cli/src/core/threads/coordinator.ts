import type {
	ModelOption,
	SelectOption,
} from "@cyrus/connections/schemas/agents";
import type { AgentEvent } from "@cyrus/connections/schemas/chat";
import type { AgentPool } from "@/core/acp/pool";
import { AgentRuntime } from "@/core/agents/runtime";
import { resolveProjectCwd } from "@/mocks/projects";

export class ThreadCoordinator {
	private readonly agents = new Map<string, AgentRuntime>();
	private readonly pool: AgentPool;

	constructor(pool: AgentPool) {
		this.pool = pool;
	}

	private getAgent(agentName: string): AgentRuntime {
		let runtime = this.agents.get(agentName);
		if (!runtime) {
			runtime = new AgentRuntime(agentName, this.pool);
			this.agents.set(agentName, runtime);
		}
		return runtime;
	}

	async getModels(agentName: string): Promise<ModelOption[]> {
		return await this.getAgent(agentName).getModels();
	}

	async getModes(agentName: string): Promise<SelectOption[]> {
		return await this.getAgent(agentName).getModes();
	}

	async getEfforts(agentName: string): Promise<SelectOption[]> {
		return await this.getAgent(agentName).getEfforts();
	}

	async getPersonas(agentName: string): Promise<SelectOption[]> {
		return await this.getAgent(agentName).getPersonas();
	}

	async setModel(
		agentName: string,
		threadId: string,
		projectId: string,
		modelId: string
	): Promise<void> {
		const cwd = resolveProjectCwd(projectId);
		await this.getAgent(agentName).setModel(threadId, projectId, cwd, modelId);
	}

	async setMode(
		agentName: string,
		threadId: string,
		projectId: string,
		modeId: string
	): Promise<void> {
		const cwd = resolveProjectCwd(projectId);
		await this.getAgent(agentName).setMode(threadId, projectId, cwd, modeId);
	}

	async setEffort(
		agentName: string,
		threadId: string,
		projectId: string,
		effortId: string
	): Promise<void> {
		const cwd = resolveProjectCwd(projectId);
		await this.getAgent(agentName).setEffort(
			threadId,
			projectId,
			cwd,
			effortId
		);
	}

	async setPersona(
		agentName: string,
		threadId: string,
		projectId: string,
		personaId: string
	): Promise<void> {
		const cwd = resolveProjectCwd(projectId);
		await this.getAgent(agentName).setPersona(
			threadId,
			projectId,
			cwd,
			personaId
		);
	}

	async *prompt(
		agentName: string,
		threadId: string,
		projectId: string,
		content: string
	): AsyncGenerator<AgentEvent> {
		const cwd = resolveProjectCwd(projectId);
		yield* this.getAgent(agentName).prompt(threadId, projectId, cwd, content);
	}

	async cancel(agentName: string, threadId: string): Promise<void> {
		await this.getAgent(agentName).cancel(threadId);
	}

	async close(agentName: string, threadId: string): Promise<void> {
		await this.getAgent(agentName).close(threadId);
	}
}
