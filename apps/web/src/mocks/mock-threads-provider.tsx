import type { UseMockThreads } from "@cyrus/hooks/use-mock-threads";
import { useMockThreads } from "@cyrus/hooks/use-mock-threads";
import { createContext, type ReactNode, useContext } from "react";

const MockThreadsContext = createContext<UseMockThreads | null>(null);

export function MockThreadsProvider({ children }: { children: ReactNode }) {
	const value = useMockThreads();
	return (
		<MockThreadsContext.Provider value={value}>
			{children}
		</MockThreadsContext.Provider>
	);
}

export function useMockThreadsContext(): UseMockThreads {
	const context = useContext(MockThreadsContext);
	if (!context) {
		throw new Error(
			"useMockThreadsContext must be used within MockThreadsProvider"
		);
	}
	return context;
}
