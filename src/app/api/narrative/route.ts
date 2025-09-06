import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { openaiJson } from "@/lib/openai";

const beatSchema = {
  type: "object",
  properties: {
    sceneNumber: { type: "integer" },
    objective: { type: "string" },
    visualIdea: { type: "string" },
    dialogue: { type: "string" },
    action: { type: "string" },
    audio: { type: "string" },
    onScreen: { type: "string" },
    transition: { type: "string" },
    notes: { type: "string" },
  },
  required: ["sceneNumber", "objective", "visualIdea", "dialogue", "action", "audio"],
  additionalProperties: false,
};

const narrativeSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    hook: { type: "string" },
    keyMessage: { type: "string" },
    cta: { type: "string" },
    tone: { type: "string" },
    continuityNotes: { type: "string" },
    beats: { type: "array", items: beatSchema },
  },
  required: ["summary", "hook", "keyMessage", "cta", "tone", "continuityNotes", "beats"],
  additionalProperties: false,
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectId, conceptId } = body || {};
  if (!projectId || !conceptId) return new Response(JSON.stringify({ error: "Missing projectId or conceptId" }), { status: 400 });

  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { frames: true, conceptCards: true } });
  if (!project) return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });
  const frames = project.frames.filter(f=>f.conceptId===conceptId).sort((a,b)=>a.sceneNumber-b.sceneNumber);
  const N = frames.length;

  const concept = project.conceptCards.find(c=>c.id===conceptId);
  const system = `You are an ad creative director. Create a coherent 30-second narrative plan for a vertical video ad. Return EXACTLY ${N} beats matching the input frame timings. No placeholders; each beat must be specific and continue the story. Beat 1 includes a strong hook. Final beats include a clear CTA. Dialogue lines are <= 12 words.`;
  const user = `Product Essence: ${JSON.stringify(project.productEssence)}\nTrend Formula: ${JSON.stringify(project.trendFormula)}\nSelected Concept: ${concept?.title}\nFrames (sceneNumber,start,end): ${frames.map(f=>({sceneNumber:f.sceneNumber,start:f.startTime,end:f.endTime}))}`;

  const result = await openaiJson<any>(system, user, "NarrativePlan", narrativeSchema);

  // Upsert narrative
  const existing = await prisma.narrativePlan.findFirst({ where: { projectId, conceptId } });
  if (existing) {
    await prisma.narrativePlan.update({ where: { id: existing.id }, data: { ...result } });
  } else {
    await prisma.narrativePlan.create({ data: { projectId, conceptId, ...result } });
  }

  return new Response(JSON.stringify({ ok: true, narrative: result }), { headers: { "content-type": "application/json" } });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") || "";
  const conceptId = searchParams.get("conceptId") || "";
  if (!projectId || !conceptId) return new Response(JSON.stringify({ error: "Missing projectId or conceptId" }), { status: 400 });
  const narrative = await prisma.narrativePlan.findFirst({ where: { projectId, conceptId } });
  return new Response(JSON.stringify({ narrative }), { headers: { "content-type": "application/json" } });
} 