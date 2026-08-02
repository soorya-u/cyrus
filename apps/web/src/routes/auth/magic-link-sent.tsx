import { createFileRoute } from "@tanstack/react-router";
import { MagicLinkSent } from "@/components/auth/magic-link-sent";

export const Route = createFileRoute("/auth/magic-link-sent")({
	component: MagicLinkSent,
});
