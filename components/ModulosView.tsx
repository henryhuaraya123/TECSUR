"use client";
import { useState, useEffect } from "react";
import { Cpu, Plus, X, ChevronDown, Calendar, Clock, GraduationCap, MapPin, User, Pencil, Trash2, Layers, Users, ChevronLeft, Search, Folder, FolderOpen, Grid, UserPlus, UserMinus, ClipboardList } from "lucide-react";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import AlertDialog from "./AlertDialog";
import ReporteAsistenciaBtn from "./ReporteAsistenciaBtn";
import ReporteMatriculaBtn from "./ReporteMatriculaBtn";
import ReporteModuloBtn from "./ReporteModuloBtn";

interface Carrera { id: string; nombre: string; }
interface Curso { id: string; nombre: string; orden: number; }
interface Modulo {
  id: string; nombre: string; fecha_inicio: string; fecha_fin: string;
  modalidad: "presencial" | "virtual" | "semipresencial"; duracion?: string | null;
  carrera_id?: string | null; profesor?: string | null;
  local?: string | null; aula?: string | null; horario?: string | null; turno?: string | null;
  carreras?: Carrera | null; cursos?: Curso[];
  docente_id?: string | null;
}

const MODULOS_POR_CARRERA: Record<string, string[]> = {
  "Construcción Civil": ["Topografía Aplicada", "Lectura de Planos", "Materiales de Construcción", "Suelos y Concreto", "Costos y Presupuestos", "Módulo I"],
  "Topografía": ["Dibujo Topográfico", "Estación Total", "Geodesia", "GPS Diferencial", "Fotogrametría", "Módulo I"],
  "Maquinaria Pesada": ["Cargador Frontal", "Excavadora Hidráulica", "Motoniveladora", "Tractor de Orugas", "Retroexcavadora", "Módulo I"],
  "Administración": ["Administración General", "Contabilidad Básica", "Recursos Humanos", "Marketing", "Logística", "Módulo I"],
  "Sistemas": ["Ofimática", "Programación Básica", "Redes y Conectividad", "Soporte Técnico", "Diseño Web", "Módulo I"],
  "default": ["Módulo I", "Módulo II", "Módulo III", "Módulo IV", "Módulo V"],
};

const card: React.CSSProperties = { background: "rgba(8,16,34,0.85)", border: "1px solid rgba(42,109,181,0.18)", borderRadius: 14, backdropFilter: "blur(12px)" };
const inp: React.CSSProperties = { width: "100%", height: 44, boxSizing: "border-box", background: "rgba(10,22,44,0.7)", border: "1px solid rgba(42,109,181,0.22)", borderRadius: 10, padding: "0 14px", color: "#dbeafe", fontSize: 13, fontFamily: "inherit", outline: "none" };
const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "rgba(74,179,216,0.75)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 };
const btnP: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, border: "none", background: "#a2a1a1ff", color: "#0d0d0dff", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" };
const btnS: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, background: "rgba(178, 181, 183, 0.1)", border: "1px solid rgba(42,109,181,0.22)", color: "rgba(120,160,210,0.85)", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" };

const MODALIDAD_COLORS: Record<string, string> = {
  presencial: "rgba(52,211,153,0.15)",
  virtual: "rgba(251,191,36,0.15)",
  semipresencial: "rgba(139,92,246,0.15)",
};
const MODALIDAD_TEXT: Record<string, string> = {
  presencial: "#34d399", virtual: "#fbbf24", semipresencial: "#a78bfa",
};

const emptyForm = {
  nombre: "", fecha_inicio: "", fecha_fin: "", modalidad: "presencial" as Modulo["modalidad"],
  duracion: "", carrera_id: "", profesor: "", local: "AV. SAN MARTIN N° 817", aula: "", horario: "", turno: "mañana"
};

