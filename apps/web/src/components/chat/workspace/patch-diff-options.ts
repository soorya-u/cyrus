export const PATCH_DIFF_OPTIONS = {
	diffStyle: "unified" as const,
	lineDiffType: "none" as const,
	overflow: "scroll" as const,
	theme: "github-dark" as const,
	themeType: "dark" as const,
	stickyHeader: true,
};

// Options for the viewers inside the Workspace drawer. The theme comes from
// useViewerTheme so it follows the app's light/dark mode.
export const DRAWER_VIEWER_OPTIONS = {
	overflow: PATCH_DIFF_OPTIONS.overflow,
	// The drawer shows each file's path and counts in its own header row.
	disableFileHeader: true,
	// Deleted lines would show their old-file number, which matches nothing in
	// the file on disk; leave it blank so every number shown is a real line.
	unsafeCSS: `
		/* Deleted lines would show their old-file number, which matches nothing in
		   the file on disk; leave it blank so every number shown is a real line. */
		[data-gutter] [data-line-type="change-deletion"] [data-line-number-content] { visibility: hidden; }
		/* Zed-like strength: the viewer keeps --mix-* percent of the background and
		   blends in the rest of the added / removed colour. */
		[data-line-type="change-addition"][data-line],
		[data-line-type="change-deletion"][data-line],
		[data-line-type="change-addition"][data-no-newline],
		[data-line-type="change-deletion"][data-no-newline] { --mix-light: 74%; --mix-dark: 78%; }
		[data-line-type="change-addition"][data-column-number],
		[data-line-type="change-deletion"][data-column-number],
		[data-line-type="change-addition"][data-gutter-buffer],
		[data-line-type="change-deletion"][data-gutter-buffer] { --mix-light: 62%; --mix-dark: 66%; }
	`,
};
