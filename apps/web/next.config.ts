import path from "path";
import type { NextConfig } from "next";

const devPort = process.env.WEB_PORT ?? "3000";

const nextConfig: NextConfig = {
  output: "standalone",
  // Shiki has to load from node_modules rather than be bundled. Its grammars
  // and regex engine are pulled in at runtime, and once bundled the engine
  // comes up unable to match anything: highlighting silently degrades to one
  // flat token per line - a theme applied, no syntax. Nothing throws, which
  // is why it looks like the highlighter simply stopped caring.
  serverExternalPackages: ["shiki"],
  turbopack: {
    root: path.join(__dirname, "../../"),
  },
  allowedDevOrigins: [`localhost:${devPort}`, 'nandscape.dev', '192.168.5.67'],
};

export default nextConfig;