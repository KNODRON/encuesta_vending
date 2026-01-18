const STORAGE_KEY = "encuesta_vending_db_v2";
let db = loadDB();
let editId = null;

const $ = (id) => document.getElementById(id);

const el = {
  edificio: $("edificio"),
  direccion: $("direccion"),
  comuna: $("comuna"),
  entrevistado: $("entrevistado"),
  telefono: $("telefono"),
  fecha: $("fecha"),
  departamentos: $("departamentos"),
  conserjeria: $("conserjeria"),

  q2_otro_chk: $("q2_otro_chk"),
  q2_otro_txt: $("q2_otro_txt"),

  autoriza: $("autoriza"),
  ubicacion: $("ubicacion"),
  electricidad: $("electricidad"),
  conectividad: $("conectividad"),
  comision: $("comision"),
  comision_valor: $("comision_valor"),

  comentarios: $("comentarios"),

  tbody: $("tbody"),
};

init();

function init() {
  // Fecha por defecto: hoy
  if (!el.fecha.value) el.fecha.valueAsDate = new Date();

  el.q2_otro_chk.addEventListener("change", () => {
    el.q2_otro_txt.classList.toggle("hidden", !el.q2_otro_chk.checked);
    if (!el.q2_otro_chk.checked) el.q2_otro_txt.value = "";
  });

  $("btnNueva").addEventListener("click", nueva);
  $("btnGuardar").addEventListener("click", () => $("btnGuardarBase").click());

  $("btnGuardarBase").addEventListener("click", guardarEnBase);
  $("btnBorrarBase").addEventListener("click", borrarBase);

  $("btnPDF").addEventListener("click", exportarPDFResumen);

  renderTabla();
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

function saveDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function nueva() {
  editId = null;
  $("btnGuardarBase").textContent = "Guardar entrevista en la base";
  clearForm();
  el.fecha.valueAsDate = new Date();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearForm() {
  el.edificio.value = "";
  el.direccion.value = "";
  el.comuna.value = "";
  el.entrevistado.value = "";
  el.telefono.value = "";
  el.departamentos.value = "";
  el.conserjeria.value = "";

  document.querySelectorAll("input[type=radio]").forEach(r => r.checked = false);
  document.querySelectorAll("#q2 input[type=checkbox]").forEach(c => c.checked = false);
  el.q2_otro_txt.classList.add("hidden");
  el.q2_otro_txt.value = "";

  el.autoriza.value = "";
  el.ubicacion.value = "";
  el.electricidad.value = "";
  el.conectividad.value = "";
  el.comision.value = "";
  el.comision_valor.value = "";

  el.comentarios.value = "";
}

function getRadio(name) {
  const r = document.querySelector(`input[name="${name}"]:checked`);
  return r ? r.value : "";
}

function getQ2Productos() {
  const selected = [...document.querySelectorAll("#q2 input[type=checkbox]:checked")].map(x => x.value);
  const otroMarcado = selected.includes("Otro");
  let otro = "";
  if (otroMarcado) {
    otro = (el.q2_otro_txt.value || "").trim();
  }
  return { selected, otroMarcado, otro };
}

function validar(data) {
  const faltan = [];
  if (!data.edificio) faltan.push("Edificio");
  if (!data.entrevistado) faltan.push("Entrevistado");
  if (!data.fecha) faltan.push("Fecha");
  if (!data.q1) faltan.push("Q1");
  if (!data.q4) faltan.push("Q4");
  if (!data.q5) faltan.push("Q5");
  if (data.q2_otroMarcado && !data.q2_otro) faltan.push("Q2 'Otro' (especificar)");
  return faltan;
}

function buildRecordFromForm() {
  const q2 = getQ2Productos();

  return {
    id: editId ?? cryptoId(),
    ts: new Date().toISOString(),
    edificio: el.edificio.value.trim(),
    direccion: el.direccion.value.trim(),
    comuna: el.comuna.value.trim(),
    entrevistado: el.entrevistado.value.trim(),
    telefono: el.telefono.value.trim(),
    fecha: el.fecha.value,
    departamentos: el.departamentos.value ? Number(el.departamentos.value) : "",
    conserjeria: el.conserjeria.value,

    q1: getRadio("q1"),
    q2: q2.selected.filter(x => x !== "Otro"),
    q2_otroMarcado: q2.otroMarcado,
    q2_otro: q2.otro,
    q3: getRadio("q3"),
    q4: getRadio("q4"),
    q5: getRadio("q5"),

    autoriza: el.autoriza.value,
    ubicacion: el.ubicacion.value.trim(),
    electricidad: el.electricidad.value,
    conectividad: el.conectividad.value,
    comision: el.comision.value,
    comision_valor: el.comision_valor.value.trim(),

    comentarios: el.comentarios.value.trim(),
  };
}

function guardarEnBase() {
  const rec = buildRecordFromForm();
  const faltan = validar(rec);
  if (faltan.length) {
    alert("Faltan campos obligatorios:\n- " + faltan.join("\n- "));
    return;
  }

  if (editId) {
    db = db.map(x => x.id === editId ? { ...rec, id: editId } : x);
    editId = null;
    $("btnGuardarBase").textContent = "Guardar entrevista en la base";
  } else {
    db.unshift(rec);
  }

  saveDB();
  renderTabla();
  alert("Entrevista guardada.");
  nueva();
}

function borrarBase() {
  const ok = confirm("¿Seguro que quieres borrar TODA la base local de encuestas?");
  if (!ok) return;
  db = [];
  saveDB();
  renderTabla();
  alert("Base borrada.");
}

function renderTabla() {
  el.tbody.innerHTML = "";
  if (!db.length) {
    el.tbody.innerHTML = `<tr><td colspan="6" style="color:#9fb0a9">Sin registros todavía.</td></tr>`;
    return;
  }

  for (const r of db) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(r.fecha || "")}</td>
      <td>${escapeHtml(r.edificio || "")}</td>
      <td>${escapeHtml(r.entrevistado || "")}</td>
      <td>${escapeHtml(r.q1 || "")}</td>
      <td>${escapeHtml(r.q5 || "")}</td>
      <td>
        <button class="btn btn--ghost" data-act="ver" data-id="${r.id}">Ver</button>
        <button class="btn btn--ghost" data-act="editar" data-id="${r.id}">Editar</button>
        <button class="btn btn--danger" data-act="del" data-id="${r.id}">Eliminar</button>
      </td>
    `;
    tr.querySelectorAll("button").forEach(b => b.addEventListener("click", onRowAction));
    el.tbody.appendChild(tr);
  }
}

function onRowAction(e) {
  const id = e.currentTarget.getAttribute("data-id");
  const act = e.currentTarget.getAttribute("data-act");
  const rec = db.find(x => x.id === id);
  if (!rec) return;

  if (act === "del") {
    const ok = confirm(`¿Eliminar registro de "${rec.edificio}" (${rec.fecha})?`);
    if (!ok) return;
    db = db.filter(x => x.id !== id);
    saveDB();
    renderTabla();
    return;
  }

  if (act === "ver") {
    abrirVistaImprimible(rec, false);
    return;
  }

  if (act === "editar") {
    cargarEnFormulario(rec);
    editId = rec.id;
    $("btnGuardarBase").textContent = "Actualizar registro";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function cargarEnFormulario(r) {
  el.edificio.value = r.edificio || "";
  el.direccion.value = r.direccion || "";
  el.comuna.value = r.comuna || "";
  el.entrevistado.value = r.entrevistado || "";
  el.telefono.value = r.telefono || "";
  el.fecha.value = r.fecha || "";
  el.departamentos.value = r.departamentos !== "" ? r.departamentos : "";
  el.conserjeria.value = r.conserjeria || "";

  setRadio("q1", r.q1);
  setRadio("q3", r.q3);
  setRadio("q4", r.q4);
  setRadio("q5", r.q5);

  // Q2
  document.querySelectorAll("#q2 input[type=checkbox]").forEach(c => c.checked = false);
  for (const val of (r.q2 || [])) {
    const box = [...document.querySelectorAll("#q2 input[type=checkbox]")].find(x => x.value === val);
    if (box) box.checked = true;
  }
  if (r.q2_otroMarcado) {
    el.q2_otro_chk.checked = true;
    el.q2_otro_txt.classList.remove("hidden");
    el.q2_otro_txt.value = r.q2_otro || "";
  } else {
    el.q2_otro_chk.checked = false;
    el.q2_otro_txt.classList.add("hidden");
    el.q2_otro_txt.value = "";
  }

  el.autoriza.value = r.autoriza || "";
  el.ubicacion.value = r.ubicacion || "";
  el.electricidad.value = r.electricidad || "";
  el.conectividad.value = r.conectividad || "";
  el.comision.value = r.comision || "";
  el.comision_valor.value = r.comision_valor || "";

  el.comentarios.value = r.comentarios || "";
}

function setRadio(name, value) {
  if (!value) return;
  const r = document.querySelector(`input[name="${name}"][value="${cssEscape(value)}"]`);
  if (r) r.checked = true;
}

function exportarCSV() {
  if (!db.length) return alert("No hay registros para exportar.");

  const headers = [
    "fecha","edificio","direccion","comuna","entrevistado","telefono","departamentos","conserjeria",
    "q1","q2","q2_otro","q3","q4","q5",
    "autoriza","ubicacion","electricidad","conectividad","comision","comision_valor",
    "comentarios"
  ];

  const rows = db.map(r => [
    r.fecha, r.edificio, r.direccion, r.comuna, r.entrevistado, r.telefono,
    r.departamentos, r.conserjeria,
    r.q1, (r.q2 || []).join(" | "), r.q2_otroMarcado ? r.q2_otro : "",
    r.q3, r.q4, r.q5,
    r.autoriza, r.ubicacion, r.electricidad, r.conectividad, r.comision, r.comision_valor,
    r.comentarios
  ]);

  const csv = [headers, ...rows]
    .map(arr => arr.map(v => csvCell(v)).join(","))
    .join("\n");

  downloadBlob(csv, `ENCUESTA_VENDING_${today()}.csv`, "text/csv;charset=utf-8");
}

function exportarPDFResumen() {
  if (!db.length) return alert("No hay registros para exportar.");
  // Resumen: usa el primero (más reciente)
  abrirVistaImprimible(db[0], true);
}

function abrirVistaImprimible(rec, autoPrint) {
  const html = `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Resumen Encuesta Vending</title>
  <style>
    body{font-family:Arial,system-ui; margin:24px; color:#111}
    h1{margin:0 0 6px}
    .muted{color:#444}
    .box{border:1px solid #ddd; border-radius:10px; padding:14px; margin:12px 0}
    .grid{display:grid; grid-template-columns:1fr 1fr; gap:10px}
    .row{margin:6px 0}
    b{display:inline-block; min-width:220px}
    @media print { button{display:none} }
  </style>
</head>
<body>
  <h1>Encuesta Vending</h1>
  <div class="muted">Resumen para propuesta / seguimiento</div>

  <div class="box">
    <h2 style="margin:0 0 10px; font-size:16px">Identificación</h2>
    <div class="grid">
      <div class="row"><b>Fecha:</b> ${esc(rec.fecha)}</div>
      <div class="row"><b>Edificio:</b> ${esc(rec.edificio)}</div>
      <div class="row"><b>Dirección:</b> ${esc(rec.direccion)}</div>
      <div class="row"><b>Comuna:</b> ${esc(rec.comuna)}</div>
      <div class="row"><b>Entrevistado:</b> ${esc(rec.entrevistado)}</div>
      <div class="row"><b>Teléfono:</b> ${esc(rec.telefono)}</div>
      <div class="row"><b>N° Depto (est.):</b> ${esc(rec.departamentos)}</div>
      <div class="row"><b>Conserjería:</b> ${esc(rec.conserjeria)}</div>
    </div>
  </div>

  <div class="box">
    <h2 style="margin:0 0 10px; font-size:16px">Respuestas</h2>
    <div class="row"><b>Q1 (Compra por conveniencia):</b> ${esc(rec.q1)}</div>
    <div class="row"><b>Q2 (Productos):</b> ${esc((rec.q2||[]).join(", "))}${rec.q2_otroMarcado ? " + Otro: " + esc(rec.q2_otro) : ""}</div>
    <div class="row"><b>Q3 (Horario):</b> ${esc(rec.q3)}</div>
    <div class="row"><b>Q4 (Pago electrónico):</b> ${esc(rec.q4)}</div>
    <div class="row"><b>Q5 (Vending en edificio):</b> ${esc(rec.q5)}</div>
  </div>

  <div class="box">
    <h2 style="margin:0 0 10px; font-size:16px">Condiciones / Operación</h2>
    <div class="grid">
      <div class="row"><b>Autoriza:</b> ${esc(rec.autoriza)}</div>
      <div class="row"><b>Ubicación sugerida:</b> ${esc(rec.ubicacion)}</div>
      <div class="row"><b>Electricidad:</b> ${esc(rec.electricidad)}</div>
      <div class="row"><b>Conectividad:</b> ${esc(rec.conectividad)}</div>
      <div class="row"><b>Comisión:</b> ${esc(rec.comision)}</div>
      <div class="row"><b>Valor comisión:</b> ${esc(rec.comision_valor)}</div>
    </div>
    <div class="row" style="margin-top:10px"><b>Comentarios:</b> ${esc(rec.comentarios)}</div>
  </div>

  <button onclick="window.print()">Imprimir / Guardar como PDF</button>

  ${autoPrint ? "<script>window.print()</script>" : ""}
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return alert("El navegador bloqueó la ventana emergente. Habilita popups para exportar PDF.");
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function csvCell(v) {
  const s = (v ?? "").toString().replace(/\r?\n/g, " ").trim();
  // Si contiene coma o comillas, encierra en comillas y duplica comillas
  if (/[",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function escapeHtml(str) {
  return (str ?? "").toString()
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}
function esc(v){ return escapeHtml(v); }

function cssEscape(v){
  // escape básico para selector atributo value=""
  return (v ?? "").toString().replace(/"/g, '\\"');
}

function cryptoId() {
  // id corto legible
  const a = crypto.getRandomValues(new Uint32Array(2));
  return `${a[0].toString(16)}${a[1].toString(16)}`;
}
