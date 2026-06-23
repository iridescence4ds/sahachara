import { useState, useEffect } from "react"
import axios from "axios"
import { motion } from "framer-motion"
import { Loader2, Calendar } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function Library() {
  const [groupedArtifacts, setGroupedArtifacts] = useState({})
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchLibrary() {
      try {
        const res = await axios.get("http://localhost:4000/library")
        const grouped = {}
        res.data.forEach(art => {
            const dt = new Date(art.date)
            const year = dt.getFullYear()
            const month = dt.toLocaleString('default', { month: 'long' })
            const day = dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
            
            if (!grouped[year]) grouped[year] = {}
            if (!grouped[year][month]) grouped[year][month] = {}
            if (!grouped[year][month][day]) grouped[year][month][day] = []
            
            grouped[year][month][day].push(art)
        })
        setGroupedArtifacts(grouped)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchLibrary()
  }, [])

  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ paddingTop: "80px", paddingBottom: "160px" }}>
      <div style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "48px", fontWeight: 500, letterSpacing: "-0.04em", marginBottom: "12px", color: "#0f172a" }}>Knowledge Library</h2>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "100px" }}><Loader2 className="lucide-spin" size={32} color="#94a3b8" /></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "64px" }}>
            {Object.keys(groupedArtifacts).sort((a,b)=>b-a).map(year => (
                <div key={year}>
                    <h3 style={{ fontSize: "36px", color: "#94a3b8", marginBottom: "32px", borderBottom: "1px solid rgba(0,0,0,0.05)", paddingBottom: "16px" }}>{year}</h3>
                    {Object.keys(groupedArtifacts[year]).map(month => (
                        <div key={month} style={{ marginBottom: "48px", marginLeft: "16px" }}>
                            <h4 style={{ fontSize: "24px", color: "#64748b", marginBottom: "24px" }}>{month}</h4>
                            {Object.keys(groupedArtifacts[year][month]).map(day => (
                                <div key={day} style={{ marginBottom: "32px", marginLeft: "16px" }}>
                                    <div style={{ fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: "16px" }}>{day}</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
                                        {groupedArtifacts[year][month][day].map(art => (
                                            <div key={art.id} className="glass-panel" onClick={() => navigate(`/resources/${art.id}`)} style={{ padding: "24px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "12px" }}>
                                                <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" }}>
                                                    <Calendar size={12} /> {art.type || 'Resource'}
                                                </div>
                                                <h3 style={{ fontSize: "18px", margin: 0, color: "#0f172a", lineHeight: "1.3" }}>{art.title || art.filename}</h3>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            ))}
        </div>
      )}
    </motion.section>
  )
}
