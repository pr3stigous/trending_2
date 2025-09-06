import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { conceptCards: true, frames: true },
  });
  if (!project) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  return new Response(JSON.stringify(project), { headers: { "content-type": "application/json" } });
} 