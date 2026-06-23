import { auth } from "@cyrus/auth";
import { openapi } from "@elysia/openapi";

const AUTH_PREFIX = "/api/auth";
const AUTH_TAG = "Auth";

type AuthSpec = Awaited<ReturnType<typeof auth.api.generateOpenAPISchema>>;
type AuthPath = NonNullable<AuthSpec["paths"][string]>;
type DocOption = NonNullable<
	NonNullable<Parameters<typeof openapi>[0]>["documentation"]
>;

const authSpec = await auth.api.generateOpenAPISchema();

function withAuthTag(item: AuthPath): AuthPath {
	const tagged: AuthPath = { ...item };
	if (tagged.get) {
		tagged.get = { ...tagged.get, tags: [AUTH_TAG] };
	}
	if (tagged.post) {
		tagged.post = { ...tagged.post, tags: [AUTH_TAG] };
	}
	return tagged;
}

const prefixedPaths: Record<string, AuthPath> = {};
for (const [path, item] of Object.entries(authSpec.paths)) {
	prefixedPaths[`${AUTH_PREFIX}${path}`] = withAuthTag(item);
}

const documentation: DocOption = {
	info: {
		title: "Cyrus API",
		version: "1.0.0",
		description:
			"Combined OpenAPI for the Cyrus server and better-auth endpoints.",
	},
	tags: [{ name: AUTH_TAG, description: "better-auth endpoints" }],
	paths: prefixedPaths as unknown as DocOption["paths"],
	components: {
		securitySchemes: authSpec.components
			.securitySchemes as unknown as NonNullable<
			DocOption["components"]
		>["securitySchemes"],
		schemas: authSpec.components.schemas as unknown as NonNullable<
			DocOption["components"]
		>["schemas"],
	},
	security: authSpec.security,
	servers: authSpec.servers,
};

export const openApiDocsPlugin = openapi({
	path: "/api/docs",
	provider: "scalar",
	documentation,
});
