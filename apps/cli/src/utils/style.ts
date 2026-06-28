const enabled = Bun.enableANSIColors;

const wrap =
	(open: string, close: string) =>
	(s: string): string =>
		enabled ? `${open}${s}${close}` : s;

const color = (name: string) =>
	wrap(Bun.color(name, "ansi-256") || "", "\x1b[39m");

export const red = color("red");
export const green = color("green");
export const blue = color("blue");
export const cyan = color("cyan");
export const bold = wrap("\x1b[1m", "\x1b[22m");
export const dim = wrap("\x1b[2m", "\x1b[22m");
export const underline = wrap("\x1b[4m", "\x1b[24m");

type Printer = (strings: TemplateStringsArray, ...values: unknown[]) => void;

const join = (strings: TemplateStringsArray, values: unknown[]): string =>
	strings.reduce(
		(out, str, i) => out + str + (i < values.length ? String(values[i]) : ""),
		""
	);

const printer =
	(style: (s: string) => string, write: (s: string) => void): Printer =>
	(strings, ...values) =>
		write(style(join(strings, values)));

export const print = {
	line: printer(
		(s) => s,
		(s) => console.log(s)
	),
	dim: printer(dim, (s) => console.log(s)),
	success: printer(green, (s) => console.log(s)),
	error: printer(red, (s) => console.error(s)),
};
