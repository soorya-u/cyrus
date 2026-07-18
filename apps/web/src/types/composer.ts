import type { ChatMessage } from "@cyrus/schemas/rtc/chat";
import type {
	ApprovalView,
	ElicitationView,
	ErrorView,
} from "@cyrus/schemas/view";
import type { Result } from "better-result";

/** Git/cwd identity shared by committed threads and controller-local drafts. */
export type ComposerSubject = {
	id: string;
	projectId: string;
	worktreePath?: string | null;
};

export type ComposerProps = {
	projectId: string;
	threadId: string;
	subject: ComposerSubject;
	onSend: (message: ChatMessage) => Promise<Result<void, Error>>;
	onStop?: () => void;
	busy?: boolean;
	stopping?: boolean;
	threadError?: ErrorView | null;
	pendingApprovals?: ApprovalView[];
	pendingElicitations?: ElicitationView[];
	localDraft?: boolean;
};
