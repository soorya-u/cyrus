import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
	normalizeCallbackPath,
	toAbsoluteCallbackUrl,
} from "@/auth/callback-url";
import { MagicLink } from "@/components/auth/magic-link";

const searchSchema = z.object({
	callbackUrl: z.string().optional(),
});

export const Route = createFileRoute("/auth/magic-link")({
	validateSearch: searchSchema,
	component: MagicLinkPage,
});

function MagicLinkPage() {
	const { callbackUrl } = Route.useSearch();
	const callbackPath = normalizeCallbackPath(callbackUrl);
	const absoluteCallbackUrl = callbackPath
		? toAbsoluteCallbackUrl(callbackPath)
		: undefined;

	return <MagicLink callbackUrl={absoluteCallbackUrl} />;
}
