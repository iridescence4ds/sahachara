import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useDropzone } from "react-dropzone"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import { 
    UploadCloud, Loader2, ArrowRight, Trash2, Plus 
} from "lucide-react"

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  
  return (
    <div style={{ display: "flex", gap: "40px", paddingTop: "40px", paddingBottom: "100px" }}>
      {/* Sidebar */}
      <div style={{ width: "240px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
        <h2 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: "16px", paddingLeft: "16px" }}>Admin Center</h2>
        <TabItem id="overview" label="Overview" icon={<LayoutDashboard size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabItem id="resources" label="Resource Mgmt" icon={<FileText size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabItem id="library" label="Library Mgmt" icon={<Library size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabItem id="topics" label="Topic Mgmt" icon={<Users size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabItem id="discussions" label="Discussions" icon={<MessageSquare size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabItem id="users" label="Users" icon={<Users size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabItem id="settings" label="Settings" icon={<Settings size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1 }}>
        <AnimatePresence mode="wait">
            {activeTab === "overview" && <OverviewTab key="overview" />}
            {activeTab === "resources" && <ResourcesTab key="resources" />}
            {/* Other tabs are placeholders */}
            {["library", "topics", "discussions", "users", "settings"].includes(activeTab) && (
                <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="glass-panel" style={{ padding: "48px", textAlign: "center", color: "#64748b" }}>
                        <Settings size={32} style={{ marginBottom: "16px", opacity: 0.5 }} />
                        <h3 style={{ fontSize: "20px", color: "#0f172a", marginBottom: "8px" }}>{activeTab} Management</h3>
                        <p>This module is under construction.</p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function TabItem({ id, label, icon, activeTab, setActiveTab }) {
    const isActive = activeTab === id;
    return (
        <div 
            onClick={() => setActiveTab(id)}
            style={{
                padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px", 
                borderRadius: "12px", cursor: "pointer", transition: "all 0.2s",
                background: isActive ? "rgba(15, 23, 42, 0.05)" : "transparent",
                color: isActive ? "#0f172a" : "#64748b",
                fontWeight: isActive ? 500 : 400
            }}
        >
            {icon} {label}
        </div>
    )
}

function OverviewTab() {
    const [stats, setStats] = useState(null)

    useEffect(() => {
        axios.get("http://localhost:4000/admin/stats").then(res => setStats(res.data)).catch(console.error)
    }, [])

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <h2 style={{ fontSize: "32px", fontWeight: 500, color: "#0f172a", marginBottom: "32px" }}>Dashboard Overview</h2>
            
            {!stats ? (
                <div style={{ padding: "40px", display: "flex", justifyContent: "center" }}><Loader2 className="lucide-spin" size={24} color="#94a3b8"/></div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px" }}>
                    <StatCard label="Total Resources" value={stats.total_resources} />
                    <StatCard label="Total Topics" value={stats.total_topics} />
                    <StatCard label="Total Discussions" value={stats.total_discussions} />
                    <StatCard label="Total Users" value={stats.total_users} />
                </div>
            )}
        </motion.div>
    )
}

function StatCard({ label, value }) {
    return (
        <div className="glass-panel" style={{ padding: "24px" }}>
            <div style={{ fontSize: "13px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>{label}</div>
            <div style={{ fontSize: "36px", fontWeight: 500, color: "#0f172a" }}>{value}</div>
        </div>
    )
}

function ResourcesTab() {
    const [resources, setResources] = useState([])
    const [loading, setLoading] = useState(true)
    const [isUploading, setIsUploading] = useState(false)
    const [file, setFile] = useState(null)
    const [uploadLoading, setUploadLoading] = useState(false)
    const navigate = useNavigate()

    const fetchResources = useCallback(async () => {
        setLoading(true)
        try {
            const res = await axios.get("http://localhost:4000/admin/resources")
            setResources(res.data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchResources()
    }, [fetchResources])

    const onDrop = useCallback(acceptedFiles => {
        if (acceptedFiles?.length > 0) setFile(acceptedFiles[0])
    }, [])

    const { getRootProps, getInputProps } = useDropzone({
        onDrop, accept: { 'text/plain': ['.txt'], 'text/vtt': ['.vtt'] }, maxFiles: 1
    })

    async function uploadFile() {
        if (!file) return
        const formData = new FormData()
        formData.append("file", file)
        formData.append("chunk_minutes", 15)
        setUploadLoading(true)
        try {
            await axios.post("http://localhost:4000/upload", formData, { timeout: 300000 })
            setIsUploading(false)
            setFile(null)
            fetchResources()
        } catch (err) {
            console.error(err)
            alert("Upload failed. Please ensure backend is running.")
        } finally {
            setUploadLoading(false)
        }
    }

    async function handleDelete(id) {
        if (!confirm("Are you sure you want to delete this resource?")) return;
        try {
            await axios.delete(`http://localhost:4000/admin/resources/${id}`)
            fetchResources()
        } catch (e) {
            console.error(e)
            alert("Delete failed")
        }
    }

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                <h2 style={{ fontSize: "32px", fontWeight: 500, color: "#0f172a", margin: 0 }}>Resource Management</h2>
                <button onClick={() => setIsUploading(!isUploading)} className="glass-button" style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Plus size={16} /> New Resource
                </button>
            </div>

            <AnimatePresence>
                {isUploading && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden", marginBottom: "32px" }}>
                        <div className="glass-panel" style={{ padding: "32px" }}>
                            <h3 style={{ fontSize: "18px", color: "#0f172a", marginBottom: "24px" }}>Upload Resource</h3>
                            <div 
                                {...getRootProps()} 
                                style={{
                                    padding: "48px 40px", cursor: "pointer", borderRadius: "16px",
                                    background: "rgba(255,255,255,0.5)", border: "1px dashed rgba(0,0,0,0.1)",
                                    textAlign: "center", marginBottom: "24px"
                                }}
                            >
                                <input {...getInputProps()} />
                                <div style={{ color: file ? "#1e293b" : "#94a3b8", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                                    {file ? <FileText size={36} /> : <UploadCloud size={36} />}
                                    <span style={{ fontSize: "16px", fontWeight: 500 }}>{file ? file.name : "Drag & drop a file or click to select"}</span>
                                </div>
                            </div>
                            
                            {file && (
                                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                    <button onClick={uploadFile} disabled={uploadLoading} className="glass-button" style={{ padding: "12px 24px", display: "flex", alignItems: "center", gap: "8px", background: "#0f172a", color: "white" }}>
                                        {uploadLoading ? <Loader2 className="lucide-spin" size={16} /> : "Upload"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? (
                <div style={{ padding: "40px", display: "flex", justifyContent: "center" }}><Loader2 className="lucide-spin" size={24} color="#94a3b8"/></div>
            ) : (
                <div className="glass-panel" style={{ overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.5)" }}>
                                <th style={{ padding: "16px 24px", fontSize: "13px", color: "#64748b", fontWeight: 500 }}>Title</th>
                                <th style={{ padding: "16px 24px", fontSize: "13px", color: "#64748b", fontWeight: 500 }}>Type</th>
                                <th style={{ padding: "16px 24px", fontSize: "13px", color: "#64748b", fontWeight: 500 }}>Date</th>
                                <th style={{ padding: "16px 24px", fontSize: "13px", color: "#64748b", fontWeight: 500 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {resources.map(res => (
                                <tr key={res.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                                    <td style={{ padding: "16px 24px", color: "#0f172a", fontWeight: 500 }}>{res.title || res.filename}</td>
                                    <td style={{ padding: "16px 24px", color: "#64748b", fontSize: "14px" }}>{res.type || 'transcript'}</td>
                                    <td style={{ padding: "16px 24px", color: "#64748b", fontSize: "14px" }}>{new Date(res.date).toLocaleDateString()}</td>
                                    <td style={{ padding: "16px 24px", display: "flex", gap: "12px" }}>
                                        <button onClick={() => navigate(`/admin/workspace/${res.id}`)} className="glass-button" style={{ padding: "6px", color: "#64748b" }}><ArrowRight size={16} /></button>
                                        <button onClick={() => handleDelete(res.id)} className="glass-button" style={{ padding: "6px", color: "#ef4444" }}><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </motion.div>
    )
}
