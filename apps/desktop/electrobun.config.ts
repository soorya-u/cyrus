import type { ElectrobunConfig } from "electrobun";

const webBuildDir = "../web/dist";

export default {
	app: {
		name: "cyrus",
		identifier: "dev.soorya-u.cyrus",
		version: "0.0.1",
		urlSchemes: ["dev.soorya-u.cyrus"],
	},
	runtime: {
		exitOnLastWindowClosed: true,
	},
	build: {
		bun: {
			entrypoint: "src/bun/index.ts",
		},
		copy: {
			[webBuildDir]: "views/mainview",
		},
		watchIgnore: [`${webBuildDir}/**`],
		mac: {
			bundleCEF: false,
			defaultRenderer: "native",
		},
		linux: {
			bundleCEF: false,
			defaultRenderer: "native",
		},
		win: {
			bundleCEF: false,
			defaultRenderer: "native",
		},
	},
} satisfies ElectrobunConfig;
