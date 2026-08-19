import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This app lives in a subdirectory of a repo that has its own lockfile at the
  // root; pin the tracing root so Next does not pick up the parent project.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
