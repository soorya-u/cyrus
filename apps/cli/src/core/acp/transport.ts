import type { AcpTransport } from "@acp-kit/core";
import {
	createSdkConnectionFactory,
	nodeChildProcessTransport,
} from "@acp-kit/core/node";
import type { SessionConfigAgent } from "@/core/agents/session-config";

export function createTrackedTransport(): {
	transport: AcpTransport;
	getConnection: () => SessionConfigAgent | undefined;
} {
	let connection: SessionConfigAgent | undefined;
	const factory = createSdkConnectionFactory();

	const transport = nodeChildProcessTransport({
		connectionFactory: {
			create(options) {
				const conn = factory.create(options);
				connection = conn as unknown as SessionConfigAgent;
				return conn;
			},
		},
	});

	return {
		transport,
		getConnection: () => connection,
	};
}
