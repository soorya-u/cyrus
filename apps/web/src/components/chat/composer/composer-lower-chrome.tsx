import { cn } from "cnfast";
import { ComposerBranchToolbar } from "@/components/chat/composer/composer-branch-toolbar";
import { Button } from "@/components/ui/button";
import type { ComposerSubject } from "@/types/composer";

export function ComposerLowerChrome({
	localDraft,
	draftGitOpen,
	onOpenDraftGit,
	isGitRepo,
	subject,
}: {
	localDraft: boolean;
	draftGitOpen: boolean;
	onOpenDraftGit: () => void;
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
			{localDraft && !draftGitOpen ? (
				<div className="flex justify-center pb-1">
					<Button
						className="h-7 px-2 text-muted-foreground text-xs"
						onClick={onOpenDraftGit}
						size="sm"
						type="button"
						variant="ghost"
					>
						Branch / worktree
					</Button>
				</div>
			) : null}
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
