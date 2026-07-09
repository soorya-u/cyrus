import { DeviceRoleSchema } from "@cyrus/schemas/signaling";
import type { Router } from "@orpc/server";
import { RPCHandler, type RPCHandlerOptions } from "@orpc/server/websocket";
import { RTCPeerConnection as NodeRTCPeerConnection } from "node-datachannel/polyfill";
import type { ControllerContract } from "../../contracts/controller";
import type { WorkerContract } from "../../contracts/worker";
import type { ThreadEventBus } from "../bus";
import {
	createIceBuffer,
	type RtcContext,
	relayLocalIce,
	type SignalingClient,
	type SignalingEvents,
	whenOpen,
} from "../peer";
import { asWebSocket } from "../socket";

// each router must implement its contract with RtcContext
export type WorkerRouters = {
	controller: Router<ControllerContract, RtcContext>;
	worker: Router<WorkerContract, RtcContext>;
};

export type WorkerOptions = {
	signaling: SignalingClient;
	events: SignalingEvents;
	routers: WorkerRouters;
	eventBus: ThreadEventBus;
	config?: RTCConfiguration;
	rpc?: RPCHandlerOptions<RtcContext>;
};

export type WorkerConnection = {
	close(): void;
};

export function serveWorker(options: WorkerOptions): WorkerConnection {
	const { signaling, events, config, routers, eventBus } = options;

	const handlers = {
		controller: new RPCHandler(routers.controller, options.rpc),
		worker: new RPCHandler(routers.worker, options.rpc),
	};

	const sessions = new Map<
		string,
		{ pc: RTCPeerConnection; ice: ReturnType<typeof createIceBuffer> }
	>();

	function dispose(peerId: string): void {
		eventBus.close(peerId);
		const session = sessions.get(peerId);
		if (session) {
			session.pc.close();
			sessions.delete(peerId);
		}
	}

	async function accept(
		from: string,
		offer: RTCSessionDescriptionInit
	): Promise<void> {
		dispose(from);

		const pc = new NodeRTCPeerConnection(
			config
		) as unknown as RTCPeerConnection;
		const ice = createIceBuffer(pc);
		sessions.set(from, { pc, ice });

		relayLocalIce(pc, signaling, from);

		pc.addEventListener("datachannel", (event) => {
			const { channel } = event;
			// the channel label is the dialer's role; ignore unknown ones
			const role = DeviceRoleSchema.safeParse(channel.label);
			if (!role.success) {
				return;
			}
			// node-datachannel polyfill: `datachannel` fires before `onOpen`, so wait
			whenOpen(channel)
				.then(() => {
					handlers[role.data].upgrade(asWebSocket(channel), {
						context: { peerId: from, eventBus } satisfies RtcContext,
					});
				})
				.catch(() => {
					// channel closed before opening — nothing to upgrade
				});
		});

		pc.addEventListener("connectionstatechange", () => {
			if (pc.connectionState === "closed" || pc.connectionState === "failed") {
				dispose(from);
			}
		});

		await ice.setRemote(offer);
		const answer = await pc.createAnswer();
		await pc.setLocalDescription(answer);
		await signaling.answer({ to: from, answer });
	}

	const unsubscribe = events.subscribe((event) => {
		switch (event.type) {
			case "offer":
				accept(event.from, event.offer).catch(() => dispose(event.from));
				break;
			case "ice-candidate":
				sessions.get(event.from)?.ice.addRemote(event.candidate);
				break;
			case "peer-left":
				dispose(event.id);
				break;
			default:
				break;
		}
	});

	return {
		close() {
			unsubscribe();
			for (const peerId of [...sessions.keys()]) {
				dispose(peerId);
			}
			eventBus.closeAll();
		},
	};
}
