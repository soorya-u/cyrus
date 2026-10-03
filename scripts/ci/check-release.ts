import { appendFileSync } from "node:fs";
import {
	MIN_PEER_VERSION,
	meetsMinimumVersion,
	RELEASE_VERSION,
} from "@cyrus/constants/version";

const tag = process.env.GITHUB_REF_NAME ?? "";
const refType = process.env.GITHUB_REF_TYPE;

function fail(message: string): never {
	console.error(`::error::${message}`);
	process.exit(1);
}

if (refType !== "tag")
	fail(`Releases run from a tag, not ${refType ?? "a branch"}.`);
if (tag !== `v${RELEASE_VERSION}`)
	fail(
		`Tag ${tag} does not match the root package.json version ${RELEASE_VERSION}.`
	);

for (const [role, minimum] of Object.entries(MIN_PEER_VERSION)) {
	if (!meetsMinimumVersion(RELEASE_VERSION, minimum))
		fail(
			`Release ${RELEASE_VERSION} is below the minimum ${minimum} the server admits for a ${role}.`
		);
}

const prerelease = RELEASE_VERSION.includes("-");
console.log(
	`Releasing ${RELEASE_VERSION}${prerelease ? " (prerelease: CLI only)" : ""}`
);

const output = process.env.GITHUB_OUTPUT;
if (output) {
	appendFileSync(
		output,
		`version=${RELEASE_VERSION}\nprerelease=${prerelease}\n`
	);
}
