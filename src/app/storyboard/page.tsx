"use client";
import { useEffect, useMemo, useState } from "react";

type Frame = { id:string; sceneNumber:number; startTime:number; endTime:number; generatedImageURL?:string|null; status?:string; visualPrompt?:string; actionDescription?:string; audioCue?:string; dialogueOrVoiceover?:string; onScreenText?:{content:string;position:string;style:string}; conceptId?:string };

type Concept = { id:string; title:string };

export default function Storyboard(){
  const [projectId,setProjectId]=useState<string>("");
  const [frames,setFrames]=useState<Frame[]>([]);
  const [concepts,setConcepts]=useState<Concept[]>([]);
  const [activeConcept,setActiveConcept]=useState<string>("");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);

  async function load(){
    const p=await fetch(`/api/projects/${projectId}`).then(r=>r.json());
    const all=(p.frames||[]).sort((a: Frame,b: Frame)=> a.conceptId===b.conceptId ? a.sceneNumber-b.sceneNumber : (a.conceptId||"").localeCompare(b.conceptId||""));
    setFrames(all);
    const cs=(p.conceptCards||[]).map((c: any)=>({id:c.id,title:c.title})) as Concept[];
    setConcepts(cs);
    if(!activeConcept && cs.length){ setActiveConcept(cs[0].id); }
    return { all, cs };
  }

  const visibleFrames = useMemo(()=> frames.filter((f: Frame)=>f.conceptId===activeConcept).sort((a: Frame,b: Frame)=>a.sceneNumber-b.sceneNumber),[frames,activeConcept]);

  useEffect(()=>{
    const url=new URL(window.location.href);
    const id=url.searchParams.get("projectId")||"";
    setProjectId(id);
    if(!id) return;
    fetch(`/api/projects/${id}`).then(r=>r.json()).then(p=>{ 
      const all=(p.frames||[]).sort((a: Frame,b: Frame)=> a.conceptId===b.conceptId ? a.sceneNumber-b.sceneNumber : (a.conceptId||"").localeCompare(b.conceptId||""));
      setFrames(all);
      const cs=(p.conceptCards||[]).map((c: any)=>({id:c.id,title:c.title})) as Concept[];
      setConcepts(cs);
      if(cs.length){ setActiveConcept(cs[0].id); }
      setLoading(false);
    });
  },[]);

  async function generateNarrative(){
    if(!activeConcept) return;
    setBusy(true);
    try{
      await fetch('/api/narrative',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({projectId,conceptId:activeConcept})});
    } finally { setBusy(false); }
  }

  async function generate(){
    if(!activeConcept) return;
    setBusy(true);
    try{
      await fetch('/api/narrative',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({projectId,conceptId:activeConcept})});
      await fetch('/api/storyboard/prompts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({projectId,conceptId:activeConcept})});
      for(let i=0;i<20;i++){
        const { all } = await load();
        const remaining=all.filter((f: Frame)=>f.conceptId===activeConcept && !f.generatedImageURL && !!f.visualPrompt).length;
        if(remaining===0) break;
        await fetch('/api/storyboard/images',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({projectId,conceptId:activeConcept})});
      }
      await load();
    } finally{ setBusy(false); }
  }

  useEffect(()=>{
    if(!projectId) return;
    const t=setInterval(()=>{ load(); }, 4000);
    return ()=>clearInterval(t);
  },[projectId]);

  if(loading) return <main className="p-8">Building storyboard...</main>;

  return (
    <main className="p-8 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Storyboard (30s total)</h1>
          <div className="mt-2 flex gap-2">
            {concepts.map((c: Concept)=> (
              <button key={c.id} className={`px-3 py-1 border ${activeConcept===c.id?'bg-black text-white':'bg-white'}`} onClick={()=>setActiveConcept(c.id)}>{c.title}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <a className="px-3 py-2 border" href={`/script?projectId=${projectId}`}>View Script</a>
          <a className="px-3 py-2 border" href={`/api/export/pdf?projectId=${projectId}&conceptId=${activeConcept}`} target="_blank">Export PDF</a>
          <button className="px-3 py-2 border" onClick={generateNarrative} disabled={busy||!activeConcept}>Generate narrative</button>
          <button className="bg-black text-white px-4 py-2" onClick={generate} disabled={busy||!activeConcept}>{busy?"Generating...":"Generate all images"}</button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {visibleFrames.map((f: Frame)=> (
          <div key={f.id} className="border rounded overflow-hidden">
            <div className="aspect-[9/16] bg-gray-100 flex items-center justify-center text-gray-500">
              {f.generatedImageURL ? <img src={f.generatedImageURL} alt={`Frame ${f.sceneNumber}`} className="w-full h-full object-cover"/> : <span>{f.status==='failed'? 'Failed' : 'Pending image'}</span>}
            </div>
            <div className="p-2 text-xs text-gray-700 space-y-1">
              <div className="font-semibold">Scene {f.sceneNumber} · {f.startTime}s–{f.endTime}s</div>
              {f.dialogueOrVoiceover && <div><span className="font-medium">Dialogue:</span> {f.dialogueOrVoiceover}</div>}
              {f.actionDescription && <div><span className="font-medium">Action:</span> {f.actionDescription}</div>}
              {f.audioCue && <div><span className="font-medium">Audio:</span> {f.audioCue}</div>}
              {f.onScreenText?.content && <div><span className="font-medium">On-screen:</span> {f.onScreenText.content}</div>}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
} 