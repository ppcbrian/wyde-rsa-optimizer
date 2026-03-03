import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";

const STATUS_COLORS = {
  "Top Performer":  "#f97316",
  "High ROAS":      "#0a0a0a",
  "Underperformer": "#dc2626",
  "Wasted Spend":   "#dc2626",
  "Low Data":       "#9a9a9a",
  "OK":             "#9a9a9a",
};

function parsePct(val) {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return val;
  return parseFloat(String(val).replace("%", "")) / 100;
}
function parseNum(val) {
  if (val === null || val === undefined || val === "") return 0;
  return parseFloat(String(val).replace(/,/g, "")) || 0;
}
function parseLine(line) {
  const result = []; let current = ""; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; }
    else { current += ch; }
  }
  result.push(current.trim()); return result;
}
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || ""; });
    rows.push(row);
  }
  return rows;
}
function mapRow(row) {
  const impressions = parseNum(row["Impressions"]);
  const clicks      = parseNum(row["Clicks"]);
  const conversions = parseNum(row["Conversions"]);
  const cost        = parseNum(row["Cost"] || row["cost"] || 0);
  const conv_value  = parseNum(row["Conv. Value"] || row["conv_value"] || 0);
  const cpi_csv     = row["CPI (Conv. / Impr.)"] ? parseNum(row["CPI (Conv. / Impr.)"]) : null;
  const rpi_csv     = row["RPI (Revenue / Impr.)"] ? parseNum(row["RPI (Revenue / Impr.)"]) : null;
  const cpi = (cpi_csv !== null && cpi_csv > 0) ? cpi_csv : (impressions > 0 ? conversions / impressions : null);
  const rpi = (rpi_csv !== null && rpi_csv > 0) ? rpi_csv : (conv_value > 0 && impressions > 0 ? conv_value / impressions : null);
  return {
    asset_text: row["Asset Text"] || "",
    field_type: (row["Asset Type"] || "").toUpperCase(),
    campaign_name: row["Campaign"] || "",
    ad_group: row["Ad Group"] || "",
    impressions, clicks,
    ctr: parsePct(row["CTR"]),
    conversions, cvr: parsePct(row["Conv. Rate"]),
    cost, conv_value, cpi, rpi,
  };
}
function classifyAsset(asset, stats, minImpressions) {
  const { impressions, cost, conversions, ctr, cpi } = asset;
  if (impressions < minImpressions) return "Low Data";
  if (cost > 100 && conversions === 0) return "Wasted Spend";
  if (ctr !== null && stats.avgCTR > 0 && ctr < stats.avgCTR * 0.65 && impressions > stats.medianImpressions * 0.3) return "Underperformer";
  if (cpi !== null && stats.avgCPI > 0 && cpi > stats.avgCPI * 1.4 && conversions > 0) return "Top Performer";
  const roas = asset.conv_value && asset.cost > 0 ? asset.conv_value / asset.cost : 0;
  if (roas > 5) return "High ROAS";
  if (ctr !== null && stats.avgCTR > 0 && ctr > stats.avgCTR * 1.4 && conversions > 0) return "Top Performer";
  return "OK";
}
function computeStats(rows) {
  const q = rows.filter(r => r.impressions >= 50);
  const totalClicks = q.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = q.reduce((s, r) => s + r.impressions, 0);
  const totalConversions = q.reduce((s, r) => s + r.conversions, 0);
  const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const avgCVR = totalClicks > 0 ? totalConversions / totalClicks : 0;
  const avgCPI = totalImpressions > 0 ? totalConversions / totalImpressions : 0;
  const sorted = [...q].sort((a, b) => a.impressions - b.impressions);
  const medianImpressions = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)].impressions : 0;
  return { avgCTR, avgCVR, avgCPI, medianImpressions };
}
function fmt(val, type) {
  if (val === null || val === undefined) return "—";
  if (type === "pct") return (val * 100).toFixed(2) + "%";
  if (type === "num") return new Intl.NumberFormat("en-US").format(Math.round(val));
  return val;
}

