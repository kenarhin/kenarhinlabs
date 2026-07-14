type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

interface ImportMetaEnv {
	readonly PUBLIC_API_BASE_URL?: string;
	readonly PUBLIC_SITE_URL?: string;
	readonly PUBLIC_TURNSTILE_SITEKEY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare namespace App {
	interface Locals extends Runtime {}
}
