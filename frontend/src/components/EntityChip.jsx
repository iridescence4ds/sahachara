import { useState } from "react"

export default function EntityChip({ item }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <span 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        padding: "8px 20px", 
        background: isHovered ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)", 
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.12)", 
        borderRadius: "99px", 
        fontSize: "14px", 
        color: isHovered ? "#0f172a" : "#475569",
        boxShadow: isHovered ? "0 8px 16px rgba(0,0,0,0.04), 0 0 16px rgba(255,255,255,0.2)" : "none",
        transform: isHovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      }}
    >
      {item}
    </span>
  )
}
