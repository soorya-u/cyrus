import { SearchIcon } from "lucide-react";

type ThreadSearchFieldProps = {
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
};

export function ThreadSearchField({
	value,
	onChange,
	placeholder,
}: ThreadSearchFieldProps) {
	return (
		<div className="flex h-8 w-full items-center gap-2 rounded-lg border border-input bg-background px-2.5 shadow-xs/5 ring-ring/24 transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
			<SearchIcon
				aria-hidden="true"
				className="size-3.5 shrink-0 text-muted-foreground/60"
			/>
			<input
				className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs outline-none placeholder:text-muted-foreground/72"
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				type="search"
				value={value}
			/>
		</div>
	);
}
