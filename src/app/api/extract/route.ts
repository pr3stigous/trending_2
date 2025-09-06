import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { openaiJson } from "@/lib/openai";

const trendSchema = {
  type: "object",
  properties: {
    coreMechanic: { type: "string" },
    emotionalArc: { type: "string" },
    keyTropes: { type: "array", items: { type: "string" } },
    pacing: { type: "string" },
  },
  required: ["coreMechanic", "emotionalArc", "keyTropes", "pacing"],
  additionalProperties: false,
};

const productSchema = {
  type: "object",
  properties: {
    targetPersona: { type: "string" },
    problemSolved: { type: "string" },
    ahaMoment: { type: "string" },
    brandVoice: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
    keyDifferentiators: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
  },
  required: ["targetPersona", "problemSolved", "ahaMoment", "brandVoice", "keyDifferentiators"],
  additionalProperties: false,
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectId, trendAnalysis, productDescription } = body || {};
  if (!projectId || !trendAnalysis || !productDescription) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }

  const system = `You are an advertising analyst. Extract structured fields exactly per JSON schema.`;
  const trendUser = `Trend Analysis (verbatim):\n${trendAnalysis}\n\nExtract Trend Formula.`;
  const productUser = `Product Description (verbatim):\n${productDescription}\n\nExtract Product Essence.`;

  const [trendFormula, productEssence] = await Promise.all([
    openaiJson<any>(system, trendUser, "TrendFormula", trendSchema),
    openaiJson<any>(system, productUser, "ProductEssence", productSchema),
  ]);

  await prisma.project.update({
    where: { id: projectId },
    data: { trendFormula, productEssence },
  });

  return new Response(JSON.stringify({ trendFormula, productEssence }), { headers: { "content-type": "application/json" } });
} 