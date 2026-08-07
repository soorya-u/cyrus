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
import { ActiveSession, type SessionWithWorkerName } from "./active-session";

export type ActiveSessionsProps = {
	className?: string;
};

export function ActiveSessions({ className }: ActiveSessionsProps) {
	const { authClient } = useAuth();
	const { data: session } = useSession(authClient);

	const { data: sessions, isPending } = useListSessions(authClient);

	const allSessions = ((sessions as SessionWithWorkerName[] | undefined) ?? [])
		.slice()
		.sort(
			(a, b) =>
				Number(b.id === session?.session.id) -
				Number(a.id === session?.session.id)
		);
	const controllerSessions = allSessions.filter((s) => !s.workerName);
	const workerSessions = allSessions.filter((s) => s.workerName);

	return (
		<div className={cn("space-y-6", className)}>
			<SessionSection
				isPending={isPending}
				sessions={controllerSessions}
				title="Controllers"
			/>
			<Show when={isPending || workerSessions.length > 0}>
				<SessionSection
					isPending={isPending}
					sessions={workerSessions}
					title={`Workers (${workerSessions.length})`}
				/>
			</Show>
		</div>
	);
}

type SessionSectionProps = {
	title: string;
	sessions: SessionWithWorkerName[];
	isPending: boolean;
};

function SessionSection({ title, sessions, isPending }: SessionSectionProps) {
	return (
		<div>
			<h2 className="mb-3 font-semibold text-sm">{title}</h2>

			<Card className="p-0">
				<CardContent className="p-0">
					<Show
						fallback={
							<ItemGroup className="gap-0">
								{sessions.map((activeSession, index) => (
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
