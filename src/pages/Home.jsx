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
    icon: "◈",
    accent: "#008060",
  },
  {
    id: "audit",
    path: null,
    label: "Account Audit",
    category: "Search Ads",
    description: "Full Google Ads account health check — wasted spend, search term leaks, negative keyword gaps, bid strategy issues, and Quality Score analysis.",
    status: "coming",
    icon: "⬡",
    accent: "#637381",
  },
  {
    id: "ngram",
    path: null,
    label: "N-Gram Analyzer",
    category: "Search Ads",
    description: "Extract 1–5 gram phrases from search term reports, aggregate performance metrics, and surface high and low performing query patterns.",
    status: "coming",
    icon: "◫",
    accent: "#637381",
  },
  {
    id: "scripts",
    path: null,
    label: "Scripts Data",
    category: "Automation",
    description: "View and manage Google Ads script outputs across all client accounts from a single interface.",
    status: "coming",
    icon: "◧",
    accent: "#637381",
  },
];

const STATUS = {
  live:    { label: "Live",       bg: "#f0fdf4", color: "#008060", border: "#bbf7d0" },
  coming:  { label: "Coming Soon", bg: "#f9fafb", color: "#637381", border: "#e4e7e9" },
};

export default function Home() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{
      fontFamily: "'DM Sans', system-ui, sans-serif",
      background: "#f6f6f7",
      minHeight: "100vh",
      color: "#1a1a2e",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tool-card {
          animation: fadeUp 0.4s ease both;
        }
      `}</style>

      {/* Top nav */}
      <div style={{
        background: "#fff",
        borderBottom: "1px solid #e4e7e9",
        padding: "0 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 56,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28,
            background: "#008060",
            borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 700, fontSize: 13,
          }}>W</div>
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>Wyde Media</span>
          <span style={{ color: "#c9cccf", margin: "0 4px" }}>/</span>
          <span style={{ fontSize: 14, color: "#637381" }}>Tools</span>
        </div>
        <div style={{ fontSize: 12, color: "#637381", fontFamily: "'DM Mono', monospace" }}>
          tools.wydemedia.com
        </div>
      </div>

      {/* Hero */}
      <div style={{
        background: "#fff",
        borderBottom: "1px solid #e4e7e9",
        padding: "48px 32px 40px",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{
            display: "inline-block",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#008060",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "4px 10px",
            borderRadius: 4,
            marginBottom: 16,
          }}>Internal Tools Suite</div>
          <h1 style={{
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            marginBottom: 12,
            color: "#1a1a2e",
          }}>
            Wyde Media Suite
          </h1>
          <p style={{
            fontSize: 16,
            color: "#637381",
            maxWidth: 520,
            lineHeight: 1.6,
            fontWeight: 400,
          }}>
            AI-powered tools for Google Ads management across all client accounts.
          </p>
        </div>
      </div>

      {/* Tools grid */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 32px" }}>

        <div style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#8c9196",
          marginBottom: 16,
        }}>All Tools ({TOOLS.length})</div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}>
          {TOOLS.map((tool, i) => {
            const isLive    = tool.status === "live";
            const isHovered = hovered === tool.id;
            const s         = STATUS[tool.status];

            return (
              <div
                key={tool.id}
                className="tool-card"
                onClick={() => isLive && tool.path && navigate(tool.path)}
                onMouseEnter={() => setHovered(tool.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  animationDelay: `${i * 60}ms`,
                  background: "#fff",
                  border: `1px solid ${isHovered && isLive ? "#008060" : "#e4e7e9"}`,
                  borderRadius: 12,
                  padding: "24px",
                  cursor: isLive ? "pointer" : "default",
                  transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
                  boxShadow: isHovered && isLive
                    ? "0 4px 20px rgba(0,128,96,0.1)"
                    : "0 1px 3px rgba(0,0,0,0.04)",
                  transform: isHovered && isLive ? "translateY(-2px)" : "none",
                  opacity: isLive ? 1 : 0.7,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                }}
              >
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{
                    width: 40, height: 40,
                    background: isLive ? "#f0fdf4" : "#f9fafb",
                    border: `1px solid ${isLive ? "#bbf7d0" : "#e4e7e9"}`,
                    borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                    color: isLive ? "#008060" : "#8c9196",
                  }}>{tool.icon}</div>
                  <span style={{
                    background: s.bg,
                    color: s.color,
                    border: `1px solid ${s.border}`,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: 4,
                  }}>{s.label}</span>
                </div>

                {/* Content */}
                <div style={{ fontSize: 11, fontWeight: 500, color: "#8c9196", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{tool.category}</div>
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 8, color: "#1a1a2e" }}>{tool.label}</div>
                <div style={{ fontSize: 13, color: "#637381", lineHeight: 1.6, flex: 1 }}>{tool.description}</div>

                {/* Footer */}
                {isLive && (
                  <div style={{
                    marginTop: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: isHovered ? "#008060" : "#1a1a2e",
                    transition: "color 0.15s",
                  }}>
                    Open tool
                    <span style={{ fontSize: 16, transition: "transform 0.15s", transform: isHovered ? "translateX(3px)" : "none", display: "inline-block" }}>→</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: "1px solid #e4e7e9",
        padding: "20px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: "100%",
      }}>
        <span style={{ fontSize: 12, color: "#8c9196" }}>Wyde Media Suite · Internal use only</span>
        <span style={{ fontSize: 12, color: "#8c9196", fontFamily: "'DM Mono', monospace" }}>v2.0</span>
      </div>
    </div>
  );
}
