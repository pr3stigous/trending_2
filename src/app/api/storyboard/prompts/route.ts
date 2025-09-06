import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { openaiJson } from "@/lib/openai";

const frameSchema = {
  type: "object",
  properties: {
    visualPrompt: { type: "string" },
    actionDescription: { type: "string" },
    audioCue: { type: "string" },
    dialogueOrVoiceover: { type: "string" },
    onScreenText: {
      type: "object",
      properties: {
        content: { type: "string" },
        position: { type: "string" },
        style: { type: "string" },
      },
      required: ["content", "position", "style"],
      additionalProperties: false,
    },
  },
  required: ["visualPrompt", "actionDescription", "audioCue", "dialogueOrVoiceover", "onScreenText"],
  additionalProperties: false,
};

const outputSchema = {
  type: "object",
  properties: {
    frames: { type: "array", items: frameSchema },
  },
  required: ["frames"],
  additionalProperties: false,
};

function composePrompt(beat: any, essence: any) {
  const brand = Array.isArray(essence?.brandVoice) ? essence.brandVoice.join(", ") : "clean, modern";
  return `Vertical 9:16, ${brand}. ${beat.visualIdea}. Cinematic lighting, shallow depth of field, realistic textures.`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectId, conceptId } = body || {};
  if (!projectId) return new Response(JSON.stringify({ error: "Missing projectId" }), { status: 400 });

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });

  const where: any = { projectId };
  if (conceptId) where.conceptId = conceptId;
  const frames = await prisma.storyboardFrame.findMany({ where, orderBy: { sceneNumber: "asc" } });

  let narrative = conceptId ? await prisma.narrativePlan.findFirst({ where: { projectId, conceptId } }) : null;
  if (conceptId && !narrative) {
    // Generate narrative if missing
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/narrative`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId, conceptId }) });
    try { const j = await res.json(); narrative = j.narrative || (await prisma.narrativePlan.findFirst({ where: { projectId, conceptId } })); } catch { /* noop */ }
  }

  if (narrative?.beats && Array.isArray(narrative.beats) && (narrative.beats as any[]).length === frames.length) {
    // Use beats directly to populate frames
    const beats = narrative.beats as any[];
    await prisma.$transaction(frames.map((f, idx) => {
      const b = beats[idx];
      return prisma.storyboardFrame.update({
        where: { id: f.id },
        data: {
          visualPrompt: composePrompt(b, project.productEssence),
          actionDescription: b.action,
          audioCue: b.audio,
          dialogueOrVoiceover: b.dialogue,
          onScreenText: { content: b.onScreen || "", position: "bottom", style: "bold, white" },
        }
      });
    }));
    return new Response(JSON.stringify({ ok: true, fromNarrative: true }), { headers: { "content-type": "application/json" } });
  }

  // Fallback to model-based per-frame composition if narrative missing
  const framesSorted = [...frames].sort((a,b)=>a.sceneNumber-b.sceneNumber);
  const N = framesSorted.length;
  const system = `You are a storyboard writer for 30-second vertical video ads. For each input frame, produce detailed visual prompts suitable for a photorealistic image model, plus concise action, audio, dialogue, and on-screen text. Return EXACTLY the same number of items as the input frames, in the SAME order.`;
  const user = `Product Essence: ${JSON.stringify(project.productEssence)}\nTrend Formula: ${JSON.stringify(project.trendFormula)}\nInput Frames (sceneNumber,start,end): ${framesSorted.map(f=>({sceneNumber:f.sceneNumber,start:f.startTime,end:f.endTime}))}\nReturn an array of ${N} frame objects (one per input).`;

  const result = await openaiJson<{ frames: any[] }>(system, user, "StoryboardFrames", outputSchema);

  const out = Array.isArray(result.frames) ? result.frames : [];
  const normalized = framesSorted.map((_, idx) => out[idx] ?? out[out.length-1] ?? { visualPrompt: "", actionDescription: "", audioCue: "", dialogueOrVoiceover: "", onScreenText: { content: "", position: "bottom", style: "bold, white" } });

  await prisma.$transaction(
    framesSorted.map((f, idx) => {
      const r = normalized[idx];
      return prisma.storyboardFrame.update({
        where: { id: f.id },
        data: {
          visualPrompt: r.visualPrompt,
          actionDescription: r.actionDescription,
          audioCue: r.audioCue,
          dialogueOrVoiceover: r.dialogueOrVoiceover,
          onScreenText: r.onScreenText,
        },
      });
    })
  );

  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
} 