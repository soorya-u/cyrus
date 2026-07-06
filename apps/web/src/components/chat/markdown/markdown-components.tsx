import { cn } from "cnfast";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

const MARKDOWN_COMPONENTS = {
	pre: ({ children, ...props }: React.ComponentProps<"pre">) => (
		<pre
			className="my-2 overflow-x-auto rounded-md border border-border/70 bg-muted/40 p-3 font-mono text-[11px] leading-relaxed"
			{...props}
		>
			{children}
		</pre>
	),
	code: ({ children, className, ...props }: React.ComponentProps<"code">) => {
		const isInline = !className;
		return isInline ? (
			<code
				className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[0.85em] text-foreground"
				{...props}
			>
				{children}
			</code>
		) : (
			<code className={cn("font-mono", className)} {...props}>
				{children}
			</code>
		);
	},
	h1: ({ children }: React.ComponentProps<"h1">) => (
		<h1 className="mt-3 mb-1.5 font-bold text-base">{children}</h1>
	),
	h2: ({ children }: React.ComponentProps<"h2">) => (
		<h2 className="mt-2 mb-1 font-bold text-sm">{children}</h2>
	),
	h3: ({ children }: React.ComponentProps<"h3">) => (
		<h3 className="mt-2 mb-1 font-semibold text-sm">{children}</h3>
	),
	p: ({ children }: React.ComponentProps<"p">) => (
		<p className="my-1.5 leading-relaxed">{children}</p>
	),
	ul: ({ children }: React.ComponentProps<"ul">) => (
		<ul className="my-1.5 list-disc pl-5">{children}</ul>
	),
	ol: ({ children }: React.ComponentProps<"ol">) => (
		<ol className="my-1.5 list-decimal pl-5">{children}</ol>
	),
	li: ({ children }: React.ComponentProps<"li">) => (
		<li className="my-0.5">{children}</li>
	),
	a: ({ children, href }: React.ComponentProps<"a">) => (
		<a
			className="text-primary underline underline-offset-2"
			href={href}
			rel="noreferrer"
			target="_blank"
		>
			{children}
		</a>
	),
	blockquote: ({ children }: React.ComponentProps<"blockquote">) => (
		<blockquote className="my-2 border-border border-l-2 pl-3 text-muted-foreground">
			{children}
		</blockquote>
	),
	hr: () => <hr className="my-3 border-border" />,
	table: ({ children }: React.ComponentProps<"table">) => (
		<table className="my-2 w-full border-collapse text-xs">{children}</table>
	),
	th: ({ children }: React.ComponentProps<"th">) => (
		<th className="border border-border bg-muted/40 px-2 py-1 text-left font-semibold">
			{children}
		</th>
	),
	td: ({ children }: React.ComponentProps<"td">) => (
		<td className="border border-border px-2 py-1">{children}</td>
	),
} as const;

export function renderMarkdown(text: string): React.ReactNode {
	return (
		<ReactMarkdown
			components={MARKDOWN_COMPONENTS}
			remarkPlugins={[remarkGfm, remarkBreaks]}
		>
			{text}
		</ReactMarkdown>
	);
}
