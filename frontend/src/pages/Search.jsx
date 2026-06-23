import { useState, useEffect } from "react"
import axios from "axios"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { Search as SearchIcon, Loader2, Users, FileText, MessageSquare } from "lucide-react"

export default function SearchPage() {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState(null)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query.length > 2) {
                setLoading(true)
                axios.get(`http://localhost:4000/search?q=${encodeURIComponent(query)}`)
                    .then(res => setResults(res.data))
                    .catch(console.error)
                    .finally(() => setLoading(false))
            } else {
                setResults(null)
            }
        }, 500)
        return () => clearTimeout(timeoutId)
    }, [query])

    return (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ paddingTop: "80px", paddingBottom: "160px" }}>
            <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center", marginBottom: "64px" }}>
                <h2 style={{ fontSize: "48px", fontWeight: 500, letterSpacing: "-0.04em", marginBottom: "32px", color: "#0f172a" }}>Unified Search</h2>
                <div style={{ position: "relative", width: "100%" }}>
                    <SearchIcon size={24} color="#94a3b8" style={{ position: "absolute", left: "24px", top: "50%", transform: "translateY(-50%)" }} />
                    <input 
                        type="text" 
                        value={query} onChange={e => setQuery(e.target.value)}
                        placeholder="Search topics, resources, discussions..."
                        style={{
                            width: "100%", padding: "24px 24px 24px 64px", fontSize: "20px",
                            borderRadius: "24px", border: "1px solid rgba(0,0,0,0.1)", background: "rgba(255,255,255,0.7)",
                            boxShadow: "0 20px 40px rgba(0,0,0,0.05)", outline: "none", boxSizing: "border-box"
                        }}
                    />
                    {loading && <Loader2 size={24} color="#94a3b8" className="lucide-spin" style={{ position: "absolute", right: "24px", top: "50%", transform: "translateY(-50%)" }} />}
                </div>
            </div>

            {results && (
                <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "48px" }}>
                    
                    {results.topics?.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: "16px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: "16px" }}>Topics</h3>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                                {results.topics.map(t => (
                                    <div key={t.id} onClick={() => navigate(`/topics/${t.id}`)} className="glass-panel" style={{ padding: "20px", cursor: "pointer", display: "flex", alignItems: "center", gap: "16px" }}>
                                        <div style={{ padding: "12px", background: "rgba(15,23,42,0.05)", borderRadius: "12px", color: "#0f172a" }}><Users size={20} /></div>
                                        <div style={{ fontSize: "16px", fontWeight: 500, color: "#0f172a" }}>{t.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {results.resources?.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: "16px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: "16px" }}>Resources</h3>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                                {results.resources.map(r => (
                                    <div key={r.id} onClick={() => navigate(`/resources/${r.id}`)} className="glass-panel" style={{ padding: "20px", cursor: "pointer", display: "flex", alignItems: "center", gap: "16px" }}>
                                        <div style={{ padding: "12px", background: "rgba(15,23,42,0.05)", borderRadius: "12px", color: "#0f172a" }}><FileText size={20} /></div>
                                        <div>
                                            <div style={{ fontSize: "16px", fontWeight: 500, color: "#0f172a", marginBottom: "4px" }}>{r.title || "Untitled"}</div>
                                            <div style={{ fontSize: "13px", color: "#64748b" }}>{r.type}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {results.comments?.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: "16px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: "16px" }}>Discussions</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                {results.comments.map(c => (
                                    <div key={c.id} onClick={() => c.topic_id && navigate(`/topics/${c.topic_id}`)} className="glass-panel" style={{ padding: "20px", cursor: "pointer", display: "flex", alignItems: "center", gap: "16px" }}>
                                        <div style={{ padding: "12px", background: "rgba(15,23,42,0.05)", borderRadius: "12px", color: "#0f172a" }}><MessageSquare size={20} /></div>
                                        <div style={{ fontSize: "15px", color: "#334155", lineHeight: "1.5" }}>"{c.content}"</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {results.topics.length === 0 && results.resources.length === 0 && results.comments.length === 0 && (
                        <div style={{ textAlign: "center", padding: "48px", color: "#94a3b8" }}>No results found for "{query}"</div>
                    )}

                </div>
            )}
        </motion.section>
    )
}
