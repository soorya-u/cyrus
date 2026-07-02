import type {
	SetSessionConfigOptionRequest,
	SetSessionConfigOptionResponse,
} from "@agentclientprotocol/sdk";

export type SessionConfigAgent = {
	setSessionConfigOption(
		params: SetSessionConfigOptionRequest
	): Promise<SetSessionConfigOptionResponse>;
};

export async function setSessionConfigOption(
	agent: SessionConfigAgent,
	sessionId: string,
	configId: string,
	value: string
): Promise<void> {
	await agent.setSessionConfigOption({
		sessionId,
		configId,
		value,
	});
}
