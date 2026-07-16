import yoctoSpinner from "yocto-spinner";

export function createSpinner(text: string) {
	return yoctoSpinner({ text });
}
