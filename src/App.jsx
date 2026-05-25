import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const PATTERNS = [
  "Sobrepensamiento / rumiación", "Evitación emocional", "Hiperfuncionamiento",
  "Desconexión corporal", "Autoabandono", "Hiperautoexigencia / perfeccionismo",
  "Evitación conductual", "Desregulación emocional", "Complacencia / necesidad de validación",
  "Ansiedad anticipatoria", "Hipercontrol", "Otro"
];
const REGULATION = ["Alta", "Media", "Baja"];
const STAGES = ["Claridad", "Comprensión", "Regulación", "Cambio conductual"];

const C = {
  bg: "#0a0a0c", surface: "#111114", border: "#1c1c22", borderHover: "#2e2e38",
  accent: "#b8956a", text: "#e2ddd6", textMuted: "#6b6b7a", textDim: "#3a3a45",
};

const S = {
  input: {
    background: "transparent", border: `1px solid ${C.border}`, borderRadius: 0,
    color: C.text, padding: "10px 14px", fontSize: "13px", fontFamily: "'Georgia', serif",
    width: "100%", boxSizing: "border-box", outline: "none",
  },
  label: {
    fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase",
    color: C.textMuted, display: "block", marginBottom: "6px",
  },
  primary: {
    background: C.accent, border: "none", color: C.bg, padding: "10px 24px",
    cursor: "pointer", fontSize: "12px", letterSpacing: "0.12em",
    fontFamily: "'Georgia', serif", textTransform: "uppercase",
  },
  ghost: {
    background: "transparent", border: `1px solid ${C.border}`, color: C.textMuted,
    padding: "8px 18px", cursor: "pointer", fontSize: "12px", fontFamily: "'Georgia', serif",
  },
};

function Tag({ label }) {
  return <span style={{ background: "#16161c", border: `1px solid ${C.border}`, color: C.textMuted, padding: "3px 10px", fontSize: "10px", marginRight: "6px", marginBottom: "6px", display: "inline-block" }}>{label}</span>;
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <div style={{ fontSize: "10px", letterSpacing: "0.25em", textTransform: "uppercase", color: C.accent, marginBottom: "14px", paddingBottom: "8px", borderBottom: `1px solid ${C.border}` }}>{title}</div>
      {children}
    </div>
  );
}

