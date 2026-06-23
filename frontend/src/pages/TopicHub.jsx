import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, MessageSquare, BookOpen, FileText, CornerDownRight, ThumbsUp, ChevronLeft } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"

export default function TopicHub() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [topic, setTopic] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("discussion")

    const fetchTopic = useCallback(() => {
        axios.get(`http://localhost:4000/topics/${id}`)
            .then(res => setTopic(res.data))
            .catch(e => { console.error(e); navigate("/topics") })
            .finally(() => setLoading(false))
    }, [id, navigate])

    useEffect(() => {
        fetchTopic()
    }, [fetchTopic])

    if (loading || !topic) {
        return <div style={{ display: "flex", justifyContent: "center", padding: "100px" }}><Loader2 className="lucide-spin" size={32} color="#94a3b8" /></div>
    }

    const comments = topic.discussion?.comments || []

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ paddingBottom: "160px" }}>
            <Link to="/topics" style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#64748b", textDecoration: "none", marginBottom: "32px", fontSize: "14px" }}>
                <ChevronLeft size={16} /> Back to Topics
            </Link>

            <div style={{ marginBottom: "48px" }}>
                <h1 style={{ fontSize: "56px", fontWeight: 500, letterSpacing: "-0.04em", color: "#0f172a", marginBottom: "16px" }}>{topic.name}</h1>
                <p style={{ fontSize: "20px", color: "#64748b", maxWidth: "800px", lineHeight: "1.6" }}>{topic.description || "A dedicated hub for exploring and discussing this topic."}</p>
            </div>

            <div style={{ display: "flex", gap: "12px", marginBottom: "48px", borderBottom: "1px solid rgba(0,0,0,0.05)", paddingBottom: "16px" }}>
                <TabButton id="discussion" label={`Discussion (${comments.length})`} icon={<MessageSquare size={16}/>} activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton id="resources" label={`Resources (${topic.resources?.length || 0})`} icon={<FileText size={16}/>} activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton id="content" label="Content Overview" icon={<BookOpen size={16}/>} activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>

            <AnimatePresence mode="wait">
                {activeTab === "discussion" && <DiscussionTab key="disc" comments={comments} topicId={id} onUpdate={fetchTopic} />}
                {activeTab === "resources" && <ResourcesTab key="res" resources={topic.resources || []} />}
                {activeTab === "content" && (
                    <motion.div key="content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div className="glass-panel" style={{ padding: "48px" }}>
                            <h3 style={{ fontSize: "24px", color: "#0f172a", marginBottom: "24px" }}>Learning Objectives</h3>
                            <p style={{ color: "#475569", lineHeight: "1.6" }}>Understand the fundamentals of {topic.name}. Further structured content will be populated here.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

function TabButton({ id, label, icon, activeTab, setActiveTab }) {
    const isActive = activeTab === id;
    return (
        <button 
            onClick={() => setActiveTab(id)}
            style={{
                background: isActive ? "rgba(15, 23, 42, 0.05)" : "transparent",
                border: "none", padding: "12px 24px", borderRadius: "99px",
                color: isActive ? "#0f172a" : "#64748b",
                fontWeight: isActive ? 500 : 400,
                fontSize: "15px", display: "flex", alignItems: "center", gap: "8px",
                cursor: "pointer", transition: "all 0.2s"
            }}
        >
            {icon} {label}
        </button>
    )
}

function DiscussionTab({ comments, topicId, onUpdate }) {
    const { user } = useAuth()
    const [newComment, setNewComment] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async () => {
        if (!newComment.trim()) return
        setSubmitting(true)
        try {
            await axios.post(`http://localhost:4000/topics/${topicId}/discussion/comments`, { content: newComment })
            setNewComment("")
            onUpdate()
        } catch (e) {
            console.error(e)
            alert("Failed to post comment.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ fontSize: "16px", color: "#0f172a", margin: 0 }}>Start a new discussion</h3>
                {user ? (
                    <>
                        <textarea 
                            value={newComment} onChange={e => setNewComment(e.target.value)}
                            placeholder="Share an insight or ask a question..."
                            style={{ width: "100%", minHeight: "100px", padding: "16px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.1)", background: "rgba(255,255,255,0.5)", fontSize: "15px", resize: "vertical", outline: "none" }}
                        />
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <button onClick={handleSubmit} disabled={submitting} className="glass-button" style={{ padding: "10px 24px", background: "#0f172a", color: "white" }}>
                                {submitting ? <Loader2 size={16} className="lucide-spin" /> : "Post Discussion"}
                            </button>
                        </div>
                    </>
                ) : (
                    <div style={{ padding: "24px", background: "rgba(0,0,0,0.02)", borderRadius: "12px", textAlign: "center", color: "#64748b" }}>
                        Please log in to participate in the discussion.
                    </div>
                )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {comments.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px", color: "#94a3b8" }}>No discussions yet. Be the first to start one!</div>
                ) : (
                    comments.map(c => <CommentThread key={c.id} comment={c} topicId={topicId} onUpdate={onUpdate} />)
                )}
            </div>
        </motion.div>
    )
}

function CommentThread({ comment, topicId, onUpdate }) {
    const { user } = useAuth()
    const [replyText, setReplyText] = useState("")
    const [isReplying, setIsReplying] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const handleReply = async () => {
        if (!replyText.trim()) return
        setSubmitting(true)
        try {
            await axios.post(`http://localhost:4000/topics/${topicId}/discussion/comments`, { content: replyText, parent_id: comment.id })
            setReplyText("")
            setIsReplying(false)
            onUpdate()
        } catch (e) {
            console.error(e)
            alert("Failed to post reply.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="glass-panel" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "#0f172a" }}>{comment.user}</div>
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>{new Date(comment.created_at).toLocaleString()}</div>
            </div>
            <p style={{ fontSize: "15px", color: "#334155", lineHeight: "1.6", margin: "0 0 16px 0", whiteSpace: "pre-wrap" }}>{comment.content}</p>
            
            <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                <button style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                    <ThumbsUp size={14} /> {comment.upvotes || 0}
                </button>
                {user && (
                    <button onClick={() => setIsReplying(!isReplying)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "13px" }}>
                        Reply
                    </button>
                )}
            </div>

            <AnimatePresence>
                {isReplying && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden", marginBottom: "16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingLeft: "16px", borderLeft: "2px solid rgba(0,0,0,0.05)" }}>
                            <textarea 
                                value={replyText} onChange={e => setReplyText(e.target.value)}
                                placeholder="Write a reply..."
                                style={{ width: "100%", minHeight: "60px", padding: "12px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.1)", background: "rgba(255,255,255,0.5)", fontSize: "14px", resize: "vertical", outline: "none" }}
                            />
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                <button onClick={() => setIsReplying(false)} className="glass-button" style={{ padding: "6px 16px", fontSize: "13px" }}>Cancel</button>
                                <button onClick={handleReply} disabled={submitting} className="glass-button" style={{ padding: "6px 16px", fontSize: "13px", background: "#0f172a", color: "white" }}>
                                    {submitting ? <Loader2 size={14} className="lucide-spin" /> : "Reply"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {comment.replies && comment.replies.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingLeft: "16px", borderLeft: "2px solid rgba(0,0,0,0.05)", marginTop: "16px" }}>
                    {comment.replies.map(r => (
                        <div key={r.id}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                <div style={{ fontSize: "13px", fontWeight: 500, color: "#475569", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <CornerDownRight size={12} color="#94a3b8"/> {r.user}
                                </div>
                                <div style={{ fontSize: "11px", color: "#94a3b8" }}>{new Date(r.created_at).toLocaleString()}</div>
                            </div>
                            <p style={{ fontSize: "14px", color: "#475569", lineHeight: "1.5", margin: 0, paddingLeft: "18px" }}>{r.content}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function ResourcesTab({ resources }) {
    const navigate = useNavigate()
    
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {resources.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px", color: "#94a3b8" }}>No resources linked to this topic yet.</div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
                    {resources.map(res => (
                        <div key={res.id} className="glass-panel" onClick={() => navigate(`/resources/${res.id}`)} style={{ padding: "24px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" }}>
                                <FileText size={12} /> {res.type || 'Resource'}
                            </div>
                            <h3 style={{ fontSize: "18px", margin: 0, color: "#0f172a", lineHeight: "1.3" }}>{res.title || res.filename}</h3>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    )
}
