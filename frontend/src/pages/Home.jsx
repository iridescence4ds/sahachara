import { useState, useEffect } from "react"
import axios from "axios"
import { motion } from "framer-motion"
import { useNavigate, Link } from "react-router-dom"

export default function Home() {
  const navigate = useNavigate()
  
  const [featuredTopics, setFeaturedTopics] = useState([])
  
  useEffect(() => {
    axios.get("http://localhost:4000/topics").then(res => setFeaturedTopics(res.data.slice(0, 4))).catch(console.error)
  }, [])

  return (
    <motion.section 
      initial={{ opacity: 0, filter: "blur(10px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} exit={{ opacity: 0, y: -40, filter: "blur(20px)" }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}
    >
      <h1 style={{ fontSize: "clamp(56px, 7vw, 110px)", lineHeight: "1.0", letterSpacing: "-0.05em", marginBottom: "40px", color: "#0f172a", fontWeight: 500 }}>
        Sahachara
      </h1>
      <p style={{ fontSize: "22px", lineHeight: "1.6", color: "#475569", maxWidth: "600px", marginBottom: "40px", fontWeight: 400 }}>
        Explore the people, papers, and ideas behind every conversation.
      </p>



      <div style={{ width: "100%", maxWidth: "1000px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", textAlign: "left", marginBottom: "80px" }}>
        <div>
            <h2 style={{ fontSize: "24px", fontWeight: 500, color: "#0f172a", marginBottom: "24px" }}>Featured Topics</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {featuredTopics.map(topic => (
                    <Link key={topic.id} to={`/topics/${topic.id}`} className="glass-panel" style={{ padding: "24px", textDecoration: "none", display: "block" }}>
                        <h3 style={{ fontSize: "18px", color: "#0f172a", marginBottom: "8px" }}>{topic.name}</h3>
                        <p style={{ fontSize: "14px", color: "#64748b", margin: 0, opacity: 0.8 }}>{topic.description || "Explore discussions and resources."}</p>
                    </Link>
                ))}
            </div>
        </div>
        <div>
            <h2 style={{ fontSize: "24px", fontWeight: 500, color: "#0f172a", marginBottom: "24px" }}>Trending Discussions</h2>
            <div className="glass-panel" style={{ padding: "32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#64748b", height: "200px" }}>
                <p>Join the conversation in the topics hub.</p>
                <Link to="/topics" className="glass-button" style={{ marginTop: "16px", padding: "8px 24px", textDecoration: "none" }}>View Topics</Link>
            </div>
        </div>
      </div>
    </motion.section>
  )
}