function ImportSession({ patient, onSave, onCancel }) {
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const buildPatientContext = () => {
    const sessions = patient.sessions || [];
    const sessionSummary = sessions.map((s, i) =>
      `Sesión ${i + 1} (${s.date}): Emergió: ${s.emerged || "—"}. Patrones: ${s.patterns || "—"}. Tarea: ${s.task || "—"}. Resultado: ${s.task_result || "—"}. Etapa: ${s.stage}.`
    ).join("\n");
    return `PACIENTE: ${patient.name} | Edad: ${patient.age || "—"} | Etapa: ${patient.stage || "—"}
Patrón: ${patient.predominant_pattern || "—"}
Hipótesis: ${patient.initial_hypothesis || "—"}
Sesiones previas (${sessions.length}):
${sessionSummary || "Primera sesión."}`;
  };

  const processSession = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const prompt = `Eres una asistente clínica especializada en TCC y regulación emocional. Procesa este texto de sesión terapéutica y genera un JSON con exactamente esta estructura (sin texto adicional, sin markdown):
{"emerged":"qué emergió emocionalmente","patterns":"patrones clínicos observados","regulation_level":"Alta, Media o Baja","stage":"Claridad, Comprensión, Regulación o Cambio conductual","task_result":"Realizada, Parcial, No realizada, o Primera sesión","task":"tarea sugerida con objetivo clínico","notes":"hipótesis emergentes y observaciones","clinical_summary":"resumen clínico en 3-5 líneas","new_patterns":"patrones nuevos detectados","updated_hypothesis":"hipótesis actualizada","next_session_script":"guión sugerido para próxima sesión","therapeutic_warnings":"señales de alerta clínica"}

CONTEXTO: ${buildPatientContext()}
TEXTO: ${rawText}`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
      });
      const data = await res.json();
      const text = data.content?.map(i => i.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      setResult(JSON.parse(clean));
    } catch (err) {
      setError("Error al procesar. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const confirmSave = async () => {
    if (!result) return;
    await onSave({
      patient_id: patient.id,
      date,
      session_number: (patient.sessions?.length || 0) + 1,
      emerged: result.emerged,
      patterns: result.patterns,
      regulation_level: result.regulation_level,
      stage: result.stage,
      task_result: result.task_result,
      task: result.task,
      notes: result.notes + "\n\nResumen: " + result.clinical_summary + "\n\nPatrones nuevos: " + result.new_patterns + "\n\nHipótesis actualizada: " + result.updated_hypothesis + "\n\nGuión próxima sesión: " + result.next_session_script + "\n\nAlertas: " + result.therapeutic_warnings,
    });
  };

  return (
    <div style={{ maxWidth: "700px" }}>
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "10px", letterSpacing: "0.2em", color: C.accent, marginBottom: "6px", textTransform: "uppercase" }}>{patient.name} — Sesión {(patient.sessions?.length || 0) + 1}</div>
        <h3 style={{ fontSize: "20px", fontWeight: "400", color: C.text, margin: "0 0 8px" }}>Importar sesión</h3>
        <p style={{ color: C.textMuted, fontSize: "13px", margin: 0 }}>Pega la transcripción de Encuadrados, tus apuntes o el guión. La IA estructura todo.</p>
      </div>
      <div style={{ marginBottom: "16px" }}>
        <label style={S.label}>Fecha</label>
        <input type="date" style={{ ...S.input, width: "200px" }} value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <div style={{ marginBottom: "20px" }}>
        <label style={S.label}>Texto de la sesión</label>
        <textarea style={{ ...S.input, minHeight: "220px", resize: "vertical", lineHeight: "1.7" }} value={rawText} onChange={e => setRawText(e.target.value)} placeholder="Pega aquí la transcripción, apuntes o guión..." />
      </div>
      {!result && (
        <div style={{ display: "flex", gap: "12px" }}>
          <button style={S.ghost} onClick={onCancel}>Cancelar</button>
          <button onClick={processSession} disabled={loading || !rawText.trim()} style={{ ...S.primary, opacity: loading || !rawText.trim() ? 0.4 : 1 }}>
            {loading ? "Procesando con IA..." : "Procesar sesión →"}
          </button>
        </div>
      )}
      {error && <div style={{ color: "#c47a7a", fontSize: "13px", marginTop: "12px" }}>{error}</div>}
      {result && (
        <div style={{ marginTop: "24px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.25em", color: C.accent, textTransform: "uppercase", marginBottom: "20px" }}>Output clínico — revisa antes de guardar</div>
          {[
            { key: "clinical_summary", label: "Resumen clínico" },
            { key: "emerged", label: "Qué emergió" },
            { key: "patterns", label: "Patrones observados" },
            { key: "new_patterns", label: "Patrones nuevos" },
            { key: "updated_hypothesis", label: "Hipótesis actualizada" },
            { key: "task", label: "Tarea para esta semana" },
            { key: "next_session_script", label: "Guión próxima sesión" },
            { key: "therapeutic_warnings", label: "Señales de alerta" },
          ].map(({ key, label }) => result[key] && (
            <div key={key} style={{ marginBottom: "16px" }}>
              <label style={S.label}>{label}</label>
              <div style={{ background: "#0d0d10", border: `1px solid ${C.border}`, padding: "14px", fontSize: "13px", lineHeight: "1.7", color: C.text, whiteSpace: "pre-wrap" }}>{result[key]}</div>
            </div>
          ))}
          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button style={S.ghost} onClick={() => setResult(null)}>Volver a procesar</button>
            <button style={S.primary} onClick={confirmSave}>Guardar en expediente →</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewPatientForm({ onSave, onCancel }) {
  const [mode, setMode] = useState("import");
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", age: "", consultation_reason: "", main_discomfort: "",
    predominant_pattern: "", regulation_level: "", automatic_thoughts: "",
    physical_responses: "", avoidance_behaviors: "", relevant_history: "",
    resources: "", initial_hypothesis: "", stage: "Claridad", notes: ""
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const importFromText = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          messages: [{ role: "user", content: `Extrae información clínica y devuelve SOLO un JSON válido sin markdown:\n${rawText}\n\nJSON: {"name":"","age":"","consultation_reason":"","main_discomfort":"","predominant_pattern":"","regulation_level":"Alta/Media/Baja","automatic_thoughts":"","physical_responses":"","avoidance_behaviors":"","relevant_history":"","resources":"","initial_hypothesis":"","stage":"Claridad/Comprensión/Regulación/Cambio conductual","notes":""}` }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(i => i.text || "").join("") || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setForm(f => ({ ...f, ...parsed }));
      setMode("manual");
    } catch {
      alert("Error al procesar.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    await onSave(form);
  };

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", paddingBottom: "60px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "10px", letterSpacing: "0.25em", color: C.accent, marginBottom: "8px", textTransform: "uppercase" }}>Nuevo expediente</div>
        <h2 style={{ fontSize: "22px", fontWeight: "400", color: C.text, margin: "0 0 16px" }}>Mapa clínico inicial</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setMode("import")} style={{ ...S.primary, fontSize: "11px", padding: "8px 18px" }}>Importar desde texto →</button>
          <button onClick={() => setMode("manual")} style={{ ...S.ghost, fontSize: "11px" }}>Llenar manualmente</button>
        </div>
      </div>
      {mode === "import" && (
        <div style={{ marginBottom: "28px" }}>
          <label style={S.label}>Pega aquí la información del paciente</label>
          <textarea style={{ ...S.input, minHeight: "200px", resize: "vertical", lineHeight: "1.7" }} value={rawText} onChange={e => setRawText(e.target.value)} placeholder="Pega el resumen de ChatGPT, apuntes clínicos o cualquier texto..." />
          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button style={S.ghost} onClick={() => setMode("manual")}>Llenar manualmente</button>
            <button onClick={importFromText} disabled={loading || !rawText.trim()} style={{ ...S.primary, opacity: loading || !rawText.trim() ? 0.4 : 1 }}>
              {loading ? "Procesando..." : "Extraer información →"}
            </button>
          </div>
        </div>
      )}
      {mode === "manual" && (
        <>
          <Section title="Identificación">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div><label style={S.label}>Nombre *</label><input style={S.input} value={form.name} onChange={e => set("name", e.target.value)} /></div>
              <div><label style={S.label}>Edad</label><input style={S.input} value={form.age} onChange={e => set("age", e.target.value)} /></div>
            </div>
          </Section>
          <Section title="Motivo de consulta">
            <div style={{ marginBottom: "14px" }}><label style={S.label}>¿Qué trae al paciente?</label><textarea style={{ ...S.input, minHeight: "80px", resize: "vertical" }} value={form.consultation_reason} onChange={e => set("consultation_reason", e.target.value)} /></div>
            <div><label style={S.label}>¿Cómo lo vive internamente?</label><textarea style={{ ...S.input, minHeight: "70px", resize: "vertical" }} value={form.main_discomfort} onChange={e => set("main_discomfort", e.target.value)} /></div>
          </Section>
          <Section title="Mapa de funcionamiento">
            <div style={{ marginBottom: "14px" }}><label style={S.label}>Patrón predominante</label>
              <select style={{ ...S.input, cursor: "pointer" }} value={form.predominant_pattern} onChange={e => set("predominant_pattern", e.target.value)}>
                <option value="">Seleccionar...</option>{PATTERNS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div><label style={S.label}>Regulación</label>
                <select style={{ ...S.input, cursor: "pointer" }} value={form.regulation_level} onChange={e => set("regulation_level", e.target.value)}>
                  <option value="">Seleccionar...</option>{REGULATION.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div><label style={S.label}>Etapa</label>
                <select style={{ ...S.input, cursor: "pointer" }} value={form.stage} onChange={e => set("stage", e.target.value)}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: "14px" }}><label style={S.label}>Pensamientos automáticos</label><textarea style={{ ...S.input, minHeight: "70px", resize: "vertical" }} value={form.automatic_thoughts} onChange={e => set("automatic_thoughts", e.target.value)} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div><label style={S.label}>Respuestas corporales</label><textarea style={{ ...S.input, minHeight: "70px", resize: "vertical" }} value={form.physical_responses} onChange={e => set("physical_responses", e.target.value)} /></div>
              <div><label style={S.label}>Conductas de evitación</label><textarea style={{ ...S.input, minHeight: "70px", resize: "vertical" }} value={form.avoidance_behaviors} onChange={e => set("avoidance_behaviors", e.target.value)} /></div>
            </div>
          </Section>
          <Section title="Historia y recursos">
            <div style={{ marginBottom: "14px" }}><label style={S.label}>Historia relevante</label><textarea style={{ ...S.input, minHeight: "80px", resize: "vertical" }} value={form.relevant_history} onChange={e => set("relevant_history", e.target.value)} /></div>
            <div><label style={S.label}>Recursos y fortalezas</label><textarea style={{ ...S.input, minHeight: "60px", resize: "vertical" }} value={form.resources} onChange={e => set("resources", e.target.value)} /></div>
          </Section>
          <Section title="Hipótesis clínica inicial">
            <textarea style={{ ...S.input, minHeight: "90px", resize: "vertical" }} value={form.initial_hypothesis} onChange={e => set("initial_hypothesis", e.target.value)} />
          </Section>
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button style={S.ghost} onClick={onCancel}>Cancelar</button>
            <button style={{ ...S.primary, opacity: form.name.trim() ? 1 : 0.4 }} onClick={handleSave}>Crear expediente →</button>
          </div>
        </>
      )}
    </div>
  );
}

