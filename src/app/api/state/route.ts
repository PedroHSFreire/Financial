import { promises as fs } from "node:fs";
import path from "node:path";
import { createDefaultState, normalizeState, type FinanceState } from "@/lib/finance";

export const runtime = "nodejs";

const storageDir = path.join(process.cwd(), ".codex-data");
const storageFile = path.join(storageDir, "finance-state.json");

async function readStoredState(): Promise<FinanceState> {
  try {
    const raw = await fs.readFile(storageFile, "utf8");
    return normalizeState(JSON.parse(raw));
  } catch {
    return createDefaultState();
  }
}

async function writeStoredState(state: FinanceState) {
  try {
    await fs.mkdir(storageDir, { recursive: true });
    await fs.writeFile(storageFile, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // Vercel does not guarantee a writable filesystem. The client still keeps local storage.
  }
}

export async function GET() {
  const state = await readStoredState();
  return Response.json(state);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const state = normalizeState(body);
  await writeStoredState(state);

  return Response.json({ ok: true });
}
