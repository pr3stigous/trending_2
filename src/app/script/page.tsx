"use client";
import { useEffect, useMemo, useState } from "react";

type Frame = { id:string; sceneNumber:number; startTime:number; endTime:number; dialogueOrVoiceover?:string; actionDescription?:string; audioCue?:string; onScreenText?:{content:string;position:string;style:string}; conceptId?:string };

type Concept = { id:string; title:string };

type Narrative = { summary:string; hook:string; keyMessage:string; cta:string; tone:string; continuityNotes:string };

export default function Script(){
  const [projectId,setProjectId]=useState<string>("");
  const [frames,setFrames]=useState<Frame[]>([]);
  const [concepts,setConcepts]=useState<Concept[]>([]);
  const [activeConcept,setActiveConcept]=useState<string>("");
  const [narrative,setNarrative]=useState<Narrative|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string>("");

  async function load(id: string){
    if(!id) return;
    const r=await fetch(`/api/projects/${id}`);
    if(!r.ok){ throw new Error(`Failed to load project ${id}`); }
    const p=await r.json();
    const all=(p.frames||[]).sort((a: Frame,b: Frame)=> a.conceptId===b.conceptId ? a.sceneNumber-b.sceneNumber : (a.conceptId||"").localeCompare(b.conceptId||""));
    setFrames(all);
    const cs=(p.conceptCards||[]).map((c: any)=>({id:c.id,title:c.title})) as Concept[];
    setConcepts(cs);
    if(!activeConcept && cs.length){ setActiveConcept(cs[0].id); }
  }

  const visibleFrames = useMemo(()=> frames.filter((f: Frame)=>f.conceptId===activeConcept).sort((a: Frame,b: Frame)=>a.sceneNumber-b.sceneNumber),[frames,activeConcept]);

  useEffect(()=>{
    const url=new URL(window.location.href);
    const id=url.searchParams.get("projectId")||"";
    setProjectId(id);
    if(!id){ setLoading(false); return; }
    load(id).then(()=> setLoading(false)).catch((e)=>{ setError(e.message||"Failed to load"); setLoading(false); });
  },[]);

  useEffect(()=>{
    async function fetchNarrative(){
      if(!projectId||!activeConcept) return;
      const r=await fetch(`/api/narrative?projectId=${projectId}&conceptId=${activeConcept}`);
      if(!r.ok) return;
      const j=await r.json();
      setNarrative(j.narrative||null);
    }
    fetchNarrative();
  },[projectId,activeConcept]);

  if(loading) return <main className="p-8">Loading script...</main>;
  if(error) return <main className="p-8 text-red-600">{error}</main>;

  return (
    <main className="p-8 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Script</h1>
          <div className="mt-2 flex gap-2">
            {concepts.map((c: Concept)=> (
              <button key={c.id} className={`px-3 py-1 border ${activeConcept===c.id?'bg-black text-white':'bg-white'}`} onClick={()=>setActiveConcept(c.id)}>{c.title}</button>
            ))}
          </div>
        </div>
        <a className="px-3 py-2 border" href={`/api/export/pdf?projectId=${projectId}&conceptId=${activeConcept}`} target="_blank">Export PDF</a>
      </div>

      {narrative && (
        <section className="border p-4 rounded text-sm space-y-1">
          <div><span className="font-medium">Summary:</span> {narrative.summary}</div>
          <div><span className="font-medium">Hook:</span> {narrative.hook}</div>
          <div><span className="font-medium">Key message:</span> {narrative.keyMessage}</div>
          <div><span className="font-medium">CTA:</span> {narrative.cta}</div>
          <div><span className="font-medium">Tone:</span> {narrative.tone}</div>
          <div><span className="font-medium">Continuity:</span> {narrative.continuityNotes}</div>
        </section>
      )}

      <ol className="list-decimal pl-6 space-y-3 text-sm">
        {visibleFrames.map((f: Frame)=> (
          <li key={f.id}>
            <div className="text-gray-600">Scene {f.sceneNumber} · {f.startTime}s–{f.endTime}s</div>
            {f.dialogueOrVoiceover && <div><span className="font-medium">Dialogue:</span> {f.dialogueOrVoiceover}</div>}
            {f.actionDescription && <div><span className="font-medium">Action:</span> {f.actionDescription}</div>}
            {f.audioCue && <div><span className="font-medium">Audio:</span> {f.audioCue}</div>}
            {f.onScreenText?.content && <div><span className="font-medium">On-screen:</span> {f.onScreenText.content}</div>}
          </li>
        ))}
      </ol>
    </main>
  );
} 