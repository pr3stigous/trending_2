import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

function allocateDurations(total: number, frames: number, min: number, max: number): number[] {
  const base = total / frames;
  const arr = Array.from({ length: frames }, () => base);
  for (let i = 0; i < frames; i++) arr[i] = Math.min(max, Math.max(min, arr[i]));
  const sum = arr.reduce((a, b) => a + b, 0);
  const scale = total / sum;
  return arr.map((v) => Number((v * scale).toFixed(2)));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectId, selectedConceptIds, frameCount = 10 } = body || {};
  if (!projectId || !Array.isArray(selectedConceptIds) || selectedConceptIds.length === 0 || selectedConceptIds.length > 3) {
    return new Response(JSON.stringify({ error: "Provide 1-3 selectedConceptIds and projectId" }), { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { conceptCards: true } });
  if (!project) return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });

  const totalSeconds = 30.0;
  const durations = allocateDurations(totalSeconds, frameCount, 1.5, 6.0);

  await prisma.project.update({ where: { id: projectId }, data: { selectedConceptIds: selectedConceptIds as any } });
  // Clear existing frames for this project before regenerating
  await prisma.storyboardFrame.deleteMany({ where: { projectId } });

  for (const conceptId of selectedConceptIds) {
    let time = 0;
    const framesData = durations.map((d, i) => {
      const startTime = Number(time.toFixed(2));
      const endTime = Number((time + d).toFixed(2));
      time += d;
      return {
        projectId,
        conceptId,
        sceneNumber: i + 1,
        startTime,
        endTime,
        aspectRatio: "9:16",
        visualPrompt: "",
        actionDescription: "",
        audioCue: "",
        dialogueOrVoiceover: "",
        onScreenText: {},
        imageParams: {},
        status: "pending",
      };
    });
    await prisma.$transaction(framesData.map((f) => prisma.storyboardFrame.create({ data: f })));
  }

  const created = await prisma.storyboardFrame.findMany({ where: { projectId }, orderBy: [{ conceptId: "asc" }, { sceneNumber: "asc" }] });

  return new Response(JSON.stringify({ frames: created }), { headers: { "content-type": "application/json" } });
} 