"use client";

import { Studio } from "@prisma/studio-core/ui";
import { createStudioBFFClient } from "@prisma/studio-core/data/bff";
import { createPostgresAdapter } from "@prisma/studio-core/data/postgres-core";
import "@prisma/studio-core/ui/index.css";

// Executor talks to our own auth-gated endpoint (app/api/admin/studio/route.ts),
// which is the only thing that ever touches the database connection.
const executor = createStudioBFFClient({ url: "/api/admin/studio" });
const adapter = createPostgresAdapter({ executor });

export function DatabaseStudio() {
  return <Studio adapter={adapter} />;
}
