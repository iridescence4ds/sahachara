import { Routes, Route, Link, NavLink } from "react-router-dom"
import { motion } from "framer-motion"
import { Feather, Library, Users, Search, Settings } from "lucide-react"
import { useAuth } from "./contexts/AuthContext"
import Home from "./pages/Home"
import LibraryPage from "./pages/Library"
import ResourceExplorer from "./pages/ResourceExplorer"
import AdminDashboard from "./pages/AdminDashboard"
import TopicHub from "./pages/TopicHub"
import TopicsList from "./pages/TopicsList"
import SearchPage from "./pages/Search"
import ResourceWorkspace from "./pages/ResourceWorkspace"

function MockLoginSelector() {
    const { user, login, logout } = useAuth()
    
    if (user) {
        return (
            <div style={{ display: "flex", gap: "16px", alignItems: "center", fontSize: "14px", color: "#64748b" }}>
                <span>Logged in as <b>{user.role}</b></span>
                <span onClick={logout} style={{ cursor: "pointer", textDecoration: "underline" }}>Logout</span>
            </div>
        )
    }
    
    return (
        <div style={{ display: "flex", gap: "12px", fontSize: "13px" }}>
            <button onClick={() => login("admin")} className="liquid-glass-pill" style={{ padding: "6px 12px", cursor: "pointer" }}>Admin Login</button>
            <button onClick={() => login("student")} className="liquid-glass-pill" style={{ padding: "6px 12px", cursor: "pointer" }}>Student Login</button>
        </div>
    )
}

export default function App() {
  const { user } = useAuth()

  return (
    <>
      {/* Clean Background System (No excessive blurs) */}
      <div style={{ position: "fixed", inset: 0, zIndex: -2, background: "var(--bg-primary)" }} />

      <div style={{ position: "fixed", top: "16px", left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 100, pointerEvents: "none" }}>
        {/*
          ORIGINAL NAVBAR BACKUP (To reverse easily if requested):
          <nav 
            style={{
              pointerEvents: "auto",
              display: "flex", alignItems: "center", padding: "10px 24px",
              justifyContent: "space-between", gap: "48px",
              background: "var(--glass-bg)",
              backdropFilter: "blur(60px)",
              WebkitBackdropFilter: "blur(60px)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--glass-shadow), inset 0 1px 1px rgba(255,255,255,0.8)",
              borderRadius: "999px"
            }}
          >
            <Link to="/" style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", textDecoration: "none" }}>
              <div style={{ background: "var(--accent)", padding: "6px", borderRadius: "10px", display: "flex" }}>
                <Feather color="white" size={16} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.02em", color: "#0f172a" }}>Sahachara</span>
            </Link>
            <div style={{ display: "flex", gap: "12px", fontSize: "14px", fontWeight: 500, color: "#475569", alignItems: "center" }}>
              <Link to="/library" className="glass-pill" style={{ textDecoration: "none" }}><Library size={14} /> Library</Link>
              <Link to="/topics" className="glass-pill" style={{ textDecoration: "none" }}><Users size={14} /> Topics</Link>
              <Link to="/search" className="glass-pill" style={{ textDecoration: "none" }}><Search size={14} /> Search</Link>
              {user?.role === "ADMIN" && (
                <Link to="/admin" className="glass-pill" style={{ textDecoration: "none", color: "var(--accent)" }}><Settings size={14} /> Admin</Link>
              )}
              <div style={{ width: "1px", height: "20px", background: "rgba(0,0,0,0.1)", margin: "0 8px" }} />
              <MockLoginSelector />
            </div>
          </nav>
        */}

        <nav className="liquid-glass-nav">
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", textDecoration: "none" }}>
            <div style={{ background: "rgba(167, 139, 250, 0.08)", padding: "6px", borderRadius: "10px", display: "flex", border: "1px solid rgba(255, 255, 255, 0.15)", boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.2)" }}>
              <Feather color="#6d28d9" size={16} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.02em", color: "#0f172a" }}>
              Sahachara
            </span>
          </Link>
          <div style={{ display: "flex", gap: "12px", fontSize: "14px", fontWeight: 500, color: "#475569", alignItems: "center" }}>
            <NavLink to="/library" className={({ isActive }) => `liquid-glass-pill ${isActive ? "active" : ""}`} style={{ textDecoration: "none" }}>
              <Library size={14} /> Library
            </NavLink>
            <NavLink to="/topics" className={({ isActive }) => `liquid-glass-pill ${isActive ? "active" : ""}`} style={{ textDecoration: "none" }}>
              <Users size={14} /> Topics
            </NavLink>
            <NavLink to="/search" className={({ isActive }) => `liquid-glass-pill ${isActive ? "active" : ""}`} style={{ textDecoration: "none" }}>
              <Search size={14} /> Search
            </NavLink>
            {user?.role === "ADMIN" && (
              <NavLink to="/admin" className={({ isActive }) => `liquid-glass-pill ${isActive ? "active" : ""}`} style={{ textDecoration: "none" }}>
                <Settings size={14} /> Admin
              </NavLink>
            )}
            <div style={{ width: "1px", height: "20px", background: "rgba(255, 255, 255, 0.25)", margin: "0 8px" }} />
            <MockLoginSelector />
          </div>
        </nav>
      </div>

      <main style={{ paddingTop: "100px", width: "100%", maxWidth: "1600px", margin: "0 auto", paddingLeft: "32px", paddingRight: "32px", position: "relative", boxSizing: "border-box" }}>
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/topics" element={<TopicsList />} />
            <Route path="/topics/:id" element={<TopicHub />} />
            <Route path="/resources/:id" element={<ResourceExplorer />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/workspace/:id" element={<ResourceWorkspace />} />
            <Route path="/search" element={<SearchPage />} />
        </Routes>
      </main>
    </>
  )
}