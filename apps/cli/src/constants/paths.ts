import { join } from "node:path";
import { env } from "@/lib/env";

export const CONFIG_FILE = "config.yml";
export const AGENTS_FILE = "agents.yml";
export const WORKER_PID = "worker.pid";
export const WORKER_LOG = "worker.log";
export const DATABASE_FILE = "store.db";

export const ACP_DIR = "acp";
export const REGISTRY_JSON_FILE = "registry.json";
export const REGISTRY_CACHE_INFO_FILE = "registry_cache.json";

export const CONFIG_PATH = join(env.CYRUS_HOME, CONFIG_FILE);
export const AGENTS_PATH = join(env.CYRUS_HOME, AGENTS_FILE);
export const STORE_DB_PATH = join(env.CYRUS_HOME, DATABASE_FILE);
export const PID_PATH = join(env.CYRUS_HOME, WORKER_PID);
export const LOG_PATH = join(env.CYRUS_HOME, WORKER_LOG);

export const ACP_CACHE_DIR = join(env.CYRUS_HOME, ACP_DIR);
export const REGISTRY_JSON_PATH = join(ACP_CACHE_DIR, REGISTRY_JSON_FILE);
export const REGISTRY_CACHE_INFO_PATH = join(
	ACP_CACHE_DIR,
	REGISTRY_CACHE_INFO_FILE
);
