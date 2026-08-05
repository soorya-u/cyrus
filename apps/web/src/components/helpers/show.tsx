import type { PropsWithChildren } from "react";

export type ShowProps = {
	when: boolean;
	fallback?: React.ReactNode;
} & PropsWithChildren;

export const Show = ({ when, children, fallback }: ShowProps) =>
	when ? children : fallback;
