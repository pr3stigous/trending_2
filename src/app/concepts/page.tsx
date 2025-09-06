"use client";
import { useEffect, useState } from "react";

type Concept = { id:string; title:string; pitch:string; bestFor:string; lens:string; rationale:string; risks:string[]; sampleHook:string };

export default function Concepts(){
  const [projectId,setProjectId]=useState<string>("");
  const [concepts,setConcepts]=useState<Concept[]>([]);
  const [selected,setSelected]=useState<string[]>([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    const url=new URL(window.location.href);
    const id=url.searchParams.get("projectId")||"";
    setProjectId(id);
    if(!id) return;
    fetch(`/api/projects/${id}`).then(r=>r.json()).then(async p=>{
      if(p.conceptCards?.length){ setConcepts(p.conceptCards); setLoading(false); }
      else {
        await fetch('/api/ideate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({projectId:id})});
        const p2=await fetch(`/api/projects/${id}`).then(r=>r.json());
        setConcepts(p2.conceptCards||[]);
        setLoading(false);
      }
    });
  },[]);

  function toggle(id:string){
    setSelected(prev=> prev.includes(id) ? prev.filter(x=>x!==id) : (prev.length<3?[...prev,id]:prev));
  }

  async function continueNext(){
    await fetch('/api/storyboard',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({projectId,selectedConceptIds:selected,frameCount:10})});
    window.location.href=`/storyboard?projectId=${projectId}`;
  }

  if(loading) return <main className="p-8">Generating concepts...</main>;

  return (
    <main className="p-8 space-y-4 max-w-5xl">
      <h1 className="text-2xl font-bold">Select up to 3 Concepts</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {concepts.map((c)=> (
          <div key={c.id} className={`border p-4 rounded ${selected.includes(c.id)?'ring-2 ring-black':''}`}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{c.title}</h2>
              <input type="checkbox" checked={selected.includes(c.id)} onChange={()=>toggle(c.id)} />
            </div>
            <p className="text-sm mt-1">{c.pitch}</p>
            <p className="text-xs mt-1 text-gray-600">Lens: {c.lens} · Best for: {c.bestFor}</p>
            <p className="text-xs mt-1">Hook: {c.sampleHook}</p>
          </div>
        ))}
      </div>
      <button className="bg-black text-white px-4 py-2" disabled={!selected.length} onClick={continueNext}>Generate Storyboard</button>
    </main>
  );
} 