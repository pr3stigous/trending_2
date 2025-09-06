import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") || "";
  const conceptId = searchParams.get("conceptId") || undefined;
  if (!projectId) return new Response(JSON.stringify({ error: "Missing projectId" }), { status: 400 });

  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { conceptCards: true } });
  if (!project) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

  const where: any = { projectId };
  if (conceptId) where.conceptId = conceptId;
  const frames = await prisma.storyboardFrame.findMany({ where, orderBy: { sceneNumber: "asc" } });

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Cover
  let page = pdfDoc.addPage([612, 792]); // Letter
  let { width, height } = page.getSize();
  page.setFont(font);
  page.setFontSize(24);
  page.drawText("Storyboard", { x: 50, y: height - 80 });
  page.setFontSize(12);
  page.drawText(`Project: ${project.name}`, { x: 50, y: height - 110 });
  if (conceptId) {
    const concept = project.conceptCards.find((c) => c.id === conceptId);
    if (concept) page.drawText(`Concept: ${concept.title}`, { x: 50, y: height - 130 });
  }

  for (const f of frames) {
    page = pdfDoc.addPage([612, 792]);
    ({ width, height } = page.getSize());
    page.setFont(font);
    page.setFontSize(14);
    page.drawText(`Scene ${f.sceneNumber}  ${f.startTime}s–${f.endTime}s`, { x: 50, y: height - 80 });

    let y = height - 110;
    const draw = (label: string, value?: string) => {
      if (!value) return;
      page.setFontSize(11);
      page.drawText(`${label}: ${value}`.slice(0, 500), { x: 50, y });
      y -= 18;
    };

    if (f.generatedImageURL) {
      page.setFontSize(10);
      page.drawText(`Image: ${f.generatedImageURL}`.slice(0, 90), { x: 50, y });
      y -= 18;
    }

    draw("Dialogue", f.dialogueOrVoiceover || undefined);
    draw("Action", f.actionDescription || undefined);
    draw("Audio", f.audioCue || undefined);
    draw("On-screen", (f.onScreenText as any)?.content || undefined);
  }

  const bytes = await pdfDoc.save();
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=storyboard-${projectId}${conceptId?`-${conceptId}`:""}.pdf`,
    },
  });
} 