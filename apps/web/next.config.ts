import path from "path";
import type { NextConfig } from "next";

// The dev server's actual port,  WEB_PORT overrides the default 3000 (see
// docker-compose.yml and .env.example), so the allowlist below has to follow
// it instead of assuming 3000.
const devPort = process.env.WEB_PORT ?? "3000";

const nextConfig: NextConfig = {
  // Emits a self-contained .next/standalone/ build (server + only the
  // node_modules it actually needs) so the production Docker image doesn't
  // have to ship the whole pnpm workspace's node_modules.
  output: "standalone",
  turbopack: {
    root: path.join(__dirname, "../../"),
  },
  allowedDevOrigins: [`localhost:${devPort}`, 'nandscape.dev', '192.168.5.67'],
};

export default nextConfig;