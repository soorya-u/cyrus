import { ensureDatabaseSchema } from "../harness/database";
import { buildServerEnv, requireE2e } from "../harness/env";

requireE2e();
await ensureDatabaseSchema(buildServerEnv());
