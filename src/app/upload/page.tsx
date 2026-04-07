"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";

interface MissingField {
  row_index: number;
  field: string;
  suggestion: unknown;
  reason: string;
}

interface Dataset {
  table: string;
  channel: string;
  columns: string[];
  rows: Record<string, unknown>[];
  missing_fields: MissingField[];
  analysis: string;
}

interface AnalysisResult {
  datasets: Dataset[];
  overall_analysis: string;
  error?: string;
}

const fmt = (n: number) => n.toLocaleString();

export default function UploadPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveResults, setSaveResults] = useState<Array<{ table: string; channel: string; inserted: number }>>([]);
  const [fileName, setFileName] = useState("");

  const onDrop = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setLoading(true);
    setError("");
    setSaved(false);
    setResult(null);
    setFileName(files.map(f => f.name).join(", "));

    try {
      // Process each file through Claude analysis
      const allDatasets: Dataset[] = [];
      const analyses: string[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("action", "analyze");

        const res = await fetch("/api/analyze", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Analysis failed");
          continue;
        }

        if (data.datasets) allDatasets.push(...data.datasets);
        if (data.overall_analysis) analyses.push(data.overall_analysis);
      }

      setResult({
        datasets: allDatasets,
        overall_analysis: analyses.join(" "),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCellEdit = (dsIndex: number, rowIndex: number, field: string, value: string) => {
    if (!result) return;
    const updated = { ...result };
    const row = { ...updated.datasets[dsIndex].rows[rowIndex] };

    // Try to parse as number
    const num = Number(value);
    row[field] = value === "" ? null : isNaN(num) ? value : num;
    updated.datasets[dsIndex].rows[rowIndex] = row;

    // Remove from missing_fields if filled
    updated.datasets[dsIndex].missing_fields = updated.datasets[dsIndex].missing_fields.filter(
      mf => !(mf.row_index === rowIndex && mf.field === field)
    );

    setResult({ ...updated });
  };

  const handleApplySuggestion = (dsIndex: number, mf: MissingField) => {
    if (!result || mf.suggestion === null || mf.suggestion === undefined) return;
    handleCellEdit(dsIndex, mf.row_index, mf.field, String(mf.suggestion));
  };

  const handleApplyAllSuggestions = (dsIndex: number) => {
    if (!result) return;
    const ds = result.datasets[dsIndex];
    for (const mf of [...ds.missing_fields]) {
      if (mf.suggestion !== null && mf.suggestion !== undefined) {
        handleApplySuggestion(dsIndex, mf);
      }
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("action", "save");
      formData.append("data", JSON.stringify(result));

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Save failed");
        return;
      }

      setSaveResults(data.results || []);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const totalMissing = result?.datasets.reduce((s, ds) => s + ds.missing_fields.length, 0) || 0;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"],
    },
    multiple: true,
  });

  const isMissing = (dsIndex: number, rowIndex: number, field: string) => {
    if (!result) return false;
    return result.datasets[dsIndex].missing_fields.some(
      mf => mf.row_index === rowIndex && mf.field === field
    );
  };

  const getSuggestion = (dsIndex: number, rowIndex: number, field: string): MissingField | undefined => {
    if (!result) return undefined;
    return result.datasets[dsIndex].missing_fields.find(
      mf => mf.row_index === rowIndex && mf.field === field
    );
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 pl-3.5 border-l-4 border-l-[#5955ff]">
        <h2 className="text-xl font-bold tracking-tight">Upload Data</h2>
        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded text-white bg-[#5955ff]">AI-Powered Analysis</span>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`bg-white rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-all mb-6 ${
          isDragActive ? "border-[#5955ff] bg-[#5955ff]/5" : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        <div className="mb-3">
          <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        {isDragActive ? (
          <p className="text-[#5955ff] font-semibold">Drop files here...</p>
        ) : (
          <>
            <p className="font-semibold text-gray-700 mb-1">Drop your CSV, XLSX, or screenshots here</p>
            <p className="text-sm text-gray-500">Claude will analyze the data, map it to the right channel, and flag anything missing</p>
          </>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center mb-6">
          <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-[#5955ff] rounded-full animate-spin mb-3" />
          <p className="text-gray-600 font-medium">Analyzing with Claude...</p>
          <p className="text-gray-400 text-sm mt-1">Extracting data, identifying gaps, and mapping to channels</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-[#FADBD8] border border-[#C0392B]/20 rounded-xl p-4 mb-6">
          <p className="text-[#C0392B] font-semibold text-sm">{error}</p>
        </div>
      )}

      {/* Analysis Result */}
      {result && !saved && (
        <div>
          {/* Overall Analysis */}
          <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-[#5955ff] p-5 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[13px] font-bold text-[#5955ff] uppercase tracking-wider mb-2">AI Analysis</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{result.overall_analysis}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                {totalMissing > 0 && (
                  <span className="inline-block bg-[#FEF9E7] text-[#b7950b] px-2.5 py-1 rounded text-[11px] font-semibold">
                    {totalMissing} missing field{totalMissing > 1 ? "s" : ""}
                  </span>
                )}
                <span className="inline-block bg-[#D5F5E3] text-[#1E8449] px-2.5 py-1 rounded text-[11px] font-semibold">
                  {result.datasets.length} dataset{result.datasets.length > 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-2">Source: {fileName}</div>
          </div>

          {/* Datasets */}
          {result.datasets.map((ds, di) => (
            <div key={di} className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#5955ff]" />
                  <span className="text-[13px] font-semibold">{ds.channel}</span>
                  <span className="text-[11px] text-gray-400">({ds.rows.length} rows &rarr; {ds.table})</span>
                </div>
                <div className="flex items-center gap-2">
                  {ds.missing_fields.length > 0 && (
                    <button
                      onClick={() => handleApplyAllSuggestions(di)}
                      className="text-[11px] font-semibold text-[#5955ff] hover:text-[#4745cc] transition-colors px-2 py-1 rounded hover:bg-[#5955ff]/5"
                    >
                      Apply all suggestions
                    </button>
                  )}
                </div>
              </div>

              {/* Analysis */}
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <p className="text-xs text-gray-600">{ds.analysis}</p>
              </div>

              {/* Missing fields banner */}
              {ds.missing_fields.length > 0 && (
                <div className="px-4 py-2.5 bg-[#FEF9E7] border-b border-[#f0e68c]">
                  <p className="text-xs font-semibold text-[#b7950b] mb-1">
                    {ds.missing_fields.length} missing field{ds.missing_fields.length > 1 ? "s" : ""} detected
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ds.missing_fields.map((mf, mi) => (
                      <button
                        key={mi}
                        onClick={() => handleApplySuggestion(di, mf)}
                        className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                          mf.suggestion !== null && mf.suggestion !== undefined
                            ? "bg-white border-[#b7950b]/30 text-[#b7950b] hover:bg-[#b7950b]/10 cursor-pointer"
                            : "bg-white border-gray-300 text-gray-500 cursor-default"
                        }`}
                        title={mf.reason}
                      >
                        Row {mf.row_index + 1}: <strong>{mf.field}</strong>
                        {mf.suggestion !== null && mf.suggestion !== undefined && (
                          <span className="ml-1 text-[#1E8449]">&rarr; {String(mf.suggestion)}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Editable table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-gray-500 font-semibold w-8">#</th>
                      {ds.columns.map(col => (
                        <th key={col} className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-gray-500 font-semibold whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ds.rows.map((row, ri) => (
                      <tr key={ri} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 text-[10px] text-gray-400 font-mono">{ri + 1}</td>
                        {ds.columns.map(col => {
                          const missing = isMissing(di, ri, col);
                          const suggestion = getSuggestion(di, ri, col);
                          const val = row[col];
                          return (
                            <td key={col} className={`px-1 py-1 ${missing ? "bg-[#FEF9E7]" : ""}`}>
                              <div className="relative group">
                                <input
                                  type="text"
                                  value={val === null || val === undefined ? "" : String(val)}
                                  onChange={(e) => handleCellEdit(di, ri, col, e.target.value)}
                                  placeholder={suggestion?.suggestion !== null && suggestion?.suggestion !== undefined ? String(suggestion.suggestion) : "—"}
                                  className={`w-full px-2 py-1 text-xs font-mono border rounded transition-colors outline-none ${
                                    missing
                                      ? "border-[#b7950b]/40 bg-[#FEF9E7] placeholder-[#b7950b]/40 focus:border-[#5955ff] focus:bg-white"
                                      : "border-transparent bg-transparent hover:border-gray-300 focus:border-[#5955ff] focus:bg-white"
                                  }`}
                                />
                                {suggestion && suggestion.reason && (
                                  <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap z-10">
                                    {suggestion.reason}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Save button */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">
              {totalMissing > 0 ? (
                <span className="text-[#b7950b]">{totalMissing} field{totalMissing > 1 ? "s" : ""} still empty — you can save anyway or fill them first</span>
              ) : (
                <span className="text-[#1E8449]">All fields complete</span>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-[#1E8449] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#196f3d] transition-colors disabled:opacity-50"
            >
              Save to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      <ChatInterface />

      {/* Saved confirmation */}
      {saved && (
        <div className="bg-[#D5F5E3] border border-[#1E8449]/20 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-[#1E8449] mb-2">Data saved successfully</h3>
          {saveResults.map((r, i) => (
            <p key={i} className="text-sm text-[#1E8449]/80">
              {r.channel}: {r.inserted} rows upserted into {r.table}
            </p>
          ))}
          <div className="flex gap-3 mt-4">
            <a href="/dashboard" className="text-sm font-semibold text-[#1E8449] underline">
              Go to Dashboard &rarr;
            </a>
            <button
              onClick={() => { setSaved(false); setResult(null); setSaveResults([]); }}
              className="text-sm font-semibold text-[#1E8449]/60 hover:text-[#1E8449] underline"
            >
              Upload more
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Chat Interface =====
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10), // last 10 messages for context
        }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages(prev => [...prev, { role: "assistant", content: `Error: ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to connect";
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-6">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full bg-[#5955ff]" />
        <span className="text-[13px] font-semibold">Ask Claude about your data</span>
        <span className="text-[11px] text-gray-400">Analyzes all dashboard data in real-time</span>
      </div>

      {/* Messages */}
      <div className="h-[400px] overflow-y-auto px-5 py-4 space-y-4 bg-gray-50/50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-gray-300 mb-3">
              <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400 mb-1">Ask anything about your GTM performance</p>
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {[
                "What was our best performing week?",
                "Compare YouTube Mar vs Feb",
                "Which cold email campaign should we double down on?",
                "Why did LinkedIn drop in February?",
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(q); }}
                  className="text-[11px] px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:border-[#5955ff] hover:text-[#5955ff] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#5955ff] text-white rounded-br-sm"
                  : "bg-white border border-gray-200 text-gray-700 rounded-bl-sm"
              }`}
            >
              {msg.role === "assistant" ? (
                <div
                  className="prose prose-sm max-w-none [&_p]:my-1.5 [&_ul]:my-1.5 [&_li]:my-0.5 [&_strong]:text-gray-900 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1"
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask about your GTM performance..."
          className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#5955ff] transition-colors"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-[#5955ff] text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#4745cc] transition-colors disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function formatMarkdown(text: string): string {
  return text
    .replace(/### (.*)/g, "<h3>$1</h3>")
    .replace(/## (.*)/g, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/^- (.*)/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*<\/li>)/, "<ul>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}