export default function ModulosView({
  onNavigate,
  carreraId,
  carreraNombre,
  onBack
}: {
  onNavigate?: (view: string) => void;
  carreraId?: string;
  carreraNombre?: string;
  onBack?: () => void;
}) {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);

  const currentCarreraNombre = carreraNombre || carreras.find(c => c.id === carreraId)?.nombre || "";
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Modulo | null>(null);
  const [delTarget, setDelTarget] = useState<Modulo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ open: boolean; type: "success" | "error"; text: string }>({ open: false, type: "success", text: "" });
  const [form, setForm] = useState({
    ...emptyForm,
    carrera_id: carreraId || ""
  });
  const [filterStatus, setFilterStatus] = useState("");

  const [viewingAlumnos, setViewingAlumnos] = useState<Modulo | null>(null);
  const [alumnosMatriculados, setAlumnosMatriculados] = useState<any[]>([]);
  const [loadingAlumnos, setLoadingAlumnos] = useState(false);

  // Estados para búsqueda, filtro y paginación de alumnos matriculados
  const [searchAlum, setSearchAlum] = useState("");
  const [filterTurno, setFilterTurno] = useState("");
  const [pageAlum, setPageAlum] = useState(1);
  const [pageSizeAlum] = useState(10);

  // Estados para búsqueda y paginación de módulos
  const [searchMod, setSearchMod] = useState("");
  const [pageMod, setPageMod] = useState(1);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [viewMode, setViewMode] = useState<"folders" | "flat">("flat");
  const pageSizeMod = viewMode === "flat" ? 12 : 6;
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [currentSubFolder, setCurrentSubFolder] = useState<string | null>(null);

  function handleSelectFolder(folderName: string) {
    setCurrentFolder(folderName);
    setCurrentSubFolder(null);
    setPageMod(1);
  }

  // Estados de Cursos y Docentes
  const [cursosModulo, setCursosModulo] = useState<any[]>([]);
  const [docentes, setDocentes] = useState<any[]>([]);
  const [loadingCursos, setLoadingCursos] = useState(false);
  const [showCursoForm, setShowCursoForm] = useState(false);
  const [editCursoTarget, setEditCursoTarget] = useState<any | null>(null);
  const [delCursoTarget, setDelCursoTarget] = useState<any | null>(null);

  // Formulario del Curso
  const [cursoNombre, setCursoNombre] = useState("");
  const [cursoCreditos, setCursoCreditos] = useState(1);
  const [cursoOrden, setCursoOrden] = useState(1);
  const [cursoDocenteId, setCursoDocenteId] = useState("");
  const [cursoDescripcion, setCursoDescripcion] = useState("");
  const [submittingCurso, setSubmittingCurso] = useState(false);

  // Asistencias específicas por curso
  const [activeAsistenciaCurso, setActiveAsistenciaCurso] = useState<any | null>(null);
  const [fechaAsistencia, setFechaAsistencia] = useState(new Date().toLocaleDateString('sv-SE'));
  const [asistenciasMap, setAsistenciasMap] = useState<Record<string, boolean>>({});
  const [observacionesMap, setObservacionesMap] = useState<Record<string, string>>({});
  const [savingAsistencia, setSavingAsistencia] = useState(false);
  // Estados para matricular (agregar) alumno
  const [showMatriculaForm, setShowMatriculaForm] = useState(false);
  const [searchAlumQuery, setSearchAlumQuery] = useState("");
  const [searchedAlumnos, setSearchedAlumnos] = useState<any[]>([]);
  const [loadingSearchedAlumnos, setLoadingSearchedAlumnos] = useState(false);
  const [selectedAlumno, setSelectedAlumno] = useState<any | null>(null);
  const [submittingMatricula, setSubmittingMatricula] = useState(false);

  // Estado para desmatricular (quitar) alumno
  const [delMatriculaTarget, setDelMatriculaTarget] = useState<any | null>(null);

  // Estados para ingresar notas por curso
  const [activeNotasCurso, setActiveNotasCurso] = useState<any | null>(null);
  const [notasMap, setNotasMap] = useState<Record<string, string>>({});
  const [initialNotasMap, setInitialNotasMap] = useState<Record<string, string>>({});
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [savingNotas, setSavingNotas] = useState(false);

  // Estados para cambiar docente rápido en cursos
  const [changeDocenteTarget, setChangeDocenteTarget] = useState<any | null>(null);
  const [changeDocenteId, setChangeDocenteId] = useState<string>("");
  const [submittingChangeDocente, setSubmittingChangeDocente] = useState(false);

  useEffect(() => { loadCarreras(); loadModulos(); setCurrentFolder(null); setCurrentSubFolder(null); }, [carreraId]);

  async function loadModulos() {
    setLoading(true);
    const url = carreraId ? `/api/modulos?carrera_id=${carreraId}` : "/api/modulos";
    const res = await fetch(url);
    const data = await res.json();
    setModulos(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function loadCarreras() {
    const res = await fetch("/api/carreras");
    const data = await res.json();
    setCarreras(Array.isArray(data) ? data : []);
  }

  function flash(type: "success" | "error", text: string) { setMsg({ open: true, type, text }); }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true);
    const payload = {
      nombre: form.nombre,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      modalidad: form.modalidad,
      duracion: form.duracion || null,
      carrera_id: form.carrera_id || null,
      profesor: form.profesor || null,
      local: form.local || null,
      aula: form.aula || null,
      horario: form.horario || null,
      turno: form.turno || "mañana",
    };
    const res = await fetch("/api/modulos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json(); setSubmitting(false);
    if (!res.ok) { flash("error", data.error); return; }
    flash("success", `Módulo "${data.nombre}" creado`);
    setForm({ ...emptyForm, carrera_id: carreraId || "" }); setShowForm(false);
    loadModulos();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editTarget) return; setSubmitting(true);
    const payload = {
      nombre: form.nombre,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      modalidad: form.modalidad,
      duracion: form.duracion || null,
      carrera_id: form.carrera_id || null,
      profesor: form.profesor || null,
      local: form.local || null,
      aula: form.aula || null,
      horario: form.horario || null,
      turno: form.turno || "mañana",
    };
    const res = await fetch(`/api/modulos/${editTarget.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json(); setSubmitting(false);
    if (!res.ok) { flash("error", data.error); return; }
    flash("success", `Módulo "${data.nombre}" actualizado`);
    setEditTarget(null); loadModulos();
  }

  async function handleDelete() {
    if (!delTarget) return; setSubmitting(true);
    const res = await fetch(`/api/modulos/${delTarget.id}`, { method: "DELETE" });
    setSubmitting(false);
    if (!res.ok) { flash("error", "Error al eliminar"); return; }
    flash("success", `Módulo "${delTarget.nombre}" eliminado`);
    setDelTarget(null); loadModulos();
  }

  function openEdit(m: Modulo) {
    setEditTarget(m);
    setForm({
      nombre: m.nombre,
      fecha_inicio: m.fecha_inicio,
      fecha_fin: m.fecha_fin,
      modalidad: m.modalidad,
      duracion: m.duracion ?? "",
      carrera_id: m.carrera_id ?? "",
      profesor: m.profesor ?? "",
      local: m.local ?? "",
      aula: m.aula ?? "",
      horario: m.horario ?? "",
      turno: m.turno ?? "mañana"
    });
    setShowForm(false);
  }

  function handleOpenNewModulo() {
    setEditTarget(null);
    setForm({
      ...emptyForm,
      carrera_id: carreraId || "",
      aula: (currentFolder && currentFolder !== "SIN AULA") ? currentFolder : "",
      nombre: currentSubFolder || ""
    });
    setShowForm(true);
  }

  // Obtener sugerencias según carrera seleccionada
  const selectedCarreraName = carreras.find(c => c.id === form.carrera_id)?.nombre || "";
  const sugerencias = MODULOS_POR_CARRERA[selectedCarreraName] || MODULOS_POR_CARRERA["default"];

  async function loadCursosModulo(moduloId: string) {
    setLoadingCursos(true);
    try {
      const res = await fetch(`/api/cursos?modulo_id=${moduloId}`);
      const data = await res.json();
      setCursosModulo(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCursos(false);
    }
  }

  async function loadDocentes() {
    try {
      const res = await fetch("/api/docentes");
      const data = await res.json();
      setDocentes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadAlumnosModulo(m: Modulo) {
    setViewingAlumnos(m);
    setSearchAlum("");
    setFilterTurno("");
    setPageAlum(1);
    setLoadingAlumnos(true);
    try {
      const resMat = await fetch(`/api/matriculas?modulo_id=${m.id}`);
      const dataMat = await resMat.json();
      setAlumnosMatriculados(Array.isArray(dataMat) ? dataMat : []);

      await Promise.all([
        loadCursosModulo(m.id),
        loadDocentes()
      ]);
    } catch (err) {
      flash("error", "Error al cargar los datos del módulo");
    } finally {
      setLoadingAlumnos(false);
    }
  }

  async function handleSearchAlumnos(query: string) {
    if (!query.trim()) {
      setSearchedAlumnos([]);
      return;
    }
    setLoadingSearchedAlumnos(true);
    try {
      const res = await fetch(`/api/alumnos?search=${encodeURIComponent(query)}&pageSize=15`);
      const data = await res.json();
      setSearchedAlumnos(data.data || []);
    } catch (err) {
      console.error(err);
      flash("error", "Error al buscar alumnos");
    } finally {
      setLoadingSearchedAlumnos(false);
    }
  }

  async function handleCreateMatricula() {
    if (!viewingAlumnos || !selectedAlumno) {
      flash("error", "Debe seleccionar un alumno");
      return;
    }
    setSubmittingMatricula(true);
    try {
      // Priorizar el turno del módulo, de lo contrario inferir
      let turno = viewingAlumnos.turno;
      if (!turno) {
        turno = "mañana";
        const h = (viewingAlumnos.horario || "").toLowerCase();
        if (h.includes("noche")) {
          turno = "noche";
        } else if (h.includes("tarde") && !h.includes("sab") && !h.includes("sáb") && !h.includes("dom")) {
          turno = "tarde";
        } else if (h.includes("sab") || h.includes("sáb") || h.includes("dom") || h.includes("fin de semana")) {
          if (h.includes("full") || h.includes("completo") || h.includes("tarde")) {
            turno = "sabado_domingo_full";
          } else {
            turno = "sabado_domingo_am";
          }
        }
      }

      const payload = {
        alumno_id: selectedAlumno.id,
        modulo_id: viewingAlumnos.id,
        carrera_id: viewingAlumnos.carrera_id || null,
        turno
      };
      const res = await fetch("/api/matriculas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al matricular alumno");
      }
      flash("success", "Alumno matriculado exitosamente");
      setShowMatriculaForm(false);
      setSelectedAlumno(null);
      setSearchAlumQuery("");
      setSearchedAlumnos([]);
      // Recargar listado
      loadAlumnosModulo(viewingAlumnos);
    } catch (err: any) {
      flash("error", err.message);
    } finally {
      setSubmittingMatricula(false);
    }
  }

  async function handleDeleteMatricula() {
    if (!delMatriculaTarget || !viewingAlumnos) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/matriculas?id=${delMatriculaTarget.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al retirar alumno");
      flash("success", "Alumno retirado del módulo correctamente");
      setDelMatriculaTarget(null);
      // Recargar listado
      loadAlumnosModulo(viewingAlumnos);
    } catch (err: any) {
      flash("error", err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function loadNotas(cursoId: string) {
    setLoadingNotas(true);
    try {
      const res = await fetch(`/api/notas-cursos?curso_id=${cursoId}`);
      const data = await res.json();
      const map: Record<string, string> = {};
      if (Array.isArray(data)) {
        data.forEach((n: any) => {
          map[n.matricula_id] = n.nota !== null ? n.nota.toString() : "";
        });
      }
      setNotasMap(map);
      setInitialNotasMap(map);
    } catch (err) {
      console.error(err);
      flash("error", "Error al cargar las notas");
    } finally {
      setLoadingNotas(false);
    }
  }

  async function handleSaveNotas() {
    if (!activeNotasCurso) return;
    setSavingNotas(true);
    try {
      const promises = alumnosMatriculados.map(async (m: any) => {
        const strNota = notasMap[m.id];
        const initialNota = initialNotasMap[m.id];

        // Evitar llamadas innecesarias si la nota no cambió
        const normalizedInitial = initialNota || "";
        const normalizedStr = strNota || "";
        if (normalizedInitial === normalizedStr) return;

        const numNota = strNota && strNota.trim() !== "" ? parseFloat(strNota) : null;
        if (numNota !== null && (isNaN(numNota) || numNota < 0 || numNota > 20)) {
          throw new Error(`La nota de ${m.alumnos?.apellidos}, ${m.alumnos?.nombres} debe estar entre 0 y 20.`);
        }
        const res = await fetch("/api/notas-cursos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matricula_id: m.id,
            curso_id: activeNotasCurso.id,
            nota: numNota
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al guardar notas");
      });
      await Promise.all(promises);
      flash("success", "Notas guardadas correctamente");
      setActiveNotasCurso(null);
    } catch (err: any) {
      flash("error", err.message || "Error al guardar las notas");
    } finally {
      setSavingNotas(false);
    }
  }

  async function handleSaveDocente() {
    if (!changeDocenteTarget || !viewingAlumnos) return;
    setSubmittingChangeDocente(true);
    try {
      const res = await fetch(`/api/cursos/${changeDocenteTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: changeDocenteTarget.nombre,
          creditos: changeDocenteTarget.creditos,
          orden: changeDocenteTarget.orden,
          docente_id: changeDocenteId || null,
          descripcion: changeDocenteTarget.descripcion || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al asignar docente");

      flash("success", "Docente asignado correctamente");
      setChangeDocenteTarget(null);
      loadCursosModulo(viewingAlumnos.id);
    } catch (err: any) {
      flash("error", err.message);
    } finally {
      setSubmittingChangeDocente(false);
    }
  }

  async function handleCreateCurso(e: React.FormEvent) {
    e.preventDefault();
    if (!viewingAlumnos) return;
    if (!cursoNombre.trim()) {
      flash("error", "El nombre del curso es requerido");
      return;
    }
    setSubmittingCurso(true);
    try {
      const payload = {
        modulo_id: viewingAlumnos.id,
        nombre: cursoNombre.trim(),
        creditos: Number(cursoCreditos),
        orden: Number(cursoOrden),
        docente_id: cursoDocenteId || null,
        descripcion: cursoDescripcion || null
      };
      const res = await fetch("/api/cursos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear el curso");
      flash("success", `Curso "${data.nombre}" creado exitosamente`);
      setShowCursoForm(false);
      resetCursoForm();
      loadCursosModulo(viewingAlumnos.id);
    } catch (err: any) {
      flash("error", err.message);
    } finally {
      setSubmittingCurso(false);
    }
  }

  async function handleEditCurso(e: React.FormEvent) {
    e.preventDefault();
    if (!viewingAlumnos || !editCursoTarget) return;
    if (!cursoNombre.trim()) {
      flash("error", "El nombre del curso es requerido");
      return;
    }
    setSubmittingCurso(true);
    try {
      const payload = {
        nombre: cursoNombre.trim(),
        creditos: Number(cursoCreditos),
        orden: Number(cursoOrden),
        docente_id: cursoDocenteId || null,
        descripcion: cursoDescripcion || null
      };
      const res = await fetch(`/api/cursos/${editCursoTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar el curso");
      flash("success", `Curso "${data.nombre}" actualizado exitosamente`);
      setEditCursoTarget(null);
      resetCursoForm();
      loadCursosModulo(viewingAlumnos.id);
    } catch (err: any) {
      flash("error", err.message);
    } finally {
      setSubmittingCurso(false);
    }
  }

  async function handleDeleteCurso() {
    if (!viewingAlumnos || !delCursoTarget) return;
    setSubmittingCurso(true);
    try {
      const res = await fetch(`/api/cursos/${delCursoTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar el curso");
      }
      flash("success", "Curso eliminado correctamente");
      setDelCursoTarget(null);
      loadCursosModulo(viewingAlumnos.id);
    } catch (err: any) {
      flash("error", err.message);
    } finally {
      setSubmittingCurso(false);
    }
  }

  function resetCursoForm() {
    setCursoNombre("");
    setCursoCreditos(1);
    setCursoOrden(1);
    setCursoDocenteId("");
    setCursoDescripcion("");
  }

  function openEditCurso(c: any) {
    setEditCursoTarget(c);
    setCursoNombre(c.nombre);
    setCursoCreditos(c.creditos || 1);
    setCursoOrden(c.orden || 1);
    setCursoDocenteId(c.docente_id || "");
    setCursoDescripcion(c.descripcion || "");
    setShowCursoForm(true);
  }

  async function loadAsistenciaCurso(cursoId: string, moduloId: string, fechaStr: string) {
    try {
      const res = await fetch(`/api/asistencias?curso_id=${cursoId}&modulo_id=${moduloId}&fecha=${fechaStr}`);
      const data = await res.json();
      const newAsis: Record<string, boolean> = {};
      const newObs: Record<string, string> = {};

      alumnosMatriculados.forEach(m => {
        newAsis[m.id] = true;
        newObs[m.id] = "";
      });

      if (Array.isArray(data)) {
        data.forEach(item => {
          newAsis[item.matricula_id] = item.estado === "presente" || item.estado === "tardanza";
          newObs[item.matricula_id] = item.observacion || "";
        });
      }
      setAsistenciasMap(newAsis);
      setObservacionesMap(newObs);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    if (activeAsistenciaCurso && viewingAlumnos) {
      loadAsistenciaCurso(activeAsistenciaCurso.id, viewingAlumnos.id, fechaAsistencia);
    }
  }, [activeAsistenciaCurso, fechaAsistencia]);

  useEffect(() => {
    if (activeNotasCurso) {
      loadNotas(activeNotasCurso.id);
    }
  }, [activeNotasCurso]);

  async function handleSaveAsistencia() {
    if (!viewingAlumnos || !activeAsistenciaCurso) return;
    setSavingAsistencia(true);
    try {
      const promises = alumnosMatriculados.map(m => {
        const isPresent = asistenciasMap[m.id];
        const payload = {
          matricula_id: m.id,
          modulo_id: viewingAlumnos.id,
          curso_id: activeAsistenciaCurso.id,
          fecha: fechaAsistencia,
          estado: isPresent ? "presente" : "falta",
          observacion: observacionesMap[m.id] || null
        };
        return fetch("/api/asistencias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      });
      await Promise.all(promises);
      flash("success", "Asistencia del curso guardada correctamente");
      setActiveAsistenciaCurso(null);
    } catch (e) {
      flash("error", "Error al guardar asistencia");
    } finally {
      setSavingAsistencia(false);
    }
  }

  function getStatus(m: Modulo) {
    const now = new Date(), s = new Date(m.fecha_inicio), e = new Date(m.fecha_fin);
    if (now < s) return { label: "Próximo", color: "#fbbf24" };
    if (now > e) return { label: "Concluido", color: "#94a3b8" };
    return { label: "En curso", color: "#34d399" };
  }

  const isFormOpen = showForm || !!editTarget;

  if (viewingAlumnos) {
    const uniqueTurnos = Array.from(new Set(alumnosMatriculados.map(m => m.turno).filter(Boolean)));
    const showTurnoFilter = uniqueTurnos.length > 1;
    const effectiveFilterTurno = showTurnoFilter ? filterTurno : "";

    // Filtrar alumnos matriculados
    const filteredAlumnos = alumnosMatriculados.filter(mat => {
      const alum = mat.alumnos;
      if (!alum) return false;

      const q = searchAlum.toLowerCase().trim();
      if (q) {
        const dniMatch = (alum.dni || "").toLowerCase().includes(q);
        const codigoMatch = (alum.codigo || "").toLowerCase().includes(q);
        const nombresMatch = (alum.nombres || "").toLowerCase().includes(q);
        const apellidosMatch = (alum.apellidos || "").toLowerCase().includes(q);
        if (!dniMatch && !codigoMatch && !nombresMatch && !apellidosMatch) {
          return false;
        }
      }

      if (effectiveFilterTurno) {
        if (mat.turno !== effectiveFilterTurno) return false;
      }

      return true;
    });

    const totalAlum = filteredAlumnos.length;
    const totalPagesAlum = Math.max(1, Math.ceil(totalAlum / pageSizeAlum));
    const currentPageAlum = Math.min(pageAlum, totalPagesAlum);
    const paginatedAlumnos = filteredAlumnos.slice(
      (currentPageAlum - 1) * pageSizeAlum,
      currentPageAlum * pageSizeAlum
    );

    const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    const idxModulo = modulos.findIndex(m => m.id === viewingAlumnos.id);
    const roman = idxModulo !== -1 ? (ROMAN_NUMERALS[idxModulo] || String(idxModulo + 1)) : "I";
    const tituloModulo = `MODULO ${roman} MAQUINA (${viewingAlumnos.nombre.toUpperCase()})`;

    return (
      <div className="ts-viewing-alumnos-container" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
        <style dangerouslySetInnerHTML={{
          __html: `
          .ts-btn-back:hover { background: #f1f5f9!important; transform: translateY(-1px); }
          .ts-btn-back:active { transform: translateY(0); }
        `}} />
        {/* Header */}
        <div style={{ ...card, padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                <button
                  onClick={() => setViewingAlumnos(null)}
                  className="ts-btn-back"
                  style={{ background: "#ffffff", border: "none", borderRadius: 10, padding: "8px 14px", color: "#0f172a", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "background .2s, transform .15s" }}
                >
                  <ChevronLeft size={15} style={{ strokeWidth: 2.5 }} />
                  <span>Regresar</span>
                </button>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#dbeafe", margin: 0, textTransform: "uppercase" }}>{tituloModulo}</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Layout en columna de ancho completo (100%) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>

          {/* SECCIÓN SUPERIOR: Cursos del Módulo (100% ancho) */}
          <div style={{ ...card, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "#dbeafe", margin: 0 }}>Cursos del Módulo</h3>
              <button
                style={{ ...btnS, padding: "5px 10px", fontSize: 11, height: 26, gap: 4, border: "1.5px solid #ffffff", color: "#ffffff" }}
                onClick={() => { resetCursoForm(); setShowCursoForm(true); setEditCursoTarget(null); }}
              >
                <Plus size={12} /> Nuevo Curso
              </button>
            </div>

            {loadingAlumnos ? (
              <div style={{ textAlign: "center", padding: 20, color: "rgba(74,179,216,0.5)", fontSize: 12 }}>Cargando cursos...</div>
            ) : cursosModulo.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "rgba(74,179,216,0.4)", fontSize: 12 }}>
                No hay cursos creados en este módulo.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 12 }}>
                {cursosModulo.map(c => {
                  const doc = c.docentes;
                  return (
                    <div key={c.id} style={{ padding: 12, background: "rgba(10,22,44,0.5)", border: "1px solid rgba(42,109,181,0.15)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ fontWeight: 700, color: "#dbeafe", fontSize: 13, lineHeight: 1.3 }}>
                          {c.nombre} <span style={{ fontSize: 10, color: "rgba(74,179,216,0.7)", fontWeight: 500 }}>({c.creditos || 1} CR)</span>
                        </div>
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          <button
                            title="Editar Curso / Asignar Docente"
                            style={{ background: "transparent", border: "none", color: "rgba(74,179,216,0.6)", padding: 4, cursor: "pointer", transition: "color 0.2s" }}
                            onClick={() => openEditCurso(c)}
                            onMouseEnter={e => e.currentTarget.style.color = "#4ab3d8"}
                            onMouseLeave={e => e.currentTarget.style.color = "rgba(74,179,216,0.6)"}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            title="Eliminar Curso"
                            style={{ background: "transparent", border: "none", color: "rgba(248,113,113,0.5)", padding: 4, cursor: "pointer", transition: "color 0.2s" }}
                            onClick={() => setDelCursoTarget(c)}
                            onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                            onMouseLeave={e => e.currentTarget.style.color = "rgba(248,113,113,0.5)"}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <div style={{ fontSize: 11, color: doc ? "#34d399" : "#fbbf24", fontWeight: doc ? 600 : 500, marginTop: 4 }}>
                        {doc ? `DOCENTE. ${doc.nombres.split(" ")[0]} ${doc.apellidos.split(" ")[0]}` : "Sin docente asignado"}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, width: "100%" }}>
                        <button
                          style={{
                            background: "rgba(52,211,153,0.12)",
                            border: "1px solid rgba(52,211,153,0.25)",
                            color: "#34d399",
                            padding: "5px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4
                          }}
                          onClick={() => {
                            setActiveAsistenciaCurso(c);
                            setFechaAsistencia(new Date().toLocaleDateString('sv-SE'));
                          }}
                        >
                          <Calendar size={11} /> Asistencia
                        </button>
                        <button
                          style={{
                            background: "rgba(251,191,36,0.12)",
                            border: "1px solid rgba(251,191,36,0.25)",
                            color: "#fbbf24",
                            padding: "5px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4
                          }}
                          onClick={() => {
                            setActiveNotasCurso(c);
                          }}
                        >
                          <ClipboardList size={11} /> Notas
                        </button>
                        <button
                          style={{
                            background: "rgba(239,68,68,0.12)",
                            border: "1px solid #ef4444",
                            color: "#ef4444",
                            padding: "5px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4
                          }}
                          onClick={() => {
                            setChangeDocenteTarget(c);
                            setChangeDocenteId(c.docente_id || "");
                          }}
                        >
                          <User size={11} /> CAMBIAR DOCENTE
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECCIÓN INFERIOR: Listado de Alumnos (100% ancho, paginado y filtrado) */}
          <div style={{ ...card, overflow: "hidden" }}>

            {/* Barra de Filtros y Búsqueda */}
            <div style={{ display: "flex", gap: 12, padding: "16px 24px", borderBottom: "1px solid rgba(42,109,181,0.12)", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(74,179,216,0.5)" }} />
                <input
                  type="text"
                  placeholder="Buscar por DNI, Nombres o Apellidos..."
                  value={searchAlum}
                  onChange={e => { setSearchAlum(e.target.value); setPageAlum(1); }}
                  style={{ ...inp, padding: "0 12px 0 34px", height: 36, fontSize: 12.5 }}
                />
              </div>
              {showTurnoFilter && (
                <select
                  value={filterTurno}
                  onChange={e => { setFilterTurno(e.target.value); setPageAlum(1); }}
                  style={{ ...inp, width: 160, height: 36, fontSize: 12.5, padding: "0 10px" }}
                >
                  <option value="">Todos los Turnos</option>
                  {uniqueTurnos.map((t: any) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, " ").toUpperCase()}
                    </option>
                  ))}
                </select>
              )}
              <button
                style={{
                  ...btnS,
                  background: "rgba(52,211,153,0.12)",
                  border: "1.5px solid #ffffff",
                  color: "#ffffff",
                  padding: "0 16px",
                  height: 36,
                  fontSize: 12.5,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer"
                }}
                onClick={() => {
                  setSelectedAlumno(null);
                  setSearchAlumQuery("");
                  setSearchedAlumnos([]);
                  setShowMatriculaForm(true);
                }}
              >
                <UserPlus size={14} /> Matricular Alumno
              </button>
            </div>

            {loadingAlumnos ? (
              <div style={{ padding: "60px", textAlign: "center", color: "rgba(74,179,216,0.5)" }}>Cargando alumnos...</div>
            ) : filteredAlumnos.length === 0 ? (
              <div style={{ padding: "60px", textAlign: "center", color: "rgba(74,179,216,0.4)" }}>
                <Users size={32} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
                <p style={{ fontSize: 13 }}>No se encontraron alumnos que coincidan con la búsqueda o filtros</p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table className="ts-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(42,109,181,0.14)" }}>
                        {["#", "DNI", "Apellidos y Nombres", "Celular", "Turno", "Fecha Matrícula", ""].map((h, i) => (
                          <th key={i} style={{ padding: "12px 16px", fontSize: 10, fontWeight: 600, color: "rgba(74,179,216,0.55)", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap", textAlign: h === "" ? "right" : "left" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAlumnos.map((mat, idx) => (
                        <tr key={mat.id} style={{ borderBottom: "1px solid rgba(42,109,181,0.08)" }}>
                          <td style={{ padding: "12px 16px", color: "rgba(74,179,216,0.4)", fontSize: 11 }}>{(currentPageAlum - 1) * pageSizeAlum + idx + 1}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontFamily: "monospace", fontSize: 12, padding: "3px 8px", borderRadius: 5, background: "rgba(42,109,181,0.12)", border: "1px solid rgba(42,109,181,0.2)", color: "#ffffff" }}>
                              {mat.alumnos?.dni}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: 700, color: "#dbeafe" }}>{mat.alumnos?.apellidos}</div>
                            <div style={{ color: "rgba(180,210,240,0.7)", fontSize: 12 }}>{mat.alumnos?.nombres}</div>
                          </td>
                          <td style={{ padding: "12px 16px", color: "rgba(180,210,240,0.8)" }}>{mat.alumnos?.celular || "—"}</td>
                          <td style={{ padding: "12px 16px", color: "rgba(180,210,240,0.8)", textTransform: "capitalize" }}>{(viewingAlumnos?.turno || mat.turno)?.replace(/_/g, " ")}</td>
                          <td style={{ padding: "12px 16px", color: "rgba(180,210,240,0.6)", fontSize: 12 }}>{mat.fecha_registro}</td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                              <ReporteMatriculaBtn matriculaId={mat.id} label="Constancia" />
                              <ReporteAsistenciaBtn matriculaId={mat.id} />
                              <button
                                title="Quitar Alumno del Módulo"
                                style={{
                                  background: "rgba(248,113,113,0.12)",
                                  border: "1px solid rgba(248,113,113,0.25)",
                                  color: "#f87171",
                                  padding: "4px 8px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4
                                }}
                                onClick={() => setDelMatriculaTarget(mat)}
                              >
                                <UserMinus size={11} /> Quitar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px", borderTop: "1px solid rgba(42,109,181,0.12)", flexWrap: "wrap", gap: 10 }}>
                  <span style={{ fontSize: 12.5, color: "rgba(180,210,240,0.6)" }}>
                    Mostrando {paginatedAlumnos.length} de {totalAlum} alumnos
                  </span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button
                      disabled={currentPageAlum === 1}
                      onClick={() => setPageAlum(p => Math.max(1, p - 1))}
                      style={{
                        ...btnS,
                        padding: "5px 10px",
                        fontSize: 11,
                        height: 28,
                        cursor: currentPageAlum === 1 ? "not-allowed" : "pointer",
                        opacity: currentPageAlum === 1 ? 0.4 : 1
                      }}
                    >
                      Anterior
                    </button>
                    <span style={{ fontSize: 12.5, color: "#dbeafe", padding: "0 6px" }}>
                      Página {currentPageAlum} de {totalPagesAlum}
                    </span>
                    <button
                      disabled={currentPageAlum === totalPagesAlum}
                      onClick={() => setPageAlum(p => Math.min(totalPagesAlum, p + 1))}
                      style={{
                        ...btnS,
                        padding: "5px 10px",
                        fontSize: 11,
                        height: 28,
                        cursor: currentPageAlum === totalPagesAlum ? "not-allowed" : "pointer",
                        opacity: currentPageAlum === totalPagesAlum ? 0.4 : 1
                      }}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Modal: Crear / Editar Curso */}
        <Modal
          open={showCursoForm || !!editCursoTarget}
          onClose={() => { setShowCursoForm(false); setEditCursoTarget(null); resetCursoForm(); }}
          title={editCursoTarget ? "Editar Curso" : "Nuevo Curso"}
          maxWidth="450px"
        >
          <form onSubmit={editCursoTarget ? handleEditCurso : handleCreateCurso} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={lbl}>Nombre del Curso *</label>
              <input
                type="text"
                style={inp}
                className="md-inp"
                placeholder="Ej: Mantenimiento Preventivo"
                value={cursoNombre}
                onChange={e => setCursoNombre(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={lbl}>Créditos *</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  style={inp}
                  className="md-inp"
                  value={cursoCreditos}
                  onChange={e => setCursoCreditos(Number(e.target.value))}
                  required
                />
              </div>
              <div>
                <label style={lbl}>Orden de visualización</label>
                <input
                  type="number"
                  min={1}
                  style={inp}
                  className="md-inp"
                  value={cursoOrden}
                  onChange={e => setCursoOrden(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label style={lbl}>Profesor Asignado (Maestro)</label>
              <select
                style={{ ...inp, cursor: "pointer" }}
                className="md-inp"
                value={cursoDocenteId}
                onChange={e => setCursoDocenteId(e.target.value)}
              >
                <option value="">-- Sin asignar --</option>
                {docentes.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.apellidos}, {d.nombres} {d.dni ? `(DNI: ${d.dni})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={lbl}>Descripción (opcional)</label>
              <textarea
                style={{ ...inp, height: 60, padding: "10px 14px", resize: "none" }}
                className="md-inp"
                placeholder="Breve descripción del curso..."
                value={cursoDescripcion}
                onChange={e => setCursoDescripcion(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8, borderTop: "1px solid rgba(42,109,181,0.12)", paddingTop: 14 }}>
              <button
                type="button"
                style={btnS}
                onClick={() => { setShowCursoForm(false); setEditCursoTarget(null); resetCursoForm(); }}
                disabled={submittingCurso}
              >
                Cancelar
              </button>
              <button type="submit" style={btnP} className="cr-btn-p" disabled={submittingCurso}>
                {submittingCurso ? "Guardando..." : editCursoTarget ? "Actualizar" : "Crear"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Confirmar Eliminación del Curso */}
        <ConfirmDialog
          open={!!delCursoTarget}
          onClose={() => setDelCursoTarget(null)}
          onConfirm={handleDeleteCurso}
          loading={submittingCurso}
          title="¿Eliminar curso?"
          description="Esta acción eliminará el curso y todas sus calificaciones/asistencias. No se puede deshacer."
        >
          {delCursoTarget && (
            <div style={{ padding: "8px 12px", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 8, marginTop: 8 }}>
              <div style={{ fontWeight: 700, color: "#f87171", fontSize: 13 }}>
                {delCursoTarget.nombre}
              </div>
              <div style={{ fontSize: 11, color: "rgba(248,113,113,0.7)", marginTop: 2 }}>
                Módulo: {viewingAlumnos?.nombre}
              </div>
            </div>
          )}
        </ConfirmDialog>

        {/* Modal: Registro de Asistencia del Curso */}
        <Modal
          open={!!activeAsistenciaCurso}
          onClose={() => setActiveAsistenciaCurso(null)}
          title={`Asistencia del Curso: ${activeAsistenciaCurso?.nombre || ""}`}
          maxWidth="650px"
        >
          {activeAsistenciaCurso && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, background: "rgba(10,22,44,0.4)", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(42,109,181,0.12)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(74,179,216,0.8)", textTransform: "uppercase" }}>Fecha:</span>
                  <input
                    type="date"
                    style={{ ...inp, width: 150, height: 32, fontSize: 12 }}
                    value={fechaAsistencia}
                    onChange={e => setFechaAsistencia(e.target.value)}
                    min={viewingAlumnos?.fecha_inicio || undefined}
                    max={viewingAlumnos?.fecha_fin || undefined}
                  />
                </div>
                <span style={{ fontSize: 11, color: "rgba(120,160,210,0.6)" }}>
                  Profesor: {activeAsistenciaCurso.docentes ? `${activeAsistenciaCurso.docentes.nombres} ${activeAsistenciaCurso.docentes.apellidos}` : "Sin docente asignado"}
                </span>
              </div>

              <div style={{ overflowY: "auto", maxHeight: "40vh", border: "1px solid rgba(42,109,181,0.12)", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(10,22,44,0.3)", borderBottom: "1px solid rgba(42,109,181,0.14)" }}>
                      <th style={{ padding: "8px 12px", color: "rgba(74,179,216,0.6)" }}>Alumno</th>
                      <th style={{ padding: "8px 12px", color: "rgba(74,179,216,0.6)", textAlign: "center" }}>Asistencia</th>
                      <th style={{ padding: "8px 12px", color: "rgba(74,179,216,0.6)" }}>Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alumnosMatriculados.map(m => (
                      <tr key={m.id} style={{ borderBottom: "1px solid rgba(42,109,181,0.08)" }}>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontWeight: 700, color: "#dbeafe" }}>
                            {m.alumnos?.apellidos}, {m.alumnos?.nombres}
                          </div>
                          <div style={{ fontSize: 10, color: "rgba(120,160,210,0.5)" }}>
                            DNI: {m.alumnos?.dni}
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <button
                            type="button"
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              color: asistenciasMap[m.id] ? "#f87171" : "#34d399",
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "4px 8px",
                              borderRadius: 6,
                              backgroundColor: asistenciasMap[m.id] ? "rgba(248,113,113,0.12)" : "rgba(52,211,153,0.12)"
                            }}
                            onClick={() => setAsistenciasMap(p => ({ ...p, [m.id]: !p[m.id] }))}
                          >
                            {asistenciasMap[m.id] ? "FALTA" : "PRESENTE"}
                          </button>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <input
                            type="text"
                            placeholder="Ninguna..."
                            style={{ ...inp, height: 28, fontSize: 11, padding: "0 8px" }}
                            value={observacionesMap[m.id] || ""}
                            onChange={e => setObservacionesMap(p => ({ ...p, [m.id]: e.target.value }))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10, borderTop: "1px solid rgba(42,109,181,0.12)", paddingTop: 14 }}>
                <button
                  type="button"
                  style={btnS}
                  onClick={() => setActiveAsistenciaCurso(null)}
                  disabled={savingAsistencia}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  style={btnP}
                  className="cr-btn-p"
                  onClick={handleSaveAsistencia}
                  disabled={savingAsistencia}
                >
                  {savingAsistencia ? "Guardando..." : "Guardar Asistencia"}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal: Matricular Alumno */}
        <Modal
          open={showMatriculaForm}
          onClose={() => {
            setShowMatriculaForm(false);
            setSelectedAlumno(null);
            setSearchAlumQuery("");
            setSearchedAlumnos([]);
          }}
          title="Matricular Alumno en el Módulo"
          maxWidth="550px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={lbl}>Buscar Alumno (DNI, Apellidos o Nombres)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  style={inp}
                  placeholder="Ej: 45678912 o Quispe..."
                  value={searchAlumQuery}
                  onChange={e => setSearchAlumQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearchAlumnos(searchAlumQuery);
                    }
                  }}
                />
                <button
                  type="button"
                  style={{ ...btnS, background: "rgba(74,179,216,0.15)", color: "#4ab3d8", border: "1px solid rgba(74,179,216,0.25)" }}
                  onClick={() => handleSearchAlumnos(searchAlumQuery)}
                  disabled={loadingSearchedAlumnos}
                >
                  {loadingSearchedAlumnos ? "Buscando..." : "Buscar"}
                </button>
              </div>
            </div>

            {/* Resultados de la búsqueda */}
            {loadingSearchedAlumnos ? (
              <div style={{ textAlign: "center", padding: 10, color: "rgba(74,179,216,0.5)", fontSize: 12 }}>Buscando alumnos...</div>
            ) : searchedAlumnos.length > 0 ? (
              <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid rgba(42,109,181,0.15)", borderRadius: 8, background: "rgba(10,22,44,0.3)" }}>
                {searchedAlumnos.map(alum => {
                  const isSelected = selectedAlumno?.id === alum.id;
                  return (
                    <div
                      key={alum.id}
                      style={{
                        padding: "8px 12px",
                        borderBottom: "1px solid rgba(42,109,181,0.08)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: isSelected ? "rgba(74,179,216,0.1)" : "transparent"
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, color: "#dbeafe", fontSize: 12.5 }}>
                          {alum.apellidos}, {alum.nombres}
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(74,179,216,0.6)" }}>
                          DNI: {alum.dni} | Carrera: {alum.carrera || "—"}
                        </div>
                      </div>
                      <button
                        type="button"
                        style={{
                          ...btnS,
                          padding: "4px 8px",
                          fontSize: 11,
                          height: 24,
                          background: isSelected ? "#34d399" : "rgba(74,179,216,0.08)",
                          color: isSelected ? "#0a162c" : "#7cc8e8",
                          border: isSelected ? "none" : "1px solid rgba(74,179,216,0.2)"
                        }}
                        onClick={() => setSelectedAlumno(alum)}
                      >
                        {isSelected ? "Seleccionado" : "Seleccionar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : searchAlumQuery.trim() !== "" ? (
              <div style={{ textAlign: "center", padding: 10, color: "rgba(74,179,216,0.4)", fontSize: 12 }}>No se encontraron alumnos</div>
            ) : null}

            {/* Estudiante seleccionado */}
            {selectedAlumno && (
              <div style={{ padding: "10px 14px", background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "rgba(52,211,153,0.75)", fontWeight: 600, textTransform: "uppercase" }}>Estudiante Seleccionado:</div>
                <div style={{ fontWeight: 700, color: "#34d399", fontSize: 13, marginTop: 2 }}>
                  {selectedAlumno.apellidos}, {selectedAlumno.nombres}
                </div>
                <div style={{ fontSize: 11, color: "rgba(180,210,240,0.7)" }}>
                  DNI: {selectedAlumno.dni}
                </div>
              </div>
            )}



            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8, borderTop: "1px solid rgba(42,109,181,0.12)", paddingTop: 14 }}>
              <button
                type="button"
                style={btnS}
                onClick={() => {
                  setShowMatriculaForm(false);
                  setSelectedAlumno(null);
                  setSearchAlumQuery("");
                  setSearchedAlumnos([]);
                }}
                disabled={submittingMatricula}
              >
                Cancelar
              </button>
              <button
                type="button"
                style={btnP}
                className="cr-btn-p"
                onClick={handleCreateMatricula}
                disabled={submittingMatricula || !selectedAlumno}
              >
                {submittingMatricula ? "Registrando..." : "Matricular Alumno"}
              </button>
            </div>
          </div>
        </Modal>

        {/* Confirmar Retiro del Alumno */}
        <ConfirmDialog
          open={!!delMatriculaTarget}
          onClose={() => setDelMatriculaTarget(null)}
          onConfirm={handleDeleteMatricula}
          loading={submitting}
          title="¿Quitar alumno del módulo?"
          description="Esta acción retirará al alumno del módulo. Se perderán de forma permanente sus calificaciones y registros de asistencia asociados a este módulo. No se puede deshacer."
        >
          {delMatriculaTarget && (
            <div style={{ padding: "8px 12px", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 8, marginTop: 8 }}>
              <div style={{ fontWeight: 700, color: "#f87171", fontSize: 13 }}>
                {delMatriculaTarget.alumnos?.apellidos}, {delMatriculaTarget.alumnos?.nombres}
              </div>
              <div style={{ fontSize: 11, color: "rgba(248,113,113,0.7)", marginTop: 2 }}>
                DNI: {delMatriculaTarget.alumnos?.dni} | Turno: {delMatriculaTarget.turno?.replace(/_/g, " ")}
              </div>
            </div>
          )}
        </ConfirmDialog>

        {/* Modal: Registro de Notas del Curso */}
        <Modal
          open={!!activeNotasCurso}
          onClose={() => setActiveNotasCurso(null)}
          title={`Calificaciones del Curso: ${activeNotasCurso?.nombre || ""}`}
          maxWidth="600px"
        >
          {activeNotasCurso && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "rgba(10,22,44,0.4)", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(42,109,181,0.12)", fontSize: 12, color: "rgba(120,160,210,0.8)" }}>
                Docente: <strong style={{ color: "#dbeafe" }}>{activeNotasCurso.docentes ? `${activeNotasCurso.docentes.nombres} ${activeNotasCurso.docentes.apellidos}` : "Sin docente asignado"}</strong>
              </div>

              {loadingNotas ? (
                <div style={{ padding: 40, textAlign: "center", color: "rgba(74,179,216,0.5)" }}>Cargando notas...</div>
              ) : alumnosMatriculados.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "rgba(74,179,216,0.4)" }}>No hay alumnos matriculados en este módulo.</div>
              ) : (
                <div style={{ overflowY: "auto", maxHeight: "50vh", border: "1px solid rgba(42,109,181,0.12)", borderRadius: 8 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "rgba(10,22,44,0.6)", borderBottom: "1px solid rgba(42,109,181,0.15)" }}>
                        <th style={{ padding: "8px 12px", width: "40px", color: "rgba(74,179,216,0.6)", textTransform: "uppercase", fontSize: 10 }}>#</th>
                        <th style={{ padding: "8px 12px", width: "100px", color: "rgba(74,179,216,0.6)", textTransform: "uppercase", fontSize: 10 }}>DNI</th>
                        <th style={{ padding: "8px 12px", color: "rgba(74,179,216,0.6)", textTransform: "uppercase", fontSize: 10 }}>Apellidos y Nombres</th>
                        <th style={{ padding: "8px 12px", width: "100px", color: "rgba(74,179,216,0.6)", textTransform: "uppercase", fontSize: 10, textAlign: "center" }}>Nota (0-20)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alumnosMatriculados.map((m, idx) => {
                        const scoreStr = notasMap[m.id];
                        const score = scoreStr && scoreStr.trim() !== "" ? parseFloat(scoreStr) : null;
                        const scoreColor = score !== null ? (score >= 14 ? "#34d399" : "#f87171") : "#dbeafe";

                        return (
                          <tr key={m.id} style={{ borderBottom: "1px solid rgba(42,109,181,0.08)" }}>
                            <td style={{ padding: "10px 12px", color: "rgba(74,179,216,0.4)" }}>{idx + 1}</td>
                            <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#ffffff" }}>{m.alumnos?.dni}</td>
                            <td style={{ padding: "10px 12px", fontWeight: 600, color: "#dbeafe" }}>
                              {m.alumnos?.apellidos}, {m.alumnos?.nombres}
                            </td>
                            <td style={{ padding: "6px 12px", textAlign: "center" }}>
                              <input
                                type="number"
                                min={0}
                                max={20}
                                step="any"
                                placeholder="—"
                                style={{
                                  ...inp,
                                  height: 32,
                                  width: 70,
                                  textAlign: "center",
                                  padding: "0 4px",
                                  fontSize: 13.5,
                                  fontWeight: 700,
                                  color: scoreColor
                                }}
                                value={notasMap[m.id] || ""}
                                onChange={e => {
                                  const val = e.target.value;
                                  setNotasMap(p => ({ ...p, [m.id]: val }));
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10, borderTop: "1px solid rgba(42,109,181,0.12)", paddingTop: 14 }}>
                <button
                  type="button"
                  style={btnS}
                  onClick={() => setActiveNotasCurso(null)}
                  disabled={savingNotas || loadingNotas}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  style={btnP}
                  className="cr-btn-p"
                  onClick={handleSaveNotas}
                  disabled={savingNotas || loadingNotas}
                >
                  {savingNotas ? "Guardando..." : "Guardar Notas"}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal: Cambiar Docente Rápido */}
        <Modal
          open={!!changeDocenteTarget}
          onClose={() => setChangeDocenteTarget(null)}
          title={`Asignar Docente al Curso: ${changeDocenteTarget?.nombre || ""}`}
          maxWidth="450px"
        >
          {changeDocenteTarget && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={lbl}>Seleccionar Docente</label>
                <div style={{ position: "relative" }}>
                  <select
                    style={{ ...inp, cursor: "pointer", paddingRight: "36px" }}
                    value={changeDocenteId}
                    onChange={e => setChangeDocenteId(e.target.value)}
                  >
                    <option value="">— Sin docente asignado —</option>
                    {docentes.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.apellidos}, {d.nombres} {d.dni ? `(DNI: ${d.dni})` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                      color: "rgba(74,179,216,0.5)"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10, borderTop: "1px solid rgba(42,109,181,0.12)", paddingTop: 14 }}>
                <button
                  type="button"
                  style={btnS}
                  onClick={() => setChangeDocenteTarget(null)}
                  disabled={submittingChangeDocente}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  style={btnP}
                  className="cr-btn-p"
                  onClick={handleSaveDocente}
                  disabled={submittingChangeDocente}
                >
                  {submittingChangeDocente ? "Asignando..." : "Guardar Cambios"}
                </button>
              </div>
            </div>
          )}
        </Modal>

        <AlertDialog
          open={msg.open}
          onClose={() => setMsg(p => ({ ...p, open: false }))}
          message={msg.text}
          type={msg.type}
        />
      </div>
    );
  }

  const filteredModulos = modulos.filter(m => {
    if (filterStatus) {
      if (getStatus(m).label !== filterStatus) return false;
    }
    if (filterStartDate) {
      if (m.fecha_inicio < filterStartDate) return false;
    }
    if (filterEndDate) {
      if (m.fecha_fin > filterEndDate) return false;
    }
    if (searchMod.trim()) {
      const q = searchMod.toLowerCase().trim();
      const nameMatch = (m.nombre || "").toLowerCase().includes(q);
      const profMatch = (m.profesor || "").toLowerCase().includes(q);
      const aulaMatch = (m.aula || "").toLowerCase().includes(q);
      const horarioMatch = (m.horario || "").toLowerCase().includes(q);
      if (!nameMatch && !profMatch && !aulaMatch && !horarioMatch) return false;
    }
    return true;
  });

  // Group modules by classroom
  const modulesByAula: Record<string, Modulo[]> = {};
  filteredModulos.forEach(m => {
    const aulaKey = m.aula?.trim() ? m.aula.trim().toUpperCase() : "SIN AULA";
    if (!modulesByAula[aulaKey]) {
      modulesByAula[aulaKey] = [];
    }
    modulesByAula[aulaKey].push(m);
  });

  const folderNames = Object.keys(modulesByAula).sort((a, b) => {
    if (a === "SIN AULA") return 1;
    if (b === "SIN AULA") return -1;
    return a.localeCompare(b);
  });

  const modulesInFolder = currentFolder ? (modulesByAula[currentFolder] || []) : [];

  // Group modules in the current folder by module name (sub-folder)
  const modulesBySubFolder: Record<string, Modulo[]> = {};
  modulesInFolder.forEach(m => {
    const subFolderKey = m.nombre?.trim() ? m.nombre.trim() : "SIN NOMBRE";
    if (!modulesBySubFolder[subFolderKey]) {
      modulesBySubFolder[subFolderKey] = [];
    }
    modulesBySubFolder[subFolderKey].push(m);
  });

  const subFolderNames = Object.keys(modulesBySubFolder).sort((a, b) => {
    if (a === "SIN NOMBRE") return 1;
    if (b === "SIN NOMBRE") return -1;
    return a.localeCompare(b);
  });

  const modulesInSubFolder = currentSubFolder ? (modulesBySubFolder[currentSubFolder] || []) : [];

  const totalPagesMod = viewMode === "folders" && currentFolder !== null && currentSubFolder !== null
    ? Math.ceil(modulesInSubFolder.length / pageSizeMod)
    : viewMode === "flat"
      ? Math.ceil(filteredModulos.length / pageSizeMod)
      : 1;

  const currentPageMod = Math.min(pageMod, totalPagesMod || 1);

  const paginatedModulos = viewMode === "folders" && currentFolder !== null && currentSubFolder !== null
    ? modulesInSubFolder.slice((currentPageMod - 1) * pageSizeMod, currentPageMod * pageSizeMod)
    : viewMode === "flat"
      ? filteredModulos.slice((currentPageMod - 1) * pageSizeMod, currentPageMod * pageSizeMod)
      : [];

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <style>{`
        .md-inp:focus{border-color:rgba(74,179,216,.55)!important;box-shadow:0 0 0 3px rgba(74,179,216,.1)!important;}
        .md-card:hover{border-color:rgba(74,179,216,.3)!important;transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.4);}
        .md-action:hover{background:rgba(42,109,181,.15)!important;color:#4ab3d8!important;}
        .md-del:hover{background:rgba(248,113,113,.1)!important;color:#f87171!important;}
        .md-btn-alumnos:hover{background:rgba(52,211,153,0.18)!important;color:#6ee7b7!important;}
        .ts-btn-back:hover { background: #f1f5f9!important; transform: translateY(-1px); }
        .ts-btn-back:active { transform: translateY(0); }
        .folder-card:hover {
          border-color: rgba(74,179,216,.35)!important;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,.4);
          background: rgba(8,16,34,0.95)!important;
        }
        .folder-card:hover svg {
          color: #38bdf8!important;
          transform: scale(1.05);
        }
      `}</style>

      {/* Header */}
      <div style={{ ...card, padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Fila de Título */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              {onBack && (
                <button
                  onClick={onBack}
                  className="ts-btn-back"
                  style={{ background: "#ffffff", border: "none", borderRadius: 10, padding: "8px 14px", color: "#0f172a", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "background .2s, transform .15s" }}
                >
                  <ChevronLeft size={15} style={{ strokeWidth: 2.5 }} />
                  <span>Regresar</span>
                </button>
              )}
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#dbeafe", margin: 0 }}>
                {currentCarreraNombre ? `— ${currentCarreraNombre}` : ""}
              </h2>
            </div>
            <p style={{ fontSize: 13, color: "rgba(74,179,216,0.6)", marginTop: 4 }}>
              {currentCarreraNombre
                ? `Módulos académicos de la carrera ${currentCarreraNombre} con profesor y aula`
                : "Módulos académicos del instituto con profesor y aula"}
            </p>
          </div>
        </div>

        {/* Línea Divisoria */}
        <div style={{ height: "1px", background: "rgba(42,109,181,0.12)", margin: "0 -28px" }} />

        {/* Fila de Controles (Buscador, Filtro y Botón) */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", width: "100%" }}>
          {/* Buscador de Módulos */}
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <input
              className="md-inp"
              style={{ ...inp, paddingLeft: 34, height: 40, fontSize: 12 }}
              placeholder="Buscar módulo, profesor, horario, aula..."
              value={searchMod}
              onChange={e => { setSearchMod(e.target.value); setPageMod(1); }}
            />
            <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "rgba(74,179,216,0.5)" }} />
          </div>

          {/* Filtro por estado del módulo */}
          <div style={{ position: "relative" }}>
            <select className="md-inp" style={{ ...inp, paddingRight: 32, cursor: "pointer", height: 40, fontSize: 12 }} value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="Próximo">Próximo</option>
              <option value="En curso">En curso</option>
              <option value="Concluido">Concluido</option>
            </select>
            <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(74,179,216,0.5)" }} />
          </div>

          {/* Filtro por fecha - Desde */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: "rgba(74,179,216,0.6)", fontWeight: 700, letterSpacing: "0.05em" }}>DESDE:</span>
            <input
              type="date"
              className="md-inp"
              style={{ ...inp, width: 130, height: 40, fontSize: 11, padding: "0 8px", cursor: "pointer" }}
              value={filterStartDate}
              onChange={e => { setFilterStartDate(e.target.value); setPageMod(1); }}
            />
          </div>

          {/* Filtro por fecha - Hasta */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: "rgba(74,179,216,0.6)", fontWeight: 700, letterSpacing: "0.05em" }}>HASTA:</span>
            <input
              type="date"
              className="md-inp"
              style={{ ...inp, width: 130, height: 40, fontSize: 11, padding: "0 8px", cursor: "pointer" }}
              value={filterEndDate}
              onChange={e => { setFilterEndDate(e.target.value); setPageMod(1); }}
            />
          </div>

          {/* Botón de limpiar fechas */}
          {(filterStartDate || filterEndDate) && (
            <button
              onClick={() => { setFilterStartDate(""); setFilterEndDate(""); setPageMod(1); }}
              style={{
                background: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.2)",
                color: "#f87171",
                height: 40,
                padding: "0 12px",
                borderRadius: 10,
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                transition: "all 0.2s"
              }}
            >
              <X size={12} />
              LIMPIAR FECHAS
            </button>
          )}

          {/* Toggle View Mode */}
          <div style={{ display: "flex", gap: 6, background: "rgba(10,22,44,0.7)", padding: "4px", borderRadius: 10, border: "1px solid rgba(42,109,181,0.22)", height: 40, alignItems: "center", boxSizing: "border-box" }}>
            <button
              type="button"
              onClick={() => { setViewMode("flat"); setCurrentFolder(null); setCurrentSubFolder(null); setPageMod(1); }}
              style={{
                background: viewMode === "flat" ? "rgba(74,179,216,0.15)" : "transparent",
                border: "none",
                borderRadius: 8,
                padding: "0 12px",
                height: 32,
                color: viewMode === "flat" ? "#4ab3d8" : "rgba(120, 160, 210, 0.65)",
                fontWeight: viewMode === "flat" ? 700 : 500,
                fontSize: 11,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s"
              }}
            >
              <Grid size={13} />
              VER TODOS (LISTA)
            </button>
            <button
              type="button"
              onClick={() => { setViewMode("folders"); setCurrentFolder(null); setCurrentSubFolder(null); setPageMod(1); }}
              style={{
                background: viewMode === "folders" ? "rgba(74,179,216,0.15)" : "transparent",
                border: "none",
                borderRadius: 8,
                padding: "0 12px",
                height: 32,
                color: viewMode === "folders" ? "#4ab3d8" : "rgba(120, 160, 210, 0.65)",
                fontWeight: viewMode === "folders" ? 700 : 500,
                fontSize: 11,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s"
              }}
            >
              <Folder size={13} />
              ORGANIZAR POR CARPETAS
            </button>
          </div>

          <button style={btnP} onClick={handleOpenNewModulo}>
            <Plus size={14} /> Nuevo Módulo
          </button>
        </div>
      </div>

      {/* Alerts */}
      <AlertDialog
        open={msg.open}
        onClose={() => setMsg(p => ({ ...p, open: false }))}
        message={msg.text}
        type={msg.type}
      />

      {/* Form */}
      <Modal
        open={isFormOpen}
        onClose={() => { setShowForm(false); setEditTarget(null); }}
        title={editTarget ? "Editar Módulo" : "Nuevo Módulo"}
        maxWidth="min(600px, 95vw)"
      >
        <form onSubmit={editTarget ? handleEdit : handleCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16, marginBottom: 16 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={lbl}>Nombre del Módulo *</label>
              <input className="md-inp" style={inp} list="mod-sug" placeholder="Ej: Cargador Frontal" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} required />
              <datalist id="mod-sug">{sugerencias.map(n => <option key={n} value={n} />)}</datalist>
            </div>
            {!carreraId && (
              <div>
                <label style={lbl}>Carrera</label>
                <div style={{ position: "relative" }}>
                  <select className="md-inp" style={{ ...inp, paddingRight: 32, cursor: "pointer" }} value={form.carrera_id} onChange={e => setForm(p => ({ ...p, carrera_id: e.target.value }))}>
                    <option value="">Sin carrera</option>
                    {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(74,179,216,0.5)" }} />
                </div>
              </div>
            )}
            <div>
              <label style={lbl}>Modalidad *</label>
              <div style={{ position: "relative" }}>
                <select className="md-inp" style={{ ...inp, paddingRight: 32, cursor: "pointer" }} value={form.modalidad} onChange={e => setForm(p => ({ ...p, modalidad: e.target.value as Modulo["modalidad"] }))}>
                  <option value="presencial">Presencial</option>
                  <option value="virtual">Virtual</option>
                  <option value="semipresencial">Semipresencial</option>
                </select>
                <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(74,179,216,0.5)" }} />
              </div>
            </div>
            <div>
              <label style={lbl}>Duración</label>
              <input className="md-inp" style={inp} type="text" placeholder="Ej: 120 horas, 4 semanas" value={form.duracion} onChange={e => setForm(p => ({ ...p, duracion: e.target.value }))} />
            </div>
            <div>
              <label style={lbl}>Fecha Inicio *</label>
              <input className="md-inp" style={inp} type="date" value={form.fecha_inicio} onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))} required />
            </div>
            <div>
              <label style={lbl}>Fecha Fin *</label>
              <input className="md-inp" style={inp} type="date" value={form.fecha_fin} onChange={e => setForm(p => ({ ...p, fecha_fin: e.target.value }))} required />
            </div>
            <div style={{ gridColumn: "1/-1", display: "grid", gridTemplateColumns: "3fr 1fr", gap: 16 }}>
              <div>
                <label style={lbl}>Horario *</label>
                <input className="md-inp" style={inp} list="horario-sug" placeholder="Ej: Lunes a Viernes 8:00 AM - 12:00 PM" value={form.horario} onChange={e => setForm(p => ({ ...p, horario: e.target.value }))} required />
                <datalist id="horario-sug">
                  <option value="Lunes a Viernes 8:00 AM - 12:00 PM" />
                  <option value="Lunes a Viernes 2:00 PM - 6:00 PM" />
                  <option value="Lunes a Viernes 6:00 PM - 10:00 PM" />
                  <option value="Sábados y Domingos 8:00 AM - 1:00 PM" />
                  <option value="Sábados y Domingos 2:00 PM - 7:00 PM" />
                  <option value="Sábados 8:00 AM - 1:00 PM" />
                  <option value="Sábados 2:00 PM - 7:00 PM" />
                  <option value="Domingos 8:00 AM - 1:00 PM" />
                  <option value="Domingos 2:00 PM - 7:00 PM" />
                </datalist>
              </div>

              <div>
                <label style={lbl}>Turno</label>
                <div style={{ position: "relative" }}>
                  <select className="md-inp" style={{ ...inp, paddingRight: 32, cursor: "pointer" }} value={form.turno} onChange={e => setForm(p => ({ ...p, turno: e.target.value }))}>
                    <option value="mañana">Mañana</option>
                    <option value="tarde">Tarde</option>
                    <option value="noche">Noche</option>
                  </select>
                  <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(74,179,216,0.5)" }} />
                </div>
              </div>
            </div>
            {/* El docente ahora se asigna por curso individual, no por módulo */}

            <div>
              <label style={lbl}>Local</label>
              <input className="md-inp" style={inp} placeholder="Sede o local" value={form.local} onChange={e => setForm(p => ({ ...p, local: e.target.value }))} />
            </div>
            <div>
              <label style={lbl}>Carpeta (Aula)</label>
              <input
                className="md-inp"
                style={inp}
                placeholder="Ej: A-101"
                value={form.aula}
                list="aulas-suggestions"
                onChange={e => setForm(p => ({ ...p, aula: e.target.value }))}
              />
              <datalist id="aulas-suggestions">
                <option value="A-101" />
                <option value="A-102" />
                <option value="A-103" />
                <option value="B-101" />
                <option value="B-102" />
                <option value="D-101" />
              </datalist>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
            <button type="button" style={btnS} onClick={() => { setShowForm(false); setEditTarget(null); }}>Cancelar</button>
            <button type="submit" style={btnP} disabled={submitting}>
              <Cpu size={14} /> {submitting ? "Guardando…" : editTarget ? "Actualizar Módulo" : "Crear Módulo"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={handleDelete}
        loading={submitting}
        title="¿Eliminar módulo?"
        description="Se eliminarán también los cursos y matrículas asociadas."
      >
        <p style={{ fontSize: 13, color: "rgba(120,160,210,0.7)" }}><strong style={{ color: "#4ab3d8" }}>{delTarget?.nombre}</strong></p>
      </ConfirmDialog>

      {/* Cards grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(310px,1fr))", gap: 16 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 200, borderRadius: 14, background: "rgba(42,109,181,0.07)" }} />)}
        </div>
      ) : modulos.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", color: "rgba(74,179,216,0.4)" }}>
          <Cpu size={48} style={{ margin: "0 auto 12px", opacity: 0.2 }} /><p style={{ fontSize: 13 }}>No hay módulos registrados</p>
        </div>
      ) : filteredModulos.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", color: "rgba(74,179,216,0.4)" }}>
          <Search size={48} style={{ margin: "0 auto 12px", opacity: 0.2 }} />
          <p style={{ fontSize: 13 }}>No se encontraron módulos con los filtros aplicados</p>
        </div>
      ) : (
        <>
          {viewMode === "folders" && currentFolder !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => { setCurrentFolder(null); setCurrentSubFolder(null); }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(120, 160, 210, 0.7)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = "#4ab3d8";
                  e.currentTarget.style.background = "rgba(42, 109, 181, 0.1)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = "rgba(120, 160, 210, 0.7)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <FolderOpen size={14} />
                <span>Módulos</span>
              </button>
              <span style={{ color: "rgba(74, 179, 216, 0.45)" }}>/</span>
              <button
                type="button"
                disabled={currentSubFolder === null}
                onClick={() => setCurrentSubFolder(null)}
                style={{
                  background: currentSubFolder === null ? "rgba(74, 179, 216, 0.08)" : "transparent",
                  border: currentSubFolder === null ? "1px solid rgba(74, 179, 216, 0.18)" : "none",
                  color: currentSubFolder === null ? "#4ab3d8" : "rgba(120, 160, 210, 0.7)",
                  fontSize: 13,
                  fontWeight: currentSubFolder === null ? 700 : 600,
                  cursor: currentSubFolder === null ? "default" : "pointer",
                  padding: "4px 8px",
                  borderRadius: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "all 0.2s"
                }}
              >
                <span>{currentFolder}</span>
              </button>
              {currentSubFolder !== null && (
                <>
                  <span style={{ color: "rgba(74, 179, 216, 0.45)" }}>/</span>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#4ab3d8",
                    padding: "4px 8px",
                    background: "rgba(74, 179, 216, 0.08)",
                    border: "1px solid rgba(74, 179, 216, 0.18)",
                    borderRadius: 6,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5
                  }}>
                    {currentSubFolder}
                  </span>
                </>
              )}
            </div>
          )}

          {viewMode === "folders" && currentFolder === null ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {folderNames.map(folderName => {
                const count = modulesByAula[folderName].length;
                return (
                  <div
                    key={folderName}
                    className="folder-card"
                    onClick={() => handleSelectFolder(folderName)}
                    style={{
                      ...card,
                      padding: "20px 24px",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      cursor: "pointer",
                      transition: "all 0.2s ease-in-out",
                    }}
                  >
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: "rgba(59, 130, 246, 0.12)",
                      border: "1px solid rgba(59, 130, 246, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <Folder size={22} style={{ color: "#60a5fa" }} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#dbeafe", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={folderName}>
                        {folderName}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(74, 179, 216, 0.6)", marginTop: 2 }}>
                        {count} {count === 1 ? "módulo" : "módulos"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : viewMode === "folders" && currentFolder !== null && currentSubFolder === null ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {subFolderNames.map(subFolderName => {
                const count = modulesBySubFolder[subFolderName].length;
                return (
                  <div
                    key={subFolderName}
                    className="folder-card"
                    onClick={() => { setCurrentSubFolder(subFolderName); setPageMod(1); }}
                    style={{
                      ...card,
                      padding: "20px 24px",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      cursor: "pointer",
                      transition: "all 0.2s ease-in-out",
                    }}
                  >
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: "rgba(16, 185, 129, 0.12)",
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <Folder size={22} style={{ color: "#10b981" }} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#dbeafe", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={subFolderName}>
                        {subFolderName}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(74, 179, 216, 0.6)", marginTop: 2 }}>
                        {count} {count === 1 ? "grupo" : "grupos"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(310px,1fr))", gap: 16 }}>
              {paginatedModulos.map(m => {
                const status = getStatus(m);
                return (
                  <div key={m.id} className="md-card" style={{ ...card, padding: 20, display: "flex", flexDirection: "column", gap: 12, transition: "all .2s" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg,rgba(59,130,246,0.2),rgba(6,182,212,0.2))", border: "1px solid rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Cpu size={16} style={{ color: "#60a5fa" }} />
                        </div>
                        <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: MODALIDAD_COLORS[m.modalidad], color: MODALIDAD_TEXT[m.modalidad], fontWeight: 600 }}>{m.modalidad.toUpperCase()}</span>
                      </div>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(42,109,181,0.1)", color: status.color, fontWeight: 600 }}>{status.label.toUpperCase()}</span>
                        {onNavigate && (
                          <button className="md-action" style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(42,109,181,0.2)", background: "transparent", color: "rgba(74,179,216,0.5)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .2s" }} onClick={() => onNavigate("docentes")} title="Ir a Panel Docente (Notas y Asistencia)"><GraduationCap size={12} /></button>
                        )}
                        <button className="md-action" style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(42,109,181,0.2)", background: "transparent", color: "rgba(74,179,216,0.5)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .2s" }} onClick={() => openEdit(m)} title="Editar"><Pencil size={12} /></button>
                        <button className="md-del" style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid transparent", background: "transparent", color: "rgba(248,113,113,0.4)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .2s" }} onClick={() => setDelTarget(m)} title="Eliminar"><Trash2 size={12} /></button>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#dbeafe", lineHeight: 1.3 }}>{m.nombre}</div>
                      {m.carreras && <div style={{ fontSize: 11, color: "rgba(74,179,216,0.6)", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}><GraduationCap size={10} />{m.carreras.nombre}</div>}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {m.aula && (
                          <span style={{
                            fontSize: 10,
                            padding: "2.5px 8px",
                            borderRadius: 6,
                            background: "rgba(99,102,241,0.15)",
                            color: "#a5b4fc",
                            border: "1px solid rgba(99,102,241,0.25)",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            maxWidth: "100%"
                          }} title={`Aula: ${m.aula}`}>
                            <MapPin size={9} style={{ flexShrink: 0 }} />
                            AULA: {m.aula.toUpperCase()}
                          </span>
                        )}
                        {m.local && (
                          <span style={{
                            fontSize: 10,
                            padding: "2.5px 8px",
                            borderRadius: 6,
                            background: "rgba(74,179,216,0.12)",
                            color: "#7cc8e8",
                            border: "1px solid rgba(74,179,216,0.22)",
                            fontWeight: 500,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            maxWidth: "100%"
                          }} title={`Sede: ${m.local}`}>
                            {m.local.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, color: "rgba(120,160,210,0.7)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={10} style={{ color: "rgba(74,179,216,0.4)", flexShrink: 0 }} />{m.fecha_inicio} → {m.fecha_fin}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}><Clock size={10} style={{ color: "rgba(74,179,216,0.4)", flexShrink: 0 }} />{m.duracion ? `${m.duracion} · ` : ""}{Math.round((new Date(m.fecha_fin).getTime() - new Date(m.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24))} días</div>
                      {m.profesor && <div style={{ display: "flex", alignItems: "center", gap: 5 }}><User size={10} style={{ color: "rgba(74,179,216,0.4)", flexShrink: 0 }} />Prof. {m.profesor}</div>}
                      {m.horario && <div style={{ display: "flex", alignItems: "center", gap: 5 }}><Clock size={10} style={{ color: "rgba(74,179,216,0.4)", flexShrink: 0 }} />Horario: {m.horario}</div>}
                    </div>

                    <button
                      className="md-btn-alumnos"
                      style={{
                        ...btnS,
                        marginTop: 10,
                        width: "100%",
                        justifyContent: "center",
                        padding: "8px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 8,
                        background: "rgba(52,211,153,0.08)",
                        border: "1px solid rgba(52,211,153,0.18)",
                        color: "#34d399",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      onClick={() => loadAlumnosModulo(m)}
                    >
                      <Users size={13} />
                      VER ALUMNOS DEL MODULO
                    </button>

                    <ReporteModuloBtn
                      moduloId={m.id}
                      text="Descargar Registro (Notas y Asistencia)"
                      style={{
                        marginTop: 8,
                        width: "100%",
                        justifyContent: "center",
                        padding: "8px 12px",
                        height: "auto",
                        borderRadius: 8,
                        background: "rgba(251,191,36,0.08)",
                        border: "1px solid rgba(251,191,36,0.18)",
                        color: "#fbbf24",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Paginación de módulos */}
          {((viewMode === "flat") || (viewMode === "folders" && currentFolder !== null && currentSubFolder !== null)) && totalPagesMod > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, padding: "0 4px", flexWrap: "wrap", gap: 10 }}>
              <span style={{ fontSize: 12.5, color: "rgba(120,160,210,0.6)" }}>
                Mostrando {paginatedModulos.length} de {viewMode === "folders" && currentFolder !== null && currentSubFolder !== null ? modulesInSubFolder.length : filteredModulos.length} módulos
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  disabled={currentPageMod === 1}
                  onClick={() => setPageMod(p => Math.max(1, p - 1))}
                  style={{
                    ...btnS,
                    padding: "5px 10px",
                    fontSize: 11,
                    height: 28,
                    cursor: currentPageMod === 1 ? "not-allowed" : "pointer",
                    opacity: currentPageMod === 1 ? 0.4 : 1
                  }}
                >
                  Anterior
                </button>
                <span style={{ fontSize: 12.5, color: "#dbeafe", padding: "0 6px" }}>
                  Página {currentPageMod} de {totalPagesMod}
                </span>
                <button
                  disabled={currentPageMod === totalPagesMod}
                  onClick={() => setPageMod(p => Math.min(totalPagesMod, p + 1))}
                  style={{
                    ...btnS,
                    padding: "5px 10px",
                    fontSize: 11,
                    height: 28,
                    cursor: currentPageMod === totalPagesMod ? "not-allowed" : "pointer",
                    opacity: currentPageMod === totalPagesMod ? 0.4 : 1
                  }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
