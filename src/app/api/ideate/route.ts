import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { openaiJson } from "@/lib/openai";

const conceptSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    pitch: { type: "string" },
    bestFor: { type: "string" },
    lens: { type: "string" },
    rationale: { type: "string" },
    risks: { type: "array", items: { type: "string" } },
    sampleHook: { type: "string" },
  },
  required: ["id", "title", "pitch", "bestFor", "lens", "rationale", "risks", "sampleHook"],
  additionalProperties: false,
};

const outputSchema = {
  type: "object",
  properties: {
    concepts: { type: "array", minItems: 6, maxItems: 8, items: conceptSchema },
  },
  required: ["concepts"],
  additionalProperties: false,
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectId } = body || {};
  if (!projectId) return new Response(JSON.stringify({ error: "Missing projectId" }), { status: 400 });

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });

  const system = `You are a creative strategist. Given a Trend Formula and Product Essence, generate 6–8 distinct Concept Cards applying different Creative Lenses. Use the provided JSON schema strictly.`;
  const user = `Trend Formula: ${JSON.stringify(project.trendFormula)}\nProduct Essence: ${JSON.stringify(project.productEssence)}\n`; 
  const result = await openaiJson<{ concepts: any[] }>(system, user, "ConceptCards", outputSchema);

  // Store concept cards
  await prisma.conceptCard.deleteMany({ where: { projectId } });
  const created = await prisma.$transaction(
    result.concepts.map((c) =>
      prisma.conceptCard.create({
        data: {
          projectId,
          title: c.title,
          pitch: c.pitch,
          bestFor: c.bestFor,
          lens: c.lens,
          rationale: c.rationale,
          risks: c.risks,
          sampleHook: c.sampleHook,
        },
      })
    )
  );

  return new Response(JSON.stringify({ concepts: created }), { headers: { "content-type": "application/json" } });
} 