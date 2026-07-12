import type { ToolFields } from "@cyrus/utils/tool-fields";
import {
	EyeIcon,
	GlobeIcon,
	type LucideIcon,
	SearchIcon,
	SquarePenIcon,
	TerminalIcon,
} from "lucide-react";

export type ToolPresentation = {
	heading: string;
	preview: string | null;
	detail: string | null;
	icon: LucideIcon;
};

export const KIND_PRESENTATIONS: Record<
	string,
	(fields: ToolFields) => ToolPresentation
> = {
	execute: (fields) => ({
		heading: "Ran command",
		preview: fields.command,
		detail: fields.output ?? fields.command,
		icon: TerminalIcon,
	}),
	read: (fields) => ({
		heading: "Read file",
		preview: fields.path,
		detail: fields.path,
		icon: EyeIcon,
	}),
	edit: (fields) => ({
		heading: "Changed files",
		preview: fields.path,
		detail: fields.path,
		icon: SquarePenIcon,
	}),
	delete: (fields) => ({
		heading: "Changed files",
		preview: fields.path,
		detail: fields.path,
		icon: SquarePenIcon,
	}),
	move: (fields) => ({
		heading: "Changed files",
		preview: fields.path,
		detail: fields.path,
		icon: SquarePenIcon,
	}),
	search: (fields) => ({
		heading: "Searched files",
		preview: fields.query,
		detail: fields.query,
		icon: SearchIcon,
	}),
	fetch: (fields) => ({
		heading: "Fetched resource",
		preview: fields.path ?? fields.query,
		detail: fields.output,
		icon: GlobeIcon,
	}),
};
