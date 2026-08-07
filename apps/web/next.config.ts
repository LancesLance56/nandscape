import path from "path";
import type { NextConfig } from "next";

const devPort = process.env.WEB_PORT ?? "3000";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.join(__dirname, "../../"),
  },
  allowedDevOrigins: [`localhost:${devPort}`, 'nandscape.dev', '192.168.5.67'],
};

export default nextConfig;