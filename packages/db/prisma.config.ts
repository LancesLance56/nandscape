import path from "path";
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

const result = dotenv.config({ path: path.join(process.cwd(), ".env") });
console.log("dotenv result:", result);
console.log("cwd:", process.cwd());
console.log("DATABASE_URL:", process.env.DATABASE_URL);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});