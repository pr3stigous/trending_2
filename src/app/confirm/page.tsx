"use client";
import { useEffect, useState } from "react";

export default function Confirm(){
  const [projectId,setProjectId]=useState<string>("");
  const [essence,setEssence]=useState<any>(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    const url=new URL(window.location.href);
    const id=url.searchParams.get("projectId")||"";
    setProjectId(id);
    if(!id) return;
    fetch(`/api/projects/${id}`).then(r=>r.json()).then(p=>{setEssence(p.productEssence); setLoading(false);});
  },[]);

  async function save(){
    await fetch('/api/essence',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({projectId,productEssence:essence})});
    window.location.href=`/concepts?projectId=${projectId}`;
  }

  if(loading) return <main className="p-8">Loading...</main>;

  return (
    <main className="p-8 space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">Confirm Product Essence</h1>
      <p className="text-sm text-gray-600">This is the only editable step in MVP.</p>
      <div className="space-y-2">
        <label className="block text-sm font-medium">targetPersona</label>
        <input className="border p-2 w-full" value={essence?.targetPersona||""} onChange={e=>setEssence({...essence,targetPersona:e.target.value})}/>
        <label className="block text-sm font-medium">problemSolved</label>
        <textarea className="border p-2 w-full" value={essence?.problemSolved||""} onChange={e=>setEssence({...essence,problemSolved:e.target.value})}/>
        <label className="block text-sm font-medium">ahaMoment</label>
        <textarea className="border p-2 w-full" value={essence?.ahaMoment||""} onChange={e=>setEssence({...essence,ahaMoment:e.target.value})}/>
        <label className="block text-sm font-medium">brandVoice (comma separated)</label>
        <input className="border p-2 w-full" value={(essence?.brandVoice||[]).join(', ')} onChange={e=>setEssence({...essence,brandVoice:e.target.value.split(',').map((s:string)=>s.trim()).filter(Boolean)})}/>
        <label className="block text-sm font-medium">keyDifferentiators (one per line)</label>
        <textarea className="border p-2 w-full" value={(essence?.keyDifferentiators||[]).join('\n')} onChange={e=>setEssence({...essence,keyDifferentiators:e.target.value.split('\n').map((s:string)=>s.trim()).filter(Boolean)})}/>
      </div>
      <button className="bg-black text-white px-4 py-2" onClick={save}>Save & Continue</button>
    </main>
  );
} 