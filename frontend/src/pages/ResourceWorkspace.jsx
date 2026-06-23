import { useState, useEffect, useCallback } from "react"
import { useParams, Link } from "react-router-dom"
import axios from "axios"
import { useDropzone } from "react-dropzone"
import { 
  ArrowLeft, Loader2, Sparkles, UserCircle2, 
  Box, AlignLeft, FileText, Image as ImageIcon, Plus, X, Layers, Eye
} from "lucide-react"

// Smart categorization helper
const getFileCategory = (name, type = "") => {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const mime = (type || "").toLowerCase();
  
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "heic"].includes(ext)) {
    return "image";
  }
  if (
    mime.includes("presentation") || 
    mime.includes("powerpoint") || 
    mime.includes("keynote") || 
    ["ppt", "pptx", "pps", "ppsx", "key", "odp"].includes(ext)
  ) {
    return "presentation";
  }
  if (
    mime === "application/pdf" || 
    mime.includes("word") || 
    mime.includes("sheet") || 
    mime.includes("text") || 
    ["pdf", "doc", "docx", "xls", "xlsx", "txt", "rtf", "csv", "pages"].includes(ext)
  ) {
    return "document";
  }
  return "other";
};

export default function ResourceWorkspace() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingAsset, setUploadingAsset] = useState(false)
  const [activeAssetTab, setActiveAssetTab] = useState("all")

  // Local state for editing global_entities
  const [entities, setEntities] = useState({
    concepts: [], authors: [], papers: [], books: [], materials: [], methodologies: [], assets: []
  })

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`http://localhost:4000/library/${id}`)
      setData(res.data)
      const gEntities = res.data.global_entities || {}
      setEntities({
        concepts: gEntities.concepts || [],
        authors: gEntities.authors || [],
        papers: gEntities.papers || [],
        books: gEntities.books || [],
        materials: gEntities.materials || [],
        methodologies: gEntities.methodologies || [],
        assets: gEntities.assets || []
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function saveWorkspace() {
    setIsSaving(true)
    try {
      await axios.put(`http://localhost:4000/library/${id}/workspace`, {
        global_entities: entities
      })
      alert("Workspace saved!")
    } catch (e) {
      console.error(e)
      alert("Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

  const addEntity = (type) => {
    const name = prompt(`Enter new ${type} name:`)
    if (!name) return
    setEntities(prev => ({
      ...prev,
      [type]: [...prev[type], name]
    }))
  }

  const removeEntity = (type, index) => {
    setEntities(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }))
  }

  const onAssetDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    setUploadingAsset(true)
    const newAssets = []
    
    for (const file of acceptedFiles) {
      const formData = new FormData()
      formData.append("file", file)
      
      try {
        const res = await axios.post(`http://localhost:4000/library/${id}/assets`, formData)
        const assetUrl = res.data.url
        newAssets.push({
          name: file.name,
          url: assetUrl,
          type: file.type || "",
          uploadedAt: new Date().toISOString()
        })
      } catch (e) {
        console.error("Asset upload failed for file: " + file.name, e)
        alert(`Failed to upload file ${file.name}. Error: ${e.response?.data?.error || e.message}`)
      }
    }
    
    if (newAssets.length > 0) {
      setEntities(prev => ({
        ...prev,
        assets: [...(prev.assets || []), ...newAssets]
      }))
    }
    setUploadingAsset(false)
  }, [id])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: onAssetDrop })

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", paddingTop: "100px" }}><Loader2 className="lucide-spin" size={32} color="#94a3b8" /></div>
  }

  if (!data) return <div style={{ textAlign: "center", padding: "100px" }}>Resource not found</div>

  const chunks = data.results || []

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)", paddingBottom: "20px" }}>
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link to="/admin" className="glass-button" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", color: "#64748b", padding: "8px 16px" }}>
            <ArrowLeft size={16} /> Back to Admin
          </Link>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 600, color: "#0f172a" }}>Workspace: {data.filename}</h1>
        </div>
        <button onClick={saveWorkspace} disabled={isSaving} className="glass-button" style={{ padding: "8px 24px", background: "#0f172a", color: "white" }}>
          {isSaving ? <Loader2 className="lucide-spin" size={16} /> : "Save Workspace"}
        </button>
      </div>

      {/* 3-Column Layout */}
      <div style={{ display: "flex", gap: "24px", flex: 1, overflow: "hidden" }}>
        
        {/* Col 1: Transcript */}
        <div className="glass-panel" style={{ flex: "1 1 30%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid rgba(0,0,0,0.05)", fontWeight: 600, color: "#475569" }}>Original Transcript</div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {chunks.map((r, i) => (
              <div key={i} style={{ padding: "12px", background: "rgba(255,255,255,0.5)", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>Chunk {r.chunk.chunk_index}</div>
                <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.6 }}>{r.chunk.content}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 2: Entities */}
        <div className="glass-panel" style={{ flex: "1 1 40%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid rgba(0,0,0,0.05)", fontWeight: 600, color: "#475569" }}>Knowledge Graph Nodes</div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "32px" }}>
            <EntityManager title="Concepts" type="concepts" icon={<Sparkles size={16}/>} items={entities.concepts} onAdd={() => addEntity("concepts")} onRemove={(idx) => removeEntity("concepts", idx)} />
            <EntityManager title="Authors" type="authors" icon={<UserCircle2 size={16}/>} items={entities.authors} onAdd={() => addEntity("authors")} onRemove={(idx) => removeEntity("authors", idx)} />
            <EntityManager title="Papers" type="papers" icon={<FileText size={16}/>} items={entities.papers} onAdd={() => addEntity("papers")} onRemove={(idx) => removeEntity("papers", idx)} />
            <EntityManager title="Methodologies" type="methodologies" icon={<AlignLeft size={16}/>} items={entities.methodologies} onAdd={() => addEntity("methodologies")} onRemove={(idx) => removeEntity("methodologies", idx)} />
            <EntityManager title="Materials" type="materials" icon={<Box size={16}/>} items={entities.materials} onAdd={() => addEntity("materials")} onRemove={(idx) => removeEntity("materials", idx)} />
          </div>
        </div>

        {/* Col 3: Media & Assets */}
        <div className="glass-panel" style={{ flex: "1 1 30%", display: "flex", flexDirection: "column", overflow: "hidden", background: "rgba(248,250,252,0.8)" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid rgba(0,0,0,0.05)", fontWeight: 600, color: "#475569" }}>Media & Assets</div>
          
          <div style={{ padding: "16px" }}>
            <div {...getRootProps()} style={{
              padding: "24px 16px", border: "2px dashed rgba(148, 163, 184, 0.4)", borderRadius: "16px", 
              textAlign: "center", cursor: "pointer", background: isDragActive ? "rgba(167, 139, 250, 0.1)" : "rgba(255,255,255,0.5)",
              transition: "all 0.2s"
            }}>
              <input {...getInputProps()} />
              {uploadingAsset ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <Loader2 className="lucide-spin" size={24} color="#6d28d9" style={{ margin: "0 auto" }}/>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Uploading assets...</span>
                </div>
              ) : (
                <>
                  <ImageIcon size={24} color="#94a3b8" style={{ margin: "0 auto 8px" }}/>
                  <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>Drop images, diagrams, slides or PDFs here</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>Supports multiple files</div>
                </>
              )}
            </div>
          </div>

          {/* Tab Selector */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.4)" }}>
            <TabButton active={activeAssetTab === "all"} onClick={() => setActiveAssetTab("all")} label="All" count={(entities.assets || []).length} />
            <TabButton active={activeAssetTab === "image"} onClick={() => setActiveAssetTab("image")} label="Images" count={(entities.assets || []).filter(a => getFileCategory(a.name, a.type) === "image").length} />
            <TabButton active={activeAssetTab === "presentation"} onClick={() => setActiveAssetTab("presentation")} label="Slides" count={(entities.assets || []).filter(a => getFileCategory(a.name, a.type) === "presentation").length} />
            <TabButton active={activeAssetTab === "document"} onClick={() => setActiveAssetTab("document")} label="Docs" count={(entities.assets || []).filter(a => getFileCategory(a.name, a.type) === "document").length} />
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {(entities.assets || []).filter(a => activeAssetTab === "all" || getFileCategory(a.name, a.type) === activeAssetTab).length === 0 && (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "13px", padding: "40px 20px" }}>No assets in this category.</div>
            )}
            {(entities.assets || []).map((asset, i) => {
              const category = getFileCategory(asset.name, asset.type);
              const isMatch = activeAssetTab === "all" || category === activeAssetTab;
              if (!isMatch) return null;

              return (
                <div key={i} style={{ 
                  background: "white", padding: "12px", borderRadius: "12px", 
                  border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                  display: "flex", flexDirection: "column", gap: "8px"
                }}>
                  {category === "image" ? (
                    <img src={asset.url} alt={asset.name} style={{ width: "100%", borderRadius: "8px", maxHeight: "150px", objectFit: "cover" }} />
                  ) : category === "presentation" ? (
                    <div style={{ padding: "16px 12px", background: "linear-gradient(135deg, #fef08a 0%, #fde047 100%)", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", color: "#854d0e" }}>
                      <Layers size={24} />
                      <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Slide Deck</span>
                    </div>
                  ) : (
                    <div style={{ padding: "16px 12px", background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", color: "#0369a1" }}>
                      <FileText size={24} />
                      <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>PDF / Document</span>
                    </div>
                  )}
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={asset.name}>{asset.name}</div>
                    <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "capitalize" }}>{category} file</div>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px", borderTop: "1px solid rgba(0,0,0,0.03)", paddingTop: "8px" }}>
                    <a href={asset.url} target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#6d28d9", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", fontWeight: 500 }}>
                      <Eye size={12} /> View File
                    </a>
                    <button onClick={() => removeEntity("assets", i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center", padding: "4px" }} title="Remove asset">
                      <X size={14}/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  )
}

function EntityManager({ title, icon, items, onAdd, onRemove }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {icon} {title} ({items.length})
        </div>
        <button onClick={onAdd} className="glass-button" style={{ padding: "4px 8px", fontSize: "12px" }}><Plus size={14} /></button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {items.length === 0 && <span style={{ fontSize: "13px", color: "#94a3b8" }}>No items</span>}
        {items.map((item, i) => {
          const name = typeof item === 'string' ? item : item.name;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.7)", padding: "6px 12px", borderRadius: "99px", fontSize: "13px", border: "1px solid rgba(0,0,0,0.05)" }}>
              <span>{name}</span>
              <button onClick={() => onRemove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", padding: 0 }}><X size={12} /></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, label, count }) {
  return (
    <button 
      onClick={onClick} 
      style={{
        flex: 1, padding: "12px 4px", fontSize: "11px", fontWeight: active ? 600 : 500,
        color: active ? "#6d28d9" : "#64748b", border: "none", background: active ? "rgba(167, 139, 250, 0.08)" : "transparent",
        borderBottom: active ? "2px solid #6d28d9" : "2px solid transparent", cursor: "pointer", transition: "all 0.2s",
        display: "flex", alignItems: "center", justifyContent: "center", gap: "4px"
      }}
    >
      {label} <span style={{ fontSize: "9px", background: active ? "rgba(109,40,217,0.15)" : "rgba(0,0,0,0.05)", padding: "2px 5px", borderRadius: "6px", fontWeight: 600 }}>{count}</span>
    </button>
  );
}
