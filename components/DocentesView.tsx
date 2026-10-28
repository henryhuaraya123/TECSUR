"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronDown, Calendar, Save, Plus, CheckSquare, Square, Layers, User, Edit, Search, X, Clock, Folder, Grid, GraduationCap } from "lucide-react";
import AlertDialog from "./AlertDialog";
import Modal from "./Modal";
import ReporteModuloBtn from "./ReporteModuloBtn";
import ReporteCursoBtn from "./ReporteCursoBtn";
import { carreraBadgeStyle } from "@/lib/carreraColors";

interface Modulo {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  modalidad: string;
  duracion?: string | number | null;
  profesor?: string;
  local?: string;
  aula?: string;
  carrera_id?: string | null;
  carreras?: { id: string; nombre: string } | null;
  cursos?: any[] | null;
}
interface Matricula { id: string; alumnos: { id: string; dni: string; nombres: string; apellidos: string; carrera: string } }
interface Curso { id: string; nombre: string; orden: number; creditos?: number; }
interface Asistencia { id: string; matricula_id: string; estado: string }
interface NotaCurso { id: string; matricula_id: string; nota: number | null }

const cardStyle: React.CSSProperties = { background: "rgba(8,16,34,0.85)", border: "1px solid rgba(42,109,181,0.18)", borderRadius: 14, backdropFilter: "blur(12px)" };
const inpStyle: React.CSSProperties = { width: "100%", height: 40, boxSizing: "border-box", background: "rgba(10,22,44,0.7)", border: "1px solid rgba(42,109,181,0.22)", borderRadius: 10, padding: "0 14px", color: "#dbeafe", fontSize: 13, outline: "none" };
const btnPrimary: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1a4a7a 0%,#2a6db5 55%,#4ab3d8 100%)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const btnSecondary: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, background: "rgba(42,109,181,0.1)", border: "1px solid rgba(42,109,181,0.22)", color: "rgba(120,160,210,0.85)", fontSize: 13, fontWeight: 500, cursor: "pointer" };

interface DocentesViewProps {
  docenteId?: string | null;
}

