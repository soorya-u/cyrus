import { useAuth, useListSessions, useSession } from "@better-auth-ui/react";
import { cn } from "cnfast";
import { Fragment } from "react";
import { Show } from "@/components/helpers/show";
import { Card, CardContent } from "@/components/ui/card";
import {
	Item,
	ItemContent,
	ItemGroup,
	ItemMedia,
	ItemSeparator,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { ActiveSession } from "./active-session";

export type ActiveSessionsProps = {
	className?: string;
};

/**
 * Render a card listing all active sessions for the current user with revoke controls.
 *
 * Shows each session's browser, OS, IP address, and creation time. The current session is marked
 * and navigates to sign-out on click, while other sessions can be revoked individually.
 *
 * @returns A JSX element containing the sessions card
 */
export function ActiveSessions({ className }: ActiveSessionsProps) {
	const { authClient, localization } = useAuth();
	const { data: session } = useSession(authClient);

	const { data: sessions, isPending } = useListSessions(authClient);

	const activeSessions = [...(sessions ?? [])].sort(
		(a, b) =>
			Number(b.id === session?.session.id) -
			Number(a.id === session?.session.id)
	);

	return (
		<div>
			<h2 className="mb-3 font-semibold text-sm">
				{localization.settings.activeSessions}
			</h2>

			<Card className={cn("p-0", className)}>
				<CardContent className="p-0">
					<Show
						fallback={
							<ItemGroup className="gap-0">
								{activeSessions?.map((activeSession, index) => (
									<Fragment key={activeSession.id}>
										<Show when={index > 0}>
											<ItemSeparator />
										</Show>
										<ActiveSession activeSession={activeSession} />
									</Fragment>
								))}
							</ItemGroup>
						}
						when={isPending}
					>
						<SessionRowSkeleton />
					</Show>
				</CardContent>
			</Card>
		</div>
	);
}

function SessionRowSkeleton() {
	return (
		<Item>
			<ItemMedia>
				<Skeleton className="size-10 rounded-md" />
			</ItemMedia>
			<ItemContent>
				<Skeleton className="h-4 w-20" />
				<Skeleton className="h-3 w-32" />
			</ItemContent>
		</Item>
	);
}
