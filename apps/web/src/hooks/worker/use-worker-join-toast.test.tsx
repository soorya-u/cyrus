import { SignalingConnectionContext } from "@cyrus/providers/signaling/signaling-context";
import type { SignalingConnection } from "@cyrus/providers/types";
import type { ServerEvent } from "@cyrus/schemas/signaling";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useWorkerJoinToast } from "./use-worker-join-toast";

vi.mock("sonner", () => ({
	toast: { success: vi.fn() },
}));

beforeEach(() => {
	vi.mocked(toast.success).mockClear();
});

function createSignaling() {
	const handlers = new Set<(event: ServerEvent) => void>();

	const connection = {
		session: {
			close: () => undefined,
			events: {
				subscribe: (handler: (event: ServerEvent) => void) => {
					handlers.add(handler);
					return () => handlers.delete(handler);
				},
				close: () => undefined,
			},
		},
		orpc: {},
	} as unknown as SignalingConnection;

	return {
		connection,
		emit: (event: ServerEvent) => {
			for (const handler of handlers) handler(event);
		},
	};
}

function wrapperFor(connection: SignalingConnection) {
	return ({ children }: { children: ReactNode }) => (
		<SignalingConnectionContext.Provider value={connection}>
			{children}
		</SignalingConnectionContext.Provider>
	);
}

describe("useWorkerJoinToast", () => {
	test("shows a toast when a worker peer joins", () => {
		const { connection, emit } = createSignaling();
		renderHook(() => useWorkerJoinToast(), {
			wrapper: wrapperFor(connection),
		});

		emit({
			type: "peer-joined",
			peer: { id: "peer-1", name: "Worker One", role: "worker" },
		});

		expect(toast.success).toHaveBeenCalledTimes(1);
		expect(toast.success).toHaveBeenCalledWith(
			expect.stringContaining("Worker One")
		);
	});

	test("ignores peer-joined events for non-worker roles", () => {
		const { connection, emit } = createSignaling();
		renderHook(() => useWorkerJoinToast(), {
			wrapper: wrapperFor(connection),
		});

		emit({
			type: "peer-joined",
			peer: { id: "peer-2", name: "Controller One", role: "controller" },
		});

		expect(toast.success).not.toHaveBeenCalled();
	});

	test("ignores other event types", () => {
		const { connection, emit } = createSignaling();
		renderHook(() => useWorkerJoinToast(), {
			wrapper: wrapperFor(connection),
		});

		emit({ type: "peer-left", id: "peer-1" });

		expect(toast.success).not.toHaveBeenCalled();
	});

	test("unsubscribes on unmount", () => {
		const { connection, emit } = createSignaling();
		const { unmount } = renderHook(() => useWorkerJoinToast(), {
			wrapper: wrapperFor(connection),
		});

		unmount();
		emit({
			type: "peer-joined",
			peer: { id: "peer-1", name: "Worker One", role: "worker" },
		});

		expect(toast.success).not.toHaveBeenCalled();
	});
});
