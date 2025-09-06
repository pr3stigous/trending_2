"use client";
import { useState } from "react";

export default function NewProject(){
  const [name,setName]=useState("");
  const [trend,setTrend]=useState("");
  const [product,setProduct]=useState("");
  const [projectId,setProjectId]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);

  async function handleCreate(){
    setLoading(true);
    try{
      const r=await fetch("/api/projects",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,trendAnalysis:trend,productDescription:product})});
      const j=await r.json();
      setProjectId(j.projectId);
      await fetch("/api/extract",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({projectId:j.projectId,trendAnalysis:trend,productDescription:product})});
      window.location.href=`/confirm?projectId=${j.projectId}`;
    } finally{setLoading(false);}  
  }

  return (
    <main className="p-8 space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">Create Project</h1>
      <input className="border p-2 w-full" placeholder="Project name" value={name} onChange={e=>setName(e.target.value)} />
      <textarea className="border p-2 w-full h-40" placeholder="Paste Trend Analysis (manual)" value={trend} onChange={e=>setTrend(e.target.value)} />
      <textarea className="border p-2 w-full h-40" placeholder="Describe your product/service" value={product} onChange={e=>setProduct(e.target.value)} />
      <button className="bg-black text-white px-4 py-2" disabled={loading||!name||!trend||!product} onClick={handleCreate}>{loading?"Working...":"Create & Extract"}</button>
    </main>
  );
} 