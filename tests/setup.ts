import { loadEnvConfig } from "@next/env";

// process.env.NODE_ENV is typed readonly by Next.js; the cast below only
// bypasses the compile-time restriction, the runtime assignment is normal.
(process.env as Record<string, string>).NODE_ENV = "test";
loadEnvConfig(process.cwd());
