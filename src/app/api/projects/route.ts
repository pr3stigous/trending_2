import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, trendAnalysis, productDescription } = body || {};
  if (!name || !trendAnalysis || !productDescription) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }
  const project = await prisma.project.create({
    data: {
      name,
      trendFormula: {},
      productEssence: {},
    },
  });
  return new Response(JSON.stringify({ projectId: project.id }), { headers: { "content-type": "application/json" } });
} 