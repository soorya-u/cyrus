import { useCallback, useEffect, useRef, useState } from "react";
export function useLocalStorage(key, initialValue) {
	const [value, setValue] = useState(() => {
		if (typeof window === "undefined") {
			return initialValue;
		}
		try {
			const raw = window.localStorage.getItem(key);
			return raw ? JSON.parse(raw) : initialValue;
		} catch {
			return initialValue;
		}
	});
	const ref = useRef(value);
	ref.current = value;
	useEffect(() => {
		try {
			window.localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// ignore
		}
	}, [key, value]);
	const reset = useCallback(() => setValue(initialValue), [initialValue]);
	return [value, setValue, reset];
}