function AIAssistant({ patient }) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const buildContext = () => {
    const sessions = patient.sessions || [];
    const sessionSummary = sessions.map((s, i) => `Sesión ${i + 1} (${s.date}): Emergió: ${s.emerged || "—"}. Patrones: ${s.patterns || "—"}. Tarea: ${s.task || "—"}.`).join("\n");
    return `PACIENTE: ${patient.name} | Etapa: ${patient.stage || "—"} | Patrón: ${patient.predominant_pattern || "—"}
Hipótesis: ${patient.initial_hypothesis || "—"}
SESIONES:\n${sessionSummary || "Sin sesiones."}`;
  };

  const ask = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: `Eres asistente clínica especializada en TCC. Secuencia: observación → comprensión → cambio. Priorizas patrones sobre diagnósticos.\n\n${buildContext()}\n\nCONSULTA: ${query}\n\nResponde en español, máximo 350 palabras.` }] })
      });
      const data = await res.json();
      setResponse(data.content?.map(i => i.text || "").join("\n") || "Sin respuesta.");
    } catch {
      setResponse("Error al conectar.");
    } finally {
      setLoading(false);
    }
  };

  const quickQueries = [
    "¿Qué loop emocional observas?", "¿Qué tarea sugiere el momento actual?",
    "¿Qué narrativa sostiene el malestar?", "Genera guión para próxima sesión",
    "¿Qué señales de alerta observas?",
  ];

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <label style={S.label}>Consulta al asistente clínico</label>
        <textarea style={{ ...S.input, minHeight: "80px", resize: "vertical" }} value={query} onChange={e => setQuery(e.target.value)} placeholder="Pregúntale algo sobre este caso..." />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
        {quickQueries.map((q, i) => <button key={i} onClick={() => setQuery(q)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.textMuted, padding: "5px 12px", cursor: "pointer", fontSize: "11px", fontFamily: "Georgia, serif" }}>{q}</button>)}
      </div>
      <button onClick={ask} disabled={loading || !query.trim()} style={{ ...S.primary, opacity: loading || !query.trim() ? 0.4 : 1, marginBottom: "20px" }}>
        {loading ? "Consultando..." : "Consultar →"}
      </button>
      {response && <div style={{ background: "#0d0d10", border: `1px solid ${C.border}`, padding: "20px", fontSize: "13px", lineHeight: "1.8", color: C.text, whiteSpace: "pre-wrap" }}>{response}</div>}
    </div>
  );
}

