import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, "../../"),
  },
  allowedDevOrigins: ['localhost:3000', 'localhost:3001', 'nandscape.dev', '192.168.5.67'],
};

export default nextConfig;