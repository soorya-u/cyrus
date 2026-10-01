export const PATCH_DIFF_OPTIONS = {
	diffStyle: "unified" as const,
	lineDiffType: "none" as const,
	overflow: "scroll" as const,
	theme: "github-dark" as const,
	themeType: "dark" as const,
	stickyHeader: true,
};

export const FILE_VIEW_OPTIONS = {
	overflow: PATCH_DIFF_OPTIONS.overflow,
	theme: PATCH_DIFF_OPTIONS.theme,
	themeType: PATCH_DIFF_OPTIONS.themeType,
};
