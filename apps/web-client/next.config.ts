import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

// Local dev reads the monorepo-root .env (Next only auto-loads the app dir's);
// on Vercel this path doesn't exist and env comes from the platform.
loadEnv({ path: resolve(process.cwd(), '../../.env'), quiet: true });

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  transpilePackages: ['@bytebulletin/shared'],
  // Keep mongodb out of the webpack server bundle — its optional deps (aws4,
  // kerberos, snappy, …) otherwise produce module-not-found warnings.
  serverExternalPackages: ['mongodb'],
};

export default withSerwist(nextConfig);
