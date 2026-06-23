"use client";

import { useEffect, useState } from "react";

export function ThemeProvider({
	children,
	attribute: _attribute,
	defaultTheme: _defaultTheme,
	disableTransitionOnChange: _disableTransitionOnChange,
	storageKey: _storageKey,
}: {
	children: React.ReactNode;
	attribute?: string;
	defaultTheme?: string;
	disableTransitionOnChange?: boolean;
	storageKey?: string;
}) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	return mounted ? children : null;
}
