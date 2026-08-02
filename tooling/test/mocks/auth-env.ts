export const FAKE_BETTER_AUTH_ENV = {
	NODE_ENV: "testing",
	BETTER_AUTH_SECRET: "cyrus-test-secret-that-is-at-least-32-characters",
	OAUTH_GITHUB_CLIENT_ID: "cyrus-test-github-client-id",
	OAUTH_GITHUB_CLIENT_SECRET: "cyrus-test-github-client-secret",
	OAUTH_GOOGLE_CLIENT_ID: "cyrus-test-google-client-id",
	OAUTH_GOOGLE_CLIENT_SECRET: "cyrus-test-google-client-secret",
	OAUTH_PROXY_SECRET: "cyrus-test-oauth-proxy-secret",
	RESEND_API_KEY: "re_test_123",
	RESEND_FROM_EMAIL: "noreply@cyrus.test",
	ALLOWED_ORIGINS: "https://cyrus.soorya-u.dev",
	PRODUCTION_URL: "https://cyrus.soorya-u.dev",
	WEB_APP_URL: "https://cyrus.soorya-u.dev",
} as const;
