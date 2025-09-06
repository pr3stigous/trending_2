import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectId, productEssence } = body || {};
  if (!projectId || !productEssence) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }
  const updated = await prisma.project.update({ where: { id: projectId }, data: { productEssence } });
  return new Response(JSON.stringify({ ok: true, productEssence: updated.productEssence }), { headers: { "content-type": "application/json" } });
} 