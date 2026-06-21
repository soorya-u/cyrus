import { QueryCache, QueryClient } from "@tanstack/react-query";
import { log } from "evlog";

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error) => log.error({ kind: "query_error", error }),
	}),
});
