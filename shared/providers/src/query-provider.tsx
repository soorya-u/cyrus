import {
	QueryCache,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { type PropsWithChildren, useState } from "react";

type QueryCacheOptions = NonNullable<
	ConstructorParameters<typeof QueryCache>[0]
>;

type QueryProviderProps = PropsWithChildren<{
	onError?: QueryCacheOptions["onError"];
}>;

export function QueryProvider({ onError, children }: QueryProviderProps) {
	const [client] = useState(
		() =>
			new QueryClient({
				queryCache: new QueryCache({ onError }),
			})
	);

	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