function PatientDetail({ patient, onBack, onUpdate }) {
  const [view, setView] = useState("profile");
  const [addingSession, setAddingSession] = useState(false);
  const sessions = patient.sessions || [];

  const saveSession = async (sessionData) => {
    const { data, error } = await supabase.from("sessions").insert([sessionData]).select();
    if (!error && data) {
      const updated = { ...patient, sessions: [...sessions, data[0]], stage: sessionData.stage };
      onUpdate(updated);
      setAddingSession(false);
    }
  };

  const tabs = [["profile", "Perfil"], [`sessions`, `Sesiones (${sessions.length})`], ["ai", "Asistente IA"]];

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
        <button onClick={onBack} style={{ ...S.ghost, padding: "6px 12px", fontSize: "11px" }}>← Pacientes</button>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "400", color: C.text, margin: 0 }}>{patient.name}</h2>
          <div style={{ fontSize: "12px", color: C.textMuted, marginTop: "2px" }}>{patient.age && `${patient.age} años · `}{sessions.length} sesiones · Etapa: {patient.stage}</div>
        </div>
      </div>
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: "28px" }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} style={{ background: "transparent", border: "none", borderBottom: view === id ? `2px solid ${C.accent}` : "2px solid transparent", color: view === id ? C.accent : C.textMuted, padding: "10px 20px", cursor: "pointer", fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Georgia, serif", marginBottom: "-1px" }}>{label}</button>
        ))}
      </div>
      {view === "profile" && (
        <div>
          {patient.consultation_reason && <Section title="Motivo de consulta"><p style={{ color: C.text, fontSize: "14px", lineHeight: "1.7", margin: 0 }}>{patient.consultation_reason}</p></Section>}
          <Section title="Mapa de funcionamiento">
            <div style={{ display: "flex", flexWrap: "wrap", marginBottom: "16px" }}>
              {patient.predominant_pattern && <Tag label={patient.predominant_pattern} />}
              {patient.stage && <Tag label={patient.stage} />}
              {patient.regulation_level && <Tag label={`Regulación ${patient.regulation_level}`} />}
            </div>
            {patient.automatic_thoughts && <div style={{ marginBottom: "12px" }}><div style={S.label}>Pensamientos automáticos</div><p style={{ color: C.text, fontSize: "13px", lineHeight: "1.7", margin: 0 }}>{patient.automatic_thoughts}</p></div>}
            {patient.avoidance_behaviors && <div><div style={S.label}>Conductas de evitación</div><p style={{ color: C.text, fontSize: "13px", lineHeight: "1.7", margin: 0 }}>{patient.avoidance_behaviors}</p></div>}
          </Section>
          {patient.initial_hypothesis && <Section title="Hipótesis clínica"><p style={{ color: C.text, fontSize: "14px", lineHeight: "1.8", margin: 0, fontStyle: "italic", borderLeft: `2px solid ${C.accent}`, paddingLeft: "16px" }}>{patient.initial_hypothesis}</p></Section>}
        </div>
      )}
      {view === "sessions" && (
        <div>
          {addingSession ? (
            <ImportSession patient={patient} onSave={saveSession} onCancel={() => setAddingSession(false)} />
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
                <button style={S.primary} onClick={() => setAddingSession(true)}>+ Registrar sesión</button>
              </div>
              {sessions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: C.textMuted }}>Sin sesiones registradas aún.</div>
              ) : (
                [...sessions].reverse().map((s, i) => (
                  <div key={s.id} style={{ border: `1px solid ${C.border}`, padding: "20px", marginBottom: "12px", background: C.surface }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                      <span style={{ fontSize: "13px", color: C.text }}>Sesión {sessions.length - i} · {s.date}</span>
                      <div style={{ display: "flex", gap: "6px" }}><Tag label={s.stage} />{s.task_result && <Tag label={s.task_result} />}</div>
                    </div>
                    {s.emerged && <div style={{ marginBottom: "10px" }}><div style={S.label}>Emergió</div><p style={{ color: C.text, fontSize: "13px", lineHeight: "1.6", margin: 0 }}>{s.emerged}</p></div>}
                    {s.task && <div style={{ marginBottom: "10px" }}><div style={S.label}>Tarea</div><p style={{ color: C.accent, fontSize: "13px", lineHeight: "1.6", margin: 0 }}>{s.task}</p></div>}
                    {s.notes && <div><div style={S.label}>Notas</div><p style={{ color: C.textMuted, fontSize: "13px", lineHeight: "1.6", margin: 0, whiteSpace: "pre-wrap" }}>{s.notes}</p></div>}
                  </div>
                ))
              )}
            </>
          )}
        </div>
      )}
      {view === "ai" && <AIAssistant patient={patient} />}
    </div>
  );
}

