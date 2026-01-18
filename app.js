"use strict";

const STORAGE_KEY = "encuesta_vending_db_v1";

const $ = (id) => document.getElementById(id);

const fields = {
  buildingName: $("buildingName"),
  buildingAddress: $("buildingAddress"),
  interviewee: $("interviewee"),
  contact: $("contact"),
  date: $("date"),
  units: $("units"),
  notes: $("notes"),
  q2OtherToggle: null, // checkbox
  q2OtherText: $("q2OtherText")
};

const statusEl = $("status");
const tableBody = $("table").querySelector("tbody");

function nowISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDB(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function getRadio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : "";
}

function setRadio(name, value) {
  const els = document.querySelectorAll(`input[name="${name}"]`);
  els.forEach(e => e.checked = (e.value === value));
}

function getQ2Products() {
  const checked = Array.from(document.querySelectorAll("input.q2:checked")).map(x => x.value);
  const otherChecked = Array.from(document.querySelectorAll("input.q2OtherToggle:checked")).length > 0;
  const otherText = fields.q2OtherText.value.trim();
  if (otherChecked && otherText) checked.push(`Otro: ${otherText}`);
  return checked;
}

function setQ2Products(list) {
  const items = new Set(list || []);
  document.querySelectorAll("input.q2").forEach(cb => {
    cb.checked = items.has(cb.value);
  });

  // Other
  const otherEntry = (list || []).find(x => x.startsWith("Otro: "));
  const otherToggle = document.querySelector("input.q2OtherToggle");
  if (otherEntry) {
    otherToggle.checked = true;
    fields.q2OtherText.disabled = false;
    fields.q2OtherText.value = otherEntry.replace("Otro: ", "");
  } else {
    otherToggle.checked = false;
    fields.q2OtherText.disabled = true;
    fields.q2OtherText.value = "";
  }
}

function getFormData() {
  return {
    id: crypto.randomUUID(),
    buildingName: fields.buildingName.value.trim(),
    buildingAddress: fields.buildingAddress.value.trim(),
    interviewee: fields.interviewee.value.trim(),
    contact: fields.contact.value.trim(),
    date: fields.date.value || nowISODate(),
    units: fields.units.value ? Number(fields.units.value) : "",
    q1: getRadio("q1"),
    q2: getQ2Products(),
    q3: getRadio("q3"),
    q4: getRadio("q4"),
    q5: getRadio("q5"),
    notes: fields.notes.value.trim()
  };
}

function setFormData(d) {
  fields.buildingName.value = d.buildingName || "";
  fields.buildingAddress.value = d.buildingAddress || "";
  fields.interviewee.value = d.interviewee || "";
  fields.contact.value = d.contact || "";
  fields.date.value = d.date || nowISODate();
  fields.units.value = d.units === "" ? "" : (d.units ?? "");
  setRadio("q1", d.q1 || "");
  setQ2Products(d.q2 || []);
  setRadio("q3", d.q3 || "");
  setRadio("q4", d.q4 || "");
  setRadio("q5", d.q5 || "");
  fields.notes.value = d.notes || "";
}

function clearForm() {
  setFormData({
    buildingName: "",
    buildingAddress: "",
    interviewee: "",
    contact: "",
    date: nowISODate(),
    units: "",
    q1: "",
    q2: [],
    q3: "",
    q4: "",
    q5: "",
    notes: ""
  });
}

function validateForDB(d) {
  // Mínimo viable: edificio + entrevistado + Q1 + Q5
  if (!d.buildingName) return "Falta: Edificio / Condominio";
  if (!d.interviewee) return "Falta: Entrevistado";
  if (!d.q1) return "Falta: Q1 (compraría por conveniencia)";
  if (!d.q5) return "Falta: Q5 (le parece bien la vending)";
  return "";
}

function renderTable(db) {
  tableBody.innerHTML = "";
  db.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.date || "")}</td>
      <td>${escapeHtml(row.buildingName || "")}</td>
      <td>${escapeHtml(row.interviewee || "")}</td>
      <td>${escapeHtml(row.q1 || "")}</td>
      <td>${escapeHtml(row.q5 || "")}</td>
      <td>
        <button class="smallBtn" data-act="load" data-id="${row.id}">Cargar</button>
        <button class="smallBtn danger" data-act="del" data-id="${row.id}">Eliminar</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function downloadText(filename, text, mime="text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCSV(db) {
  const header = [
    "fecha","edificio","direccion","entrevistado","contacto","departamentos",
    "q1","q2","q3","q4","q5","observaciones"
  ];

  const lines = [header.join(",")];

  db.forEach(r => {
    const row = [
      r.date ?? "",
      r.buildingName ?? "",
      r.buildingAddress ?? "",
      r.interviewee ?? "",
      r.contact ?? "",
      r.units ?? "",
      r.q1 ?? "",
      (r.q2 || []).join(" | "),
      r.q3 ?? "",
      r.q4 ?? "",
      r.q5 ?? "",
      r.notes ?? ""
    ].map(csvCell);

    lines.push(row.join(","));
  });

  return lines.join("\n");
}

