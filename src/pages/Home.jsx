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
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="1" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.9"/>
        <rect x="10" y="1" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.4"/>
        <rect x="1" y="10" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.4"/>
        <rect x="10" y="10" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.65"/>
      </svg>
    ),
  },
  {
    id: "audit",
    path: null,
    label: "Account Audit",
    category: "Search Ads",
    description: "Full Google Ads account health check — wasted spend, search term leaks, negative keyword gaps, bid strategy issues, and Quality Score analysis.",
    status: "coming",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M9 5v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "ngram",
    path: null,
    label: "N-Gram Analyzer",
    category: "Search Ads",
    description: "Extract 1–5 gram phrases from search term reports, aggregate performance metrics, and surface high and low performing query patterns.",
    status: "coming",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M2 14 L6 8 L10 11 L14 4 L16 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: "scripts",
    path: null,
    label: "Scripts Data",
    category: "Automation",
    description: "View and manage Google Ads script outputs across all client accounts from a single interface.",
    status: "coming",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M5 7h8M5 10h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);

  const liveCount   = TOOLS.filter(t => t.status === "live").length;
  const comingCount = TOOLS.filter(t => t.status === "coming").length;

  return (
    <div style={{
      fontFamily: "'Inter', system-ui, sans-serif",
      background: "#f1f1f1",
      minHeight: "100vh",
      color: "#1a1a1a",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tool-card { animation: fadeUp 0.35s ease both; }
      `}</style>

      {/* Top nav */}
      <div style={{
        background: "#fff",
        borderBottom: "1px solid #e3e3e3",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 52,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 26, height: 26,
            background: "#1a73e8",
            borderRadius: 5,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 700, fontSize: 12,
          }}>w</div>
          <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.02em" }}>wydemedia</span>
          <span style={{ color: "#c4c4c4", fontSize: 14, margin: "0 2px" }}>/</span>
          <span style={{ fontSize: 13, color: "#6b6b6b" }}>PPC Scaling OS</span>
        </div>
        <div style={{ fontSize: 11, color: "#9e9e9e", fontFamily: "monospace" }}>
          tools.wydemedia.com
        </div>
      </div>

      {/* Page header */}
      <div style={{
        background: "#fff",
        borderBottom: "1px solid #e3e3e3",
        padding: "32px 24px 28px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", color: "#1a1a1a", marginBottom: 6 }}>
                wydemedia PPC Scaling OS
              </h1>
              <p style={{ fontSize: 13, color: "#6b6b6b", lineHeight: 1.5 }}>
                AI-powered tools for Google Ads management across all client accounts.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ background: "#f0f7ff", border: "1px solid #cce0ff", borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1a73e8", letterSpacing: "-0.03em" }}>{liveCount}</div>
                <div style={{ fontSize: 11, color: "#5c85c4", fontWeight: 500, marginTop: 1 }}>Live</div>
              </div>
              <div style={{ background: "#f9f9f9", border: "1px solid #e3e3e3", borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#6b6b6b", letterSpacing: "-0.03em" }}>{comingCount}</div>
                <div style={{ fontSize: 11, color: "#9e9e9e", fontWeight: 500, marginTop: 1 }}>Coming</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tools grid */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9e9e9e", marginBottom: 14 }}>
          All tools ({TOOLS.length})
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
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
                  animationDelay: `${i * 50}ms`,
                  background: "#fff",
                  border: `1px solid ${isHovered ? "#1a73e8" : "#e3e3e3"}`,
                  borderRadius: 10,
                  padding: "20px",
                  cursor: isLive ? "pointer" : "default",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  boxShadow: isHovered ? "0 2px 12px rgba(26,115,232,0.12)" : "0 1px 2px rgba(0,0,0,0.04)",
                  opacity: isLive ? 1 : 0.6,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{
                    width: 36, height: 36,
                    background: isLive ? "#f0f7ff" : "#f5f5f5",
                    borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: isLive ? "#1a73e8" : "#9e9e9e",
                  }}>{tool.icon}</div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", padding: "3px 8px", borderRadius: 4,
                    ...(isLive
                      ? { background: "#f0f7ff", color: "#1a73e8", border: "1px solid #cce0ff" }
                      : { background: "#f5f5f5", color: "#9e9e9e", border: "1px solid #e3e3e3" }),
                  }}>{isLive ? "Live" : "Coming soon"}</span>
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9e9e9e", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{tool.category}</div>
                <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", color: "#1a1a1a", marginBottom: 8 }}>{tool.label}</div>
                <div style={{ fontSize: 12, color: "#6b6b6b", lineHeight: 1.6, flex: 1 }}>{tool.description}</div>
                {isLive && (
                  <div style={{
                    marginTop: 16, paddingTop: 14, borderTop: "1px solid #f0f0f0",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    fontSize: 12, fontWeight: 600,
                    color: isHovered ? "#1a73e8" : "#6b6b6b",
                    transition: "color 0.15s",
                  }}>
                    <span>Open tool</span>
                    <span style={{ transition: "transform 0.15s", transform: isHovered ? "translateX(3px)" : "none", display: "inline-block", fontSize: 14 }}>→</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #e3e3e3", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 99 }}>
        <span style={{ fontSize: 11, color: "#9e9e9e" }}>wydemedia PPC Scaling OS · Internal use only</span>
        <span style={{ fontSize: 11, color: "#c4c4c4", fontFamily: "monospace" }}>v2.0</span>
      </div>
    </div>
  );
}
