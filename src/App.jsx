import { useState, useMemo, useRef } from "react";

const STATUS_COLORS = {
  "Top Performer": "#22c55e",
  "High ROAS":     "#06b6d4",
  "Underperformer":"#f97316",
  "Wasted Spend":  "#ef4444",
  "Low Data":      "#6b7280",
  "OK":            "#94a3b8",
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
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
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

  // CPI and RPI: use from CSV if present, otherwise compute
  const cpi_csv = row["CPI (Conv. / Impr.)"] ? parseNum(row["CPI (Conv. / Impr.)"]) : null;
  const rpi_csv = row["RPI (Revenue / Impr.)"] ? parseNum(row["RPI (Revenue / Impr.)"]) : null;

  const cpi = (cpi_csv !== null && cpi_csv > 0)
    ? cpi_csv
    : (impressions > 0 ? conversions / impressions : null);

  const rpi = (rpi_csv !== null && rpi_csv > 0)
    ? rpi_csv
    : (conv_value > 0 && impressions > 0 ? conv_value / impressions : null);

  return {
    asset_text:    row["Asset Text"] || "",
    field_type:    (row["Asset Type"] || "").toUpperCase(),
    campaign_name: row["Campaign"] || "",
    ad_group:      row["Ad Group"] || "",
    impressions,
    clicks,
    ctr:        parsePct(row["CTR"]),
    conversions,
    cvr:        parsePct(row["Conv. Rate"]),
    cost,
    conv_value,
    cpi,
    rpi,
  };
}

function classifyAsset(asset, stats, minImpressions) {
  const { impressions, cost, conversions, ctr, cpi } = asset;
  if (impressions < minImpressions) return "Low Data";
  if (cost > 100 && conversions === 0) return "Wasted Spend";
  if (
    ctr !== null && stats.avgCTR > 0 &&
    ctr < stats.avgCTR * 0.65 &&
    impressions > stats.medianImpressions * 0.3
  ) return "Underperformer";
  // CPI-based top performer (Geddes: CPI is the primary winner metric)
  if (cpi !== null && stats.avgCPI > 0 && cpi > stats.avgCPI * 1.4 && conversions > 0) return "Top Performer";
  const roas = asset.conv_value && cost > 0 ? asset.conv_value / cost : 0;
  if (roas > 5) return "High ROAS";
  if (ctr !== null && stats.avgCTR > 0 && ctr > stats.avgCTR * 1.4 && conversions > 0) return "Top Performer";
  return "OK";
}

function computeStats(rows) {
  const qualifying = rows.filter((r) => r.impressions >= 50);
  const totalClicks      = qualifying.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = qualifying.reduce((s, r) => s + r.impressions, 0);
  const totalConversions = qualifying.reduce((s, r) => s + r.conversions, 0);
  const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const avgCVR = totalClicks > 0 ? totalConversions / totalClicks : 0;
  const avgCPI = totalImpressions > 0 ? totalConversions / totalImpressions : 0;
  const sorted = [...qualifying].sort((a, b) => a.impressions - b.impressions);
  const medianImpressions = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)].impressions : 0;
  return { avgCTR, avgCVR, avgCPI, medianImpressions, totalClicks, totalImpressions, totalConversions };
}

function fmt(val, type) {
  if (val === null || val === undefined) return "—";
  if (type === "pct")  return (val * 100).toFixed(2) + "%";
  if (type === "num")  return new Intl.NumberFormat("en-US").format(Math.round(val));
  return val;
}

const inputStyle = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 6,
  color: "#f1f5f9",
  fontSize: 12,
  padding: "6px 10px",
  outline: "none",
};

const FUNNEL_STAGES = ["Buy / Bottom of Funnel", "Consideration (Learn + Shop)", "Awareness & Interest"];

