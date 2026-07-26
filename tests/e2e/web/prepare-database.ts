import { ensureDatabaseSchema } from "../harness/database";
import { requireE2e } from "../harness/env";

requireE2e();
await ensureDatabaseSchema();
