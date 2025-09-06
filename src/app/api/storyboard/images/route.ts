import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { generateFluxImage } from "@/lib/flux";
import { config } from "@/lib/config";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectId, conceptId, limit = Number(process.env.MAX_CONCURRENT_IMAGE_JOBS) || config.app.maxConcurrentImageJobs } = body || {};
  if (!projectId) return new Response(JSON.stringify({ error: "Missing projectId" }), { status: 400 });

  const where: any = { projectId, status: "pending" };
  if (conceptId) where.conceptId = conceptId;
  const frames = await prisma.storyboardFrame.findMany({ where, orderBy: { sceneNumber: "asc" }, take: limit });
  if (frames.length === 0) return new Response(JSON.stringify({ ok: true, generated: 0 }), { headers: { "content-type": "application/json" } });

  const results: any[] = [];
  for (const f of frames) {
    try {
      if (!f.visualPrompt || f.visualPrompt.trim().length === 0) {
        continue;
      }
      const { imageUrl, safetyScore } = await generateFluxImage({ prompt: f.visualPrompt, size: config.app.defaultImageSize });
      const imageParams = { prompt: f.visualPrompt, negativePrompt: "", size: config.app.defaultImageSize, model: config.flux.model, safetyScore };
      await prisma.storyboardFrame.update({ where: { id: f.id }, data: { generatedImageURL: imageUrl, imageParams, status: "generated" } });
      results.push({ id: f.id, url: imageUrl });
    } catch (e: any) {
      await prisma.storyboardFrame.update({ where: { id: f.id }, data: { status: "failed" } });
      results.push({ id: f.id, error: e?.message || "error" });
    }
  }

  return new Response(JSON.stringify({ ok: true, generated: results.filter(r=>r.url).length, frames: results }), { headers: { "content-type": "application/json" } });
} 