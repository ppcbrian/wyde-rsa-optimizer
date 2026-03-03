import { useState } from "react";
import { useNavigate } from "react-router-dom";

const TOOLS = [
  {
    id: "rsa",
    path: "/rsa",
    label: "RSA Optimizer",
    category: "Search Ads",
    description: "Classify headline and description performance, identify wasted spend, and generate AI-powered replacement copy using the Geddes framework.",
    status: "live",
  },
  {
    id: "audit",
    path: null,
    label: "Account Audit",
    category: "Search Ads",
    description: "Full Google Ads account health check — wasted spend, search term leaks, negative keyword gaps, bid strategy issues, and Quality Score analysis.",
    status: "coming",
  },
  {
    id: "ngram",
    path: null,
    label: "N-Gram Analyzer",
    category: "Search Ads",
    description: "Extract 1–5 gram phrases from search term reports, aggregate performance metrics, and surface high and low performing query patterns.",
    status: "coming",
  },
  {
    id: "scripts",
    path: null,
    label: "Scripts Data",
    category: "Automation",
    description: "View and manage Google Ads script outputs across all client accounts from a single interface.",
    status: "coming",
  },
];

export default function Home() {
  const navigate  = useNavigate();
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", background: "#ffffff", minHeight: "100vh", color: "#0a0a0a" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .tool-card { animation: fadeUp 0.4s ease both; }
      `}</style>

      {/* Nav */}
      <div style={{ borderBottom: "1px solid #e8e8e8", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 24, height: 24, background: "#0a0a0a", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 11 }}>w</div>
          <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "-0.01em" }}>wydemedia</span>
        </div>
        <div style={{ fontSize: 11, color: "#9a9a9a", letterSpacing: "0.02em" }}>tools.wydemedia.com</div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "80px 40px 60px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "1px solid #e8e8e8", borderRadius: 3, padding: "5px 12px", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "#5a5a5a", textTransform: "uppercase", marginBottom: 32 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f97316", display: "inline-block" }} />
          Internal Tools Suite
        </div>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 24, color: "#0a0a0a" }}>
          wydemedia <span style={{ color: "#f97316" }}>PPC</span><br />Scaling OS
        </h1>
        <p style={{ fontSize: 15, color: "#5a5a5a", lineHeight: 1.7, maxWidth: 480, margin: "0 auto 40px", fontWeight: 400 }}>
          AI-powered tools for Google Ads management across all client accounts.
        </p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 24, fontSize: 13, color: "#5a5a5a" }}>
          <span><strong style={{ color: "#0a0a0a" }}>1</strong> live tool</span>
          <span style={{ color: "#e8e8e8" }}>·</span>
          <span><strong style={{ color: "#0a0a0a" }}>3</strong> coming soon</span>
          <span style={{ color: "#e8e8e8" }}>·</span>
          <span><strong style={{ color: "#0a0a0a" }}>29</strong> client accounts</span>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #e8e8e8" }} />

      {/* Tools */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "60px 40px 100px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f97316", display: "inline-block" }} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "#5a5a5a", textTransform: "uppercase" }}>All Tools</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {TOOLS.map((tool, i) => {
            const isLive    = tool.status === "live";
            const isHovered = hovered === tool.id;
            return (
              <div
                key={tool.id}
                className="tool-card"
                onClick={() => isLive && tool.path && navigate(tool.path)}
                onMouseEnter={() => isLive && setHovered(tool.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  animationDelay: `${i * 60}ms`,
                  borderTop: i === 0 ? "1px solid #e8e8e8" : "none",
                  borderBottom: "1px solid #e8e8e8",
                  padding: "28px 0",
                  cursor: isLive ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 24,
                  opacity: isLive ? 1 : 0.45,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "#9a9a9a", textTransform: "uppercase" }}>{tool.category}</span>
                    {isLive && (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#f97316", border: "1px solid #f97316", padding: "2px 6px", borderRadius: 2 }}>Live</span>
                    )}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#0a0a0a", marginBottom: 8 }}>{tool.label}</div>
                  <div style={{ fontSize: 12, color: "#5a5a5a", lineHeight: 1.7, maxWidth: 500 }}>{tool.description}</div>
                </div>
                <div style={{
                  flexShrink: 0,
                  border: `1px solid ${isLive ? "#0a0a0a" : "#e8e8e8"}`,
                  borderRadius: 3,
                  padding: "10px 20px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: isLive ? (isHovered ? "#fff" : "#0a0a0a") : "#c0c0c0",
                  background: isLive && isHovered ? "#0a0a0a" : "#fff",
                  transition: "background 0.15s, color 0.15s",
                  whiteSpace: "nowrap",
                }}>
                  {isLive ? "Open tool →" : "Coming soon"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, borderTop: "1px solid #e8e8e8", padding: "12px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", zIndex: 99 }}>
        <span style={{ fontSize: 11, color: "#9a9a9a" }}>wydemedia PPC Scaling OS · Internal use only</span>
        <span style={{ fontSize: 11, color: "#c8c8c8" }}>v2.0</span>
      </div>
    </div>
  );
}
