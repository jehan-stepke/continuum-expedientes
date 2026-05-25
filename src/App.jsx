import React, { useState } from "react";

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

// ── IMPORT SESSION — texto libre → IA → output clínico completo ──
function ImportSession({ patient, onSave, onCancel }) {
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const buildPatientContext = () => {
    const sessions = patient.sessions || [];
    const sessionSummary = sessions.map((s, i) =>
      `Sesión ${i + 1} (${s.date}): Emergió: ${s.emerged || "—"}. Patrones: ${s.patterns || "—"}. Tarea asignada: ${s.task || "—"}. Resultado tarea: ${s.taskResult || "—"}. Etapa: ${s.stage}.`
    ).join("\n");
    return `PACIENTE: ${patient.name} | Edad: ${patient.age || "—"} | Etapa actual: ${patient.stage || "—"}
Patrón predominante: ${patient.predominantPattern || "—"}
Hipótesis inicial: ${patient.initialHypothesis || "—"}
Sesiones previas (${sessions.length}):
${sessionSummary || "Primera sesión."}`;
  };

  const processSession = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const prompt = `Eres una asistente clínica especializada en la metodología de esta terapeuta (TCC, regulación emocional, trabajo con patrones). Tu tarea es procesar el texto de una sesión terapéutica y generar un output clínico completo.

CONTEXTO DEL PACIENTE:
${buildPatientContext()}

TEXTO DE LA SESIÓN (puede ser transcripción, apuntes crudos, guión, o mezcla):
${rawText}

Genera un JSON con exactamente esta estructura (sin texto adicional, sin markdown):
{
  "emerged": "qué emergió emocionalmente en esta sesión — emociones, reacciones, insights, contradicciones observadas",
  "patterns": "patrones clínicos observados o reforzados en esta sesión",
  "regulationLevel": "Alta, Media o Baja",
  "stage": "Claridad, Comprensión, Regulación o Cambio conductual",
  "taskResult": "Realizada, Parcial, No realizada, o Primera sesión",
  "task": "tarea terapéutica sugerida para esta semana, con objetivo clínico explícito",
  "notes": "hipótesis emergentes, ajustes al plan, observaciones clínicas relevantes",
  "clinicalSummary": "resumen clínico estructurado de la sesión en 3-5 líneas",
  "newPatterns": "patrones nuevos detectados que no estaban en sesiones anteriores",
  "updatedHypothesis": "hipótesis clínica actualizada según lo que emergió hoy",
  "nextSessionScript": "guión sugerido para la próxima sesión: apertura, foco, intervenciones clave, cierre",
  "therapeuticWarnings": "señales de alerta o cuidados clínicos específicos para este momento del proceso"
}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(i => i.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
    } catch (err) {
      setError("Error al procesar. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const confirmSave = () => {
    if (!result) return;
    onSave({
      id: Date.now().toString(),
      date,
      sessionNumber: (patient.sessions?.length || 0) + 1,
      emerged: result.emerged,
      patterns: result.patterns,
      regulationLevel: result.regulationLevel,
      stage: result.stage,
      taskResult: result.taskResult,
      task: result.task,
      notes: result.notes,
      clinicalSummary: result.clinicalSummary,
      newPatterns: result.newPatterns,
      updatedHypothesis: result.updatedHypothesis,
      nextSessionScript: result.nextSessionScript,
      therapeuticWarnings: result.therapeuticWarnings,
      rawText,
    });
  };

  return (
    <div style={{ maxWidth: "700px" }}>
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "10px", letterSpacing: "0.2em", color: C.accent, marginBottom: "6px", textTransform: "uppercase" }}>
          {patient.name} — Sesión {(patient.sessions?.length || 0) + 1}
        </div>
        <h3 style={{ fontSize: "20px", fontWeight: "400", color: C.text, margin: "0 0 8px" }}>Importar sesión</h3>
        <p style={{ color: C.textMuted, fontSize: "13px", margin: 0, lineHeight: "1.6" }}>
          Pega aquí la transcripción de Encuadrados, tus apuntes crudos, el guión, o cualquier texto de la sesión. La IA extrae y estructura todo automáticamente.
        </p>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={S.label}>Fecha de la sesión</label>
        <input type="date" style={{ ...S.input, width: "200px" }} value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={S.label}>Texto de la sesión</label>
        <textarea
          style={{ ...S.input, minHeight: "220px", resize: "vertical", lineHeight: "1.7" }}
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          placeholder="Pega aquí la transcripción, tus apuntes, el guión, o una mezcla de todo..."
        />
      </div>

      {!result && (
        <div style={{ display: "flex", gap: "12px" }}>
          <button style={S.ghost} onClick={onCancel}>Cancelar</button>
          <button
            onClick={processSession}
            disabled={loading || !rawText.trim()}
            style={{ ...S.primary, opacity: loading || !rawText.trim() ? 0.4 : 1 }}
          >
            {loading ? "Procesando con IA..." : "Procesar sesión →"}
          </button>
        </div>
      )}

      {error && <div style={{ color: "#c47a7a", fontSize: "13px", marginTop: "12px" }}>{error}</div>}

      {result && (
        <div style={{ marginTop: "24px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.25em", color: C.accent, textTransform: "uppercase", marginBottom: "20px" }}>
            Output clínico generado — revisa antes de guardar
          </div>

          {[
            { key: "clinicalSummary", label: "Resumen clínico" },
            { key: "emerged", label: "Qué emergió en sesión" },
            { key: "patterns", label: "Patrones observados" },
            { key: "newPatterns", label: "Patrones nuevos detectados" },
            { key: "updatedHypothesis", label: "Hipótesis actualizada" },
            { key: "task", label: "Tarea para esta semana" },
            { key: "nextSessionScript", label: "Guión próxima sesión" },
            { key: "therapeuticWarnings", label: "Señales de alerta clínica" },
            { key: "notes", label: "Notas clínicas adicionales" },
          ].map(({ key, label }) => result[key] && (
            <div key={key} style={{ marginBottom: "16px" }}>
              <label style={S.label}>{label}</label>
              <div style={{ background: "#0d0d10", border: `1px solid ${C.border}`, padding: "14px", fontSize: "13px", lineHeight: "1.7", color: C.text, whiteSpace: "pre-wrap" }}>
                {result[key]}
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
            {result.regulationLevel && <Tag label={`Regulación: ${result.regulationLevel}`} />}
            {result.stage && <Tag label={`Etapa: ${result.stage}`} />}
            {result.taskResult && <Tag label={`Tarea anterior: ${result.taskResult}`} />}
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button style={S.ghost} onClick={() => setResult(null)}>Volver a procesar</button>
            <button style={S.primary} onClick={confirmSave}>Guardar en expediente →</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── NEW PATIENT FORM ──
function NewPatientForm({ onSave, onCancel }) {
  const [mode, setMode] = useState("manual"); // manual | import
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", age: "", consultationReason: "", mainDiscomfort: "",
    predominantPattern: "", regulationLevel: "", automaticThoughts: "",
    physicalResponses: "", avoidanceBehaviors: "", relevantHistory: "",
    resources: "", initialHypothesis: "", stage: "Claridad", notes: ""
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const importFromText = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Extrae información clínica del siguiente texto y devuelve SOLO un JSON válido sin markdown:

${rawText}

JSON con estos campos exactos:
{"name":"","age":"","consultationReason":"","mainDiscomfort":"","predominantPattern":"","regulationLevel":"Alta/Media/Baja","automaticThoughts":"","physicalResponses":"","avoidanceBehaviors":"","relevantHistory":"","resources":"","initialHypothesis":"","stage":"Claridad/Comprensión/Regulación/Cambio conductual","notes":""}`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(i => i.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setForm(f => ({ ...f, ...parsed }));
      setMode("manual");
    } catch {
      alert("Error al procesar. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, id: Date.now().toString(), createdAt: new Date().toISOString(), sessions: [] });
  };

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", paddingBottom: "60px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "10px", letterSpacing: "0.25em", color: C.accent, marginBottom: "8px", textTransform: "uppercase" }}>Nuevo expediente</div>
        <h2 style={{ fontSize: "22px", fontWeight: "400", color: C.text, margin: "0 0 16px" }}>Mapa clínico inicial</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setMode("import")} style={{ ...S.primary, fontSize: "11px", padding: "8px 18px" }}>
            Importar desde texto →
          </button>
          <button onClick={() => setMode("manual")} style={{ ...S.ghost, fontSize: "11px" }}>
            Llenar manualmente
          </button>
        </div>
      </div>

      {mode === "import" && (
        <div style={{ marginBottom: "28px" }}>
          <label style={S.label}>Pega aquí la información del paciente (ChatGPT, apuntes, resumen clínico...)</label>
          <textarea
            style={{ ...S.input, minHeight: "200px", resize: "vertical", lineHeight: "1.7" }}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="Pega toda la información que tengas — la IA la organiza automáticamente en los campos del expediente..."
          />
          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button style={S.ghost} onClick={() => setMode("manual")}>Cancelar</button>
            <button
              onClick={importFromText}
              disabled={loading || !rawText.trim()}
              style={{ ...S.primary, opacity: loading || !rawText.trim() ? 0.4 : 1 }}
            >
              {loading ? "Procesando..." : "Extraer información →"}
            </button>
          </div>
        </div>
      )}

      {mode === "manual" && (
        <>
          <Section title="Identificación">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={S.label}>Nombre / Código *</label>
                <input style={S.input} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Ej: Sara M." />
              </div>
              <div>
                <label style={S.label}>Edad</label>
                <input style={S.input} value={form.age} onChange={e => set("age", e.target.value)} placeholder="Ej: 21" />
              </div>
            </div>
          </Section>

          <Section title="Motivo de consulta">
            <div style={{ marginBottom: "14px" }}>
              <label style={S.label}>¿Qué trae al paciente?</label>
              <textarea style={{ ...S.input, minHeight: "80px", resize: "vertical" }} value={form.consultationReason} onChange={e => set("consultationReason", e.target.value)} placeholder="Lo que expresa el paciente..." />
            </div>
            <div>
              <label style={S.label}>¿Cómo lo vive internamente?</label>
              <textarea style={{ ...S.input, minHeight: "70px", resize: "vertical" }} value={form.mainDiscomfort} onChange={e => set("mainDiscomfort", e.target.value)} placeholder="Qué hay debajo..." />
            </div>
          </Section>

          <Section title="Mapa de funcionamiento">
            <div style={{ marginBottom: "14px" }}>
              <label style={S.label}>Patrón predominante</label>
              <select style={{ ...S.input, cursor: "pointer" }} value={form.predominantPattern} onChange={e => set("predominantPattern", e.target.value)}>
                <option value="">Seleccionar...</option>
                {PATTERNS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div>
                <label style={S.label}>Nivel de regulación</label>
                <select style={{ ...S.input, cursor: "pointer" }} value={form.regulationLevel} onChange={e => set("regulationLevel", e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {REGULATION.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Etapa inicial</label>
                <select style={{ ...S.input, cursor: "pointer" }} value={form.stage} onChange={e => set("stage", e.target.value)}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={S.label}>Pensamientos automáticos</label>
              <textarea style={{ ...S.input, minHeight: "70px", resize: "vertical" }} value={form.automaticThoughts} onChange={e => set("automaticThoughts", e.target.value)} placeholder="Narrativas internas frecuentes..." />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={S.label}>Respuestas corporales</label>
                <textarea style={{ ...S.input, minHeight: "70px", resize: "vertical" }} value={form.physicalResponses} onChange={e => set("physicalResponses", e.target.value)} />
              </div>
              <div>
                <label style={S.label}>Conductas de evitación</label>
                <textarea style={{ ...S.input, minHeight: "70px", resize: "vertical" }} value={form.avoidanceBehaviors} onChange={e => set("avoidanceBehaviors", e.target.value)} />
              </div>
            </div>
          </Section>

          <Section title="Historia y recursos">
            <div style={{ marginBottom: "14px" }}>
              <label style={S.label}>Historia relevante</label>
              <textarea style={{ ...S.input, minHeight: "80px", resize: "vertical" }} value={form.relevantHistory} onChange={e => set("relevantHistory", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Recursos y fortalezas</label>
              <textarea style={{ ...S.input, minHeight: "60px", resize: "vertical" }} value={form.resources} onChange={e => set("resources", e.target.value)} />
            </div>
          </Section>

          <Section title="Hipótesis clínica inicial">
            <textarea style={{ ...S.input, minHeight: "90px", resize: "vertical" }} value={form.initialHypothesis} onChange={e => set("initialHypothesis", e.target.value)} placeholder="Qué patrón veo, qué sostiene esto, por dónde conviene empezar..." />
          </Section>

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button style={S.ghost} onClick={onCancel}>Cancelar</button>
            <button style={{ ...S.primary, opacity: form.name.trim() ? 1 : 0.4 }} onClick={handleSave}>
              Crear expediente →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── AI ASSISTANT ──
function AIAssistant({ patient }) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const buildContext = () => {
    const sessions = patient.sessions || [];
    const sessionSummary = sessions.map((s, i) =>
      `Sesión ${i + 1} (${s.date}): ${s.clinicalSummary || ""} Emergió: ${s.emerged || "—"}. Patrones: ${s.patterns || "—"}. Tarea: ${s.task || "—"}. Resultado: ${s.taskResult || "—"}. Hipótesis actualizada: ${s.updatedHypothesis || "—"}.`
    ).join("\n");
    return `EXPEDIENTE — ${patient.name} | Edad: ${patient.age || "—"} | Etapa: ${patient.stage || "—"}
Motivo: ${patient.consultationReason || "—"}
Patrón: ${patient.predominantPattern || "—"} | Regulación: ${patient.regulationLevel || "—"}
Pensamientos automáticos: ${patient.automaticThoughts || "—"}
Evitación: ${patient.avoidanceBehaviors || "—"}
Historia: ${patient.relevantHistory || "—"}
Recursos: ${patient.resources || "—"}
Hipótesis inicial: ${patient.initialHypothesis || "—"}
SESIONES (${sessions.length}):
${sessionSummary || "Sin sesiones."}`;
  };

  const ask = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Eres un asistente clínico entrenado en la metodología de esta terapeuta. Tu secuencia es observación → comprensión → cambio. Priorizas patrones sobre diagnósticos. Las tareas tienen objetivo clínico estratégico. Nunca empujas insight de forma invasiva.

LÓGICA CLÍNICA:
- El patrón que mantiene el malestar es lo más importante
- Calibras según lo que el paciente puede sostener emocionalmente ahora
- Distingues siempre: dato vs interpretación vs condena
- Las tareas interrumpen o revelan el loop, no solo reducen síntomas
- Paciente racional → tareas corporales/experienciales
- Paciente desbordado → regulación antes que introspección

${buildContext()}

CONSULTA: ${query}

Responde desde esta metodología. Si hay patrones longitudinales, nómbralos. Si sugieres tareas, explica el objetivo clínico. Máximo 350 palabras. En español.`
          }]
        })
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
    "¿Qué loop emocional observas en el historial?",
    "¿Qué tarea se alinea con la etapa actual y el patrón?",
    "¿Qué narrativa interna sostiene el malestar?",
    "¿Qué está evitando este paciente y cuál es el costo?",
    "Genera el guión para la próxima sesión",
    "¿Qué señales de alerta clínica observas?",
  ];

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <label style={S.label}>Consulta al asistente clínico</label>
        <textarea style={{ ...S.input, minHeight: "80px", resize: "vertical" }} value={query} onChange={e => setQuery(e.target.value)} placeholder="Pregúntale algo sobre este caso — conoce todo el historial..." />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
        {quickQueries.map((q, i) => (
          <button key={i} onClick={() => setQuery(q)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.textMuted, padding: "5px 12px", cursor: "pointer", fontSize: "11px", fontFamily: "Georgia, serif" }}>{q}</button>
        ))}
      </div>
      <button onClick={ask} disabled={loading || !query.trim()} style={{ ...S.primary, opacity: loading || !query.trim() ? 0.4 : 1, marginBottom: "20px" }}>
        {loading ? "Consultando..." : "Consultar →"}
      </button>
      {response && (
        <div style={{ background: "#0d0d10", border: `1px solid ${C.border}`, padding: "20px", fontSize: "13px", lineHeight: "1.8", color: C.text, whiteSpace: "pre-wrap" }}>
          {response}
        </div>
      )}
    </div>
  );
}

// ── PATIENT DETAIL ──
function PatientDetail({ patient, onBack, onUpdate }) {
  const [view, setView] = useState("profile");
  const [addingSession, setAddingSession] = useState(false);

  const saveSession = (session) => {
    const updated = {
      ...patient,
      sessions: [...(patient.sessions || []), session],
      stage: session.stage,
      regulationLevel: session.regulationLevel || patient.regulationLevel,
    };
    onUpdate(updated);
    setAddingSession(false);
  };

  const sessions = patient.sessions || [];
  const tabs = [["profile", "Perfil"], [`sessions`, `Sesiones (${sessions.length})`], ["ai", "Asistente IA"]];

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
        <button onClick={onBack} style={{ ...S.ghost, padding: "6px 12px", fontSize: "11px" }}>← Pacientes</button>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "400", color: C.text, margin: 0 }}>{patient.name}</h2>
          <div style={{ fontSize: "12px", color: C.textMuted, marginTop: "2px" }}>
            {patient.age && `${patient.age} años · `}{sessions.length} sesiones · Etapa: {patient.stage}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: "28px" }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} style={{ background: "transparent", border: "none", borderBottom: view === id ? `2px solid ${C.accent}` : "2px solid transparent", color: view === id ? C.accent : C.textMuted, padding: "10px 20px", cursor: "pointer", fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Georgia, serif", marginBottom: "-1px" }}>{label}</button>
        ))}
      </div>

      {view === "profile" && (
        <div>
          {patient.consultationReason && <Section title="Motivo de consulta"><p style={{ color: C.text, fontSize: "14px", lineHeight: "1.7", margin: 0 }}>{patient.consultationReason}</p>{patient.mainDiscomfort && <p style={{ color: C.textMuted, fontSize: "13px", lineHeight: "1.7", marginTop: "10px" }}>{patient.mainDiscomfort}</p>}</Section>}
          <Section title="Mapa de funcionamiento">
            <div style={{ display: "flex", flexWrap: "wrap", marginBottom: "16px" }}>
              {patient.predominantPattern && <Tag label={patient.predominantPattern} />}
              {patient.stage && <Tag label={patient.stage} />}
              {patient.regulationLevel && <Tag label={`Regulación ${patient.regulationLevel}`} />}
            </div>
            {patient.automaticThoughts && <div style={{ marginBottom: "12px" }}><div style={S.label}>Pensamientos automáticos</div><p style={{ color: C.text, fontSize: "13px", lineHeight: "1.7", margin: 0 }}>{patient.automaticThoughts}</p></div>}
            {patient.avoidanceBehaviors && <div><div style={S.label}>Conductas de evitación</div><p style={{ color: C.text, fontSize: "13px", lineHeight: "1.7", margin: 0 }}>{patient.avoidanceBehaviors}</p></div>}
          </Section>
          {patient.relevantHistory && <Section title="Historia relevante"><p style={{ color: C.text, fontSize: "13px", lineHeight: "1.7", margin: 0 }}>{patient.relevantHistory}</p></Section>}
          {patient.resources && <Section title="Recursos y fortalezas"><p style={{ color: C.text, fontSize: "13px", lineHeight: "1.7", margin: 0 }}>{patient.resources}</p></Section>}
          {patient.initialHypothesis && <Section title="Hipótesis clínica inicial"><p style={{ color: C.text, fontSize: "14px", lineHeight: "1.8", margin: 0, fontStyle: "italic", borderLeft: `2px solid ${C.accent}`, paddingLeft: "16px" }}>{patient.initialHypothesis}</p></Section>}
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
                <div style={{ textAlign: "center", padding: "40px", color: C.textMuted, fontSize: "14px" }}>Sin sesiones registradas aún.</div>
              ) : (
                [...sessions].reverse().map((s, i) => (
                  <div key={s.id} style={{ border: `1px solid ${C.border}`, padding: "20px", marginBottom: "12px", background: C.surface }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <div>
                        <span style={{ fontSize: "13px", color: C.text }}>Sesión {sessions.length - i}</span>
                        <span style={{ fontSize: "11px", color: C.textMuted, marginLeft: "12px" }}>{s.date}</span>
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <Tag label={s.stage} />
                        {s.taskResult && <Tag label={s.taskResult} />}
                      </div>
                    </div>
                    {s.clinicalSummary && <div style={{ marginBottom: "10px" }}><div style={S.label}>Resumen clínico</div><p style={{ color: C.text, fontSize: "13px", lineHeight: "1.6", margin: 0, fontStyle: "italic" }}>{s.clinicalSummary}</p></div>}
                    {s.emerged && <div style={{ marginBottom: "10px" }}><div style={S.label}>Emergió en sesión</div><p style={{ color: C.text, fontSize: "13px", lineHeight: "1.6", margin: 0 }}>{s.emerged}</p></div>}
                    {s.newPatterns && <div style={{ marginBottom: "10px" }}><div style={S.label}>Patrones nuevos</div><p style={{ color: C.textMuted, fontSize: "13px", lineHeight: "1.6", margin: 0 }}>{s.newPatterns}</p></div>}
                    {s.task && <div style={{ marginBottom: "10px" }}><div style={S.label}>Tarea asignada</div><p style={{ color: C.accent, fontSize: "13px", lineHeight: "1.6", margin: 0 }}>{s.task}</p></div>}
                    {s.nextSessionScript && <div style={{ marginBottom: "10px" }}><div style={S.label}>Guión próxima sesión</div><p style={{ color: C.textMuted, fontSize: "13px", lineHeight: "1.6", margin: 0 }}>{s.nextSessionScript}</p></div>}
                    {s.therapeuticWarnings && <div style={{ padding: "10px 14px", background: "#1a1010", border: `1px solid #3a2020`, marginTop: "8px" }}><div style={{ ...S.label, color: "#c47a7a" }}>⚠ Señales de alerta</div><p style={{ color: "#c47a7a", fontSize: "13px", lineHeight: "1.6", margin: 0 }}>{s.therapeuticWarnings}</p></div>}
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

// ── MAIN ──
export default function App() {
  const [patients, setPatients] = useState([]);
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);

  const addPatient = (p) => { setPatients(ps => [...ps, p]); setView("list"); };
  const updatePatient = (u) => { setPatients(ps => ps.map(p => p.id === u.id ? u : p)); setSelected(u); };
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
            {patients.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <div style={{ fontSize: "10px", letterSpacing: "0.25em", color: C.textDim, textTransform: "uppercase", marginBottom: "16px" }}>Sin expedientes</div>
                <p style={{ color: C.textMuted, fontSize: "14px", marginBottom: "28px", lineHeight: "1.7" }}>Crea el primer expediente clínico<br />o importa la información desde texto.</p>
                <button style={S.primary} onClick={() => setView("new")}>+ Crear primer expediente</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: "10px", letterSpacing: "0.2em", color: C.textMuted, textTransform: "uppercase", marginBottom: "20px" }}>
                  {patients.length} expediente{patients.length !== 1 ? "s" : ""}
                </div>
                {patients.map(p => (
                  <div key={p.id} onClick={() => openPatient(p)}
                    style={{ border: `1px solid ${C.border}`, padding: "20px 24px", marginBottom: "10px", cursor: "pointer", background: C.surface, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.borderHover}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                  >
                    <div>
                      <div style={{ fontSize: "15px", color: C.text, marginBottom: "6px" }}>{p.name}</div>
                      <div style={{ display: "flex", flexWrap: "wrap" }}>
                        {p.predominantPattern && <Tag label={p.predominantPattern} />}
                        {p.stage && <Tag label={p.stage} />}
                        {p.regulationLevel && <Tag label={`Regulación ${p.regulationLevel}`} />}
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
        <span style={{ fontSize: "11px", color: C.textDim, letterSpacing: "0.1em" }}>CONTINUUM™ — Herramientas clínicas para psicólogos</span>
        <span style={{ fontSize: "11px", color: C.textDim }}>Diseñado desde la psicología</span>
      </div>
    </div>
  );
}
