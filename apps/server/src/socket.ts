import { auth } from "@cyrus/auth";
import { env } from "@cyrus/env/server";
import { Server as Engine } from "@socket.io/bun-engine";
import { Elysia } from "elysia";
import { Server } from "socket.io";

// Inline WebRTC types — not available in the Bun server runtime
interface SessionDescription {
	sdp?: string;
	type: "offer" | "answer" | "pranswer" | "rollback";
}

interface IceCandidate {
	candidate: string;
	sdpMid?: string | null;
	sdpMLineIndex?: number | null;
	usernameFragment?: string | null;
}

type DeviceRole = "controller" | "worker";

interface DeviceInfo {
	deviceId: string;
	name: string;
	role: DeviceRole;
	socketId: string;
}

const io = new Server({
	cors: {
		origin: env.CORS_ORIGIN,
		credentials: true,
	},
});
const engine = new Engine({ path: "/io/" });

io.bind(engine);

export const socket = new Elysia().all("/io/", (ctx) => {
	if (!ctx.server) {
		return new Response("Server unavailable", { status: 503 });
	}
	return engine.handleRequest(ctx.request, ctx.server);
});

io.use(async (socket, next) => {
	const cookie = socket.handshake.headers.cookie;
	if (!cookie) {
		return next(new Error("Unauthorized"));
	}

	const session = await auth.api.getSession({
		headers: new Headers({ cookie }),
	});

	if (!session?.user) {
		return next(new Error("Unauthorized"));
	}

	// One room per user — all their devices share it
	socket.data.userId = session.user.id;
	socket.data.roomId = `room:${session.user.email}`;

	// Device metadata sent by the client in handshake.auth
	const { deviceId, role, name } = socket.handshake.auth as {
		deviceId: string;
		role: DeviceRole;
		name: string;
	};
	socket.data.deviceId = deviceId;
	socket.data.role = role;
	socket.data.name = name;

	next();
});

io.on("connection", (socket) => {
	const roomId: string = socket.data.roomId;
	const self: DeviceInfo = {
		socketId: socket.id,
		deviceId: socket.data.deviceId,
		role: socket.data.role,
		name: socket.data.name,
	};

	socket.join(roomId);

	// Tell existing peers about the new device so they can initiate WebRTC
	socket.to(roomId).emit("peer-joined", self);

	// Tell the new device who is already in the room
	io.in(roomId)
		.fetchSockets()
		.then((sockets) => {
			const peers: DeviceInfo[] = sockets
				.filter((s) => s.id !== socket.id)
				.map((s) => ({
					socketId: s.id,
					deviceId: s.data.deviceId,
					role: s.data.role,
					name: s.data.name,
				}));
			socket.emit("room-peers", peers);
		});

	// WebRTC signaling — relay to the specific target socket id
	socket.on(
		"offer",
		({ to, offer }: { to: string; offer: SessionDescription }) => {
			io.to(to).emit("offer", { from: socket.id, offer });
		}
	);

	socket.on(
		"answer",
		({ to, answer }: { to: string; answer: SessionDescription }) => {
			io.to(to).emit("answer", { from: socket.id, answer });
		}
	);

	socket.on(
		"ice-candidate",
		({ to, candidate }: { to: string; candidate: IceCandidate }) => {
			io.to(to).emit("ice-candidate", { from: socket.id, candidate });
		}
	);

	socket.on("disconnect", () => {
		socket.to(roomId).emit("peer-left", { socketId: socket.id });
	});
});
