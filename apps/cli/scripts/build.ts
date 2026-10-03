import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BunPlugin } from "bun";

const NODE_DATACHANNEL = /node-datachannel\.(cjs|mjs)$/;
const PARCEL_WATCHER_INDEX = /@parcel\/watcher\/index\.js$/;
const JS_MODULE = /\.js$/;
const PARCEL_WATCHER_REQUIRE = "binding = require(name);";

const cliRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outfile = join(cliRoot, "dist/cyrusd");
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

/** Maps our `platformTarget()` naming to `@parcel/watcher`'s own per-platform package names. */
function parcelWatcherPackageName(target: string): string {
	if (target === "linux-x64-gnu") return "@parcel/watcher-linux-x64-glibc";
	if (target === "linux-arm64-gnu") return "@parcel/watcher-linux-arm64-glibc";
	if (target === "win32-x64-msvc") return "@parcel/watcher-win32-x64";
	if (target === "win32-arm64-msvc") return "@parcel/watcher-win32-arm64";
	if (target === "darwin-x64") return "@parcel/watcher-darwin-x64";
	if (target === "darwin-arm64") return "@parcel/watcher-darwin-arm64";
	throw new Error(
		`No @parcel/watcher native package known for target "${target}"`
	);
}

function rewriteNativeAddonRequires(
	ndcNode: string,
	tursoNode: string,
	watcherNode: string,
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
			build.onLoad({ filter: PARCEL_WATCHER_INDEX }, async (args) => {
				const source = await Bun.file(args.path).text();
				if (!source.includes(PARCEL_WATCHER_REQUIRE)) {
					throw new Error(
						`@parcel/watcher loader at ${args.path} is missing the expected "${PARCEL_WATCHER_REQUIRE}" pattern; native embedding would silently fail.`
					);
				}
				const contents = source.replace(
					PARCEL_WATCHER_REQUIRE,
					`binding = require(${JSON.stringify(watcherNode)});`
				);
				return { contents, loader: "js" };
			});
		},
	};
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
const watcherPkgJson = Bun.resolveSync("@parcel/watcher/package.json", fromCli);
const watcherPlatformPkgJson = require.resolve(
	`${parcelWatcherPackageName(target)}/package.json`,
	{ paths: [watcherPkgJson] }
);
const watcherNode = join(dirname(watcherPlatformPkgJson), "watcher.node");

await mkdir(generatedDir, { recursive: true });
await writeFile(
	embedNativesEntry,
	`require(${JSON.stringify(ndcNode)});\nrequire(${JSON.stringify(tursoNode)});\nrequire(${JSON.stringify(watcherNode)});\n`
);

await mkdir(dirname(outfile), { recursive: true });

const result = await Bun.build({
	entrypoints: [fromCli, embedNativesEntry],
	env: "CLI_PUBLIC_*",
	plugins: [
		rewriteNativeAddonRequires(ndcNode, tursoNode, watcherNode, target),
	],
	compile: { outfile },
});

if (!result.success) {
	for (const log of result.logs) console.error(log);
	process.exit(1);
}

await writeFile(
	join(cliRoot, "dist/build-meta.json"),
	`${JSON.stringify(
		{
			outfile,
			embedded: [
				"node-datachannel",
				"@tursodatabase/database",
				"@parcel/watcher",
			],
			bun: Bun.version,
		},
		null,
		2
	)}\n`
);

console.log(`compiled ${outfile}`);
