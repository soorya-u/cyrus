import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useGitPatch } from "./use-git";

const queryFn = vi.fn();
const queryOptions = vi.fn((options: { queryKey: readonly unknown[] }) => ({
	queryKey: options.queryKey,
	queryFn,
}));

vi.mock("../contexts/rtc", () => ({
	useRtc: () => ({ orpc: { getGitPatch: { queryOptions } } }),
}));

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
	vi.clearAllMocks();
	queryFn.mockResolvedValue({ patch: "diff --git a/x b/x\n" });
});

describe("useGitPatch", () => {
	test("fetches the whole working-tree patch when no path is given", async () => {
		const { result } = renderHook(() => useGitPatch("t1", undefined), {
			wrapper,
		});

		await waitFor(() =>
			expect(result.current.data).toEqual({ patch: "diff --git a/x b/x\n" })
		);
		expect(queryOptions).toHaveBeenCalledWith(
			expect.objectContaining({ input: { threadId: "t1", path: undefined } })
		);
	});

	test("fetches a single file's patch when a path is given", async () => {
		renderHook(() => useGitPatch("t1", "src/a.ts"), { wrapper });

		await waitFor(() => expect(queryFn).toHaveBeenCalled());
		expect(queryOptions).toHaveBeenCalledWith(
			expect.objectContaining({ input: { threadId: "t1", path: "src/a.ts" } })
		);
	});

	test("does nothing when disabled or without a thread", () => {
		renderHook(() => useGitPatch("t1", "src/a.ts", false), { wrapper });
		renderHook(() => useGitPatch(undefined, undefined), { wrapper });

		expect(queryFn).not.toHaveBeenCalled();
	});
});