function csvCell(v) {
  const s = String(v ?? "");
  // Encapsula si contiene coma, comillas o salto de línea
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function exportPDF(db) {
  // jsPDF UMD
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const margin = 40;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Encuesta Vending - Resumen", margin, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Total entrevistas: ${db.length}`, margin, y);
  y += 16;

  // Conteos simples
  const count = (key) => db.reduce((acc, r) => (acc[r[key] || ""] = (acc[r[key] || ""] || 0) + 1, acc), {});
  const q1 = count("q1");
  const q5 = count("q5");

  const line = (text) => {
    if (y > 780) { doc.addPage(); y = margin; }
    doc.text(text, margin, y);
    y += 14;
  };

  line("Q1 (Compraría por conveniencia):");
  Object.keys(q1).filter(Boolean).forEach(k => line(`  - ${k}: ${q1[k]}`));
  y += 6;

  line("Q5 (Le parece bien una vending):");
  Object.keys(q5).filter(Boolean).forEach(k => line(`  - ${k}: ${q5[k]}`));
  y += 10;

  // Listado breve
  doc.setFont("helvetica", "bold");
  line("Detalle (primeras 25):");
  doc.setFont("helvetica", "normal");

  db.slice(0, 25).forEach((r, idx) => {
    const text = `${idx + 1}) ${r.date || ""} - ${r.buildingName || ""} - ${r.interviewee || ""} | Q1:${r.q1 || "-"} | Q5:${r.q5 || "-"}`;
    line(text);
  });

  doc.save(`encuesta_vending_resumen_${new Date().toISOString().slice(0,10)}.pdf`);
}

// --- UI actions ---
let db = loadDB();
renderTable(db);
setStatus(`Base cargada: ${db.length} entrevistas.`);

// Default date
if (!fields.date.value) fields.date.value = nowISODate();

// Other toggle
fields.q2OtherToggle = document.querySelector("input.q2OtherToggle");
fields.q2OtherToggle.addEventListener("change", () => {
  const on = fields.q2OtherToggle.checked;
  fields.q2OtherText.disabled = !on;
  if (!on) fields.q2OtherText.value = "";
});

// Top buttons
$("btnNew").addEventListener("click", () => {
  clearForm();
  setStatus("Formulario listo para nueva entrevista.");
});

$("btnSave").addEventListener("click", () => {
  setStatus("Formulario: no se guarda solo. Usa “Guardar entrevista en la base”.");
});

// Save to DB
$("btnAddToDB").addEventListener("click", () => {
  const d = getFormData();
  const err = validateForDB(d);
  if (err) return setStatus(`No se guardó: ${err}`);

  db.unshift(d);
  saveDB(db);
  renderTable(db);
  setStatus(`Guardado OK: ${d.buildingName} (${d.date}). Total: ${db.length}`);
  clearForm();
});

// Clear DB
$("btnClearDB").addEventListener("click", () => {
  const ok = confirm("¿Seguro que deseas borrar TODA la base local del teléfono?");
  if (!ok) return;
  db = [];
  saveDB(db);
  renderTable(db);
  setStatus("Base borrada.");
});

// Export CSV
$("btnExportCSV").addEventListener("click", () => {
  if (db.length === 0) return setStatus("No hay entrevistas para exportar.");
  const csv = toCSV(db);
  downloadText(`encuesta_vending_${new Date().toISOString().slice(0,10)}.csv`, csv, "text/csv;charset=utf-8");
  setStatus("CSV exportado.");
});

// Export PDF
$("btnExportPDF").addEventListener("click", () => {
  if (db.length === 0) return setStatus("No hay entrevistas para exportar.");
  exportPDF(db);
  setStatus("PDF generado.");
});

// Table actions: load / delete
tableBody.addEventListener("click", (ev) => {
  const btn = ev.target.closest("button");
  if (!btn) return;

  const act = btn.dataset.act;
  const id = btn.dataset.id;
  const idx = db.findIndex(x => x.id === id);
  if (idx < 0) return;

  if (act === "load") {
    setFormData(db[idx]);
    setStatus(`Entrevista cargada: ${db[idx].buildingName}`);
  } else if (act === "del") {
    const ok = confirm("¿Eliminar esta entrevista de la base?");
    if (!ok) return;
    db.splice(idx, 1);
    saveDB(db);
    renderTable(db);
    setStatus("Entrevista eliminada.");
  }
});
