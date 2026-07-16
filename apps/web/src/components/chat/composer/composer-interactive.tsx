import {
	useRespondApproval,
	useRespondElicitation,
} from "@cyrus/hooks/conversation/use-interactive-respond";
import type { ApprovalView, ElicitationView } from "@cyrus/schemas/view";
import { type ReactNode, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function isRejectOption(kind: string): boolean {
	const token = kind.toLowerCase();
	return token.includes("reject") || token.includes("deny");
}

function optionSortWeight(kind: string): number {
	const token = kind.toLowerCase();
	if (token.includes("allow_once") || token === "allow_once") return 0;
	if (token.includes("allow_always") || token.includes("always")) return 1;
	if (token.includes("reject") || token.includes("deny")) return 2;
	return 3;
}

/** Prefer the usual ACP triad: allow once → always → reject. Cap at 3. */
function pickApprovalOptions(approval: ApprovalView) {
	return [...approval.options]
		.sort(
			(left, right) =>
				optionSortWeight(String(left.kind)) -
				optionSortWeight(String(right.kind))
		)
		.slice(0, 3);
}

export function ComposerPendingInteractive({
	approval,
	elicitation,
	pendingApprovalCount = 1,
	pendingElicitationCount = 1,
}: {
	approval?: ApprovalView | null;
	elicitation?: ElicitationView | null;
	pendingApprovalCount?: number;
	pendingElicitationCount?: number;
}) {
	// Match permission UX: show one interactive prompt at a time in the composer.
	if (approval && !approval.resolved) {
		return (
			<ComposerApprovalPanel
				approval={approval}
				pendingCount={pendingApprovalCount}
			/>
		);
	}
	if (elicitation && !elicitation.resolved) {
		return (
			<ComposerElicitationPanel
				elicitation={elicitation}
				pendingCount={pendingElicitationCount}
			/>
		);
	}
	return null;
}

function InteractiveShell({
	label,
	pendingCount,
	title,
	subtitle,
	body,
	actions,
	error,
}: {
	label: string;
	pendingCount: number;
	title: string;
	subtitle?: ReactNode;
	body?: ReactNode;
	actions: ReactNode;
	error?: string | null;
}) {
	return (
		<div className="group rounded-[22px] p-px transition-colors duration-200">
			<div className="chat-composer-glass overflow-hidden rounded-4xl border border-border transition-colors duration-200">
				<div className="border-border/60 border-b px-4 py-3.5 sm:px-5 sm:py-4">
					<div className="flex flex-wrap items-center gap-2">
						<span className="font-medium text-muted-foreground text-xs uppercase tracking-[0.18em]">
							{label}
						</span>
						{pendingCount > 1 ? (
							<span className="text-muted-foreground text-xs">
								1/{pendingCount}
							</span>
						) : null}
					</div>
					<p className="mt-1.5 truncate font-medium text-sm">{title}</p>
					{subtitle ? (
						<div className="mt-0.5 truncate text-muted-foreground text-xs">
							{subtitle}
						</div>
					) : null}
				</div>

				{body}

				<div className="flex flex-col gap-2 px-3 py-3 sm:px-4 sm:py-3.5">
					{actions}
					{error ? <p className="text-destructive text-xs">{error}</p> : null}
				</div>
			</div>
		</div>
	);
}

function StackedActionButton({
	label,
	disabled,
	reject = false,
	onClick,
}: {
	label: string;
	disabled: boolean;
	reject?: boolean;
	onClick: () => void;
}) {
	return (
		<Button
			className="h-9 w-full justify-start px-3"
			disabled={disabled}
			onClick={onClick}
			size="sm"
			title={label}
			type="button"
			variant={reject ? "outline" : "default"}
		>
			<span className="min-w-0 truncate">{label}</span>
		</Button>
	);
}

function ComposerApprovalPanel({
	approval,
	pendingCount,
}: {
	approval: ApprovalView;
	pendingCount: number;
}) {
	const respond = useRespondApproval();
	const disabled = respond.isPending || Boolean(approval.resolved);
	const options = useMemo(() => pickApprovalOptions(approval), [approval]);

	return (
		<InteractiveShell
			actions={options.map((option) => (
				<StackedActionButton
					disabled={disabled}
					key={option.optionId}
					label={option.name}
					onClick={() =>
						respond.mutate({
							threadId: approval.threadId,
							toolCallId: approval.toolCallId,
							optionId: option.optionId,
						})
					}
					reject={isRejectOption(String(option.kind))}
				/>
			))}
			error={respond.isError ? respond.error.message : null}
			label="Pending approval"
			pendingCount={pendingCount}
			subtitle={`Tool call ${approval.toolCallId}`}
			title={approval.title ?? "Permission required"}
		/>
	);
}

function ComposerElicitationPanel({
	elicitation,
	pendingCount,
}: {
	elicitation: ElicitationView;
	pendingCount: number;
}) {
	const respond = useRespondElicitation();
	const disabled = respond.isPending || Boolean(elicitation.resolved);
	const fieldNames = useMemo(() => {
		const schema = elicitation.requestedSchema;
		if (!schema || typeof schema !== "object") return [] as string[];
		const properties = (schema as { properties?: Record<string, unknown> })
			.properties;
		if (!properties || typeof properties !== "object") return [];
		return Object.keys(properties);
	}, [elicitation.requestedSchema]);
	const [values, setValues] = useState<Record<string, string>>({});

	function submit(action: "accept" | "decline" | "cancel") {
		respond.mutate({
			threadId: elicitation.threadId,
			elicitationId: elicitation.elicitationId,
			action,
			content:
				action === "accept" && elicitation.mode === "form"
					? Object.fromEntries(
							fieldNames.map((name) => [name, values[name] ?? ""])
						)
					: undefined,
		});
	}

	let acceptLabel = "Continue";
	if (elicitation.mode === "url") acceptLabel = "Open and continue";
	else if (fieldNames.length > 0) acceptLabel = "Submit";

	let subtitle: ReactNode;
	if (elicitation.mode === "url" && elicitation.url) {
		subtitle = (
			<span className="truncate" title={elicitation.url}>
				{elicitation.url}
			</span>
		);
	} else if (elicitation.mode === "form") {
		subtitle = "Form input required";
	}

	return (
		<InteractiveShell
			actions={
				<>
					<StackedActionButton
						disabled={disabled}
						label={acceptLabel}
						onClick={() => {
							if (elicitation.mode === "url" && elicitation.url) {
								window.open(elicitation.url, "_blank", "noopener,noreferrer");
							}
							submit("accept");
						}}
					/>
					<StackedActionButton
						disabled={disabled}
						label="Decline"
						onClick={() => submit("decline")}
						reject
					/>
					<StackedActionButton
						disabled={disabled}
						label="Cancel"
						onClick={() => submit("cancel")}
						reject
					/>
				</>
			}
			body={
				elicitation.mode === "form" && fieldNames.length > 0 ? (
					<div className="space-y-2 border-border/60 border-b px-3 py-3 sm:px-4">
						{fieldNames.map((name) => {
							const fieldId = `elicitation-${elicitation.elicitationId}-${name}`;
							return (
								<div className="block space-y-1" key={name}>
									<label
										className="truncate text-muted-foreground text-xs"
										htmlFor={fieldId}
									>
										{name}
									</label>
									<Input
										disabled={disabled}
										id={fieldId}
										onChange={(event) =>
											setValues((current) => ({
												...current,
												[name]: event.target.value,
											}))
										}
										value={values[name] ?? ""}
									/>
								</div>
							);
						})}
					</div>
				) : null
			}
			error={respond.isError ? respond.error.message : null}
			label="Pending elicitation"
			pendingCount={pendingCount}
			subtitle={subtitle}
			title={elicitation.message ?? "Agent needs your input"}
		/>
	);
}
