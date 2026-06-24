import { useCallback, useRef, useState } from "react";

let counter = 0;
export function createId(prefix) {
	counter += 1;
	return `${prefix}_${counter}_${Date.now().toString(36)}`;
}
export function useIdFactory() {
	const ref = useRef(0);
	const make = useCallback((prefix) => {
		ref.current += 1;
		return `${prefix}_${ref.current}`;
	}, []);
	return make;
}
export function useToggle(initial = false) {
	const [value, setValue] = useState(initial);
	const toggle = useCallback(() => setValue((v) => !v), []);
	return [value, toggle, setValue];
}