export default function App() {
  const [patients, setPatients] = useState([]);
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [loadingPatients, setLoadingPatients] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoadingPatients(true);
    const { data: patientsData } = await supabase.from("patients").select("*").order("created_at", { ascending: false });
    if (patientsData) {
      const patientsWithSessions = await Promise.all(
        patientsData.map(async (p) => {
          const { data: sessions } = await supabase.from("sessions").select("*").eq("patient_id", p.id).order("session_number", { ascending: true });
          return { ...p, sessions: sessions || [] };
        })
      );
      setPatients(patientsWithSessions);
    }
    setLoadingPatients(false);
  };

  const addPatient = async (formData) => {
    const { data, error } = await supabase.from("patients").insert([formData]).select();
    if (!error && data) {
      setPatients(ps => [{ ...data[0], sessions: [] }, ...ps]);
      setView("list");
    }
  };

  const updatePatient = (updated) => {
    setPatients(ps => ps.map(p => p.id === updated.id ? updated : p));
    setSelected(updated);
  };

  const openPatient = (p) => { setSelected(p); setView("detail"); };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Georgia', serif", color: C.text }}>
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: C.bg, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "14px" }}>
          <button onClick={() => setView("list")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <span style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "0.14em", color: C.text }}>CONTINUUM</span>
          </button>
          <span style={{ fontSize: "10px", letterSpacing: "0.2em", color: C.textDim, textTransform: "uppercase" }}>Expedientes clínicos</span>
        </div>
        {view === "list" && <button style={S.primary} onClick={() => setView("new")}>+ Nuevo paciente</button>}
      </div>
      <div style={{ padding: "40px 32px" }}>
        {view === "new" && <NewPatientForm onSave={addPatient} onCancel={() => setView("list")} />}
        {view === "detail" && selected && <PatientDetail patient={selected} onBack={() => setView("list")} onUpdate={updatePatient} />}
        {view === "list" && (
          <div style={{ maxWidth: "760px", margin: "0 auto" }}>
            {loadingPatients ? (
              <div style={{ textAlign: "center", padding: "80px", color: C.textMuted }}>Cargando expedientes...</div>
            ) : patients.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <div style={{ fontSize: "10px", letterSpacing: "0.25em", color: C.textDim, textTransform: "uppercase", marginBottom: "16px" }}>Sin expedientes</div>
                <p style={{ color: C.textMuted, fontSize: "14px", marginBottom: "28px", lineHeight: "1.7" }}>Crea el primer expediente clínico<br />o importa la información desde texto.</p>
                <button style={S.primary} onClick={() => setView("new")}>+ Crear primer expediente</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: "10px", letterSpacing: "0.2em", color: C.textMuted, textTransform: "uppercase", marginBottom: "20px" }}>{patients.length} expediente{patients.length !== 1 ? "s" : ""}</div>
                {patients.map(p => (
                  <div key={p.id} onClick={() => openPatient(p)}
                    style={{ border: `1px solid ${C.border}`, padding: "20px 24px", marginBottom: "10px", cursor: "pointer", background: C.surface, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.borderHover}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                  >
                    <div>
                      <div style={{ fontSize: "15px", color: C.text, marginBottom: "6px" }}>{p.name}</div>
                      <div style={{ display: "flex", flexWrap: "wrap" }}>
                        {p.predominant_pattern && <Tag label={p.predominant_pattern} />}
                        {p.stage && <Tag label={p.stage} />}
                        {p.regulation_level && <Tag label={`Regulación ${p.regulation_level}`} />}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "16px" }}>
                      <div style={{ fontSize: "20px", color: C.accent, fontWeight: "300" }}>{p.sessions?.length || 0}</div>
                      <div style={{ fontSize: "10px", color: C.textMuted, letterSpacing: "0.1em" }}>sesiones</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, padding: "16px 32px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "11px", color: C.textDim }}>CONTINUUM™ — Herramientas clínicas para psicólogos</span>
        <span style={{ fontSize: "11px", color: C.textDim }}>Diseñado desde la psicología</span>
      </div>
    </div>
  );
}