export default function DocentesView({ docenteId = null }: DocentesViewProps) {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [cursosDocente, setCursosDocente] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModulo, setSelectedModulo] = useState<Modulo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(6);
  const [viewMode, setViewMode] = useState<"folders" | "flat">("folders");
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [currentAulaFolder, setCurrentAulaFolder] = useState<string | null>(null);
  const [filterCarrera, setFilterCarrera] = useState("");
  const [allAsistencias, setAllAsistencias] = useState<any[]>([]);
  const [loadingReporte, setLoadingReporte] = useState(false);
  const [filterDocente, setFilterDocente] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const [tab, setTab] = useState<"asistencia" | "notas" | "reporte">("asistencia");
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);

  // Asistencia
  const [fechaAsistencia, setFechaAsistencia] = useState<string>(new Date().toISOString().split("T")[0]);
  const [asistenciasMap, setAsistenciasMap] = useState<Record<string, boolean>>({}); // matricula_id -> presente?
  const [observacionesMap, setObservacionesMap] = useState<Record<string, string>>({}); // matricula_id -> observacion

  // Notas
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState<string>("");
  const [notasMap, setNotasMap] = useState<Record<string, string>>({}); // matricula_id -> nota
  const [showNewCurso, setShowNewCurso] = useState(false);
  const [newCursoNombre, setNewCursoNombre] = useState("");
  const [newCursoCreditos, setNewCursoCreditos] = useState(1);
  const [newCursoDocenteId, setNewCursoDocenteId] = useState("");
  const [showEditCurso, setShowEditCurso] = useState(false);
  const [editCursoId, setEditCursoId] = useState("");
  const [editCursoNombre, setEditCursoNombre] = useState("");
  const [editCursoCreditos, setEditCursoCreditos] = useState(1);
  const [editCursoDocenteId, setEditCursoDocenteId] = useState("");
  const [docentes, setDocentes] = useState<any[]>([]);

  const [saving, setSaving] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ open: boolean; message: string; type: "success" | "error" }>({ open: false, message: "", type: "success" });

  useEffect(() => {
    setLoading(true);
    const url = docenteId ? `/api/cursos?docente_id=${docenteId}` : "/api/cursos";
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setCursosDocente(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [docenteId]);

  useEffect(() => {
    if (!docenteId) {
      fetch("/api/docentes")
        .then(r => r.json())
        .then(data => setDocentes(Array.isArray(data) ? data : []))
        .catch(() => { });
    }
  }, [docenteId]);

  const loadMatriculas = async (moduloId: string) => {
    const res = await fetch(`/api/matriculas?modulo_id=${moduloId}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    list.sort((a: any, b: any) => {
      const apA = (a.alumnos?.apellidos || "").trim().toLowerCase();
      const apB = (b.alumnos?.apellidos || "").trim().toLowerCase();
      if (apA !== apB) return apA.localeCompare(apB, "es", { sensitivity: "base" });
      const nomA = (a.alumnos?.nombres || "").trim().toLowerCase();
      const nomB = (b.alumnos?.nombres || "").trim().toLowerCase();
      return nomA.localeCompare(nomB, "es", { sensitivity: "base" });
    });
    setMatriculas(list);
  };

  const loadAsistencias = async (moduloId: string, cursoId: string, fecha: string) => {
    if (!cursoId) return;
    const res = await fetch(`/api/asistencias?modulo_id=${moduloId}&curso_id=${cursoId}&fecha=${fecha}`);
    const data: Asistencia[] = await res.json();
    const asisMap: Record<string, boolean> = {};
    const obsMap: Record<string, string> = {};
    if (Array.isArray(data)) {
      data.forEach((a: any) => {
        asisMap[a.matricula_id] = a.estado === "presente";
        obsMap[a.matricula_id] = a.observacion || "";
      });
    }
    setAsistenciasMap(asisMap);
    setObservacionesMap(obsMap);
  };

  const loadCursos = async (moduloId: string) => {
    const res = await fetch(`/api/cursos?modulo_id=${moduloId}`);
    const data: Curso[] = await res.json();
    const validData = Array.isArray(data) ? data : [];
    setCursos(validData);
    if (validData.length > 0 && !selectedCursoId) {
      setSelectedCursoId(validData[0].id);
    }
  };

  const loadNotas = async (cursoId: string) => {
    if (!cursoId) return;
    const res = await fetch(`/api/notas-cursos?curso_id=${cursoId}`);
    const data: NotaCurso[] = await res.json();
    const map: Record<string, string> = {};
    if (Array.isArray(data)) {
      data.forEach(n => { map[n.matricula_id] = n.nota !== null ? n.nota.toString() : ""; });
    }
    setNotasMap(map);
  };

  useEffect(() => {
    if (selectedModulo) {
      loadMatriculas(selectedModulo.id);
      loadCursos(selectedModulo.id);
    }
  }, [selectedModulo]);

  useEffect(() => {
    if (selectedModulo && tab === "asistencia" && selectedCursoId && fechaAsistencia) {
      loadAsistencias(selectedModulo.id, selectedCursoId, fechaAsistencia);
    }
  }, [selectedModulo, tab, selectedCursoId, fechaAsistencia]);

  useEffect(() => {
    if (tab === "notas" && selectedCursoId) {
      loadNotas(selectedCursoId);
    }
  }, [tab, selectedCursoId]);

  const loadReporteData = async (moduloId: string, cursoId: string) => {
    if (!cursoId) return;
    setLoadingReporte(true);
    try {
      const res = await fetch(`/api/asistencias?modulo_id=${moduloId}&curso_id=${cursoId}`);
      const data = await res.json();
      setAllAsistencias(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReporte(false);
    }
  };

  useEffect(() => {
    if (tab === "reporte" && selectedModulo && selectedCursoId) {
      loadReporteData(selectedModulo.id, selectedCursoId);
      loadNotas(selectedCursoId);
    }
  }, [tab, selectedModulo, selectedCursoId]);

  const flash = (type: "success" | "error", message: string) => setAlertInfo({ open: true, type, message });

  // Guardar Asistencia
  const saveAsistencia = async () => {
    if (!selectedModulo || !fechaAsistencia) return;
    setSaving(true);
    try {
      const promises = matriculas.map(async (m) => {
        const presente = asistenciasMap[m.id] || false;
        const obs = observacionesMap[m.id] || "";
        await fetch("/api/asistencias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matricula_id: m.id,
            modulo_id: selectedModulo.id,
            curso_id: selectedCursoId,
            fecha: fechaAsistencia,
            estado: presente ? "presente" : "falta",
            observacion: obs.trim() === "" ? null : obs.trim()
          })
        });
      });
      await Promise.all(promises);
      flash("success", "Asistencia guardada correctamente");
    } catch (e) {
      flash("error", "Error al guardar asistencia");
    } finally {
      setSaving(false);
    }
  };

  // Crear Curso
  const createCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModulo || !newCursoNombre.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/cursos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modulo_id: selectedModulo.id,
          nombre: newCursoNombre,
          orden: cursos.length + 1,
          creditos: newCursoCreditos,
          docente_id: docenteId ? docenteId : (newCursoDocenteId || null)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error creando curso");
      flash("success", "Curso creado");
      setShowNewCurso(false);
      setNewCursoNombre("");
      setNewCursoCreditos(1);
      setNewCursoDocenteId("");
      await loadCursos(selectedModulo.id);
      setSelectedCursoId(data.id);
    } catch (err: any) {
      flash("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  // Editar Curso
  const updateCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCursoId || !editCursoNombre.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/cursos/${editCursoId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: editCursoNombre,
          creditos: editCursoCreditos,
          docente_id: docenteId ? docenteId : (editCursoDocenteId || null)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error editando curso");
      flash("success", "Curso actualizado");
      setShowEditCurso(false);
      await loadCursos(selectedModulo!.id);
    } catch (err: any) {
      flash("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  // Guardar Notas
  const saveNotas = async () => {
    if (!selectedCursoId) return;
    setSaving(true);
    try {
      const promises = matriculas.map(async (m) => {
        const strNota = notasMap[m.id];
        const numNota = strNota && strNota.trim() !== "" ? parseFloat(strNota) : null;
        if (numNota !== null && (isNaN(numNota) || numNota < 0 || numNota > 20)) return;
        await fetch("/api/notas-cursos", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matricula_id: m.id, curso_id: selectedCursoId, nota: numNota })
        });
      });
      await Promise.all(promises);
      flash("success", "Notas guardadas correctamente");
    } catch (e) {
      flash("error", "Error al guardar notas");
    } finally {
      setSaving(false);
    }
  };

  if (!selectedModulo) {
    const carrerasDisponibles = Array.from(
      new Set(
        cursosDocente
          .map(c => c.modulos?.carreras?.nombre?.trim())
          .filter(Boolean) as string[]
      )
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

    const filteredCursos = cursosDocente
      .filter(c => {
        const m = c.modulos;
        return !m || new Date().toLocaleDateString('sv-SE') <= m.fecha_fin;
      })
      .filter(c => {
        const m = c.modulos || {};
        if (filterStartDate && m.fecha_inicio && m.fecha_inicio < filterStartDate) return false;
        if (filterEndDate && m.fecha_fin && m.fecha_fin > filterEndDate) return false;
        if (filterDocente && c.docente_id !== filterDocente) return false;
        if (filterCarrera) {
          const carName = c.modulos?.carreras?.nombre?.trim() || "SIN CARRERA";
          if (carName.toUpperCase() !== filterCarrera.toUpperCase()) return false;
        }
        return true;
      })
      .filter(c => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const m = c.modulos || {};
        const doc = c.docentes || {};
        const docName = `${doc.nombres || ""} ${doc.apellidos || ""}`.toLowerCase();
        return c.nombre.toLowerCase().includes(q) ||
          (m.nombre || "").toLowerCase().includes(q) ||
          (m.carreras?.nombre || "").toLowerCase().includes(q) ||
          (m.aula || "").toLowerCase().includes(q) ||
          docName.includes(q);
      });

    // Ordenar cursos por Carrera, luego por Módulo y finalmente por orden/nombre
    const sortedCursos = [...filteredCursos].sort((a, b) => {
      const carA = (a.modulos?.carreras?.nombre || "").trim();
      const carB = (b.modulos?.carreras?.nombre || "").trim();
      if (!carA && carB) return 1;
      if (carA && !carB) return -1;
      const compCarrera = carA.localeCompare(carB, "es", { sensitivity: "base" });
      if (compCarrera !== 0) return compCarrera;

      const modA = (a.modulos?.nombre || "").trim();
      const modB = (b.modulos?.nombre || "").trim();
      const compModulo = modA.localeCompare(modB, "es", { sensitivity: "base" });
      if (compModulo !== 0) return compModulo;

      if (a.orden !== undefined && b.orden !== undefined && a.orden !== b.orden) {
        return (a.orden || 0) - (b.orden || 0);
      }
      return (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" });
    });

    // Agrupar cursos por carrera
    const coursesByCarrera: Record<string, any[]> = {};
    sortedCursos.forEach(c => {
      const carreraKey = c.modulos?.carreras?.nombre?.trim()
        ? c.modulos.carreras.nombre.trim().toUpperCase()
        : "SIN CARRERA";
      if (!coursesByCarrera[carreraKey]) {
        coursesByCarrera[carreraKey] = [];
      }
      coursesByCarrera[carreraKey].push(c);
    });

    const folderNames = Object.keys(coursesByCarrera).sort((a, b) => {
      if (a === "SIN CARRERA") return 1;
      if (b === "SIN CARRERA") return -1;
      return a.localeCompare(b, "es", { sensitivity: "base" });
    });

    const coursesInCarrera = currentFolder ? (coursesByCarrera[currentFolder] || []) : [];

    // Agrupar cursos de la carrera seleccionada por aula
    const aulasInCarrera: Record<string, any[]> = {};
    coursesInCarrera.forEach(c => {
      const aulaKey = c.modulos?.aula?.trim() ? c.modulos.aula.trim().toUpperCase() : "SIN AULA";
      if (!aulasInCarrera[aulaKey]) {
        aulasInCarrera[aulaKey] = [];
      }
      aulasInCarrera[aulaKey].push(c);
    });

    const aulaFolderNames = Object.keys(aulasInCarrera).sort((a, b) => {
      if (a === "SIN AULA") return 1;
      if (b === "SIN AULA") return -1;
      return a.localeCompare(b, "es", { sensitivity: "base" });
    });

    const coursesInAula = currentAulaFolder ? (aulasInCarrera[currentAulaFolder] || []) : [];

    const effectivePageSize = viewMode === "flat" ? 12 : 6;
    const totalItems = viewMode === "folders" && currentFolder !== null && currentAulaFolder !== null
      ? coursesInAula.length
      : viewMode === "flat"
        ? sortedCursos.length
        : 0;

    const totalPages = Math.ceil(totalItems / effectivePageSize);
    const activePage = Math.min(currentPage, totalPages || 1);

    const paginatedCursos = viewMode === "folders" && currentFolder !== null && currentAulaFolder !== null
      ? coursesInAula.slice((activePage - 1) * effectivePageSize, activePage * effectivePageSize)
      : viewMode === "flat"
        ? sortedCursos.slice((activePage - 1) * effectivePageSize, activePage * effectivePageSize)
        : [];

    // Agrupar los cursos paginados en la vista plana por carrera
    const flatCoursesByCarrera: Record<string, any[]> = {};
    paginatedCursos.forEach(c => {
      const carreraKey = c.modulos?.carreras?.nombre?.trim()
        ? c.modulos.carreras.nombre.trim().toUpperCase()
        : "SIN CARRERA";
      if (!flatCoursesByCarrera[carreraKey]) {
        flatCoursesByCarrera[carreraKey] = [];
      }
      flatCoursesByCarrera[carreraKey].push(c);
    });

    const renderCursoCard = (c: any) => {
      const m = c.modulos || {};
      const doc = c.docentes || {};
      const isFinished = new Date().toLocaleDateString('sv-SE') > m.fecha_fin;

      let diffDays = 0;
      if (m.fecha_fin) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fin = new Date(m.fecha_fin + "T00:00:00");
        const diffTime = fin.getTime() - hoy.getTime();
        diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return (
        <div key={c.id} style={{ ...cardStyle, padding: 20, cursor: "pointer", transition: "all .2s", display: "flex", flexDirection: "column", gap: 10 }}
          onClick={() => {
            setSelectedModulo(m);
            setSelectedCursoId(c.id);
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(74,179,216,0.5)"}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(42,109,181,0.18)"}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, background: "rgba(74,179,216,0.15)", color: "#4ab3d8", fontWeight: 600 }}>{(m.modalidad || "").toUpperCase()}</span>
              <span style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 20, fontWeight: 700, letterSpacing: 0.5,
                background: isFinished ? "rgba(148,163,184,0.15)" : "rgba(52,211,153,0.15)",
                color: isFinished ? "#94a3b8" : "#34d399"
              }}>
                {isFinished ? "FINALIZADO" : "EN CURSO"}
              </span>
              {!isFinished && m.fecha_fin && (
                <>
                  {diffDays > 0 ? (
                    <span style={{
                      fontSize: 10,
                      padding: "3px 8px",
                      borderRadius: 20,
                      fontWeight: 700,
                      background: diffDays <= 7 ? "rgba(245,158,11,0.15)" : "rgba(59,130,246,0.12)",
                      color: diffDays <= 7 ? "#fbbf24" : "#60a5fa",
                      border: diffDays <= 7 ? "1px solid rgba(245,158,11,0.22)" : "1px solid rgba(59,130,246,0.18)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      <Clock size={10} style={{ flexShrink: 0 }} />
                      FALTAN {diffDays} {diffDays === 1 ? "DÍA" : "DÍAS"}
                    </span>
                  ) : diffDays === 0 ? (
                    <span style={{
                      fontSize: 10,
                      padding: "3px 8px",
                      borderRadius: 20,
                      fontWeight: 700,
                      background: "rgba(239,68,68,0.15)",
                      color: "#f87171",
                      border: "1px solid rgba(239,68,68,0.22)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      <Clock size={10} style={{ flexShrink: 0 }} />
                      TERMINA HOY
                    </span>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div>
            {m.carreras && (
              <div style={{ marginBottom: 6 }}>
                <span style={carreraBadgeStyle(m.carreras.nombre)}>
                  {m.carreras.nombre.toUpperCase()}
                </span>
              </div>
            )}
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(42,109,181,0.18)", border: "1px solid rgba(42,109,181,0.3)", color: "rgba(120,160,210,0.9)", fontWeight: 600 }}>
                MÓDULO: {(m.nombre || "").toUpperCase()}
              </span>
              {m.aula && (
                <span style={{ fontSize: 10, marginLeft: 6, padding: "2px 6px", borderRadius: 4, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa", fontWeight: 600 }}>
                  AULA: {m.aula.toUpperCase()}
                </span>
              )}
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#dbeafe", margin: 0, lineHeight: 1.3 }}>{c.nombre.toUpperCase()}</h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "rgba(120,160,210,0.7)", marginTop: "auto", paddingTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Calendar size={12} style={{ color: "rgba(74,179,216,0.5)", flexShrink: 0 }} /> {m.fecha_inicio} al {m.fecha_fin}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><User size={12} style={{ color: "rgba(74,179,216,0.5)", flexShrink: 0 }} /> Docente: {doc.id ? `${doc.apellidos}, ${doc.nombres}` : "No asignado"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Layers size={12} style={{ color: "rgba(74,179,216,0.5)", flexShrink: 0 }} /> Créditos: {c.creditos || 1} CR</div>
          </div>

          <button
            className="ts-btn-alumnos"
            style={{
              ...btnSecondary,
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
            onClick={() => {
              setSelectedModulo(m);
              setSelectedCursoId(c.id);
            }}
          >
            VER ALUMNOS DEL CURSO
          </button>

          <ReporteCursoBtn
            cursoId={c.id}
            moduloId={m.id}
            text="DESCARGAR REPORTE"
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
    };

    return (
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
        <style dangerouslySetInnerHTML={{
          __html: `
          .ts-btn-enter-course:hover { background: rgba(74,179,216,0.18)!important; color: #dbeafe!important; }
          .ts-btn-alumnos:hover { background: rgba(52,211,153,0.18)!important; color: #6ee7b7!important; }
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
        `}} />
        <AlertDialog open={alertInfo.open} type={alertInfo.type} message={alertInfo.message} onClose={() => setAlertInfo(p => ({ ...p, open: false }))} />

        {/* Header */}
        <div style={{ ...cardStyle, padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Fila superior: Título */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#dbeafe", marginBottom: 4 }}>Panel Docente</h2>
              <p style={{ fontSize: 13, color: "rgba(74,179,216,0.6)", margin: 0 }}>
                {docenteId ? "Seleccione un curso para registrar asistencia y notas." : "Seleccione un módulo para registrar asistencia y notas."}
              </p>
            </div>
          </div>

          {/* Línea divisoria */}
          <div style={{ height: "1px", background: "rgba(42,109,181,0.12)", margin: "0 -28px" }} />

          {/* Fila de Controles (Buscador, Filtros y Modo de Vista) */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", width: "100%" }}>
            {/* Buscador */}
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <Search size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "rgba(74,179,216,.5)" }} />
              <input
                type="text"
                placeholder={docenteId ? "Buscar curso, módulo o carrera…" : "Buscar módulo o carrera…"}
                style={{ ...inpStyle, paddingLeft: 38, fontSize: 13, height: 40 }}
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); setCurrentFolder(null); setCurrentAulaFolder(null); }}
              />
            </div>

            {/* Filtro por Carrera */}
            {carrerasDisponibles.length > 0 && (
              <div style={{ position: "relative" }}>
                <select
                  style={{ ...inpStyle, width: 200, paddingRight: 32, cursor: "pointer", height: 40, fontSize: 12 }}
                  value={filterCarrera}
                  onChange={e => { setFilterCarrera(e.target.value); setCurrentPage(1); setCurrentFolder(null); setCurrentAulaFolder(null); }}
                >
                  <option value="">Todas las carreras</option>
                  {carrerasDisponibles.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(74,179,216,0.5)" }} />
              </div>
            )}

            {/* Filtro por Docente (solo para administradores) */}
            {!docenteId && docentes.length > 0 && (
              <div style={{ position: "relative" }}>
                <select
                  style={{ ...inpStyle, width: 220, paddingRight: 32, cursor: "pointer", height: 40, fontSize: 12 }}
                  value={filterDocente}
                  onChange={e => { setFilterDocente(e.target.value); setCurrentPage(1); setCurrentFolder(null); setCurrentAulaFolder(null); }}
                >
                  <option value="">Todos los docentes</option>
                  {docentes.map(d => (
                    <option key={d.id} value={d.id}>{d.apellidos}, {d.nombres}</option>
                  ))}
                </select>
                <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(74,179,216,0.5)" }} />
              </div>
            )}

            {/* Filtro por fecha - Desde */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: "rgba(74,179,216,0.6)", fontWeight: 700, letterSpacing: "0.05em" }}>DESDE:</span>
              <input
                type="date"
                style={{ ...inpStyle, width: 130, height: 40, fontSize: 11, padding: "0 8px", cursor: "pointer" }}
                value={filterStartDate}
                onChange={e => { setFilterStartDate(e.target.value); setCurrentPage(1); setCurrentFolder(null); setCurrentAulaFolder(null); }}
              />
            </div>

            {/* Filtro por fecha - Hasta */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: "rgba(74,179,216,0.6)", fontWeight: 700, letterSpacing: "0.05em" }}>HASTA:</span>
              <input
                type="date"
                style={{ ...inpStyle, width: 130, height: 40, fontSize: 11, padding: "0 8px", cursor: "pointer" }}
                value={filterEndDate}
                onChange={e => { setFilterEndDate(e.target.value); setCurrentPage(1); setCurrentFolder(null); setCurrentAulaFolder(null); }}
              />
            </div>

            {/* Botón de limpiar filtros */}
            {(filterStartDate || filterEndDate || filterDocente || filterCarrera) && (
              <button
                onClick={() => { setFilterStartDate(""); setFilterEndDate(""); setFilterDocente(""); setFilterCarrera(""); setCurrentPage(1); setCurrentFolder(null); setCurrentAulaFolder(null); }}
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
                LIMPIAR FILTROS
              </button>
            )}

            {/* Toggle View Mode */}
            <div style={{ display: "flex", gap: 2, background: "rgba(10,22,44,0.7)", padding: "4px", borderRadius: 10, border: "1px solid rgba(42,109,181,0.22)", height: 40, alignItems: "center", boxSizing: "border-box", marginLeft: "auto" }}>
              <button
                type="button"
                title="Vista de Carpetas (Carreras y Aulas)"
                onClick={() => { setViewMode("folders"); setCurrentFolder(null); setCurrentAulaFolder(null); setCurrentPage(1); }}
                style={{
                  background: viewMode === "folders" ? "rgba(42,109,181,0.25)" : "transparent",
                  border: "none",
                  borderRadius: 8,
                  width: 32,
                  height: 30,
                  color: viewMode === "folders" ? "#4ab3d8" : "rgba(120, 160, 210, 0.6)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s"
                }}
              >
                <Folder size={15} />
              </button>
              <button
                type="button"
                title="Vista Plana (Cuadrícula)"
                onClick={() => { setViewMode("flat"); setCurrentFolder(null); setCurrentAulaFolder(null); setCurrentPage(1); }}
                style={{
                  background: viewMode === "flat" ? "rgba(42,109,181,0.25)" : "transparent",
                  border: "none",
                  borderRadius: 8,
                  width: 32,
                  height: 30,
                  color: viewMode === "flat" ? "#4ab3d8" : "rgba(120, 160, 210, 0.6)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s"
                }}
              >
                <Grid size={15} />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#4ab3d8" }}>
            {docenteId ? "Cargando cursos..." : "Cargando módulos..."}
          </div>
        ) : sortedCursos.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "rgba(74,179,216,0.4)" }}>
            <Search size={48} style={{ margin: "0 auto 12px", opacity: 0.2 }} />
            <p style={{ fontSize: 13 }}>No se encontraron elementos que coincidan con la búsqueda</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Breadcrumb if inside folder (Carrera o Aula) */}
            {viewMode === "folders" && currentFolder !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                {currentAulaFolder === null ? (
                  <button
                    onClick={() => { setCurrentFolder(null); setCurrentAulaFolder(null); setCurrentPage(1); }}
                    className="ts-btn-back"
                    style={{
                      background: "#ffffff", border: "none", borderRadius: 8,
                      padding: "6px 12px", color: "#0f172a", fontSize: 12,
                      fontWeight: 700, cursor: "pointer", display: "inline-flex",
                      alignItems: "center", gap: 6, transition: "all 0.2s"
                    }}
                  >
                    <ChevronLeft size={14} style={{ strokeWidth: 2.5 }} />
                    <span>Volver a Carreras</span>
                  </button>
                ) : (
                  <button
                    onClick={() => { setCurrentAulaFolder(null); setCurrentPage(1); }}
                    className="ts-btn-back"
                    style={{
                      background: "#ffffff", border: "none", borderRadius: 8,
                      padding: "6px 12px", color: "#0f172a", fontSize: 12,
                      fontWeight: 700, cursor: "pointer", display: "inline-flex",
                      alignItems: "center", gap: 6, transition: "all 0.2s"
                    }}
                  >
                    <ChevronLeft size={14} style={{ strokeWidth: 2.5 }} />
                    <span>Volver a Aulas</span>
                  </button>
                )}
                <span style={{ fontSize: 12, color: "rgba(74,179,216,0.3)" }}>|</span>
                <button
                  onClick={() => { setCurrentFolder(null); setCurrentAulaFolder(null); setCurrentPage(1); }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(120,160,210,0.85)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: 6,
                    transition: "all 0.2s"
                  }}
                  title="Ir a todas las carreras"
                >
                  Carreras
                </button>
                <span style={{ fontSize: 12, color: "rgba(74,179,216,0.5)" }}>/</span>
                <button
                  onClick={() => { setCurrentAulaFolder(null); setCurrentPage(1); }}
                  disabled={currentAulaFolder === null}
                  style={{
                    background: currentAulaFolder === null ? "rgba(74,179,216,0.08)" : "transparent",
                    border: currentAulaFolder === null ? "1px solid rgba(74,179,216,0.18)" : "none",
                    borderRadius: 6,
                    padding: "5px 10px",
                    color: currentAulaFolder === null ? "#4ab3d8" : "rgba(120,160,210,0.85)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: currentAulaFolder === null ? "default" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.2s"
                  }}
                >
                  <GraduationCap size={14} />
                  <span>{currentFolder}</span>
                </button>
                {currentAulaFolder !== null && (
                  <>
                    <span style={{ fontSize: 12, color: "rgba(74,179,216,0.5)" }}>/</span>
                    <span style={{
                      fontSize: 12,
                      color: "#4ab3d8",
                      fontWeight: 700,
                      background: "rgba(74,179,216,0.08)",
                      padding: "5px 10px",
                      border: "1px solid rgba(74,179,216,0.18)",
                      borderRadius: 6,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6
                    }}>
                      <Folder size={14} />
                      <span>{currentAulaFolder}</span>
                    </span>
                    <span style={{ fontSize: 11, color: "rgba(120,160,210,0.6)", fontWeight: 600 }}>
                      ({coursesInAula.length} {coursesInAula.length === 1 ? "curso" : "cursos"})
                    </span>
                  </>
                )}
                {currentAulaFolder === null && (
                  <span style={{ fontSize: 11, color: "rgba(120,160,210,0.6)", fontWeight: 600 }}>
                    ({coursesInCarrera.length} {coursesInCarrera.length === 1 ? "curso" : "cursos"} en {aulaFolderNames.length} {aulaFolderNames.length === 1 ? "aula" : "aulas"})
                  </span>
                )}
              </div>
            )}

            {/* Nivel 1: Carpetas por Carrera */}
            {viewMode === "folders" && currentFolder === null ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                {folderNames.map(folderName => {
                  const count = coursesByCarrera[folderName].length;
                  return (
                    <div
                      key={folderName}
                      className="folder-card"
                      onClick={() => {
                        setCurrentFolder(folderName);
                        setCurrentAulaFolder(null);
                        setCurrentPage(1);
                      }}
                      style={{
                        ...cardStyle,
                        padding: "20px 24px",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        cursor: "pointer",
                        transition: "all 0.2s ease-in-out",
                      }}
                    >
                      <div style={{
                        width: 46,
                        height: 46,
                        borderRadius: 12,
                        background: "rgba(74, 179, 216, 0.12)",
                        border: "1px solid rgba(74, 179, 216, 0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        <GraduationCap size={22} style={{ color: "#4ab3d8" }} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#dbeafe", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={folderName}>
                          {folderName}
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(74, 179, 216, 0.6)", marginTop: 2 }}>
                          {count} {count === 1 ? "curso asignado" : "cursos asignados"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : viewMode === "folders" && currentFolder !== null && currentAulaFolder === null ? (
              /* Nivel 2: Carpetas por Aula dentro de la Carrera */
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
                {aulaFolderNames.map(aulaName => {
                  const count = aulasInCarrera[aulaName].length;
                  return (
                    <div
                      key={aulaName}
                      className="folder-card"
                      onClick={() => {
                        setCurrentAulaFolder(aulaName);
                        setCurrentPage(1);
                      }}
                      style={{
                        ...cardStyle,
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
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#dbeafe", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={aulaName}>
                          {aulaName}
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(74, 179, 216, 0.6)", marginTop: 2 }}>
                          {count} {count === 1 ? "curso" : "cursos"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : viewMode === "folders" && currentFolder !== null && currentAulaFolder !== null ? (
              /* Nivel 3: Cursos dentro del Aula seleccionada */
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(310px,1fr))", gap: 16 }}>
                {paginatedCursos.map(c => renderCursoCard(c))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {Object.entries(flatCoursesByCarrera).map(([carreraName, cursosList]) => (
                  <div key={carreraName} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 14px",
                      borderRadius: 10,
                      background: "rgba(10,22,44,0.6)",
                      border: "1px solid rgba(42,109,181,0.18)"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={carreraBadgeStyle(carreraName)}>
                          {carreraName}
                        </span>
                        <span style={{ fontSize: 11, color: "rgba(120,160,210,0.7)", fontWeight: 600 }}>
                          {cursosList.length} {cursosList.length === 1 ? "curso asignado" : "cursos asignados"}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(310px,1fr))", gap: 16 }}>
                      {cursosList.map(c => renderCursoCard(c))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Paginación */}
        {((viewMode === "flat") || (viewMode === "folders" && currentFolder !== null && currentAulaFolder !== null)) && totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={activePage === 1}
              style={{ ...btnSecondary, padding: "6px 12px", fontSize: 11, fontWeight: 700, opacity: activePage === 1 ? 0.4 : 1, cursor: activePage === 1 ? "not-allowed" : "pointer" }}
            >
              Anterior
            </button>
            <span style={{ display: "inline-flex", alignItems: "center", padding: "0 12px", color: "rgba(120,160,210,0.8)", fontSize: 12, fontWeight: 600 }}>
              Página {activePage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={activePage === totalPages}
              style={{ ...btnSecondary, padding: "6px 12px", fontSize: 11, fontWeight: 700, opacity: activePage === totalPages ? 0.4 : 1, cursor: activePage === totalPages ? "not-allowed" : "pointer" }}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .ts-docente-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-left: 36px;
          margin-top: 8px;
          gap: 16px;
        }
        .ts-tabs-container {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          margin-left: 38px;
          border-bottom: 1px solid rgba(42,109,181,0.2);
          overflow-x: auto;
          scrollbar-width: none;
        }
        .ts-tabs-container::-webkit-scrollbar {
          display: none;
        }
        .ts-docente-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          gap: 16px;
          flex-wrap: wrap;
        }
        .ts-docente-actions-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .ts-docente-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        @media (max-width: 768px) {
          .ts-docente-header {
            flex-direction: column;
            align-items: flex-start;
            margin-left: 0;
          }
          .ts-docente-header button {
            width: 100%;
            justify-content: center;
          }
          .ts-tabs-container {
            margin-left: 0;
          }
          .ts-docente-actions {
            flex-direction: column;
            align-items: stretch;
          }
          .ts-docente-actions button {
            width: 100%;
            justify-content: center;
          }
          .ts-docente-actions-left {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
          }
          .ts-docente-actions-left select {
            width: 100% !important;
          }
          .ts-docente-actions-left input {
            width: 100% !important;
          }
          .ts-docente-table {
            min-width: 500px;
          }
        }
      `}} />
      <AlertDialog open={alertInfo.open} type={alertInfo.type} message={alertInfo.message} onClose={() => setAlertInfo(p => ({ ...p, open: false }))} />

      {/* Header Módulo */}
      <div style={{ ...cardStyle, padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <button onClick={() => setSelectedModulo(null)} style={{ background: "rgba(42,109,181,0.1)", border: "1px solid rgba(42,109,181,0.2)", borderRadius: 8, padding: 6, color: "rgba(120,160,210,0.8)", cursor: "pointer" }}>
            <ChevronLeft size={16} />
          </button>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#dbeafe", margin: 0 }}>
            {docenteId ? (
              <>
                {cursos.find(c => c.id === selectedCursoId)?.nombre || "Cargando..."}
                <span style={{ fontSize: 13, color: "rgba(74,179,216,0.75)", marginLeft: 10, fontWeight: 600 }}>
                  (Módulo: {selectedModulo.nombre})
                </span>
              </>
            ) : (
              selectedModulo.nombre
            )}
          </h2>
        </div>
        <div className="ts-docente-header">
          <div style={{ display: "flex", alignItems: "center", gap: 15, flexWrap: "wrap", fontSize: 12, color: "rgba(120,160,210,0.8)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{
                padding: "3px 10px", borderRadius: 12, fontWeight: 700, fontSize: 10, letterSpacing: 0.5,
                background: new Date().toLocaleDateString('sv-SE') > selectedModulo.fecha_fin ? "rgba(148,163,184,0.15)" : "rgba(52,211,153,0.15)",
                color: new Date().toLocaleDateString('sv-SE') > selectedModulo.fecha_fin ? "#94a3b8" : "#34d399"
              }}>
                {new Date().toLocaleDateString('sv-SE') > selectedModulo.fecha_fin ? "FINALIZADO" : "EN CURSO"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={13} style={{ color: "#4ab3d8" }} /> {selectedModulo.fecha_inicio} al {selectedModulo.fecha_fin}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}><User size={13} style={{ color: "#4ab3d8" }} /> Prof. {selectedModulo.profesor || "No asignado"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>• {selectedModulo.modalidad}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>• {matriculas.length} alumnos</div>
          </div>
          {!docenteId && <ReporteModuloBtn moduloId={selectedModulo.id} text="Descargar Reporte" />}
        </div>

        {/* Tabs */}
        <div className="ts-tabs-container">
          <button
            style={{ padding: "10px 20px", background: "transparent", border: "none", borderBottom: tab === "asistencia" ? "2px solid #4ab3d8" : "2px solid transparent", color: tab === "asistencia" ? "#dbeafe" : "rgba(120,160,210,0.6)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .2s" }}
            onClick={() => setTab("asistencia")}
          >
            Asistencia
          </button>
          <button
            style={{ padding: "10px 20px", background: "transparent", border: "none", borderBottom: tab === "notas" ? "2px solid #4ab3d8" : "2px solid transparent", color: tab === "notas" ? "#dbeafe" : "rgba(120,160,210,0.6)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .2s" }}
            onClick={() => setTab("notas")}
          >
            Notas por Curso
          </button>
          <button
            style={{ padding: "10px 20px", background: "transparent", border: "none", borderBottom: tab === "reporte" ? "2px solid #4ab3d8" : "2px solid transparent", color: tab === "reporte" ? "#dbeafe" : "rgba(120,160,210,0.6)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .2s" }}
            onClick={() => setTab("reporte")}
          >
            Reporte del Curso
          </button>
        </div>
      </div>

      {tab === "asistencia" && (
        <div style={{ ...cardStyle, padding: "24px 28px" }}>
          <div className="ts-docente-actions">
            <div className="ts-docente-actions-left">
              {docenteId && (
                <span style={{ fontSize: 13, fontWeight: 700, color: "#4ab3d8", marginRight: 15 }}>
                  Curso: {cursos.find(c => c.id === selectedCursoId)?.nombre || "Cargando..."}
                </span>
              )}
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(74,179,216,0.8)", textTransform: "uppercase" }}>Fecha:</label>
              <input
                type="date"
                style={{ ...inpStyle, width: 160, height: 36 }}
                value={fechaAsistencia}
                onChange={e => setFechaAsistencia(e.target.value)}
                min={selectedModulo?.fecha_inicio || undefined}
                max={selectedModulo?.fecha_fin || undefined}
              />
            </div>
            <button style={btnPrimary} onClick={saveAsistencia} disabled={saving}>
              <Save size={14} /> {saving ? "Guardando..." : "Guardar Asistencia"}
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="ts-docente-table">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(42,109,181,0.2)" }}>
                  <th style={{ padding: "12px", fontSize: 11, color: "rgba(74,179,216,0.6)", textTransform: "uppercase" }}>N°</th>
                  <th style={{ padding: "12px", fontSize: 11, color: "rgba(74,179,216,0.6)", textTransform: "uppercase" }}>Alumno</th>
                  <th style={{ padding: "12px", fontSize: 11, color: "rgba(74,179,216,0.6)", textTransform: "uppercase", textAlign: "center" }}>Asistió</th>
                  <th style={{ padding: "12px", fontSize: 11, color: "rgba(74,179,216,0.6)", textTransform: "uppercase" }}>Observación</th>
                </tr>
              </thead>
              <tbody>
                {matriculas.map((m, i) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid rgba(42,109,181,0.1)" }}>
                    <td style={{ padding: "12px", fontSize: 12, color: "rgba(120,160,210,0.7)" }}>{i + 1}</td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#dbeafe" }}>{m.alumnos.apellidos}, {m.alumnos.nombres}</div>
                      <div style={{ fontSize: 11, color: "rgba(120,160,210,0.6)" }}>DNI: {m.alumnos.dni}</div>
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <button
                        type="button"
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: asistenciasMap[m.id] ? "#34d399" : "#f87171",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "5px 10px",
                          borderRadius: 6,
                          backgroundColor: asistenciasMap[m.id] ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
                          fontFamily: "inherit"
                        }}
                        onClick={() => setAsistenciasMap(p => ({ ...p, [m.id]: !p[m.id] }))}
                      >
                        {asistenciasMap[m.id] ? "PRESENTE" : "FALTA"}
                      </button>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <input
                        type="text"
                        placeholder="Nota o motivo..."
                        style={{ ...inpStyle, height: 32, fontSize: 12 }}
                        value={observacionesMap[m.id] || ""}
                        onChange={(e) => setObservacionesMap(p => ({ ...p, [m.id]: e.target.value }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "notas" && (
        <div style={{ ...cardStyle, padding: "24px 28px" }}>
          <div className="ts-docente-actions">
            <div className="ts-docente-actions-left">
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(74,179,216,0.8)", textTransform: "uppercase" }}>Curso:</label>
              {docenteId ? (
                <span style={{ fontSize: 14, fontWeight: 700, color: "#4ab3d8" }}>
                  {cursos.find(c => c.id === selectedCursoId)?.nombre || "Cargando..."}
                </span>
              ) : (
                cursos.length === 0 ? (
                  <span style={{ fontSize: 12, color: "rgba(248,113,113,0.8)" }}>No hay cursos creados.</span>
                ) : (
                  <select style={{ ...inpStyle, width: 260, height: 36 }} value={selectedCursoId} onChange={e => setSelectedCursoId(e.target.value)}>
                    {cursos.map(c => {
                      const docName = (c as any).docentes ? ` - ${((c as any).docentes.nombres || "").split(" ")[0]} ${((c as any).docentes.apellidos || "").split(" ")[0]}` : "";
                      return <option key={c.id} value={c.id}>{c.nombre} ({c.creditos || 1} CR){docName}</option>;
                    })}
                  </select>
                )
              )}
              {!docenteId && (
                <>
                  <button
                    style={{ ...btnSecondary, height: 36, marginLeft: 10 }}
                    onClick={() => {
                      setNewCursoNombre("");
                      setNewCursoCreditos(1);
                      setShowNewCurso(true);
                    }}
                  >
                    <Plus size={14} /> Nuevo Curso
                  </button>
                  {cursos.length > 0 && (
                    <button
                      style={{ ...btnSecondary, height: 36, marginLeft: 5 }}
                      onClick={() => {
                        const currentCurso = cursos.find(c => c.id === selectedCursoId);
                        if (currentCurso) {
                          setEditCursoId(currentCurso.id);
                          setEditCursoNombre(currentCurso.nombre);
                          setEditCursoCreditos(currentCurso.creditos || 1);
                          setEditCursoDocenteId((currentCurso as any).docente_id || "");
                          setShowEditCurso(true);
                        }
                      }}
                    >
                      <Edit size={14} /> Editar Curso
                    </button>
                  )}
                </>
              )}
            </div>

            {cursos.length > 0 && (
              <button style={btnPrimary} onClick={saveNotas} disabled={saving}>
                <Save size={14} /> {saving ? "Guardando..." : "Guardar Notas"}
              </button>
            )}
          </div>

          {cursos.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table className="ts-docente-table">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(42,109,181,0.2)" }}>
                    <th style={{ padding: "12px", fontSize: 11, color: "rgba(74,179,216,0.6)", textTransform: "uppercase" }}>N°</th>
                    <th style={{ padding: "12px", fontSize: 11, color: "rgba(74,179,216,0.6)", textTransform: "uppercase" }}>Alumno</th>
                    <th style={{ padding: "12px", fontSize: 11, color: "rgba(74,179,216,0.6)", textTransform: "uppercase", width: 150 }}>Nota (0-20)</th>
                  </tr>
                </thead>
                <tbody>
                  {matriculas.map((m, i) => (
                    <tr key={m.id} style={{ borderBottom: "1px solid rgba(42,109,181,0.1)" }}>
                      <td style={{ padding: "12px", fontSize: 12, color: "rgba(120,160,210,0.7)" }}>{i + 1}</td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#dbeafe" }}>{m.alumnos.apellidos}, {m.alumnos.nombres}</div>
                        <div style={{ fontSize: 11, color: "rgba(120,160,210,0.6)" }}>DNI: {m.alumnos.dni}</div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <input
                          type="number"
                          min={0} max={20} step={1}
                          placeholder="—"
                          style={{ ...inpStyle, width: 80, height: 32, textAlign: "center", fontSize: 14, fontWeight: 700, color: notasMap[m.id] && parseFloat(notasMap[m.id]) >= 14 ? "#34d399" : notasMap[m.id] && parseFloat(notasMap[m.id]) < 14 ? "#f87171" : "#dbeafe" }}
                          value={notasMap[m.id] ?? ""}
                          onChange={(e) => setNotasMap(p => ({ ...p, [m.id]: e.target.value }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "reporte" && (
        <div style={{ ...cardStyle, padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#dbeafe", margin: 0 }}>Reporte Consolidado del Curso</h3>
              <p style={{ fontSize: 12, color: "rgba(74,179,216,0.6)", margin: "4px 0 0 0" }}>
                Monitoreo de notas y asistencia para el curso: <strong style={{ color: "#7cc8e8" }}>{cursos.find(c => c.id === selectedCursoId)?.nombre || ""}</strong>
              </p>
            </div>
          </div>

          {loadingReporte ? (
            <div style={{ textAlign: "center", padding: 30, color: "#4ab3d8" }}>
              Cargando reporte de alumnos...
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="ts-docente-table">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(42,109,181,0.2)" }}>
                    <th style={{ padding: "12px", fontSize: 11, color: "rgba(74,179,216,0.6)", textTransform: "uppercase" }}>N°</th>
                    <th style={{ padding: "12px", fontSize: 11, color: "rgba(74,179,216,0.6)", textTransform: "uppercase" }}>Alumno / DNI</th>
                    <th style={{ padding: "12px", fontSize: 11, color: "rgba(74,179,216,0.6)", textTransform: "uppercase", textAlign: "center" }}>Nota</th>
                    <th style={{ padding: "12px", fontSize: 11, color: "rgba(74,179,216,0.6)", textTransform: "uppercase", textAlign: "center" }}>Estado Nota</th>
                    <th style={{ padding: "12px", fontSize: 11, color: "rgba(74,179,216,0.6)", textTransform: "uppercase", textAlign: "center" }}>Asistencia</th>
                    <th style={{ padding: "12px", fontSize: 11, color: "rgba(74,179,216,0.6)", textTransform: "uppercase", textAlign: "center" }}>% Asist.</th>
                  </tr>
                </thead>
                <tbody>
                  {matriculas.map((m, i) => {
                    const strNota = notasMap[m.id];
                    const numNota = strNota && strNota.trim() !== "" ? parseFloat(strNota) : null;
                    const approved = numNota !== null && numNota >= 14;
                    const graded = numNota !== null;

                    // Asistencias para este alumno en este curso
                    const studentAsis = allAsistencias.filter(a => a.matricula_id === m.id);
                    const totalSessions = Array.from(new Set(allAsistencias.map(a => a.fecha))).length;
                    const presentCount = studentAsis.filter(a => a.estado === "presente" || a.estado === "tardanza").length;
                    const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;

                    return (
                      <tr key={m.id} style={{ borderBottom: "1px solid rgba(42,109,181,0.1)" }}>
                        <td style={{ padding: "12px", fontSize: 12, color: "rgba(120,160,210,0.7)" }}>{i + 1}</td>
                        <td style={{ padding: "12px" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#dbeafe" }}>{m.alumnos.apellidos}, {m.alumnos.nombres}</div>
                          <div style={{ fontSize: 11, color: "rgba(120,160,210,0.6)" }}>DNI: {m.alumnos.dni}</div>
                        </td>
                        <td style={{ padding: "12px", textAlign: "center", fontSize: 14, fontWeight: 700, color: graded ? (approved ? "#34d399" : "#f87171") : "rgba(120,160,210,0.5)" }}>
                          {graded ? numNota : "—"}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <span style={{
                            fontSize: 10,
                            padding: "3px 8px",
                            borderRadius: 12,
                            fontWeight: 700,
                            background: graded ? (approved ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)") : "rgba(148,163,184,0.15)",
                            color: graded ? (approved ? "#34d399" : "#f87171") : "#94a3b8"
                          }}>
                            {graded ? (approved ? "APROBADO" : "DESAPROBADO") : "SIN NOTA"}
                          </span>
                        </td>
                        <td style={{ padding: "12px", textAlign: "center", fontSize: 12, color: "#dbeafe" }}>
                          <span style={{ color: "#34d399", fontWeight: 600 }}>{presentCount}</span>
                          <span style={{ color: "rgba(120,160,210,0.4)" }}> / </span>
                          <span style={{ color: "rgba(120,160,210,0.7)" }}>{totalSessions}</span>
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: attendanceRate >= 70 ? "#34d399" : "#fbbf24"
                          }}>
                            {attendanceRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Nuevo Curso */}
      <Modal open={showNewCurso} onClose={() => setShowNewCurso(false)} title="Crear Nuevo Curso" maxWidth="400px">
        <form onSubmit={createCurso}>
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(74,179,216,0.7)", marginBottom: 6, textTransform: "uppercase" }}>Nombre del Curso *</label>
            <input
              style={inpStyle}
              autoFocus
              placeholder="Ej: Mantenimiento I"
              value={newCursoNombre}
              onChange={e => setNewCursoNombre(e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(74,179,216,0.7)", marginBottom: 6, textTransform: "uppercase" }}>Créditos *</label>
            <input
              type="number"
              min={1}
              style={inpStyle}
              placeholder="Ej: 3"
              value={newCursoCreditos}
              onChange={e => setNewCursoCreditos(Number(e.target.value))}
              required
            />
          </div>
          {!docenteId && (
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(74,179,216,0.7)", marginBottom: 6, textTransform: "uppercase" }}>Docente Asignado</label>
              <div style={{ position: "relative" }}>
                <select
                  style={inpStyle}
                  value={newCursoDocenteId}
                  onChange={e => setNewCursoDocenteId(e.target.value)}
                >
                  <option value="">Sin docente</option>
                  {docentes.map(d => (
                    <option key={d.id} value={d.id}>{d.apellidos}, {d.nombres}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" style={btnSecondary} onClick={() => setShowNewCurso(false)}>Cancelar</button>
            <button type="submit" style={btnPrimary} disabled={saving}>Crear Curso</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Editar Curso */}
      <Modal open={showEditCurso} onClose={() => setShowEditCurso(false)} title="Editar Curso" maxWidth="400px">
        <form onSubmit={updateCurso}>
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(74,179,216,0.7)", marginBottom: 6, textTransform: "uppercase" }}>Nombre del Curso *</label>
            <input
              style={inpStyle}
              autoFocus
              placeholder="Ej: Mantenimiento I"
              value={editCursoNombre}
              onChange={e => setEditCursoNombre(e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(74,179,216,0.7)", marginBottom: 6, textTransform: "uppercase" }}>Créditos *</label>
            <input
              type="number"
              min={1}
              style={inpStyle}
              placeholder="Ej: 3"
              value={editCursoCreditos}
              onChange={e => setEditCursoCreditos(Number(e.target.value))}
              required
            />
          </div>
          {!docenteId && (
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(74,179,216,0.7)", marginBottom: 6, textTransform: "uppercase" }}>Docente Asignado</label>
              <div style={{ position: "relative" }}>
                <select
                  style={inpStyle}
                  value={editCursoDocenteId}
                  onChange={e => setEditCursoDocenteId(e.target.value)}
                >
                  <option value="">Sin docente</option>
                  {docentes.map(d => (
                    <option key={d.id} value={d.id}>{d.apellidos}, {d.nombres}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" style={btnSecondary} onClick={() => setShowEditCurso(false)}>Cancelar</button>
            <button type="submit" style={btnPrimary} disabled={saving}>Guardar Cambios</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
