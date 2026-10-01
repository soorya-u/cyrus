import type { GitFileStatus } from "@cyrus/schemas/rtc/git";
import type { GitStatusEntry } from "@pierre/trees";

export const TREE_STATUS: Record<GitFileStatus, GitStatusEntry["status"]> = {
	Added: "added",
	Deleted: "deleted",
	Modified: "modified",
	Renamed: "renamed",
	Untracked: "untracked",
};

// The tree pins its own `color-scheme: light dark` (OS preference), so inherit
// the app theme instead. Colors are Zed's One theme (light / dark): `text`,
// `text.muted`, `modified` and `deleted`, applied through the tree's override
// variables; light-dark() follows the inherited scheme.
export const TREE_THEME_STYLE = {
	colorScheme: "inherit",
	"--trees-bg-override": "transparent",
	"--trees-fg-override": "light-dark(#242529, #dce0e5)",
	"--trees-fg-muted-override": "light-dark(#58585a, #a9afbc)",
	"--trees-status-modified-override": "light-dark(#a48819, #dec184)",
	"--trees-status-deleted-override": "light-dark(#d36151, #d07277)",
} as React.CSSProperties;

// Zed's `version_control.added` / `version_control.deleted`.
export const ADDED_LINES_COLOR = "#27a657";
export const DELETED_LINES_COLOR = "#e06c76";
