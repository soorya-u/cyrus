import { cn } from "cnfast";
import { ComposerBranchToolbar } from "@/components/chat/composer/composer-branch-toolbar";
import type { ComposerSubject } from "@/types/composer";

export function ComposerLowerChrome({
	localDraft,
	isGitRepo,
	subject,
}: {
	localDraft: boolean;
	isGitRepo: boolean;
	subject: ComposerSubject;
}) {
	return (
		<div
			className={cn(
				"chat-composer-horizontal-inset chat-composer-lower-chrome relative z-10",
				isGitRepo
					? "bg-transparent! pb-[calc(env(safe-area-inset-bottom)+0.25rem)] dark:bg-transparent!"
					: "pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pb-[calc(env(safe-area-inset-bottom)+1rem)]"
			)}
		>
			{isGitRepo ? (
				<ComposerBranchToolbar
					key={subject.id}
					localDraft={localDraft}
					subject={subject}
				/>
			) : null}
		</div>
	);
}
