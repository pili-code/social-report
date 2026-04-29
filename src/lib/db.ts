import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured");
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export async function getAllFromTable(table: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await getClient().from(table).select("*").order("id", { ascending: true });
  if (error) {
    throw new Error(`getAllFromTable(${table}): ${error.message}`);
  }
  return data ?? [];
}

function stripMeta(row: Record<string, unknown>): Record<string, unknown> {
  const { id: _id, ...rest } = row;
  void _id;
  return rest;
}

export async function upsertRow(
  table: string,
  row: Record<string, unknown>,
  uniqueKeys: string[]
): Promise<void> {
  const { error } = await getClient()
    .from(table)
    .upsert(stripMeta(row), { onConflict: uniqueKeys.join(",") });
  if (error) {
    throw new Error(`upsertRow(${table}): ${error.message}`);
  }
}

export async function bulkUpsert(
  table: string,
  rows: Record<string, unknown>[],
  uniqueKeys: string[]
): Promise<{ inserted: number }> {
  if (rows.length === 0) return { inserted: 0 };

  // Dedupe by unique key (last occurrence wins) — Postgres rejects upserting
  // the same conflict target more than once in a single statement.
  const seen = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const k = uniqueKeys.map((uk) => String(row[uk] ?? "")).join("\u0000");
    seen.set(k, stripMeta(row));
  }
  const cleaned = Array.from(seen.values());

  const { error } = await getClient()
    .from(table)
    .upsert(cleaned, { onConflict: uniqueKeys.join(",") });
  if (error) {
    throw new Error(`bulkUpsert(${table}): ${error.message}`);
  }
  return { inserted: cleaned.length };
}
