import { NextRequest, NextResponse } from "next/server";
import { createPostgresJSExecutor } from "@prisma/studio-core/data/postgresjs";
import { serializeError, type StudioBFFRequest } from "@prisma/studio-core/data/bff";
import { getCurrentUser } from "@/lib/auth/current-user";
import { studioSql } from "@/lib/db/studio-client";

const executor = createPostgresJSExecutor(studioSql);

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: StudioBFFRequest;
  try {
    payload = (await request.json()) as StudioBFFRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    if (payload.procedure === "query") {
      const [error, result] = await executor.execute(payload.query, { schema: payload.schema });
      return NextResponse.json([error ? serializeError(error) : null, result]);
    }

    if (payload.procedure === "sequence") {
      const [firstQuery, secondQuery] = payload.sequence;
      if (!firstQuery || !secondQuery) {
        return NextResponse.json({ error: "Invalid sequence payload" }, { status: 400 });
      }

      const [firstError, firstResult] = await executor.execute(firstQuery);
      if (firstError) return NextResponse.json([[serializeError(firstError)]]);

      const [secondError, secondResult] = await executor.execute(secondQuery);
      if (secondError) return NextResponse.json([[null, firstResult], [serializeError(secondError)]]);

      return NextResponse.json([
        [null, firstResult],
        [null, secondResult],
      ]);
    }

    if (payload.procedure === "transaction") {
      if (!Array.isArray(payload.queries) || payload.queries.length === 0) {
        return NextResponse.json({ error: "Invalid transaction payload" }, { status: 400 });
      }
      if (!executor.executeTransaction) {
        return NextResponse.json({ error: "Transaction execution is not supported" }, { status: 501 });
      }

      const [error, result] = await executor.executeTransaction(payload.queries);
      return NextResponse.json([error ? serializeError(error) : null, result]);
    }

    return NextResponse.json({ error: "Unsupported procedure" }, { status: 400 });
  } catch (error) {
    return NextResponse.json([serializeError(error)]);
  }
}
