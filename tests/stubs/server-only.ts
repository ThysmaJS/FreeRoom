// Stub for the "server-only" package when running outside Next.js's bundler
// (e.g. under Vitest). Next.js itself turns this import into a build-time
// guard; here it's just a no-op so lib/*.ts can be unit-tested directly.
export {};
