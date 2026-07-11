import yoctoSpinner from "yocto-spinner";

export function createSpinner(text: string) {
	return yoctoSpinner({ text });
}

export async function withSpinner<T>(
	text: string,
	fn: () => Promise<T>
): Promise<T> {
	const spinner = createSpinner(text);
	spinner.start();
	try {
		return await fn();
	} finally {
		spinner.stop();
	}
}