const FUNNEL_STAGES = ["Buy / Bottom of Funnel", "Consideration (Learn + Shop)", "Awareness & Interest"];

const inp = {
  fontFamily: "'IBM Plex Mono', monospace",
  background: "#fff",
  border: "1px solid #e8e8e8",
  borderRadius: 3,
  color: "#0a0a0a",
  fontSize: 11,
  padding: "6px 10px",
  outline: "none",
};

export default function RSAOptimizer() {
  const navigate = useNavigate();
  const fileRef  = useRef();
  const [fileName, setFileName]   = useState(null);
  const [rows, setRows]           = useState([]);
  const [tab, setTab]             = useState("HEADLINE");
  const [campaignFilter, setCampaignFilter] = useState("__all__");
  const [adGroupFilter, setAdGroupFilter]   = useState("__all__");
  const [selected, setSelected]   = useState(new Set());
  const [analysisResults, setAnalysisResults] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError]         = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessDesc, setBusinessDesc] = useState("");
  const [language, setLanguage]   = useState("English");
  const [funnelStage, setFunnelStage] = useState(FUNNEL_STAGES[0]);
  const [minImpressions, setMinImpressions] = useState(50);

  function handleFile(file) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseCSV(e.target.result);
        const mapped = parsed.map(mapRow).filter(r => r.asset_text);
        setRows(mapped); setSelected(new Set()); setAnalysisResults(null); setError(null);
        setCampaignFilter("__all__"); setAdGroupFilter("__all__");
      } catch (err) { setError("Failed to parse CSV: " + err.message); }
    };
    reader.readAsText(file);
  }

  const filteredByType = useMemo(() => rows.filter(r => r.field_type === tab), [rows, tab]);
  const campaigns = useMemo(() => { const s = new Set(filteredByType.map(r => r.campaign_name).filter(Boolean)); return [...s].sort(); }, [filteredByType]);
  const adGroups  = useMemo(() => { const base = campaignFilter === "__all__" ? filteredByType : filteredByType.filter(r => r.campaign_name === campaignFilter); const s = new Set(base.map(r => r.ad_group).filter(Boolean)); return [...s].sort(); }, [filteredByType, campaignFilter]);
  const displayRows = useMemo(() => { let r = filteredByType; if (campaignFilter !== "__all__") r = r.filter(x => x.campaign_name === campaignFilter); if (adGroupFilter !== "__all__") r = r.filter(x => x.ad_group === adGroupFilter); return r; }, [filteredByType, campaignFilter, adGroupFilter]);
  const stats = useMemo(() => computeStats(displayRows), [displayRows]);
  const classifiedRows = useMemo(() => displayRows.map(r => ({ ...r, status: classifyAsset(r, stats, minImpressions), roas: r.conv_value && r.cost > 0 ? r.conv_value / r.cost : null })), [displayRows, stats, minImpressions]);
  const hasRPI = useMemo(() => classifiedRows.some(r => r.rpi !== null && r.rpi > 0), [classifiedRows]);

  function selectFlagged() {
    setSelected(new Set(classifiedRows.filter(r => r.status === "Underperformer" || r.status === "Wasted Spend").map(r => r.asset_text)));
  }
  function toggleRow(text) {
    setSelected(prev => { const next = new Set(prev); if (next.has(text)) next.delete(text); else next.add(text); return next; });
  }

  async function analyzeAndGenerate() {
    const selectedRows  = classifiedRows.filter(r => selected.has(r.asset_text));
    const topPerformers = classifiedRows.filter(r => r.status === "Top Performer" || r.status === "High ROAS").slice(0, 5);
    const charLimit     = tab === "HEADLINE" ? 30 : 90;
    const accountLabel  = businessName || (fileName ? fileName.replace(".csv", "") : "this account");
    const funnelGuidance = {
      "Awareness & Interest":        "Soft CTAs (Discover, Learn). Benefit-led, emotional.",
      "Consideration (Learn + Shop)":"Feature + Benefit mix. Info CTAs (Find, Shop, Download). Highlight USPs.",
      "Buy / Bottom of Funnel":      "Strong action CTAs (Buy, Call, Schedule). Include offers or FOMO.",
    };
    const prompt = `You are a senior Google Ads RSA copywriter. Analyze ${tab === "HEADLINE" ? "headlines (max 30 chars)" : "descriptions (max 90 chars)"} for ${accountLabel}${businessDesc ? ", a " + businessDesc : ""}. Funnel stage: ${funnelStage}.

COPY FRAMEWORK (Geddes methodology):
- Relevant Headline, Feature, Benefit, USP, Authority Statement, Pain Point, Emotional Appeal, Prequalification, CTA
- CTA guidance: ${funnelGuidance[funnelStage]}

ACCOUNT AVERAGES: Avg CTR: ${(stats.avgCTR * 100).toFixed(2)}% | Avg CVR: ${(stats.avgCVR * 100).toFixed(2)}% | Avg CPI: ${(stats.avgCPI * 100).toFixed(4)}%

TOP PERFORMERS:
${topPerformers.map(r => `"${r.asset_text}" — CTR: ${r.ctr ? (r.ctr * 100).toFixed(2) : "—"}%, CPI: ${r.cpi ? (r.cpi * 100).toFixed(4) : "—"}%, Conv: ${r.conversions}`).join("\n") || "None found"}

UNDERPERFORMERS TO DIAGNOSE:
${selectedRows.map(r => `"${r.asset_text}" — CTR: ${r.ctr ? (r.ctr * 100).toFixed(2) : "—"}%, CPI: ${r.cpi ? (r.cpi * 100).toFixed(4) : "—"}%, Conv: ${r.conversions}, Status: ${r.status}`).join("\n")}

For each: copy_component (what role it plays), diagnosis (why it fails specifically), replacements (2 in ${language}, max ${charLimit} chars each), priority (high/medium).

JSON only: [{"original":"...","copy_component":"...","diagnosis":"...","replacements":["...","..."],"priority":"high|medium"}]`;

    setAnalyzing(true); setAnalysisResults(null);
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await resp.json();
      const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const results = JSON.parse(match[0]);
        results.sort((a, b) => a.priority === "high" ? -1 : 1);
        setAnalysisResults(results);
      } else { throw new Error("Could not parse response"); }
    } catch (e) { setError("Analysis failed: " + e.message); }
    finally { setAnalyzing(false); }
  }

  const totalImpr   = classifiedRows.reduce((s, r) => s + r.impressions, 0);
  const totalClicks = classifiedRows.reduce((s, r) => s + r.clicks, 0);
  const totalConv   = classifiedRows.reduce((s, r) => s + r.conversions, 0);
  const avgCPI      = totalImpr > 0 ? totalConv / totalImpr : 0;
  const flaggedCount = classifiedRows.filter(r => r.status === "Underperformer" || r.status === "Wasted Spend").length;
  const hasData = rows.length > 0;

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", background: "#fff", color: "#0a0a0a", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        select option { background: #fff; color: #0a0a0a; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
        tr:hover td { background: #fafafa; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #e8e8e8; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #e8e8e8", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, flexWrap: "wrap", gap: 8, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate("/")} style={{ ...inp, padding: "4px 8px", cursor: "pointer", fontSize: 11, color: "#5a5a5a" }}>← back</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 20, height: 20, background: "#0a0a0a", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 10 }}>w</div>
            <span style={{ fontWeight: 700, fontSize: 12 }}>wydemedia</span>
            <span style={{ color: "#c8c8c8" }}>/</span>
            <span style={{ fontSize: 12, color: "#5a5a5a" }}>RSA Optimizer</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setShowConfig(v => !v)} style={{ ...inp, cursor: "pointer", color: showConfig ? "#f97316" : "#5a5a5a", borderColor: showConfig ? "#f97316" : "#e8e8e8" }}>config</button>
          <button onClick={() => fileRef.current.click()} style={{ background: "#0a0a0a", color: "#fff", border: "none", borderRadius: 3, padding: "6px 16px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>
            {hasData ? "load new csv →" : "load csv →"}
          </button>
          <input ref={fileRef} type="file" accept=".csv" onChange={e => handleFile(e.target.files[0])} style={{ display: "none" }} />
        </div>
      </div>

      {/* Config */}
      {showConfig && (
        <div style={{ borderBottom: "1px solid #e8e8e8", padding: "16px 24px", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end", background: "#fafafa" }}>
          {[
            { label: "Business Name",    el: <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Ongoal" style={{ ...inp, width: 160 }} /> },
            { label: "Business Desc",    el: <input value={businessDesc} onChange={e => setBusinessDesc(e.target.value)} placeholder="e.g. padel equipment" style={{ ...inp, width: 200 }} /> },
            { label: "Language",         el: <select value={language} onChange={e => setLanguage(e.target.value)} style={{ ...inp, colorScheme: "light" }}>{["English","Danish","Swedish","Norwegian","German","Dutch","French","Spanish"].map(l => <option key={l}>{l}</option>)}</select> },
            { label: "Funnel Stage",     el: <select value={funnelStage} onChange={e => setFunnelStage(e.target.value)} style={{ ...inp, colorScheme: "light", width: 210 }}>{FUNNEL_STAGES.map(s => <option key={s}>{s}</option>)}</select> },
            { label: "Min. Impressions", el: <input type="number" value={minImpressions} onChange={e => setMinImpressions(parseInt(e.target.value) || 50)} style={{ ...inp, width: 70 }} /> },
          ].map(({ label, el }) => (
            <div key={label}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a9a9a", marginBottom: 5 }}>{label}</div>
              {el}
            </div>
          ))}
        </div>
      )}

      {error && <div style={{ background: "#fff5f5", borderBottom: "1px solid #fecaca", color: "#dc2626", padding: "8px 24px", fontSize: 11 }}>{error}</div>}

      <div style={{ flex: 1, overflow: "auto" }}>
        {!hasData && (
          <div
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current.click()}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 50px)", gap: 16, cursor: "pointer" }}
          >
            <div style={{ border: "1px dashed #e8e8e8", borderRadius: 4, padding: "60px 80px", textAlign: "center", maxWidth: 500 }}>
              <div style={{ fontSize: 24, marginBottom: 12, color: "#c8c8c8" }}>↑</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Drop CSV export here</div>
              <div style={{ fontSize: 11, color: "#5a5a5a", lineHeight: 1.8 }}>
                or <span style={{ color: "#f97316", cursor: "pointer" }}>click to browse</span>
                <br />
                Required: Campaign, Ad Group, Asset Type, Asset Text,<br />Impressions, Clicks, CTR, Conv. Rate, Conversions<br />
                Optional: Cost, Conv. Value, CPI, RPI
              </div>
            </div>
          </div>
        )}

        {hasData && (
          <>
            {/* Stats */}
            <div style={{ borderBottom: "1px solid #e8e8e8", padding: "16px 24px", display: "flex", gap: 24, flexWrap: "wrap" }}>
              {[
                { label: "File",        value: fileName?.replace(".csv", "") || "—", mono: false },
                { label: "Assets",      value: classifiedRows.length.toLocaleString() },
                { label: "Impressions", value: fmt(totalImpr, "num") },
                { label: "Clicks",      value: fmt(totalClicks, "num") },
                { label: "Avg CTR",     value: fmt(stats.avgCTR, "pct") },
                { label: "Avg CVR",     value: fmt(stats.avgCVR, "pct") },
                { label: "Avg CPI",     value: avgCPI > 0 ? (avgCPI * 100).toFixed(4) + "%" : "—" },
                { label: "Flagged",     value: flaggedCount, accent: flaggedCount > 0 },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a9a9a", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: s.accent ? "#dc2626" : "#0a0a0a" }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div style={{ borderBottom: "1px solid #e8e8e8", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", border: "1px solid #e8e8e8", borderRadius: 3, overflow: "hidden" }}>
                  {["HEADLINE", "DESCRIPTION"].map((t, i) => (
                    <button key={t} onClick={() => { setTab(t); setSelected(new Set()); setCampaignFilter("__all__"); setAdGroupFilter("__all__"); }}
                      style={{ background: tab === t ? "#0a0a0a" : "#fff", color: tab === t ? "#fff" : "#5a5a5a", border: "none", borderLeft: i === 1 ? "1px solid #e8e8e8" : "none", padding: "6px 14px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>
                      {t}S
                    </button>
                  ))}
                </div>
                <select value={campaignFilter} onChange={e => { setCampaignFilter(e.target.value); setAdGroupFilter("__all__"); }} style={{ ...inp, colorScheme: "light", maxWidth: 200 }}>
                  <option value="__all__">All campaigns ({campaigns.length})</option>
                  {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={adGroupFilter} onChange={e => setAdGroupFilter(e.target.value)} style={{ ...inp, colorScheme: "light", maxWidth: 160 }}>
                  <option value="__all__">All ad groups ({adGroups.length})</option>
                  {adGroups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={selectFlagged} style={{ ...inp, cursor: "pointer", color: "#dc2626", borderColor: "#fecaca" }}>select flagged</button>
                <button onClick={analyzeAndGenerate} disabled={selected.size === 0 || analyzing}
                  style={{ background: selected.size > 0 && !analyzing ? "#f97316" : "#f5f5f5", color: selected.size > 0 && !analyzing ? "#fff" : "#9a9a9a", border: "none", borderRadius: 3, padding: "6px 16px", fontSize: 11, fontWeight: 600, cursor: selected.size > 0 && !analyzing ? "pointer" : "not-allowed", fontFamily: "'IBM Plex Mono', monospace" }}>
                  {analyzing ? "analyzing..." : `analyze + generate (${selected.size})`}
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e8e8e8" }}>
                    {["", "Asset", "Campaign / Ad Group", "Impr.", "Clicks", "CTR", "Conv.", "CVR", "CPI", ...(hasRPI ? ["RPI"] : []), "Status"].map(col => (
                      <th key={col} style={{ padding: "8px 12px", textAlign: "left", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a9a9a", whiteSpace: "nowrap", background: "#fafafa" }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classifiedRows.map((r, i) => {
                    const isSel     = selected.has(r.asset_text);
                    const ctrColor  = r.ctr !== null && stats.avgCTR > 0 ? r.ctr > stats.avgCTR * 1.2 ? "#16a34a" : r.ctr < stats.avgCTR * 0.7 ? "#dc2626" : "#0a0a0a" : "#9a9a9a";
                    const cpiColor  = r.cpi !== null && stats.avgCPI > 0 ? r.cpi > stats.avgCPI * 1.2 ? "#16a34a" : r.cpi < stats.avgCPI * 0.7 ? "#dc2626" : "#0a0a0a" : "#9a9a9a";
                    const sColor    = STATUS_COLORS[r.status] || "#9a9a9a";
                    return (
                      <tr key={i} onClick={() => toggleRow(r.asset_text)} style={{ borderBottom: "1px solid #f0f0f0", background: isSel ? "#fff8f5" : "#fff", cursor: "pointer" }}>
                        <td style={{ padding: "8px 12px", width: 32 }}>
                          <div style={{ width: 14, height: 14, borderRadius: 2, border: `1px solid ${isSel ? "#f97316" : "#e8e8e8"}`, background: isSel ? "#f97316" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff" }}>{isSel ? "✓" : ""}</div>
                        </td>
                        <td style={{ padding: "8px 12px", maxWidth: 220 }}>
                          <div style={{ color: "#0a0a0a", fontWeight: 500 }}>{r.asset_text}</div>
                        </td>
                        <td style={{ padding: "8px 12px", maxWidth: 180 }}>
                          <div style={{ color: "#5a5a5a", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>{r.campaign_name}</div>
                          {r.ad_group && <div style={{ color: "#9a9a9a", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>{r.ad_group}</div>}
                        </td>
                        <td style={{ padding: "8px 12px", color: "#5a5a5a", whiteSpace: "nowrap" }}>{fmt(r.impressions, "num")}</td>
                        <td style={{ padding: "8px 12px", color: "#5a5a5a", whiteSpace: "nowrap" }}>{fmt(r.clicks, "num")}</td>
                        <td style={{ padding: "8px 12px", color: ctrColor, whiteSpace: "nowrap", fontWeight: 600 }}>{fmt(r.ctr, "pct")}</td>
                        <td style={{ padding: "8px 12px", color: r.conversions > 0 ? "#16a34a" : "#9a9a9a", whiteSpace: "nowrap", fontWeight: r.conversions > 0 ? 600 : 400 }}>{fmt(r.conversions, "num")}</td>
                        <td style={{ padding: "8px 12px", color: "#5a5a5a", whiteSpace: "nowrap" }}>{fmt(r.cvr, "pct")}</td>
                        <td style={{ padding: "8px 12px", color: cpiColor, whiteSpace: "nowrap", fontWeight: 600 }}>{r.cpi !== null ? (r.cpi * 100).toFixed(4) + "%" : "—"}</td>
                        {hasRPI && <td style={{ padding: "8px 12px", color: "#5a5a5a", whiteSpace: "nowrap" }}>{r.rpi !== null ? r.rpi.toFixed(5) : "—"}</td>}
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: sColor, border: `1px solid ${sColor}`, padding: "2px 6px", borderRadius: 2 }}>{r.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Analysis results */}
            {(analyzing || analysisResults) && (
              <div style={{ borderTop: "1px solid #e8e8e8", padding: "32px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: analyzing ? "#f97316" : "#16a34a", display: "inline-block", animation: analyzing ? "pulse 1s infinite" : "none" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {analyzing ? "Generating analysis..." : `${analysisResults?.length} assets diagnosed`}
                  </span>
                </div>
                {analysisResults && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 780 }}>
                    {analysisResults.map((result, i) => (
                      <div key={i} style={{ borderTop: i === 0 ? "1px solid #e8e8e8" : "none", borderBottom: "1px solid #e8e8e8", padding: "24px 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: result.priority === "high" ? "#dc2626" : "#f97316", border: `1px solid ${result.priority === "high" ? "#dc2626" : "#f97316"}`, padding: "2px 6px", borderRadius: 2 }}>{result.priority === "high" ? "HIGH" : "MED"}</span>
                          {result.copy_component && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a5a5a", border: "1px solid #e8e8e8", padding: "2px 6px", borderRadius: 2 }}>{result.copy_component}</span>}
                          <span style={{ fontSize: 12, color: "#5a5a5a", fontStyle: "italic" }}>"{result.original}"</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#5a5a5a", marginBottom: 14, lineHeight: 1.6 }}>{result.diagnosis}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {(result.replacements || []).map((rep, j) => (
                            <div key={j} style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid #e8e8e8", borderRadius: 3, padding: "8px 12px" }}>
                              <span style={{ color: "#f97316", fontSize: 12, flexShrink: 0 }}>→</span>
                              <span style={{ fontSize: 12, color: "#0a0a0a", fontWeight: 500, flex: 1 }}>{rep}</span>
                              <span style={{ fontSize: 10, color: rep.length > (tab === "HEADLINE" ? 30 : 90) ? "#dc2626" : "#9a9a9a", flexShrink: 0 }}>{rep.length} chars</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
