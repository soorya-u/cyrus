import {
	client as createAcpClient,
	methods,
	ndJsonStream,
	PROTOCOL_VERSION,
} from "@agentclientprotocol/sdk";
import { Result } from "better-result";
import { env } from "@/lib/env";
import { toMessage } from "@/utils/error";
import { stdinWritable } from "@/utils/io";
import type { AgentEntry } from "@/validators/agent";

export type AcpPingResult =
	| { ok: true; agentName?: string; agentVersion?: string }
	| { ok: false; error: string };

/** Spawn agent subprocess and complete ACP initialize (stdio — no TCP port). */
export async function pingAcpAgent(entry: AgentEntry): Promise<AcpPingResult> {
	const executable = Bun.which(entry.command);
	if (!executable) {
		return {
			ok: false,
			error: `command not found on PATH: ${entry.command}`,
		};
	}

	const proc = Bun.spawn([executable, ...entry.args], {
		stdin: "pipe",
		stdout: "pipe",
		stderr: "pipe",
		env: process.env,
	});

	const timer = setTimeout(() => {
		proc.kill();
	}, env.CYRUS_ACP_TIMEOUT_MS);

	const stop = () => {
		clearTimeout(timer);
		proc.kill();
	};

	const ping = await Result.tryPromise(async () => {
		if (!(proc.stdin && proc.stdout)) {
			throw new Error("failed to open subprocess stdio pipes");
		}

		const stream = ndJsonStream(stdinWritable(proc.stdin), proc.stdout);

		const initialized = await createAcpClient({ name: "cyrus-doctor" })
			.onRequest(methods.client.session.requestPermission, () => ({
				outcome: { outcome: "selected", optionId: "allow" },
			}))
			.connectWith(stream, async (ctx) =>
				ctx.request(methods.agent.initialize, {
					protocolVersion: PROTOCOL_VERSION,
					clientCapabilities: {},
				})
			);

		const agentInfo = initialized.agentInfo;
		return {
			agentName: agentInfo?.name,
			agentVersion: agentInfo?.version,
		};
	});

	const stderr =
		Result.isError(ping) && proc.stderr
			? await new Response(proc.stderr).text()
			: "";

	stop();

	if (Result.isOk(ping)) {
		return {
			ok: true,
			agentName: ping.value.agentName,
			agentVersion: ping.value.agentVersion,
		};
	}

	const detail = stderr.trim() ? `\n${stderr.trim()}` : "";
	return { ok: false, error: `${toMessage(ping.error)}${detail}` };
}
