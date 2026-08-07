import { useAuth, useRevokeSession, useSession } from "@better-auth-ui/react";
import type { Session } from "better-auth";
import Bowser from "bowser";
import { LogOut, Monitor, Smartphone, TerminalIcon, X } from "lucide-react";
import { toast } from "sonner";

import { Show } from "@/components/helpers/show";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";

function timeAgo(date: Date) {
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
	const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

	const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
		["year", 31_536_000],
		["month", 2_592_000],
		["week", 604_800],
		["day", 86_400],
		["hour", 3600],
		["minute", 60],
		["second", 1],
	];

	for (const [unit, threshold] of UNITS)
		if (seconds >= threshold)
			return rtf.format(-Math.floor(seconds / threshold), unit);

	return rtf.format(0, "second");
}

export type SessionWithWorkerName = Session & { workerName?: string | null };

export type ActiveSessionProps = {
	activeSession: SessionWithWorkerName;
};

export function ActiveSession({ activeSession }: ActiveSessionProps) {
	const { authClient, basePaths, localization, viewPaths, navigate } =
		useAuth();
	const { data: session } = useSession(authClient, { refetchOnMount: false });

	const { mutate: revokeSession, isPending: isRevoking } = useRevokeSession(
		authClient,
		{
			onSuccess: () =>
				toast.success(localization.settings.revokeSessionSuccess),
		}
	);

	const isCurrentSession = activeSession.token === session?.session.token;
	const { workerName } = activeSession;
	const ua = workerName
		? null
		: Bowser.parse(activeSession.userAgent || "unknown");
	const isMobile =
		ua?.platform.type === "mobile" || ua?.platform.type === "tablet";

	let icon = <Monitor />;
	if (workerName) {
		icon = <TerminalIcon />;
	} else if (isMobile) {
		icon = <Smartphone />;
	}

	const title = workerName ? (
		workerName
	) : (
		<>
			{ua?.browser.name || "Unknown Browser"}
			{ua?.os.name ? `, ${ua.os.name}` : ""}
		</>
	);

	return (
		<Item>
			<ItemMedia variant="icon">{icon}</ItemMedia>
			<ItemContent>
				<ItemTitle>{title}</ItemTitle>
				<Show
					fallback={
						<Show when={Boolean(activeSession.createdAt)}>
							<ItemDescription className="capitalize">
								{activeSession.createdAt && timeAgo(activeSession.createdAt)}
							</ItemDescription>
						</Show>
					}
					when={isCurrentSession}
				>
					<Badge variant="secondary">
						{localization.settings.currentSession}
					</Badge>
				</Show>
			</ItemContent>
			<ItemActions>
				<Button
					aria-label={
						isCurrentSession
							? localization.auth.signOut
							: localization.settings.revokeSession
					}
					disabled={isRevoking}
					onClick={() =>
						isCurrentSession
							? navigate({
									to: `${basePaths.auth}/${viewPaths.auth.signOut}`,
								})
							: revokeSession(activeSession)
					}
					size="sm"
					variant="outline"
				>
					<Show when={isRevoking}>
						<Spinner />
					</Show>
					<Show when={!isRevoking && isCurrentSession}>
						<LogOut />
					</Show>
					<Show when={!(isRevoking || isCurrentSession)}>
						<X />
					</Show>

					{isCurrentSession
						? localization.auth.signOut
						: localization.settings.revoke}
				</Button>
			</ItemActions>
		</Item>
	);
}
