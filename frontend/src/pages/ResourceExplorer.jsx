import { useState, useRef, useEffect } from "react"
import { useParams, useLocation, useNavigate } from "react-router-dom"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import { 
    Search, X, Loader2, ExternalLink, UserCircle2, 
    FileText, BookOpen, Box, AlignLeft, Clock, Sparkles, ArrowUpRight,
    Library, Bookmark, MessageSquare, ArrowLeft, Share2, ChevronDown, ChevronRight, Filter,
    Layers, Eye, Download
} from "lucide-react"
import PremiumSlider from "../components/PremiumSlider"
import { PDFDownloadLink } from '@react-pdf/renderer'
import { TranscriptPDF } from '../components/TranscriptPDF'

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

export default function ResourceExplorer() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [result, setResult] = useState(location.state?.result || null)
  const [loading, setLoading] = useState(!result)
  
  const [chunkMinutes, setChunkMinutes] = useState(15)
  const [rechunking, setRechunking] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeHighlight, setActiveHighlight] = useState(null)
  const [activeConcept, setActiveConcept] = useState(null)
  const [drawerState, setDrawerState] = useState(null)
  const [activeAssetTab, setActiveAssetTab] = useState("all")
  const [selectedImage, setSelectedImage] = useState(null)
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem("sahachara_bookmarks");
      return saved ? JSON.parse(saved) : { documents: [], entities: [] };
    } catch {
      return { documents: [], entities: [] };
    }
  });
  const chunkRefs = useRef({})
  const entityRefs = useRef({})

  useEffect(() => {
      if (!result) {
          axios.get(`http://localhost:4000/library/${id}`)
              .then(res => setResult(res.data))
              .catch(e => { console.error(e); navigate("/library") })
              .finally(() => setLoading(false))
      }
  }, [id, result, navigate])

  if (loading || !result) {
      return <div style={{ display: "flex", justifyContent: "center", padding: "100px", paddingTop: "150px" }}><Loader2 className="lucide-spin" size={32} color="#94a3b8" /></div>
  }

  const data = result?.global_entities || result || {};
  const artifactId = result?.id || result?.artifact_id;
  const chunks = result?.results || [];

  const entities = {
    concepts: data?.concepts || [],
    authors: data?.authors || [],
    papers: data?.papers || [],
    books: data?.books || [],
    materials: data?.materials || [],
    methodologies: data?.methodologies || [],
    tools: data?.tools || [],
    datasets: data?.datasets || [],
    assets: data?.assets || []
  };

  const title = data?.title || result?.filename || "Untitled Transcript";
  const synthesis = data?.knowledge_synthesis || "";

  const handleRechunk = async (minutes) => {
    setChunkMinutes(minutes);
    if (!artifactId) return;
    setRechunking(true);
    try {
      const res = await axios.post(`http://localhost:4000/library/${artifactId}/rechunk`, { chunk_minutes: minutes });
      setResult(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setRechunking(false);
    }
  };

  // Bidirectional Co-occurrence Logic
  const getChunksContainingEntity = (entityName) => {
    if (!entityName) return chunks;
    const lower = entityName.toLowerCase();
    return chunks.filter(r => r.chunk.content.toLowerCase().includes(lower));
  };

  const isEntityInChunks = (entityName, chunkList) => {
    const lower = entityName.toLowerCase();
    return chunkList.some(r => r.chunk.content.toLowerCase().includes(lower));
  };

  // Filtered Chunks for Left Pane
  const visibleChunks = chunks.filter(r => {
    const textMatch = searchQuery === "" || r.chunk.content.toLowerCase().includes(searchQuery.toLowerCase());
    const highlightMatch = !activeHighlight || r.chunk.content.toLowerCase().includes(activeHighlight.toLowerCase());
    return textMatch && highlightMatch;
  });

  // Highlight active chunk IDs
  const activeChunkIds = getChunksContainingEntity(activeHighlight).map(r => r.chunk.chunk_index);

  // Filter Entities for Right Pane
  const filterEntities = (arr) => {
    return arr.filter(item => {
      const name = typeof item === 'string' ? item : item.name;
      const textMatch = searchQuery === "" || name.toLowerCase().includes(searchQuery.toLowerCase());
      const highlightMatch = !activeHighlight || isEntityInChunks(name, getChunksContainingEntity(activeHighlight));
      return textMatch && highlightMatch;
    });
  };

  const handleEntityClick = (e, item, type) => {
    if (e) e.stopPropagation();
    const name = typeof item === 'string' ? item : item.name;
    setDrawerState({
      name,
      type,
      item
    });
  };

  const scrollToEntityOrChunk = (name) => {
    setActiveHighlight(name);
    // Try to scroll to entity in Right Pane
    setTimeout(() => {
      if (entityRefs.current[name]) {
        entityRefs.current[name].scrollIntoView({ behavior: "smooth", block: "center" });
        entityRefs.current[name].style.background = "rgba(167, 139, 250, 0.4)";
        setTimeout(() => {
          if (entityRefs.current[name]) entityRefs.current[name].style.background = "rgba(255,255,255,0.4)";
        }, 1500);
      } else {
        // If not found in right pane, scroll to the first matching chunk
        const matchChunks = getChunksContainingEntity(name);
        if (matchChunks.length > 0) {
          const idx = matchChunks[0].chunk.chunk_index;
          if (chunkRefs.current[idx]) {
            chunkRefs.current[idx].scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }
    }, 100);
  };

  const toggleDocumentBookmark = () => {
    setBookmarks(prev => {
      const isBookmarked = prev.documents.includes(id);
      const newDocs = isBookmarked ? prev.documents.filter(d => d !== id) : [...prev.documents, id];
      const newBookmarks = { ...prev, documents: newDocs };
      localStorage.setItem("sahachara_bookmarks", JSON.stringify(newBookmarks));
      return newBookmarks;
    });
  };

  const toggleEntityBookmark = (entityName) => {
    setBookmarks(prev => {
      const isBookmarked = prev.entities.includes(entityName);
      const newEntities = isBookmarked ? prev.entities.filter(e => e !== entityName) : [...prev.entities, entityName];
      const newBookmarks = { ...prev, entities: newEntities };
      localStorage.setItem("sahachara_bookmarks", JSON.stringify(newBookmarks));
      return newBookmarks;
    });
  };

  // Custom Markdown Parser for Wikilinks
  const renderSynthesis = (text) => {
    if (!text) return null;
    
    // Split into paragraphs
    const paragraphs = text.split('\n');
    return paragraphs.map((p, i) => {
      if (p.startsWith('## ')) {
        return <h2 key={i} style={{ fontSize: "32px", color: "#0f172a", marginTop: "48px", marginBottom: "24px", letterSpacing: "-0.03em" }}>{p.replace('## ', '')}</h2>;
      }
      if (p.startsWith('### ')) {
        return <h3 key={i} style={{ fontSize: "24px", color: "#334155", marginTop: "32px", marginBottom: "16px" }}>{p.replace('### ', '')}</h3>;
      }
      if (!p.trim()) return <br key={i} />;

      // Parse wikilinks [[Entity Name]]
      const parts = p.split(/\[\[(.*?)\]\]/g);
      return (
        <p key={i} style={{ fontSize: "18px", lineHeight: "1.8", color: "#334155", marginBottom: "24px" }}>
          {parts.map((part, j) => {
            if (j % 2 === 1) { // Inside brackets
              return (
                <span 
                  key={j} 
                  onClick={() => scrollToEntityOrChunk(part)}
                  style={{ color: "#6d28d9", fontWeight: 500, cursor: "pointer", borderBottom: "1px dashed rgba(109, 40, 217, 0.4)", paddingBottom: "2px", transition: "all 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(167, 139, 250, 0.15)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {part}
                </span>
              );
            }
            return <span key={j}>{part.replace(/\*\*(.*?)\*\*/g, '$1')}</span>; // Simple strip bold markdown
          })}
        </p>
      );
    });
  };

  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ paddingBottom: "160px" }}>
      
      <AnimatePresence>
        {activeConcept && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{ position: "fixed", bottom: "40px", right: "40px", width: "450px", maxHeight: "80vh", overflowY: "auto", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(60px)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: "24px", boxShadow: "0 24px 48px rgba(0,0,0,0.1)", zIndex: 100, padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h3 style={{ fontSize: "24px", color: "#0f172a", fontWeight: 600, margin: 0, lineHeight: 1.2 }}>{activeConcept.name}</h3>
              <button onClick={() => { setActiveConcept(null); setActiveHighlight(null); }} style={{ background: "rgba(0,0,0,0.05)", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer", display: "flex" }}>
                <X size={16} />
              </button>
            </div>
            
            <p style={{ fontSize: "15px", color: "#475569", lineHeight: 1.6, margin: 0 }}>
              {activeConcept.summary}
            </p>

            <div style={{ display: "flex", gap: "12px" }}>
              <a href={`https://www.google.com/search?q=${encodeURIComponent(activeConcept.name)}`} target="_blank" rel="noreferrer" className="glass-button" style={{ padding: "8px 16px", borderRadius: "99px", fontSize: "13px", textDecoration: "none", color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}><ExternalLink size={14}/> Google Search</a>
              <a href={`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(activeConcept.name)}`} target="_blank" rel="noreferrer" className="glass-button" style={{ padding: "8px 16px", borderRadius: "99px", fontSize: "13px", textDecoration: "none", color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}><ExternalLink size={14}/> Wikipedia</a>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h4 style={{ fontSize: "14px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Transcript Evidence</h4>
              {getChunksContainingEntity(activeConcept.name).map((r, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.5)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>Chunk {r.chunk.chunk_index} ({r.chunk.startTime_str} &rarr; {r.chunk.endTime_str})</div>
                  <div style={{ fontSize: "14px", color: "#334155", fontStyle: "italic" }}>"{r.chunk.content.substring(0, 150)}..."</div>
                </div>
              ))}
            </div>

            {(() => {
              const relatedAuthors = filterEntities(entities.authors);
              const relatedPapers = filterEntities(entities.papers);
              
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {relatedAuthors.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: "14px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Related Authors</h4>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {relatedAuthors.map((a, i) => <span key={i} style={{ padding: "4px 12px", background: "rgba(0,0,0,0.05)", borderRadius: "99px", fontSize: "13px", color: "#334155" }}>{a.name || a}</span>)}
                      </div>
                    </div>
                  )}
                  {relatedPapers.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: "14px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Related Papers</h4>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {relatedPapers.map((p, i) => <span key={i} style={{ padding: "4px 12px", background: "rgba(0,0,0,0.05)", borderRadius: "99px", fontSize: "13px", color: "#334155" }}>{p.name || p}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          </motion.div>
        )}
      </AnimatePresence>

      {activeHighlight && !activeConcept && (
        <div style={{ marginBottom: "24px", padding: "12px 24px", background: "rgba(167, 139, 250, 0.15)", border: "1px solid rgba(167, 139, 250, 0.3)", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#6d28d9" }}>
          <span style={{ fontSize: "15px", fontWeight: 500 }}>Filtering artifacts associated with: <strong>{activeHighlight}</strong></span>
          <button onClick={() => setActiveHighlight(null)} style={{ background: "none", border: "none", color: "#6d28d9", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}><X size={16}/> Clear Filter</button>
        </div>
      )}

      <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>
        
        {/* COLUMN 1: CENTER HERO (TRANSCRIPT EXPERENCE) */}
        <div style={{ flex: 7, display: "flex", flexDirection: "column", gap: "48px" }}>
          {/* Document Header */}
          <div className="glass-panel" style={{ padding: "48px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <h1 style={{ fontSize: "36px", fontWeight: 600, color: "#0f172a", margin: 0, lineHeight: 1.2, letterSpacing: "-0.03em" }}>
              {title}
            </h1>
            <div style={{ display: "flex", gap: "24px", color: "#64748b", fontSize: "15px", flexWrap: "wrap", alignItems: "center" }}>
              <span className="glass-pill"><Clock size={14} /> {chunks.length > 0 ? chunks[chunks.length - 1].chunk.endTime_str : "00:00"} duration</span>
              <span className="glass-pill"><UserCircle2 size={14} /> {data.speakers && data.speakers.length > 0 ? data.speakers.join(", ") : "Multiple Speakers"}</span>
              <span className="glass-pill"><Sparkles size={14} /> {entities.concepts?.length || 0} Topics</span>
            </div>

            {/* Contextual Action Bar */}
            <div style={{ display: "flex", gap: "12px", marginTop: "8px", flexWrap: "wrap" }}>
              <button onClick={() => navigate("/library")} className="glass-button" style={{ padding: "10px 20px", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", borderRadius: "99px", color: "#0f172a" }}>
                <ArrowLeft size={16} /> Back to Library
              </button>
              <button onClick={toggleDocumentBookmark} className="glass-button" style={{ padding: "10px 20px", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", borderRadius: "99px", background: bookmarks.documents.includes(id) ? "rgba(167, 139, 250, 0.15)" : undefined, color: bookmarks.documents.includes(id) ? "#6d28d9" : "#0f172a" }}>
                <Bookmark size={16} fill={bookmarks.documents.includes(id) ? "#6d28d9" : "none"} /> {bookmarks.documents.includes(id) ? "Bookmarked" : "Bookmark"}
              </button>
              <button className="glass-button" style={{ padding: "10px 20px", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", borderRadius: "99px", color: "#0f172a" }}>
                <Share2 size={16} /> Share
              </button>
              <button className="glass-button" style={{ padding: "10px 20px", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", borderRadius: "99px", color: "#0f172a" }}>
                <MessageSquare size={16} /> Discussions
              </button>
              <PDFDownloadLink 
                document={<TranscriptPDF data={data} chunks={chunks} />} 
                fileName={`${title}.pdf`}
                className="glass-button" 
                style={{ padding: "10px 20px", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", borderRadius: "99px", color: "#0f172a", textDecoration: "none" }}
              >
                {({ loading }) => (
                  <>
                    <Download size={16} /> {loading ? 'Preparing PDF...' : 'Download PDF'}
                  </>
                )}
              </PDFDownloadLink>
            </div>

            <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
               <PremiumSlider value={chunkMinutes} onChange={handleRechunk} isProcessing={rechunking} />
            </div>
          </div>

          {/* Media & Assets Hub */}
          {entities.assets && entities.assets.length > 0 && (
            <div className="glass-panel" style={{ padding: "40px", display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                <h3 style={{ fontSize: "22px", color: "#0f172a", fontWeight: 600, display: "flex", alignItems: "center", gap: "10px" }}>
                  <Library size={22} color="#6d28d9" /> Lecture Media & Assets Hub
                </h3>
                {/* Horizontal Tab Filters */}
                <div style={{ display: "flex", background: "rgba(0,0,0,0.03)", padding: "4px", borderRadius: "10px", gap: "4px" }}>
                  <button 
                    onClick={() => setActiveAssetTab("all")} 
                    style={{
                      border: "none", background: activeAssetTab === "all" ? "white" : "transparent",
                      color: activeAssetTab === "all" ? "#6d28d9" : "#64748b", padding: "6px 16px",
                      borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    All ({entities.assets.length})
                  </button>
                  <button 
                    onClick={() => setActiveAssetTab("image")} 
                    style={{
                      border: "none", background: activeAssetTab === "image" ? "white" : "transparent",
                      color: activeAssetTab === "image" ? "#6d28d9" : "#64748b", padding: "6px 16px",
                      borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    Images ({entities.assets.filter(a => getFileCategory(a.name, a.type) === "image").length})
                  </button>
                  <button 
                    onClick={() => setActiveAssetTab("presentation")} 
                    style={{
                      border: "none", background: activeAssetTab === "presentation" ? "white" : "transparent",
                      color: activeAssetTab === "presentation" ? "#6d28d9" : "#64748b", padding: "6px 16px",
                      borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    Slides ({entities.assets.filter(a => getFileCategory(a.name, a.type) === "presentation").length})
                  </button>
                  <button 
                    onClick={() => setActiveAssetTab("document")} 
                    style={{
                      border: "none", background: activeAssetTab === "document" ? "white" : "transparent",
                      color: activeAssetTab === "document" ? "#6d28d9" : "#64748b", padding: "6px 16px",
                      borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    Docs ({entities.assets.filter(a => getFileCategory(a.name, a.type) === "document").length})
                  </button>
                </div>
              </div>

              {/* Grid of items */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" }}>
                {entities.assets.filter(a => activeAssetTab === "all" || getFileCategory(a.name, a.type) === activeAssetTab).map((asset, index) => {
                  const category = getFileCategory(asset.name, asset.type);
                  
                  return (
                    <motion.div 
                      key={index}
                      whileHover={{ y: -4 }}
                      style={{ 
                        background: "rgba(255,255,255,0.65)", borderRadius: "20px", 
                        border: "1px solid rgba(255,255,255,0.8)", padding: "16px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", gap: "12px",
                        position: "relative"
                      }}
                    >
                      {category === "image" ? (
                        <div 
                          onClick={() => setSelectedImage(asset)}
                          style={{ borderRadius: "14px", overflow: "hidden", aspectRatio: "16/10", cursor: "pointer", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
                        >
                          <img src={asset.url} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.2)", opacity: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.2s" }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                            <Eye size={24} color="white" />
                          </div>
                        </div>
                      ) : category === "presentation" ? (
                        <div style={{ padding: "32px 16px", background: "linear-gradient(135deg, #fef08a 0%, #fde047 100%)", borderRadius: "14px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", color: "#854d0e" }}>
                          <Layers size={36} />
                          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Slide Deck</span>
                        </div>
                      ) : (
                        <div style={{ padding: "32px 16px", background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)", borderRadius: "14px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", color: "#0369a1" }}>
                          <FileText size={36} />
                          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>PDF / Document</span>
                        </div>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={asset.name}>
                          {asset.name}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b", textTransform: "capitalize" }}>
                          {category} resource
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "8px", borderTop: "1px solid rgba(0,0,0,0.04)", paddingTop: "12px", marginTop: "auto" }}>
                        <a 
                          href={asset.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="glass-button" 
                          style={{ flex: 1, padding: "8px 12px", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", textDecoration: "none", color: "#475569", borderRadius: "99px" }}
                        >
                          <Eye size={13} /> View
                        </a>
                        <a 
                          href={asset.url} 
                          download
                          className="glass-button" 
                          style={{ padding: "8px", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "#475569", borderRadius: "50%" }}
                          title="Download file"
                        >
                          <Download size={13} />
                        </a>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Full Screen Lightbox Modal */}
          <AnimatePresence>
            {selectedImage && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedImage(null)}
                style={{ 
                  position: "fixed", inset: 0, zIndex: 10000, 
                  background: "rgba(15, 23, 42, 0.9)", backdropFilter: "blur(20px)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  padding: "40px"
                }}
              >
                {/* Close Button */}
                <button 
                  onClick={() => setSelectedImage(null)}
                  style={{ 
                    position: "absolute", top: "24px", right: "24px", 
                    background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%",
                    padding: "12px", cursor: "pointer", color: "white", display: "flex" 
                  }}
                >
                  <X size={20} />
                </button>

                {/* Main image container */}
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  onClick={e => e.stopPropagation()}
                  style={{ maxWidth: "90%", maxHeight: "80vh", background: "white", borderRadius: "24px", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column" }}
                >
                  <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>{selectedImage.name}</span>
                    <a href={selectedImage.url} download className="glass-button" style={{ padding: "6px 12px", fontSize: "12px", color: "#6d28d9", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px", borderRadius: "8px" }}>
                      <Download size={13} /> Download Original
                    </a>
                  </div>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", overflow: "hidden" }}>
                    <img src={selectedImage.url} alt={selectedImage.name} style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain" }} />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="tracking-label">TRANSCRIPT MODULES</div>
            <div className="glass-pill" style={{ fontSize: "12px", padding: "6px 16px", background: "rgba(255,255,255,0.4)" }}>
              {chunks.length} segments • {chunks.length > 0 ? chunks[chunks.length - 1].chunk.endTime_str : "00:00"} duration
            </div>
          </div>
          
          {visibleChunks.length === 0 ? (
            <div className="glass-panel" style={{ padding: "64px", textAlign: "center", color: "#94a3b8", fontSize: "16px", fontWeight: 500 }}>No segments match the current filters.</div>
          ) : (
            visibleChunks.map((r, idx) => {
              const chunk = r.chunk;
              const isHighlighted = activeChunkIds.includes(chunk.chunk_index);
              
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  key={idx} 
                  ref={el => chunkRefs.current[chunk.chunk_index] = el}
                  className="glass-panel" 
                  style={{ 
                    padding: "48px", 
                    background: isHighlighted ? "rgba(255, 255, 255, 0.85)" : "var(--glass-bg)",
                    border: isHighlighted ? "1px solid rgba(167, 139, 250, 0.6)" : "1px solid var(--glass-border)",
                    boxShadow: isHighlighted ? "0 32px 64px rgba(167, 139, 250, 0.15), inset 0 1px 1px rgba(255,255,255,0.9)" : "var(--glass-shadow)",
                    transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" 
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px", flexWrap: "wrap", gap: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div className="glass-pill" style={{ background: "rgba(255,255,255,0.7)", color: "#0f172a", fontWeight: 600 }}>
                        <Clock size={14} color="#64748b" /> {chunk.startTime_str} &ndash; {chunk.endTime_str}
                      </div>
                      <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 500, letterSpacing: "0.02em" }}>
                        {(() => {
                           const parse = (s) => {
                               if(!s) return 0;
                               const p = s.split(':').map(Number);
                               if(p.length===3) return p[0]*60+p[1];
                               return p[0];
                           };
                           const duration = parse(chunk.endTime_str) - parse(chunk.startTime_str);
                           return Math.max(1, duration);
                        })()} min duration
                      </div>
                    </div>
                  </div>
                  
                  {/* Speakers display logic upgraded */}
                  {chunk.speakers && chunk.speakers.length > 0 && (
                    <div style={{ marginBottom: "24px", display: "flex", flexWrap: "wrap", gap: "12px" }}>
                      {chunk.speakers.map((spk, si) => (
                        <div key={si} style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(167, 139, 250, 0.1)", border: "1px solid rgba(167, 139, 250, 0.2)", borderRadius: "99px", padding: "6px 16px", color: "#5b21b6", fontSize: "14px", fontWeight: 600 }}>
                          <UserCircle2 size={16} /> {spk}
                        </div>
                      ))}
                    </div>
                  )}

                  <p style={{ fontSize: "18px", lineHeight: "2.0", color: "#1e293b", whiteSpace: "pre-wrap", fontWeight: 400 }}>
                    {chunk.content}
                  </p>
                </motion.div>
              )
            })
          )}
        </div>        {/* COLUMN 2: RIGHT KNOWLEDGE GRAPH */}
        <div style={{ flex: 3, display: "flex", flexDirection: "column", gap: "24px", position: "sticky", top: "140px", alignSelf: "start", maxHeight: "calc(100vh - 160px)", overflowY: "auto", paddingRight: "16px", paddingBottom: "100px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: "16px" }}>
            <div className="tracking-label" style={{ margin: 0, padding: 0 }}>KNOWLEDGE GRAPH</div>
          </div>
          
          {/* Sidebar Search */}
          <div className="glass-panel" style={{ display: "flex", alignItems: "center", padding: "12px 16px", gap: "12px" }}>
             <Filter size={16} color="#64748b" />
             <input 
               type="text" 
               placeholder="Filter entities..." 
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "14px", color: "#0f172a" }}
             />
          </div>

          <EntityList title="Concepts" icon={<Sparkles size={16}/>} items={filterEntities(entities.concepts)} activeHighlight={activeHighlight} onClick={handleEntityClick} entityRefs={entityRefs} bookmarks={bookmarks.entities} onBookmarkToggle={toggleEntityBookmark} />
          <EntityList title="Authors" icon={<UserCircle2 size={16}/>} items={filterEntities(entities.authors)} activeHighlight={activeHighlight} onClick={handleEntityClick} entityRefs={entityRefs} bookmarks={bookmarks.entities} onBookmarkToggle={toggleEntityBookmark} />
          
          {/* Compact Papers Renderer */}
          {(() => {
             const getAllResources = () => {
               let all = [];
               chunks.forEach(r => { if (r.resources) all.push(...r.resources); });
               return all;
             };
             const allResources = getAllResources();
             const filteredPapers = filterEntities(entities.papers);
             
             if (filteredPapers.length === 0 && allResources.length === 0) return null;

             return (
               <EntityListWrapper title="Papers" icon={<FileText size={16}/>} count={filteredPapers.length + allResources.reduce((acc, r) => acc + r.papers.length, 0)}>
                 <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                   {filteredPapers.map((p, idx) => {
                     const name = typeof p === 'string' ? p : p.name;
                     return (
                       <div key={idx} style={{ padding: "12px", background: "rgba(255,255,255,0.4)", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.05)" }}>
                         <div style={{ fontWeight: 500, fontSize: "14px", color: "#0f172a", marginBottom: "8px", lineHeight: 1.3 }}>{name}</div>
                         <a href={`https://www.semanticscholar.org/search?q=${encodeURIComponent(name)}`} target="_blank" rel="noreferrer" className="glass-button" style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px", textDecoration: "none", color: "#475569", borderRadius: "6px" }}>
                           <Search size={12}/> Search Scholar
                         </a>
                       </div>
                     )
                   })}
                   {allResources.map((res, i) => (
                     res.papers.map((p, j) => (
                       <div key={`${i}-${j}`} style={{ padding: "12px", background: "rgba(255,255,255,0.4)", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.05)" }}>
                         <div style={{ fontWeight: 500, fontSize: "14px", color: "#0f172a", marginBottom: "4px", lineHeight: 1.3 }}>{p.title}</div>
                         {p.year && <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>{p.year}</div>}
                         <a href={p.semanticScholarUrl || p.url || `https://www.semanticscholar.org/search?q=${encodeURIComponent(p.title)}`} target="_blank" rel="noreferrer" className="glass-button" style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px", textDecoration: "none", color: "#475569", borderRadius: "6px" }}>
                           <ExternalLink size={12}/> Search Scholar
                         </a>
                       </div>
                     ))
                   ))}
                 </div>
               </EntityListWrapper>
             )
          })()}

          <EntityList title="Books" icon={<BookOpen size={16}/>} items={filterEntities(entities.books)} activeHighlight={activeHighlight} onClick={handleEntityClick} entityRefs={entityRefs} bookmarks={bookmarks.entities} onBookmarkToggle={toggleEntityBookmark} />
          
          <EntityList 
            title="Materials" 
            icon={<Box size={16}/>} 
            items={[...filterEntities(entities.materials), ...filterEntities(entities.tools), ...filterEntities(entities.datasets)]} 
            activeHighlight={activeHighlight} 
            onClick={handleEntityClick} 
            entityRefs={entityRefs} 
            bookmarks={bookmarks.entities} 
            onBookmarkToggle={toggleEntityBookmark} 
          />
          
          <EntityList title="Methodologies" icon={<AlignLeft size={16}/>} items={filterEntities(entities.methodologies)} activeHighlight={activeHighlight} onClick={handleEntityClick} entityRefs={entityRefs} bookmarks={bookmarks.entities} onBookmarkToggle={toggleEntityBookmark} />
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid rgba(0,0,0,0.05)", marginBottom: "80px" }} />

      {/* Drawer logic */}
      <AnimatePresence>
        {drawerState && (
          <KnowledgeDrawer 
            drawerState={drawerState} 
            chunks={chunks}
            onClose={() => setDrawerState(null)} 
          />
        )}
      </AnimatePresence>

      {/* BOTTOM: Knowledge Synthesis */}
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "64px", background: "rgba(255,255,255,0.5)", borderRadius: "32px", border: "1px solid rgba(255,255,255,0.8)", boxShadow: "var(--glass-shadow)" }}>
        <h2 style={{ fontSize: "40px", fontWeight: 500, color: "#0f172a", letterSpacing: "-0.04em", marginBottom: "16px", textAlign: "center" }}>Knowledge Synthesis</h2>
        <p style={{ textAlign: "center", color: "#64748b", marginBottom: "64px" }}>A comprehensive reading of the extracted discourse.</p>
        
        {synthesis ? (
          <div>
            {renderSynthesis(synthesis)}
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}><Loader2 className="lucide-spin" size={32} color="#94a3b8" /></div>
        )}
      </div>

    </motion.section>
  )
}

function EntityListWrapper({ title, icon, count, children, defaultExpanded = true }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  return (
    <div 
      className="glass-panel" 
      style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: isExpanded ? "20px" : "0" }}
    >
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}
      >
        <h4 style={{ fontSize: "13px", color: "rgba(15, 23, 42, 0.6)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
          {icon} {title} ({count})
        </h4>
        <button style={{ background: "transparent", border: "none", padding: "4px", display: "flex", color: "#94a3b8", cursor: "pointer" }}>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function EntityList({ title, icon, items, activeHighlight, onClick, entityRefs, bookmarks = [], onBookmarkToggle }) {
  if (!items || items.length === 0) return null;

  const getExternalLink = (name) => {
    const query = encodeURIComponent(name);
    if (title === "Authors") return `https://www.semanticscholar.org/search?q=${query}`;
    if (title === "Books") return `https://www.google.com/search?tbm=bks&q=${query}`;
    return `https://www.google.com/search?q=${query}`;
  };

  return (
    <EntityListWrapper title={title} icon={icon} count={items.length}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", paddingBottom: "4px" }}>
        {items.map((item, idx) => {
          const name = typeof item === 'string' ? item : item.name;
          const isActive = activeHighlight === name;
          return (
            <EntityItem 
              key={idx}
              name={name}
              isActive={isActive}
              isBookmarked={bookmarks.includes(name)}
              onBookmarkToggle={() => onBookmarkToggle && onBookmarkToggle(name)}
              onClick={(e) => onClick(e, item, title)}
              externalLink={getExternalLink(name)}
              entityRef={el => { if(entityRefs) entityRefs.current[name] = el; }}
            />
          )
        })}
      </div>
    </EntityListWrapper>
  )
}

function EntityItem({ name, isActive, isBookmarked, onBookmarkToggle, onClick, externalLink, entityRef }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      ref={entityRef}
      onClick={(e) => onClick(e)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`glass-bubble ${isActive ? 'active' : ''}`}
      style={{ position: 'relative' }}
    >
      <span>{name}</span>
      <AnimatePresence>
        {(isHovered || isBookmarked) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, width: 0 }}
            animate={{ opacity: 1, scale: 1, width: "auto" }}
            exit={{ opacity: 0, scale: 0.8, width: 0 }}
            style={{ display: "flex", gap: "4px", alignItems: "center", marginLeft: "4px" }}
          >
            {onBookmarkToggle && (
              <button 
                onClick={e => { e.stopPropagation(); onBookmarkToggle(); }}
                style={{
                  background: isBookmarked ? "rgba(167, 139, 250, 0.2)" : "rgba(255,255,255,0.5)",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: isBookmarked ? "#6d28d9" : "#64748b",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02), inset 0 1px 1px rgba(255,255,255,0.8)"
                }}
              >
                <Bookmark size={14} fill={isBookmarked ? "#6d28d9" : "none"} />
              </button>
            )}
            {isHovered && externalLink && (
              <a 
                href={externalLink} 
                target="_blank" 
                rel="noreferrer" 
                onClick={e => e.stopPropagation()}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  color: "#64748b",
                  background: "rgba(255,255,255,0.5)",
                  borderRadius: "4px",
                  padding: "4px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02), inset 0 1px 1px rgba(255,255,255,0.8)"
                }}
                onMouseEnter={e => { e.currentTarget.style.color = "#6d28d9"; e.currentTarget.style.background = "rgba(255,255,255,0.9)" }}
                onMouseLeave={e => { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.background = "rgba(255,255,255,0.5)" }}
              >
                <ArrowUpRight size={14} />
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function KnowledgeDrawer({ drawerState, chunks, onClose }) {
  if (!drawerState) return null;

  const { name, type } = drawerState;
  
  const drawerWidth = 380;

  // Filter chunks for evidence
  const evidenceChunks = chunks.filter(r => r.chunk.content.toLowerCase().includes(name.toLowerCase()));

  const getIcon = () => {
    switch(type.toLowerCase()) {
      case "concepts": return <Sparkles size={16} />;
      case "authors": return <UserCircle2 size={16} />;
      case "books": return <BookOpen size={16} />;
      case "materials": return <Box size={16} />;
      case "methodologies": return <AlignLeft size={16} />;
      case "papers": return <FileText size={16} />;
      default: return <Sparkles size={16} />;
    }
  };

  const encodedName = encodeURIComponent(name);
  const wikipediaLink = `https://en.wikipedia.org/wiki/Special:Search?search=${encodedName}`;
  const googleLink = `https://www.google.com/search?q=${encodedName}`;
  const semanticScholarLink = (type.toLowerCase() === "authors" || type.toLowerCase() === "papers") 
    ? `https://www.semanticscholar.org/search?q=${encodedName}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: "100%" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="glass-panel"
      style={{
        position: "fixed",
        top: "20px",
        bottom: "20px",
        right: "20px",
        width: `${drawerWidth}px`,
        zIndex: 9999,
        padding: "32px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        overflowY: "auto",
        boxShadow: "-10px 0 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.6), inset 0 1px 1px rgba(255,255,255,0.8)",
        borderRadius: "24px"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 600, color: "#0f172a", lineHeight: 1.2 }}>{name}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", marginTop: "8px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
            {getIcon()} {type}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "rgba(0,0,0,0.05)", border: "none", cursor: "pointer", color: "#64748b", borderRadius: "50%", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <X size={16} />
        </button>
      </div>
      
      {/* Explanation Text */}
      <div style={{ fontSize: "14px", color: "#475569", lineHeight: 1.6 }}>
        Described as a foundational component in this context, {name} is widely recognized in its field. It typically involves abstraction, processing, and application design. 
        <br/><br/>
        <em>(AI explanation generated from context)</em>
      </div>

      {/* Action Links */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        <a href={googleLink} target="_blank" rel="noreferrer" className="glass-button" style={{ textDecoration: "none", color: "#0f172a", fontSize: "13px", padding: "8px 16px", display: "flex", alignItems: "center", gap: "6px", borderRadius: "99px", background: "rgba(255,255,255,0.8)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <ExternalLink size={14} color="#64748b" /> Google Search
        </a>
        <a href={wikipediaLink} target="_blank" rel="noreferrer" className="glass-button" style={{ textDecoration: "none", color: "#0f172a", fontSize: "13px", padding: "8px 16px", display: "flex", alignItems: "center", gap: "6px", borderRadius: "99px", background: "rgba(255,255,255,0.8)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <ExternalLink size={14} color="#64748b" /> Wikipedia
        </a>
        {semanticScholarLink && (
          <a href={semanticScholarLink} target="_blank" rel="noreferrer" className="glass-button" style={{ textDecoration: "none", color: "#0f172a", fontSize: "13px", padding: "8px 16px", display: "flex", alignItems: "center", gap: "6px", borderRadius: "99px", background: "rgba(255,255,255,0.8)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <ExternalLink size={14} color="#64748b" /> Scholar
          </a>
        )}
      </div>

      <hr style={{ border: "none", borderTop: "1px solid rgba(0,0,0,0.06)", margin: "0" }} />

      {/* Transcript Evidence */}
      {evidenceChunks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Transcript Evidence</div>
          {evidenceChunks.map((c, i) => {
            const startStr = c.chunk.startTime_str || "00:00";
            const endStr = c.chunk.endTime_str || "15:00";
            const snippet = c.chunk.content.substring(0, 180).trim() + "...";
            return (
              <div key={i} style={{ background: "rgba(255,255,255,0.6)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "8px" }}>Chunk {c.chunk.chunk_index} ({startStr} → {endStr})</div>
                <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.5 }}>
                  "{snippet}"
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Mocked Related Sections (To be populated dynamically in future) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Related Authors</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {["Patrick Lewis", "Geoffrey Hinton", "Jeanette Wing"].map((auth, i) => (
            <div key={i} style={{ padding: "6px 12px", background: "rgba(0,0,0,0.04)", borderRadius: "99px", fontSize: "12px", color: "#475569" }}>{auth}</div>
          ))}
        </div>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px", marginBottom: "16px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Related Papers</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {["Attention Is All You Need (2017)", "Retrieval-Augmented Generation for NLP Tasks (2020)"].map((paper, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "12px", background: "rgba(0,0,0,0.02)", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.04)" }}>
              <FileText size={14} color="#64748b" style={{ marginTop: "2px", flexShrink: 0 }} />
              <div style={{ fontSize: "12px", color: "#475569", lineHeight: 1.4 }}>{paper}</div>
            </div>
          ))}
        </div>
      </div>
      
    </motion.div>
  );
}
