import {
	connectSignaling,
	type SignalingSession,
} from "@cyrus/connections/rtc/session";
import type { DeviceInfo } from "@cyrus/connections/schemas/signaling";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	type ControllerConnection,
	connectController,
	getControllerId,
} from "@/handlers/controller";
import { authClient } from "@/lib/auth";
import { env } from "@/lib/env";

export const Route = createFileRoute("/threads/")({
	component: ThreadsList,
});

type ChatMessage = { id: string; from: "me" | "worker"; text: string };
type Status = "connecting" | "online" | "error";

function ThreadsList() {
	const { data: auth, isPending } = authClient.useSession();
	const room = auth?.user.id;

	const sessionRef = useRef<SignalingSession | null>(null);
	const connRef = useRef<ControllerConnection | null>(null);

	const [status, setStatus] = useState<Status>("connecting");
	const [peers, setPeers] = useState<DeviceInfo[]>([]);
	const [activePeer, setActivePeer] = useState<DeviceInfo | null>(null);
	const [dialing, setDialing] = useState(false);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [draft, setDraft] = useState("");
	const [sending, setSending] = useState(false);

	useEffect(() => {
		if (!room) {
			return;
		}
		let cancelled = false;
		(async () => {
			try {
				const session = await connectSignaling({
					host: env.VITE_SERVER_URL,
					room,
					role: "controller",
					id: getControllerId(),
				});
				if (cancelled) {
					session.close();
					return;
				}
				sessionRef.current = session;
				setStatus("online");
				session.events.subscribe((event) => {
					if (event.type === "peer-joined") {
						setPeers((prev) =>
							prev.some((p) => p.id === event.peer.id)
								? prev
								: [...prev, event.peer]
						);
					} else if (event.type === "peer-left") {
						setPeers((prev) => prev.filter((p) => p.id !== event.id));
					}
				});
				const initial = await session.signaling.listPeers();
				if (!cancelled) {
					setPeers(initial);
				}
			} catch (error) {
				if (!cancelled) {
					setStatus("error");
				}
				console.error("signaling failed", error);
			}
		})();
		return () => {
			cancelled = true;
			connRef.current?.close();
			sessionRef.current?.close();
		};
	}, [room]);

	const openChat = useCallback(async (peer: DeviceInfo) => {
		const session = sessionRef.current;
		if (!session) {
			return;
		}
		connRef.current?.close();
		connRef.current = null;
		setActivePeer(peer);
		setMessages([]);
		setDialing(true);
		try {
			connRef.current = await connectController({
				signaling: session.signaling,
				events: session.events,
				to: peer.id,
			});
		} catch (error) {
			console.error("dial failed", error);
		} finally {
			setDialing(false);
		}
	}, []);

	const send = useCallback(async () => {
		const conn = connRef.current;
		const text = draft.trim();
		if (!(conn && text)) {
			return;
		}
		setDraft("");
		setSending(true);
		setMessages((prev) => [
			...prev,
			{ id: crypto.randomUUID(), from: "me", text },
		]);
		const replyId = crypto.randomUUID();
		setMessages((prev) => [...prev, { id: replyId, from: "worker", text: "" }]);
		try {
			const stream = await conn.client.chat({ message: text });
			for await (const { chunk } of stream) {
				setMessages((prev) =>
					prev.map((m) =>
						m.id === replyId ? { ...m, text: m.text + chunk } : m
					)
				);
			}
		} catch (error) {
			console.error("chat failed", error);
		} finally {
			setSending(false);
		}
	}, [draft]);

	if (!(isPending || room)) {
		return (
			<div className="p-6 text-muted-foreground text-sm">
				Sign in to connect to your devices.
			</div>
		);
	}

	return (
		<div className="flex h-dvh flex-col gap-4 p-6">
			<header className="flex items-center gap-3">
				<h1 className="font-semibold text-xl">Threads</h1>
				<span
					className="text-muted-foreground text-xs"
					data-testid="signaling-status"
				>
					signaling: {status}
				</span>
			</header>

			<div className="grid min-h-0 flex-1 grid-cols-[18rem_1fr] gap-4">
				<aside className="flex min-h-0 flex-col gap-2 rounded-lg border p-3">
					<h2 className="font-medium text-sm">Peers</h2>
					{peers.length === 0 ? (
						<p className="text-muted-foreground text-xs">
							No peers yet. Start a worker (cyrus CLI) in the same room.
						</p>
					) : (
						<ul className="flex flex-col gap-2" data-testid="peer-list">
							{peers.map((peer) => (
								<li
									className="rounded-md border p-2"
									data-testid="peer"
									key={peer.id}
								>
									<div className="font-medium text-sm">{peer.name}</div>
									<div
										className="break-all font-mono text-[10px] text-muted-foreground"
										data-testid="peer-id"
									>
										{peer.id}
									</div>
									<div className="text-muted-foreground text-xs">
										{peer.role}
									</div>
									<Button
										className="mt-2 w-full"
										data-testid="open-chat"
										disabled={dialing && activePeer?.id === peer.id}
										onClick={() => openChat(peer)}
										size="xs"
										variant={activePeer?.id === peer.id ? "default" : "outline"}
									>
										{activePeer?.id === peer.id ? "Connected" : "Open chat"}
									</Button>
								</li>
							))}
						</ul>
					)}
				</aside>

				<section className="flex min-h-0 flex-col rounded-lg border">
					{activePeer ? (
						<>
							<div className="border-b p-3 text-sm">
								Chat with <span className="font-medium">{activePeer.name}</span>
								{dialing && (
									<span className="ml-2 text-muted-foreground text-xs">
										connecting…
									</span>
								)}
							</div>
							<ul
								className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3"
								data-testid="messages"
							>
								{messages.map((m) => (
									<li
										className={
											m.from === "me"
												? "self-end rounded-lg bg-primary px-3 py-1.5 text-primary-foreground text-sm"
												: "self-start rounded-lg bg-muted px-3 py-1.5 text-sm"
										}
										data-testid={`message-${m.from}`}
										key={m.id}
									>
										{m.text || (m.from === "worker" ? "…" : "")}
									</li>
								))}
							</ul>
							<form
								className="flex gap-2 border-t p-3"
								onSubmit={(e) => {
									e.preventDefault();
									send();
								}}
							>
								<input
									className="flex-1 rounded-md border bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
									data-testid="chat-input"
									disabled={dialing}
									onChange={(e) => setDraft(e.target.value)}
									placeholder="Type a message…"
									value={draft}
								/>
								<Button
									data-testid="send"
									disabled={dialing || sending || !draft.trim()}
									type="submit"
								>
									Send
								</Button>
							</form>
						</>
					) : (
						<div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
							Select a peer to start chatting.
						</div>
					)}
				</section>
			</div>
		</div>
	);
}
