import { useState, useEffect } from "react"
import axios from "axios"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import { Loader2, Users } from "lucide-react"

export default function TopicsList() {
    const [topics, setTopics] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        axios.get("http://localhost:4000/topics")
            .then(res => setTopics(res.data))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    return (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ paddingTop: "80px", paddingBottom: "160px" }}>
            <div style={{ marginBottom: "64px" }}>
                <h2 style={{ fontSize: "48px", fontWeight: 500, letterSpacing: "-0.04em", marginBottom: "12px", color: "#0f172a" }}>Topics Hub</h2>
                <p style={{ fontSize: "20px", color: "#64748b", maxWidth: "600px", lineHeight: "1.6" }}>
                    Explore dedicated spaces for concepts, discussions, and associated resources.
                </p>
            </div>

            {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "100px" }}><Loader2 className="lucide-spin" size={32} color="#94a3b8" /></div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "32px" }}>
                    {topics.map(topic => (
                        <Link key={topic.id} to={`/topics/${topic.id}`} className="glass-panel" style={{ padding: "32px", textDecoration: "none", display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" }}>
                                <Users size={14} /> Knowledge Hub
                            </div>
                            <h3 style={{ fontSize: "24px", margin: 0, color: "#0f172a", lineHeight: "1.3" }}>{topic.name}</h3>
                            <p style={{ fontSize: "15px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>{topic.description || "Join the discussion."}</p>
                        </Link>
                    ))}
                </div>
            )}
        </motion.section>
    )
}
