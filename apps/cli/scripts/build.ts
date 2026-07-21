import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BunPlugin } from "bun";

const DRIZZLE_KIT_IMPORT = /^drizzle-kit(?:\/|$)/;
const NODE_DATACHANNEL = /node-datachannel\.(cjs|mjs)$/;
const JS_MODULE = /\.js$/;

const cliRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(cliRoot, "../..");
const outfile = join(cliRoot, "dist/cyrusd");
const stageDir = join(cliRoot, "dist/node_modules");
const fromCli = join(cliRoot, "src/cli.ts");
const generatedDir = join(cliRoot, "scripts/.generated");
const embedNativesEntry = join(generatedDir, "embed-natives.ts");

function resolvePackageRoot(id: string, fromFile: string): string {
	return dirname(Bun.resolveSync(`${id}/package.json`, fromFile));
}

function platformOs(): "linux" | "darwin" | "win32" | null {
	if (process.platform === "linux") return "linux";
	if (process.platform === "darwin") return "darwin";
	if (process.platform === "win32") return "win32";
	return null;
}

function platformArch(): "x64" | "arm64" | null {
	if (process.arch === "x64") return "x64";
	if (process.arch === "arm64") return "arm64";
	return null;
}

function platformTarget(): string {
	const os = platformOs();
	const arch = platformArch();
	if (!(os && arch))
		throw new Error(
			`Unsupported platform for CLI compile: ${process.platform}/${process.arch}`
		);

	if (os === "linux") return `${os}-${arch}-gnu`;
	if (os === "win32") return `${os}-${arch}-msvc`;
	return `${os}-${arch}`;
}

/** Keep drizzle-kit off the bundle — rebundling payload-sqlite breaks Zod. */
function externalizeDrizzleKit(): BunPlugin {
	return {
		name: "externalize-drizzle-kit",
		setup(build) {
			build.onResolve({ filter: DRIZZLE_KIT_IMPORT }, (args) => ({
				path: args.path,
				external: true,
			}));
		},
	};
}

/**
 * Rewrite native loaders to absolute `.node` paths. Pair with a second
 * entrypoint that `require`s those same paths so Bun.compile embeds them into
 * `$bunfs` (onLoad rewrites alone leave runtime filesystem requires).
 */
function rewriteNativeAddonRequires(
	ndcNode: string,
	tursoNode: string,
	target: string
): BunPlugin {
	const relativeNdc = "../../../build/Release/node_datachannel.node";
	const relativeTurso = `./turso.${target}.node`;
	const tursoPlatformPackage = `@tursodatabase/database-${target}`;

	return {
		name: "rewrite-native-addon-requires",
		setup(build) {
			build.onLoad({ filter: NODE_DATACHANNEL }, async (args) => {
				if (!args.path.includes("node-datachannel")) return;

				const source = await Bun.file(args.path).text();
				if (!source.includes(relativeNdc)) {
					throw new Error(
						`node-datachannel loader at ${args.path} is missing the expected require target "${relativeNdc}"; native embedding would silently fail.`
					);
				}

				return {
					contents: source
						.replaceAll(`"${relativeNdc}"`, JSON.stringify(ndcNode))
						.replaceAll(`'${relativeNdc}'`, `'${ndcNode}'`),
					loader: "js",
				};
			});
			build.onLoad({ filter: JS_MODULE }, async (args) => {
				const isTursoLoader =
					(args.path.includes("@tursodatabase/database/") ||
						args.path.includes("@tursodatabase+database@")) &&
					args.path.endsWith("/database/index.js") &&
					!args.path.includes("database-common") &&
					!args.path.includes(`database-${target}`);
				if (!isTursoLoader) return;

				const source = await Bun.file(args.path).text();
				if (!source.includes(relativeTurso)) {
					throw new Error(
						`Turso loader at ${args.path} is missing the expected require target "${relativeTurso}"; native embedding would silently fail.`
					);
				}

				// Replace only quoted require targets. A bare replaceAll of the
				// platform package id would also rewrite that substring inside
				// the absolute `.node` path from the relative rewrite.
				const contents = source
					.replaceAll(`'${relativeTurso}'`, `'${tursoNode}'`)
					.replaceAll(`"${relativeTurso}"`, `"${tursoNode}"`)
					.replaceAll(`'${tursoPlatformPackage}'`, `'${tursoNode}'`)
					.replaceAll(`"${tursoPlatformPackage}"`, `"${tursoNode}"`);
				return { contents, loader: "js" };
			});
		},
	};
}

async function stageDrizzleKitRuntime(): Promise<void> {
	const fromDatabase = join(repoRoot, "shared/database/src/connection.ts");
	const drizzleKitRoot = resolvePackageRoot("drizzle-kit", fromDatabase);
	const drizzleOrmRoot = resolvePackageRoot("drizzle-orm", fromDatabase);

	await rm(stageDir, { force: true, recursive: true });
	await mkdir(stageDir, { recursive: true });
	await cp(drizzleKitRoot, join(stageDir, "drizzle-kit"), { recursive: true });
	await cp(drizzleOrmRoot, join(stageDir, "drizzle-orm"), { recursive: true });

	const payloadDir = join(stageDir, "drizzle-kit/payload");
	await mkdir(payloadDir, { recursive: true });
	await cp(
		join(stageDir, "drizzle-kit/payload-sqlite.mjs"),
		join(payloadDir, "sqlite.js")
	);
}

const target = platformTarget();
const ndcNode = join(
	resolvePackageRoot("node-datachannel", fromCli),
	"build/Release/node_datachannel.node"
);
const tursoRoot = resolvePackageRoot("@tursodatabase/database", fromCli);
const tursoNode = join(
	dirname(tursoRoot),
	`database-${target}`,
	`turso.${target}.node`
);

await mkdir(generatedDir, { recursive: true });
await writeFile(
	embedNativesEntry,
	`require(${JSON.stringify(ndcNode)});\nrequire(${JSON.stringify(tursoNode)});\n`
);

await mkdir(dirname(outfile), { recursive: true });

const result = await Bun.build({
	entrypoints: [fromCli, embedNativesEntry],
	env: "CLI_PUBLIC_*",
	external: ["drizzle-kit"],
	plugins: [
		externalizeDrizzleKit(),
		rewriteNativeAddonRequires(ndcNode, tursoNode, target),
	],
	compile: { outfile },
});

if (!result.success) {
	for (const log of result.logs) console.error(log);
	process.exit(1);
}

await stageDrizzleKitRuntime();

await writeFile(
	join(cliRoot, "dist/build-meta.json"),
	`${JSON.stringify(
		{
			outfile,
			external: ["drizzle-kit"],
			staged: ["drizzle-kit", "drizzle-orm"],
			embedded: ["node-datachannel", "@tursodatabase/database"],
			bun: Bun.version,
		},
		null,
		2
	)}\n`
);

console.log(`compiled ${outfile}`);
