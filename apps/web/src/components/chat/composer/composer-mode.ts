export function shouldShowModeSelector(
	modes: Array<{ id: string; name: string }>
): boolean {
	return modes.length > 0;
}