export default function RSAAgent() {
  const fileRef = useRef();
  const [fileName, setFileName]         = useState(null);
  const [rows, setRows]                 = useState([]);
  const [tab, setTab]                   = useState("HEADLINE");
  const [campaignFilter, setCampaignFilter] = useState("__all__");
  const [adGroupFilter, setAdGroupFilter]   = useState("__all__");
  const [selected, setSelected]         = useState(new Set());
  const [analysisResults, setAnalysisResults] = useState(null);
  const [analyzing, setAnalyzing]       = useState(false);
  const [error, setError]               = useState(null);
  const [showConfig, setShowConfig]     = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessDesc, setBusinessDesc] = useState("");
  const [language, setLanguage]         = useState("English");
  const [funnelStage, setFunnelStage]   = useState(FUNNEL_STAGES[0]);
  const [minImpressions, setMinImpressions] = useState(50);

  function handleFile(file) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseCSV(e.target.result);
        const mapped = parsed.map(mapRow).filter((r) => r.asset_text);
        setRows(mapped);
        setSelected(new Set());
        setAnalysisResults(null);
        setError(null);
        setCampaignFilter("__all__");
        setAdGroupFilter("__all__");
      } catch (err) {
        setError("Failed to parse CSV: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  const filteredByType = useMemo(() => rows.filter((r) => r.field_type === tab), [rows, tab]);

  const campaigns = useMemo(() => {
    const s = new Set(filteredByType.map((r) => r.campaign_name).filter(Boolean));
    return [...s].sort();
  }, [filteredByType]);

  const adGroups = useMemo(() => {
    const base = campaignFilter === "__all__" ? filteredByType : filteredByType.filter((r) => r.campaign_name === campaignFilter);
    const s = new Set(base.map((r) => r.ad_group).filter(Boolean));
    return [...s].sort();
  }, [filteredByType, campaignFilter]);

  const displayRows = useMemo(() => {
    let r = filteredByType;
    if (campaignFilter !== "__all__") r = r.filter((x) => x.campaign_name === campaignFilter);
    if (adGroupFilter !== "__all__")  r = r.filter((x) => x.ad_group === adGroupFilter);
    return r;
  }, [filteredByType, campaignFilter, adGroupFilter]);

  const stats = useMemo(() => computeStats(displayRows), [displayRows]);

  const classifiedRows = useMemo(() => {
    return displayRows.map((r) => ({
      ...r,
      status: classifyAsset(r, stats, minImpressions),
      roas:   r.conv_value && r.cost > 0 ? r.conv_value / r.cost : null,
    }));
  }, [displayRows, stats, minImpressions]);

  const hasRPI = useMemo(() => classifiedRows.some((r) => r.rpi !== null && r.rpi > 0), [classifiedRows]);

  function selectFlagged() {
    const flagged = new Set(
      classifiedRows.filter((r) => r.status === "Underperformer" || r.status === "Wasted Spend").map((r) => r.asset_text)
    );
    setSelected(flagged);
  }

  function toggleRow(text) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(text)) next.delete(text); else next.add(text);
      return next;
    });
  }

  async function analyzeAndGenerate() {
    const selectedRows  = classifiedRows.filter((r) => selected.has(r.asset_text));
    const topPerformers = classifiedRows.filter((r) => r.status === "Top Performer" || r.status === "High ROAS").slice(0, 5);
    const charLimit     = tab === "HEADLINE" ? 30 : 90;
    const accountLabel  = businessName || (fileName ? fileName.replace(".csv", "") : "this account");

    const funnelGuidance = {
      "Awareness & Interest":        "Benefit-led messaging. Soft CTAs (Discover, Learn). Emotional appeal appropriate.",
      "Consideration (Learn + Shop)":"Feature + Benefit mix. Info CTAs (Find, Shop, Download). Highlight USPs and authority.",
      "Buy / Bottom of Funnel":      "Strong benefit + action CTAs (Buy, Call, Schedule, Book). Include offers or FOMO. Prequalify if B2B.",
    };

    const prompt = `You are a senior Google Ads RSA copywriter. Analyze ${tab === "HEADLINE" ? "headlines (max 30 chars)" : "descriptions (max 90 chars)"} for ${accountLabel}${businessDesc ? ", a " + businessDesc : ""}. Funnel stage: ${funnelStage}.

COPY FRAMEWORK (Geddes methodology — every asset should serve one of these roles):
- Relevant Headline: Directly mirrors the search term / ad group theme
- Feature: Specific product/service statement
- Benefit: What the product does FOR the customer (not just what it is)
- USP: Why different from all competitors
- Authority Statement: Why this is the go-to choice
- Pain Point: How this solves the customer's problem
- Emotional Appeal: How it makes the customer feel
- Prequalification: Filters for the right audience (common in B2B)
- CTA: ${funnelGuidance[funnelStage]}

ACCOUNT AVERAGES (assets with 50+ impressions):
- Avg CTR: ${(stats.avgCTR * 100).toFixed(2)}%
- Avg CVR: ${(stats.avgCVR * 100).toFixed(2)}%
- Avg CPI (Conversions/Impressions): ${(stats.avgCPI * 100).toFixed(4)}%

TOP PERFORMING ASSETS — learn from these patterns:
${topPerformers.map((r) => `"${r.asset_text}" — CTR: ${r.ctr ? (r.ctr * 100).toFixed(2) : "—"}%, CPI: ${r.cpi ? (r.cpi * 100).toFixed(4) : "—"}%, Conv: ${r.conversions}, Status: ${r.status}`).join("\n") || "None found — use general principles"}

UNDERPERFORMING ASSETS TO DIAGNOSE AND REPLACE:
${selectedRows.map((r) => `"${r.asset_text}" — CTR: ${r.ctr ? (r.ctr * 100).toFixed(2) : "—"}%, CPI: ${r.cpi ? (r.cpi * 100).toFixed(4) : "—"}%, Impr: ${r.impressions}, Conv: ${r.conversions}, Status: ${r.status}`).join("\n")}

For each underperformer:
1. copy_component: Which framework role this asset was trying to play
2. diagnosis: Specific reason it fails — e.g. "generic CTA with no outcome stated", "feature-only, no benefit translation", "too broad for any keyword theme", "wrong funnel stage messaging"
3. replacements: Two replacement assets in ${language}, max ${charLimit} chars each. Each should fix the diagnosed failure. Do NOT just shorten — rethink the angle.
4. priority: "high" if wasted spend (impressions > 0, conversions = 0, cost mentioned), otherwise "medium"

JSON only, no preamble:
[{"original":"...","copy_component":"...","diagnosis":"...","replacements":["...","..."],"priority":"high|medium"}]`;

    setAnalyzing(true);
    setAnalysisResults(null);

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await resp.json();
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const results = JSON.parse(match[0]);
        results.sort((a, b) => (a.priority === "high" ? -1 : 1));
        setAnalysisResults(results);
      } else {
        throw new Error("Could not parse analysis response");
      }
    } catch (e) {
      setError("Analysis failed: " + e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  const totalImpr   = classifiedRows.reduce((s, r) => s + r.impressions, 0);
  const totalClicks = classifiedRows.reduce((s, r) => s + r.clicks, 0);
  const totalConv   = classifiedRows.reduce((s, r) => s + r.conversions, 0);
  const avgCPI      = totalImpr > 0 ? totalConv / totalImpr : 0;
  const underperformerCount = classifiedRows.filter((r) => r.status === "Underperformer" || r.status === "Wasted Spend").length;
  const hasData = rows.length > 0;

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif", background: "#0c0f17", color: "#f1f5f9", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Mono&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        select option { background: #141825; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
      `}</style>

      {/* Header */}
      <div style={{ background: "#141825", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 200 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #f97316, #ea580c)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>R</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>RSA Optimization Agent</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{fileName || "No file loaded"}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setShowConfig((v) => !v)} style={{ background: showConfig ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${showConfig ? "rgba(249,115,22,0.4)" : "rgba(255,255,255,0.1)"}`, borderRadius: 6, color: showConfig ? "#f97316" : "#94a3b8", fontSize: 12, padding: "6px 12px", cursor: "pointer" }}>Config</button>
          <button onClick={() => fileRef.current.click()} style={{ background: "#f97316", color: "#fff", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {hasData ? "Load New CSV" : "Load CSV"}
          </button>
          <input ref={fileRef} type="file" accept=".csv" onChange={(e) => handleFile(e.target.files[0])} style={{ display: "none" }} />
        </div>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div style={{ background: "#141825", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "12px 16px", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          {[
            { label: "Business Name",    el: <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Ongoal" style={{ ...inputStyle, width: 150 }} /> },
            { label: "Business Description", el: <input value={businessDesc} onChange={(e) => setBusinessDesc(e.target.value)} placeholder="e.g. padel equipment retailer" style={{ ...inputStyle, width: 200 }} /> },
            { label: "Language", el: (
              <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }}>
                {["English","Danish","Swedish","Norwegian","German","Dutch","French","Spanish"].map((l) => <option key={l}>{l}</option>)}
              </select>
            )},
            { label: "Funnel Stage", el: (
              <select value={funnelStage} onChange={(e) => setFunnelStage(e.target.value)} style={{ ...inputStyle, colorScheme: "dark", width: 220 }}>
                {FUNNEL_STAGES.map((s) => <option key={s}>{s}</option>)}
              </select>
            )},
            { label: "Min. Impressions", el: (
              <input type="number" value={minImpressions} onChange={(e) => setMinImpressions(parseInt(e.target.value) || 50)} style={{ ...inputStyle, width: 70 }} />
            )},
          ].map(({ label, el }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{label}</div>
              {el}
            </div>
          ))}
        </div>
      )}

      {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "8px 16px", fontSize: 12 }}>{error}</div>}

      <div style={{ flex: 1, overflow: "auto" }}>
        {!hasData && (
          <div
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current.click()}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 320, gap: 12, color: "#64748b", cursor: "pointer", border: "2px dashed rgba(255,255,255,0.07)", margin: 24, borderRadius: 12 }}
          >
            <div style={{ width: 40, height: 40, background: "rgba(249,115,22,0.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>↑</div>
            <div style={{ fontSize: 13, textAlign: "center", lineHeight: 1.7 }}>
              Drop your CSV export here or <strong style={{ color: "#f97316" }}>click to browse</strong>
            </div>
            <div style={{ fontSize: 11, color: "#475569", textAlign: "center", maxWidth: 500, lineHeight: 1.7 }}>
              Required: Campaign, Ad Group, Asset Type, Asset Text, Impressions, Clicks, CTR, Conv. Rate, Conversions<br />
              Optional: Cost, Conv. Value, RPI (Revenue / Impr.), CPI (Conv. / Impr.)
            </div>
          </div>
        )}

        {hasData && (
          <>
            {/* Stats row */}
            <div style={{ display: "flex", gap: 8, padding: "10px 16px", flexWrap: "wrap" }}>
              {[
                { label: "Assets",       value: classifiedRows.length.toLocaleString() },
                { label: "Impressions",  value: fmt(totalImpr, "num") },
                { label: "Clicks",       value: fmt(totalClicks, "num") },
                { label: "Avg CTR",      value: fmt(stats.avgCTR, "pct") },
                { label: "Avg CVR",      value: fmt(stats.avgCVR, "pct") },
                { label: "Conversions",  value: fmt(totalConv, "num") },
                { label: "Avg CPI",      value: avgCPI > 0 ? (avgCPI * 100).toFixed(4) + "%" : "—" },
                { label: "Flagged",      value: underperformerCount, accent: underperformerCount > 0 ? "#ef4444" : undefined },
              ].map((s) => (
                <div key={s.label} style={{ background: "#141825", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "10px 14px", minWidth: 80 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: s.accent || "#f1f5f9" }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Tab + filters + actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 8px", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex" }}>
                  {["HEADLINE", "DESCRIPTION"].map((t, i) => (
                    <button key={t} onClick={() => { setTab(t); setSelected(new Set()); setCampaignFilter("__all__"); setAdGroupFilter("__all__"); }}
                      style={{ background: tab === t ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderLeft: i === 1 ? "none" : undefined, borderRadius: i === 0 ? "6px 0 0 6px" : "0 6px 6px 0", color: tab === t ? "#f97316" : "#94a3b8", fontSize: 12, fontWeight: 600, padding: "6px 14px", cursor: "pointer" }}>
                      {t}S
                    </button>
                  ))}
                </div>
                <select value={campaignFilter} onChange={(e) => { setCampaignFilter(e.target.value); setAdGroupFilter("__all__"); }} style={{ ...inputStyle, colorScheme: "dark", maxWidth: 220 }}>
                  <option value="__all__">All Campaigns ({campaigns.length})</option>
                  {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={adGroupFilter} onChange={(e) => setAdGroupFilter(e.target.value)} style={{ ...inputStyle, colorScheme: "dark", maxWidth: 180 }}>
                  <option value="__all__">All Ad Groups ({adGroups.length})</option>
                  {adGroups.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={selectFlagged} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, color: "#ef4444", fontSize: 12, fontWeight: 600, padding: "6px 12px", cursor: "pointer" }}>Select Flagged</button>
                <button onClick={analyzeAndGenerate} disabled={selected.size === 0 || analyzing}
                  style={{ background: selected.size > 0 && !analyzing ? "#f97316" : "rgba(255,255,255,0.08)", border: "none", borderRadius: 6, color: selected.size > 0 && !analyzing ? "#fff" : "#64748b", fontSize: 12, fontWeight: 600, padding: "6px 14px", cursor: selected.size > 0 && !analyzing ? "pointer" : "not-allowed" }}>
                  {analyzing ? "Analyzing..." : `Analyze & Generate (${selected.size})`}
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    {["", "Asset", "Campaign / Ad Group", "Impr.", "Clicks", "CTR", "Conv.", "CVR", "CPI", ...(hasRPI ? ["RPI"] : []), "Status"].map((col) => (
                      <th key={col} style={{ padding: "6px 8px", textAlign: "left", color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, whiteSpace: "nowrap" }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classifiedRows.map((r, i) => {
                    const isSel = selected.has(r.asset_text);
                    const ctrColor = r.ctr !== null && stats.avgCTR > 0
                      ? r.ctr > stats.avgCTR * 1.2 ? "#22c55e" : r.ctr < stats.avgCTR * 0.7 ? "#f97316" : "#f1f5f9"
                      : "#94a3b8";
                    const cpiColor = r.cpi !== null && stats.avgCPI > 0
                      ? r.cpi > stats.avgCPI * 1.2 ? "#22c55e" : r.cpi < stats.avgCPI * 0.7 ? "#f97316" : "#f1f5f9"
                      : "#94a3b8";
                    const rpiColor = r.rpi !== null ? "#94a3b8" : "#475569";
                    const statusColor = STATUS_COLORS[r.status] || "#94a3b8";
                    return (
                      <tr key={i} onClick={() => toggleRow(r.asset_text)}
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", background: isSel ? "rgba(249,115,22,0.06)" : "transparent", cursor: "pointer" }}
                        onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isSel ? "rgba(249,115,22,0.06)" : "transparent"; }}>
                        <td style={{ padding: "7px 8px", width: 32 }}>
                          <div style={{ width: 16, height: 16, borderRadius: 3, border: `1px solid ${isSel ? "#f97316" : "rgba(255,255,255,0.2)"}`, background: isSel ? "#f97316" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff" }}>{isSel ? "✓" : ""}</div>
                        </td>
                        <td style={{ padding: "7px 8px", maxWidth: 200 }}>
                          <div style={{ color: "#f1f5f9" }}>{r.asset_text}</div>
                        </td>
                        <td style={{ padding: "7px 8px", maxWidth: 180 }}>
                          <div style={{ color: "#64748b", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>{r.campaign_name}</div>
                          {r.ad_group && <div style={{ color: "#475569", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>{r.ad_group}</div>}
                        </td>
                        <td style={{ padding: "7px 8px", fontFamily: "'IBM Plex Mono', monospace", color: "#94a3b8", whiteSpace: "nowrap" }}>{fmt(r.impressions, "num")}</td>
                        <td style={{ padding: "7px 8px", fontFamily: "'IBM Plex Mono', monospace", color: "#94a3b8", whiteSpace: "nowrap" }}>{fmt(r.clicks, "num")}</td>
                        <td style={{ padding: "7px 8px", fontFamily: "'IBM Plex Mono', monospace", color: ctrColor, whiteSpace: "nowrap" }}>{fmt(r.ctr, "pct")}</td>
                        <td style={{ padding: "7px 8px", fontFamily: "'IBM Plex Mono', monospace", color: r.conversions > 0 ? "#22c55e" : "#64748b", whiteSpace: "nowrap" }}>{fmt(r.conversions, "num")}</td>
                        <td style={{ padding: "7px 8px", fontFamily: "'IBM Plex Mono', monospace", color: "#94a3b8", whiteSpace: "nowrap" }}>{fmt(r.cvr, "pct")}</td>
                        <td style={{ padding: "7px 8px", fontFamily: "'IBM Plex Mono', monospace", color: cpiColor, whiteSpace: "nowrap" }}>
                          {r.cpi !== null ? (r.cpi * 100).toFixed(4) + "%" : "—"}
                        </td>
                        {hasRPI && (
                          <td style={{ padding: "7px 8px", fontFamily: "'IBM Plex Mono', monospace", color: rpiColor, whiteSpace: "nowrap" }}>
                            {r.rpi !== null ? r.rpi.toFixed(5) : "—"}
                          </td>
                        )}
                        <td style={{ padding: "7px 8px" }}>
                          <span style={{ background: statusColor + "1e", border: `1px solid ${statusColor}22`, color: statusColor, fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>{r.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Analysis results */}
            {(analyzing || analysisResults) && (
              <div style={{ margin: "16px", background: "#141825", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: analyzing ? "#eab308" : "#22c55e", animation: analyzing ? "pulse 1s infinite" : "none" }} />
                  {analyzing ? "Generating AI analysis and replacement copy..." : `Analysis complete — ${analysisResults?.length} assets diagnosed`}
                </div>
                {analysisResults && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {analysisResults.map((result, i) => (
                      <div key={i} style={{ background: "#0c0f17", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 14 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                          <span style={{ background: result.priority === "high" ? "rgba(239,68,68,0.15)" : "rgba(249,115,22,0.15)", color: result.priority === "high" ? "#ef4444" : "#f97316", border: `1px solid ${result.priority === "high" ? "#ef444422" : "#f9731622"}`, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, flexShrink: 0 }}>{(result.priority || "MED").toUpperCase()}</span>
                          {result.copy_component && (
                            <span style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, flexShrink: 0 }}>{result.copy_component}</span>
                          )}
                          <div style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>"{result.original}"</div>
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10, lineHeight: 1.55 }}>{result.diagnosis}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {(result.replacements || []).map((rep, j) => (
                            <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 6, padding: "6px 10px" }}>
                              <span style={{ color: "#22c55e", fontSize: 12, flexShrink: 0 }}>→</span>
                              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#f1f5f9", flex: 1 }}>{rep}</span>
                              <span style={{ fontSize: 10, color: rep.length > (tab === "HEADLINE" ? 30 : 90) ? "#ef4444" : "#64748b", flexShrink: 0 }}>{rep.length} chars</span>
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
