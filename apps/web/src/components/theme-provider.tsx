"use client";

import { useEffect, useState } from "react";

export function ThemeProvider({
	children,
	...props
}: React.ComponentProps<typeof import("next-themes").ThemeProvider>) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	return mounted ? <>{children}</> : null; // simple pass through
}
