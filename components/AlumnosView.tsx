"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  BookOpen,
  Plus,
  CheckCircle,
  AlertTriangle,
  X,
  ChevronDown,
  UserPlus,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pencil,
  Eye,
  Phone,
  MapPin,
  Users,
  Layers,
  Download,
  History,
} from "lucide-react";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import AlertDialog from "./AlertDialog";
import ReporteAsistenciaBtn from "./ReporteAsistenciaBtn";
import ReporteMatriculaBtn from "./ReporteMatriculaBtn";
import ReporteFichaBtn from "./ReporteFichaBtn";

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────
interface Alumno {
  id: string;
  dni: string;
  codigo?: string | null;
  nombres: string;
  apellidos: string;
  carrera: string;
  fecha_nacimiento?: string | null;
  nac_distrito?: string | null;
  nac_provincia?: string | null;
  nac_departamento?: string | null;
  direccion?: string | null;
  dir_distrito?: string | null;
  dir_referencia?: string | null;
  telefono?: string | null;
  celular?: string | null;
  correo?: string | null;
  facebook?: string | null;
  colegio?: string | null;
  colegio_distrito?: string | null;
  apoderado_nombre?: string | null;
  apoderado_parentesco?: string | null;
  apoderado_celular?: string | null;
}

interface Modulo {
  id: string;
  nombre: string;
  horario?: string | null;
  carrera_id?: string | null;
  carreras?: { id: string; nombre: string } | null;
  fecha_fin: string;
  fecha_inicio?: string | null;
  aula?: string | null;
  local?: string | null;
  modalidad?: string | null;
}

interface PaginatedResponse {
  data: Alumno[];
  total: number;
  page: number;
  pageSize: number;
}

import { carreraBadgeStyle, CARRERA_COLORS } from "@/lib/carreraColors";

const CARRERAS = [
  "Operación de Cargador Frontal",
  "Operación de Excavadora",
  "Operación de Motoniveladora",
  "Operación de Tractor de Orugas",
  "Mantenimiento de Maquinaria Pesada",
  "Seguridad Minera",
];

const PAGE_SIZE = 10;


// ─────────────────────────────────────────────────────────────
// ESTILOS REUTILIZABLES
// ─────────────────────────────────────────────────────────────
const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11, fontWeight: 600,
  color: "rgba(74,179,216,0.75)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", height: 44,
  background: "rgba(10,22,44,0.7)",
  border: "1px solid rgba(42,109,181,0.22)",
  borderRadius: 10,
  padding: "0 14px",
  color: "#dbeafe",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color .2s, box-shadow .2s",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  WebkitAppearance: "none",
  paddingRight: 36,
  cursor: "pointer",
};

const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7,
  padding: "9px 18px",
  borderRadius: 10, border: "none",
  background: "#c9c7c3ff",
  color: "#0b0b0bff",
  fontSize: 13, fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
  transition: "transform .15s, box-shadow .2s, opacity .2s",
};

const secondaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7,
  padding: "9px 16px",
  borderRadius: 10,
  background: "rgba(42,109,181,0.1)",
  border: "1px solid rgba(42,109,181,0.22)",
  color: "rgba(120,160,210,0.85)",
  fontSize: 13, fontWeight: 500,
  fontFamily: "inherit",
  cursor: "pointer",
  transition: "background .2s, border-color .2s",
};

const cardStyle: React.CSSProperties = {
  background: "rgba(8,16,34,0.85)",
  border: "1px solid rgba(42,109,181,0.18)",
  borderRadius: 14,
  backdropFilter: "blur(12px)",
};

// ─────────────────────────────────────────────────────────────
// VISTA PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function AlumnosView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Estado paginación ──
  const pageParam = Number(searchParams.get("alumnos_page") ?? "1");
  const [page, setPage] = useState(pageParam);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Datos ──
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [carrerasList, setCarrerasList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [carreraFilter, setCarreraFilter] = useState("");
  const [exportingCsv, setExportingCsv] = useState(false);

  async function exportAlumnosToCSV() {
    setExportingCsv(true);
    try {
      const params = new URLSearchParams({
        search: searchInput.trim(),
        carrera: carreraFilter,
        page: "1",
        pageSize: "100000"
      });
      const res = await fetch(`/api/alumnos?${params}`);
      const json = await res.json();
      const allAlums: Alumno[] = json.data || [];

      const headers = [
        "Codigo", "DNI", "Apellidos", "Nombres", "Carrera",
        "Celular", "Telefono", "Correo", "Fecha Nacimiento",
        "Nac Departamento", "Direccion", "Colegio",
        "Apoderado", "Parentesco", "Apoderado Celular"
      ];

      const csvRows = [
        headers.join(","),
        ...allAlums.map(a => {
          const row = [
            a.codigo || "—",
            a.dni || "—",
            a.apellidos || "—",
            a.nombres || "—",
            a.carrera || "—",
            a.celular || "—",
            a.telefono || "—",
            a.correo || "—",
            a.fecha_nacimiento || "—",
            a.nac_departamento || "—",
            a.direccion || "—",
            a.colegio || "—",
            a.apoderado_nombre || "—",
            a.apoderado_parentesco || "—",
            a.apoderado_celular || "—"
          ];
          return row.map(val => {
            const escaped = ('' + val).replace(/"/g, '""');
            return `"${escaped}"`;
          }).join(",");
        })
      ];

      const csvContent = "\uFEFF" + csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `alumnos_tecsur_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error al exportar alumnos", err);
    } finally {
      setExportingCsv(false);
    }
  }

  // ── Modales ──
  const [modalAlumno, setModalAlumno] = useState(false);
  const [modalMatricula, setModalMatricula] = useState(false);
  const [matriculaTarget, setMatriculaTarget] = useState<Alumno | null>(null);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [modalVer, setModalVer] = useState(false);
  const [verTarget, setVerTarget] = useState<Alumno | null>(null);
  const [modalMatriculados, setModalMatriculados] = useState(false);
  const [matriculadosTarget, setMatriculadosTarget] = useState<Alumno | null>(null);
  const [matriculasList, setMatriculasList] = useState<any[]>([]);
  const [loadingMatriculas, setLoadingMatriculas] = useState(false);

  // ── Formularios ──
  const emptyAlumno = {
    dni: "", codigo: "", nombres: "", apellidos: "", carrera: "",
    fecha_nacimiento: "", nac_distrito: "", nac_provincia: "", nac_departamento: "",
    direccion: "", dir_distrito: "", dir_referencia: "",
    telefono: "", celular: "", correo: "", facebook: "",
    colegio: "", colegio_distrito: "",
    apoderado_nombre: "", apoderado_parentesco: "", apoderado_celular: "",
  };
  const [alumnoForm, setAlumnoForm] = useState(emptyAlumno);
  const [editForm, setEditForm] = useState<Alumno | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Alumno | null>(null);
  const [matriculaForm, setMatriculaForm] = useState({ alumno_id: "", modulo_id: "", carrera_id: "", turno: "mañana" });
  const [formTab, setFormTab] = useState<"basico" | "nacimiento" | "domicilio" | "contacto" | "apoderado">("basico");

  // ── Feedback ──
  const [submitting, setSubmitting] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // ── Helpers ──
  function showSuccess(msg: string) {
    setAlertInfo({ type: "success", msg });
  }
  function showError(msg: string) {
    setAlertInfo({ type: "error", msg });
  }

  // ── Sincronizar página con URL ──
  function navigatePage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("alumnos_page", String(p));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setPage(p);
  }

  // ── Cargar alumnos paginados ──
  const loadAlumnos = useCallback(async (p: number, search: string, carrera: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        pageSize: String(PAGE_SIZE),
        ...(search ? { search } : {}),
        ...(carrera ? { carrera } : {}),
      });
      const res = await fetch(`/api/alumnos?${params}`);
      const json: PaginatedResponse = await res.json();
      setAlumnos(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      showError("Error al cargar alumnos");
    } finally {
      setLoading(false);
    }
  }, []);

  async function loadModulos() {
    const res = await fetch("/api/modulos");
    const data = await res.json();
    // data includes carreras relation from the updated API
    setModulos(Array.isArray(data) ? data : []);
  }

  async function loadCarreras() {
    try {
      const res = await fetch("/api/carreras");
      const data = await res.json();
      if (Array.isArray(data)) {
        const dbCarreraNames = data.map((c: any) => c.nombre).filter(Boolean);
        setCarrerasList(dbCarreraNames);
      }
    } catch (err) {
      console.error("Error loading careers:", err);
    }
  }

  async function loadMatriculasAlumno(alumnoId: string) {
    setLoadingMatriculas(true);
    try {
      const res = await fetch(`/api/matriculas?alumno_id=${alumnoId}`);
      const data = await res.json();
      setMatriculasList(Array.isArray(data) ? data : []);
    } catch (err) {
      showError("Error al cargar las matrículas del alumno");
    } finally {
      setLoadingMatriculas(false);
    }
  }

  useEffect(() => {
    loadModulos();
    loadCarreras();
  }, []);

  useEffect(() => {
    loadAlumnos(page, searchTerm, carreraFilter);
  }, [page, searchTerm, carreraFilter, loadAlumnos]);

  // Debounce búsqueda
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchTerm(searchInput);
      if (page !== 1) navigatePage(1);
    }, 380);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── CRUD HANDLERS ──
  async function handleCreateAlumno(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/alumnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alumnoForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showSuccess(`Alumno ${alumnoForm.nombres} registrado exitosamente`);
      setModalAlumno(false);
      setAlumnoForm(emptyAlumno);
      loadAlumnos(page, searchTerm, carreraFilter);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al registrar alumno");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditAlumno(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/alumnos/${editForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showSuccess(`Alumno ${editForm.nombres} actualizado correctamente`);
      setModalEditar(false);
      setEditForm(null);
      loadAlumnos(page, searchTerm, carreraFilter);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al actualizar alumno");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteAlumno() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/alumnos/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      showSuccess(`Alumno ${deleteTarget.nombres} eliminado`);
      setModalEliminar(false);
      setDeleteTarget(null);
      if (alumnos.length === 1 && page > 1) navigatePage(page - 1);
      else loadAlumnos(page, searchTerm, carreraFilter);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al eliminar alumno");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMatricula(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/matriculas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(matriculaForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showSuccess("Matrícula registrada exitosamente");
      setModalMatricula(false);
      setMatriculaTarget(null);
      setMatriculaForm({ alumno_id: "", modulo_id: "", carrera_id: "", turno: "mañana" });
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error al matricular");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

        @keyframes barShift {
          0%   { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes alertIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .ts-input:focus {
          border-color: rgba(74,179,216,0.55) !important;
          box-shadow: 0 0 0 3px rgba(74,179,216,0.1) !important;
        }
        .ts-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(42,109,181,0.45) !important;
        }
        .ts-btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }
        .ts-btn-secondary:hover { background: rgba(42,109,181,0.18) !important; }

        .ts-table tr:hover td { background: rgba(42,109,181,0.06); }

        .ts-page-btn {
          width: 34px; height: 34px; border-radius: 8px;
          border: 1px solid rgba(42,109,181,0.2);
          background: rgba(42,109,181,0.08);
          color: rgba(120,160,210,0.8);
          font-size: 13px; font-weight: 500;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all .2s; font-family: inherit;
        }
        .ts-page-btn:hover:not(:disabled) {
          background: rgba(42,109,181,0.2);
          border-color: rgba(74,179,216,0.4);
          color: #4ab3d8;
        }
        .ts-page-btn.active {
          background: linear-gradient(135deg, #1a4a7a, #2a6db5);
          border-color: rgba(74,179,216,0.4);
          color: #fff;
          box-shadow: 0 2px 10px rgba(42,109,181,0.35);
        }
        .ts-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        .ts-row-action {
          width: 28px; height: 28px; border-radius: 7px;
          border: 1px solid transparent;
          background: transparent;
          display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all .18s;
        }
        .ts-row-action.enroll:hover {
          background: rgba(52,211,153,0.1);
          border-color: rgba(52,211,153,0.25);
          color: #34d399 !important;
        }
        .ts-row-action.edit:hover {
          background: rgba(42,109,181,0.15);
          border-color: rgba(74,179,216,0.3);
          color: #4ab3d8 !important;
        }
        .ts-row-action.delete:hover {
          background: rgba(248,113,113,0.1);
          border-color: rgba(248,113,113,0.25);
          color: #f87171 !important;
        }
      `}</style>

      <div style={{ width: "95%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── CABECERA ──────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{
              fontSize: 24, fontWeight: 800,
              color: "#dbeafe",
              letterSpacing: "0.02em",
              marginBottom: 4,
            }}>
              Gestión de Alumnos
            </h2>
            <p style={{ fontSize: 14, color: "rgba(74,179,216,0.6)" }}>
              Registre alumnos, edite datos y gestione matrículas
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {/* Buscador */}
            <div style={{ position: "relative", width: 300 }}>
              <Search
                size={15}
                style={{
                  position: "absolute", left: 13, top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(74,179,216,0.5)",
                  pointerEvents: "none",
                }}
              />
              <input
                className="ts-input"
                style={{ ...inputStyle, paddingLeft: 38, height: 42 }}
                placeholder="Buscar por DNI, nombre o apellido…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            {/* Filtro Carrera */}
            <div style={{ position: "relative", width: 220 }}>
              <select
                className="ts-input"
                style={{ ...selectStyle, height: 42, paddingLeft: 14 }}
                value={carreraFilter}
                onChange={(e) => {
                  setCarreraFilter(e.target.value);
                  if (page !== 1) navigatePage(1);
                }}
              >
                <option value="">Todas las Carreras</option>
                {carrerasList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(74,179,216,0.5)" }} />
            </div>

            <button
              className="ts-btn-primary"
              style={{ ...primaryBtn, height: 42 }}
              onClick={() => {
                setAlumnoForm({ ...emptyAlumno, codigo: `TS-${Math.floor(100000 + Math.random() * 900000)}` });
                setModalAlumno(true);
              }}
            >
              <Plus size={14} />
              Nuevo Alumno
            </button>
          </div>
        </div>

        {/* ── ALERTAS GLOBALES ───────────────────────────────── */}
        <AlertDialog
          open={!!alertInfo}
          type={alertInfo?.type || "success"}
          message={alertInfo?.msg || ""}
          onClose={() => setAlertInfo(null)}
        />

        {/* ── TABLA ──────────────────────────────────────────── */}
        <div style={{ ...cardStyle, overflow: "hidden" }}>

          {/* título tabla */}
          <div style={{
            padding: "14px 20px",
            borderBottom: "1px solid rgba(42,109,181,0.14)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 10
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#dbeafe" }}>
                Lista de Alumnos
              </span>
              <button
                type="button"
                onClick={exportAlumnosToCSV}
                disabled={exportingCsv}
                style={{
                  background: "rgba(52,211,153,0.1)",
                  border: "1px solid rgba(52,211,153,0.2)",
                  color: "#34d399",
                  height: 28,
                  padding: "0 10px",
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: exportingCsv ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  opacity: exportingCsv ? 0.6 : 1
                }}
              >
                <Download size={11} /> {exportingCsv ? "Exportando..." : "Exportar Excel"}
              </button>
            </div>
            <span style={{ fontSize: 12, color: "rgba(74,179,216,0.5)" }}>
              Página {page} de {totalPages}
            </span>
          </div>

          {loading ? (
            <div style={{ padding: "28px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{
                  height: 38, borderRadius: 8,
                  background: "rgba(42,109,181,0.07)",
                  animation: `pulse 1.5s ${i * 0.1}s ease-in-out infinite alternate`,
                }} />
              ))}
            </div>
          ) : alumnos.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "rgba(74,179,216,0.4)" }}>
              <BookOpen size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
              <p style={{ fontSize: 13 }}>No se encontraron alumnos</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                className="ts-table"
                style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(42,109,181,0.14)" }}>
                    {["#", "Código", "DNI", "Apellidos y Nombres", "Carrera", ""].map((h) => (
                      <th key={h} style={{
                        padding: "10px 14px", textAlign: "left",
                        fontSize: 10, fontWeight: 600,
                        color: "rgba(74,179,216,0.55)",
                        letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alumnos.map((a, idx) => (
                    <tr key={a.id} style={{ borderBottom: "1px solid rgba(42,109,181,0.08)", transition: "background .15s" }}>
                      <td style={{ padding: "11px 14px", color: "rgba(74,179,216,0.4)", fontSize: 11 }}>
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td style={{ padding: "11px 14px", minWidth: 110, whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-block", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: 12, padding: "3px 8px", borderRadius: 5, background: "rgba(74,179,216,0.12)", border: "1px solid rgba(74,179,216,0.2)", color: "#7cc8e8" }}>
                          {a.codigo || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontFamily: "monospace", fontSize: 12, padding: "3px 8px", borderRadius: 5, background: "rgba(42,109,181,0.12)", border: "1px solid rgba(42,109,181,0.2)", color: "#7cc8e8" }}>
                          {a.dni}
                        </span>
                      </td>
                      {/* Apellidos + Nombres en una celda */}
                      <td style={{ padding: "11px 14px", minWidth: 160 }}>
                        <div style={{ fontWeight: 700, color: "#dbeafe", fontSize: 13 }}>{a.apellidos}</div>
                        <div style={{ color: "rgba(180,210,240,0.7)", fontSize: 12 }}>{a.nombres}</div>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={carreraBadgeStyle(a.carrera)}>
                          {a.carrera}
                        </span>
                      </td>
                      {/* Acciones */}
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button className="ts-btn-secondary" style={{ ...secondaryBtn, padding: "5px 10px", fontSize: 11, background: "rgba(74,179,216,0.1)", borderColor: "rgba(74,179,216,0.25)", color: "#4ab3d8", height: 28 }} title="Módulos" onClick={() => { setMatriculadosTarget(a); setModalMatriculados(true); loadMatriculasAlumno(a.id); }}>
                            <Layers size={12} />
                            Módulos
                          </button>
                          <button className="ts-btn-secondary" style={{ ...secondaryBtn, padding: "5px 10px", fontSize: 11, background: "rgba(52,211,153,0.1)", borderColor: "rgba(52,211,153,0.25)", color: "#34d399", height: 28 }} title="Reporte Histórico" onClick={() => window.open(`/reportes/historial?token=${btoa(`TS-${a.dni}`)}`, '_blank')}>
                            <History size={12} />
                            Reporte Histórico
                          </button>
                          <ReporteFichaBtn alumnoId={a.id} label="Ficha de Matrícula" style={{ padding: "5px 10px", fontSize: 11, height: 28, boxSizing: "border-box" }} />
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="ts-row-action" style={{ color: "rgba(74,179,216,0.6)" }} title="Ver detalle" onClick={() => { setVerTarget(a); setModalVer(true); }}>
                              <Eye size={13} />
                            </button>
                            <button className="ts-row-action edit" style={{ color: "rgba(74,179,216,0.5)" }} title="Editar" onClick={() => { setEditForm({ ...a }); setModalEditar(true); }}>
                              <Pencil size={13} />
                            </button>
                            <button className="ts-row-action delete" style={{ color: "rgba(248,113,113,0.4)" }} title="Eliminar" onClick={() => { setDeleteTarget(a); setModalEliminar(true); }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Paginación ── */}
          {!loading && totalPages > 1 && (
            <div style={{
              padding: "14px 20px",
              borderTop: "1px solid rgba(42,109,181,0.12)",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 12, color: "rgba(74,179,216,0.5)" }}>
                {total} alumnos · página {page} de {totalPages}
              </span>

              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                <button
                  className="ts-page-btn"
                  disabled={page <= 1}
                  onClick={() => navigatePage(page - 1)}
                  title="Anterior"
                >
                  <ChevronLeft size={15} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "…")[]>((acc, p, i, arr) => {
                    if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "…" ? (
                      <span key={`ellipsis-${i}`} style={{ fontSize: 13, color: "rgba(74,179,216,0.35)", padding: "0 4px" }}>…</span>
                    ) : (
                      <button
                        key={p}
                        className={`ts-page-btn${page === p ? " active" : ""}`}
                        onClick={() => navigatePage(p as number)}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  className="ts-page-btn"
                  disabled={page >= totalPages}
                  onClick={() => navigatePage(page + 1)}
                  title="Siguiente"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MODALES
      ══════════════════════════════════════════════════════ */}

      {/* ── Modal: Nuevo Alumno ── */}
      <Modal open={modalAlumno} onClose={() => { setModalAlumno(false); setFormTab("basico"); }} title="Registrar Nuevo Alumno">
        <style>{`
          .ftab { padding:6px 14px; border-radius:8px; border:1px solid rgba(42,109,181,.2); background:transparent; color:rgba(180,210,240,.6); font-size:11px; font-weight:600; cursor:pointer; transition:all .15s; font-family:inherit; }
          .ftab.act { background:rgba(42,109,181,.2); border-color:rgba(74,179,216,.35); color:#dbeafe; }
          .ftab:hover:not(.act) { background:rgba(42,109,181,.1); color:#dbeafe; }
        `}</style>
        <form onSubmit={handleCreateAlumno} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(["basico", "nacimiento", "domicilio", "contacto", "apoderado"] as const).map(t => (
              <button key={t} type="button" className={`ftab${formTab === t ? " act" : ""}`} onClick={() => setFormTab(t)}>
                {t === "basico" ? "Básico" : t === "nacimiento" ? "Nacimiento" : t === "domicilio" ? "Domicilio" : t === "contacto" ? "Contacto" : "Apoderado"}
              </button>
            ))}
          </div>

          {/* Básico */}
          {formTab === "basico" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={fieldLabel}>Código de Alumno *</label><input className="ts-input" style={inputStyle} placeholder="Ej: AL-1002" value={alumnoForm.codigo} onChange={e => setAlumnoForm(p => ({ ...p, codigo: e.target.value }))} required /></div>
            <div><label style={fieldLabel}>DNI *</label><input className="ts-input" style={inputStyle} placeholder="Ej: 12345678" value={alumnoForm.dni} onChange={e => setAlumnoForm(p => ({ ...p, dni: e.target.value }))} maxLength={12} required /></div>
            <div style={{ gridColumn: "1/-1" }}><label style={fieldLabel}>Carrera *</label><div style={{ position: "relative" }}><select className="ts-input" style={selectStyle} value={alumnoForm.carrera} onChange={e => setAlumnoForm(p => ({ ...p, carrera: e.target.value }))} required><option value="">— Seleccionar —</option>{carrerasList.map(c => <option key={c} value={c}>{c}</option>)}</select><ChevronDown size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(74,179,216,0.5)" }} /></div></div>
            <div style={{ gridColumn: "1/-1" }}><label style={fieldLabel}>Nombres *</label><input className="ts-input" style={inputStyle} placeholder="Ej: Juan Carlos" value={alumnoForm.nombres} onChange={e => setAlumnoForm(p => ({ ...p, nombres: e.target.value }))} required /></div>
            <div style={{ gridColumn: "1/-1" }}><label style={fieldLabel}>Apellidos *</label><input className="ts-input" style={inputStyle} placeholder="Ej: García Ríos" value={alumnoForm.apellidos} onChange={e => setAlumnoForm(p => ({ ...p, apellidos: e.target.value }))} required /></div>
          </div>}

          {/* Nacimiento */}
          {formTab === "nacimiento" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1/-1" }}><label style={fieldLabel}>Fecha de Nacimiento</label><input type="date" className="ts-input" style={{ ...inputStyle, colorScheme: "dark" }} value={alumnoForm.fecha_nacimiento ?? ""} onChange={e => setAlumnoForm(p => ({ ...p, fecha_nacimiento: e.target.value }))} /></div>
            <div><label style={fieldLabel}>Distrito de Nacimiento</label><input className="ts-input" style={inputStyle} placeholder="Ej: Miraflores" value={alumnoForm.nac_distrito ?? ""} onChange={e => setAlumnoForm(p => ({ ...p, nac_distrito: e.target.value }))} /></div>
            <div><label style={fieldLabel}>Provincia</label><input className="ts-input" style={inputStyle} placeholder="Ej: Lima" value={alumnoForm.nac_provincia ?? ""} onChange={e => setAlumnoForm(p => ({ ...p, nac_provincia: e.target.value }))} /></div>
            <div style={{ gridColumn: "1/-1" }}><label style={fieldLabel}>Departamento</label><input className="ts-input" style={inputStyle} placeholder="Ej: Lima" value={alumnoForm.nac_departamento ?? ""} onChange={e => setAlumnoForm(p => ({ ...p, nac_departamento: e.target.value }))} /></div>
          </div>}

          {/* Domicilio */}
          {formTab === "domicilio" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1/-1" }}><label style={fieldLabel}>Dirección</label><input className="ts-input" style={inputStyle} placeholder="Av. Ejemplo 123" value={alumnoForm.direccion ?? ""} onChange={e => setAlumnoForm(p => ({ ...p, direccion: e.target.value }))} /></div>
            <div><label style={fieldLabel}>Distrito</label><input className="ts-input" style={inputStyle} value={alumnoForm.dir_distrito ?? ""} onChange={e => setAlumnoForm(p => ({ ...p, dir_distrito: e.target.value }))} /></div>
            <div><label style={fieldLabel}>Referencia</label><input className="ts-input" style={inputStyle} placeholder="Cerca de…" value={alumnoForm.dir_referencia ?? ""} onChange={e => setAlumnoForm(p => ({ ...p, dir_referencia: e.target.value }))} /></div>
          </div>}

          {/* Contacto */}
          {formTab === "contacto" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1/-1" }}><label style={fieldLabel}>Teléfono</label><input className="ts-input" style={inputStyle} placeholder="01-XXXXXXX" value={alumnoForm.telefono ?? ""} onChange={e => setAlumnoForm(p => ({ ...p, telefono: e.target.value }))} /></div>
            <div><label style={fieldLabel}>Correo</label><input type="email" className="ts-input" style={inputStyle} value={alumnoForm.correo ?? ""} onChange={e => setAlumnoForm(p => ({ ...p, correo: e.target.value }))} /></div>
            <div><label style={fieldLabel}>Facebook</label><input className="ts-input" style={inputStyle} value={alumnoForm.facebook ?? ""} onChange={e => setAlumnoForm(p => ({ ...p, facebook: e.target.value }))} /></div>
            <div><label style={fieldLabel}>Colegio</label><input className="ts-input" style={inputStyle} value={alumnoForm.colegio ?? ""} onChange={e => setAlumnoForm(p => ({ ...p, colegio: e.target.value }))} /></div>
            <div><label style={fieldLabel}>Distrito del Colegio</label><input className="ts-input" style={inputStyle} value={alumnoForm.colegio_distrito ?? ""} onChange={e => setAlumnoForm(p => ({ ...p, colegio_distrito: e.target.value }))} /></div>
          </div>}

          {/* Apoderado */}
          {formTab === "apoderado" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1/-1" }}><label style={fieldLabel}>Nombre del Apoderado</label><input className="ts-input" style={inputStyle} value={alumnoForm.apoderado_nombre ?? ""} onChange={e => setAlumnoForm(p => ({ ...p, apoderado_nombre: e.target.value }))} /></div>
            <div><label style={fieldLabel}>Parentesco</label><input className="ts-input" style={inputStyle} placeholder="Ej: Padre, Madre, Tutor" value={alumnoForm.apoderado_parentesco ?? ""} onChange={e => setAlumnoForm(p => ({ ...p, apoderado_parentesco: e.target.value }))} /></div>
            <div><label style={fieldLabel}>Celular del Apoderado</label><input className="ts-input" style={inputStyle} value={alumnoForm.apoderado_celular ?? ""} onChange={e => setAlumnoForm(p => ({ ...p, apoderado_celular: e.target.value }))} /></div>
          </div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4, borderTop: "1px solid rgba(42,109,181,.12)", paddingTop: 14 }}>
            <button type="button" className="ts-btn-secondary" style={secondaryBtn} onClick={() => { setModalAlumno(false); setFormTab("basico"); }}>Cancelar</button>
            <button type="submit" className="ts-btn-primary" style={primaryBtn} disabled={submitting}>
              <UserPlus size={14} />{submitting ? "Registrando…" : "Registrar Alumno"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Editar Alumno ── */}
      <Modal open={modalEditar} onClose={() => { setModalEditar(false); setFormTab("basico"); }} title="Editar Alumno">
        {editForm && (
          <form onSubmit={handleEditAlumno} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["basico", "nacimiento", "domicilio", "contacto", "apoderado"] as const).map(t => (
                <button key={t} type="button" className={`ftab${formTab === t ? " act" : ""}`} onClick={() => setFormTab(t)}>
                  {t === "basico" ? "Básico" : t === "nacimiento" ? "Nacimiento" : t === "domicilio" ? "Domicilio" : t === "contacto" ? "Contacto" : "Apoderado"}
                </button>
              ))}
            </div>

            {formTab === "basico" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={fieldLabel}>Código de Alumno *</label><input className="ts-input" style={inputStyle} value={editForm.codigo ?? ""} onChange={e => setEditForm(p => p ? { ...p, codigo: e.target.value } : p)} required /></div>
              <div><label style={fieldLabel}>DNI *</label><input className="ts-input" style={inputStyle} value={editForm.dni} onChange={e => setEditForm(p => p ? { ...p, dni: e.target.value } : p)} maxLength={12} required /></div>
              <div style={{ gridColumn: "1/-1" }}><label style={fieldLabel}>Carrera *</label><div style={{ position: "relative" }}><select className="ts-input" style={selectStyle} value={editForm.carrera} onChange={e => setEditForm(p => p ? { ...p, carrera: e.target.value } : p)} required><option value="">— Seleccionar —</option>{carrerasList.map(c => <option key={c} value={c}>{c}</option>)}</select><ChevronDown size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(74,179,216,0.5)" }} /></div></div>
              <div style={{ gridColumn: "1/-1" }}><label style={fieldLabel}>Nombres *</label><input className="ts-input" style={inputStyle} value={editForm.nombres} onChange={e => setEditForm(p => p ? { ...p, nombres: e.target.value } : p)} required /></div>
              <div style={{ gridColumn: "1/-1" }}><label style={fieldLabel}>Apellidos *</label><input className="ts-input" style={inputStyle} value={editForm.apellidos} onChange={e => setEditForm(p => p ? { ...p, apellidos: e.target.value } : p)} required /></div>
            </div>}

            {formTab === "nacimiento" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1/-1" }}><label style={fieldLabel}>Fecha de Nacimiento</label><input type="date" className="ts-input" style={{ ...inputStyle, colorScheme: "dark" }} value={editForm.fecha_nacimiento ?? ""} onChange={e => setEditForm(p => p ? { ...p, fecha_nacimiento: e.target.value } : p)} /></div>
              <div><label style={fieldLabel}>Distrito de Nacimiento</label><input className="ts-input" style={inputStyle} value={editForm.nac_distrito ?? ""} onChange={e => setEditForm(p => p ? { ...p, nac_distrito: e.target.value } : p)} /></div>
              <div><label style={fieldLabel}>Provincia</label><input className="ts-input" style={inputStyle} value={editForm.nac_provincia ?? ""} onChange={e => setEditForm(p => p ? { ...p, nac_provincia: e.target.value } : p)} /></div>
              <div style={{ gridColumn: "1/-1" }}><label style={fieldLabel}>Departamento</label><input className="ts-input" style={inputStyle} value={editForm.nac_departamento ?? ""} onChange={e => setEditForm(p => p ? { ...p, nac_departamento: e.target.value } : p)} /></div>
            </div>}

            {formTab === "domicilio" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1/-1" }}><label style={fieldLabel}>Dirección</label><input className="ts-input" style={inputStyle} value={editForm.direccion ?? ""} onChange={e => setEditForm(p => p ? { ...p, direccion: e.target.value } : p)} /></div>
              <div><label style={fieldLabel}>Distrito</label><input className="ts-input" style={inputStyle} value={editForm.dir_distrito ?? ""} onChange={e => setEditForm(p => p ? { ...p, dir_distrito: e.target.value } : p)} /></div>
              <div><label style={fieldLabel}>Referencia</label><input className="ts-input" style={inputStyle} value={editForm.dir_referencia ?? ""} onChange={e => setEditForm(p => p ? { ...p, dir_referencia: e.target.value } : p)} /></div>
            </div>}

            {formTab === "contacto" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1/-1" }}><label style={fieldLabel}>Teléfono</label><input className="ts-input" style={inputStyle} value={editForm.telefono ?? ""} onChange={e => setEditForm(p => p ? { ...p, telefono: e.target.value } : p)} /></div>
              <div><label style={fieldLabel}>Correo</label><input type="email" className="ts-input" style={inputStyle} value={editForm.correo ?? ""} onChange={e => setEditForm(p => p ? { ...p, correo: e.target.value } : p)} /></div>
              <div><label style={fieldLabel}>Facebook</label><input className="ts-input" style={inputStyle} value={editForm.facebook ?? ""} onChange={e => setEditForm(p => p ? { ...p, facebook: e.target.value } : p)} /></div>
              <div><label style={fieldLabel}>Colegio</label><input className="ts-input" style={inputStyle} value={editForm.colegio ?? ""} onChange={e => setEditForm(p => p ? { ...p, colegio: e.target.value } : p)} /></div>
              <div><label style={fieldLabel}>Distrito del Colegio</label><input className="ts-input" style={inputStyle} value={editForm.colegio_distrito ?? ""} onChange={e => setEditForm(p => p ? { ...p, colegio_distrito: e.target.value } : p)} /></div>
            </div>}

            {formTab === "apoderado" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1/-1" }}><label style={fieldLabel}>Nombre del Apoderado</label><input className="ts-input" style={inputStyle} value={editForm.apoderado_nombre ?? ""} onChange={e => setEditForm(p => p ? { ...p, apoderado_nombre: e.target.value } : p)} /></div>
              <div><label style={fieldLabel}>Parentesco</label><input className="ts-input" style={inputStyle} value={editForm.apoderado_parentesco ?? ""} onChange={e => setEditForm(p => p ? { ...p, apoderado_parentesco: e.target.value } : p)} /></div>
              <div><label style={fieldLabel}>Celular del Apoderado</label><input className="ts-input" style={inputStyle} value={editForm.apoderado_celular ?? ""} onChange={e => setEditForm(p => p ? { ...p, apoderado_celular: e.target.value } : p)} /></div>
            </div>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4, borderTop: "1px solid rgba(42,109,181,.12)", paddingTop: 14 }}>
              <button type="button" className="ts-btn-secondary" style={secondaryBtn} onClick={() => { setModalEditar(false); setFormTab("basico"); }}>Cancelar</button>
              <button type="submit" className="ts-btn-primary" style={primaryBtn} disabled={submitting}>
                <Pencil size={14} />{submitting ? "Guardando…" : "Guardar Cambios"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={modalMatricula} onClose={() => { setModalMatricula(false); setMatriculaTarget(null); }} title="Registrar Matrícula">
        <form onSubmit={handleMatricula} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {matriculaTarget && (
            <div style={{ padding: "10px 14px", background: "rgba(42,109,181,0.1)", borderRadius: 10, border: "1px solid rgba(42,109,181,0.2)" }}>
              <div style={{ fontSize: 11, color: "rgba(74,179,216,0.6)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Alumno seleccionado</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#dbeafe" }}>{matriculaTarget.apellidos}, {matriculaTarget.nombres}</div>
              <div style={{ fontSize: 11, color: "rgba(74,179,216,0.8)" }}>Carrera: {matriculaTarget.carrera}</div>
            </div>
          )}
          <div>
            <label style={fieldLabel}>Módulo *</label>
            <div style={{ position: "relative" }}>
              <select
                className="ts-input"
                style={selectStyle}
                value={matriculaForm.modulo_id}
                onChange={(e) => {
                  const mod = modulos.find(m => m.id === e.target.value);
                  setMatriculaForm((p) => ({ ...p, modulo_id: e.target.value, carrera_id: mod?.carrera_id ?? p.carrera_id }));
                }}
                required
              >
                <option value="">— Seleccionar módulo —</option>
                {modulos
                  .filter(m => (!matriculaTarget || m.carreras?.nombre === matriculaTarget.carrera) && new Date().toLocaleDateString('sv-SE') <= m.fecha_fin)
                  .map((m) => {
                    const fInicio = m.fecha_inicio ? new Date(m.fecha_inicio + "T00:00:00").toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' }) : "";
                    const fFin = m.fecha_fin ? new Date(m.fecha_fin + "T00:00:00").toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' }) : "";
                    const datesStr = fInicio && fFin ? `${fInicio} a ${fFin}` : "";
                    const details = [
                      m.aula ? `Aula: ${m.aula}` : null,
                      datesStr ? `Fechas: ${datesStr}` : null,
                      m.horario ? `Turno: ${m.horario}` : null,
                      m.modalidad ? `Mod: ${m.modalidad}` : null
                    ].filter(Boolean).join(" | ");

                    return (
                      <option key={m.id} value={m.id}>
                        {m.nombre.toUpperCase()} {details ? `(${details})` : ""}
                      </option>
                    );
                  })}
              </select>
              <ChevronDown size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(74,179,216,0.5)" }} />
            </div>
          </div>
          <div style={{ display: "none" }}>
            <label style={fieldLabel}>Turno *</label>
            <div style={{ position: "relative" }}>
              <select
                className="ts-input"
                style={selectStyle}
                value={matriculaForm.turno}
                onChange={(e) => setMatriculaForm((p) => ({ ...p, turno: e.target.value }))}
                required
              >
                <optgroup label="Turnos regulares">
                  <option value="mañana">Mañana (08:00 – 12:00)</option>
                  <option value="tarde">Tarde (13:00 – 17:00)</option>
                  <option value="noche">Noche (17:00 – 20:30)</option>
                </optgroup>
                <optgroup label="Turnos especiales">
                  <option value="sabado_domingo_am">Sábado y Domingo AM (08:00 – 13:00)</option>
                  <option value="sabado_domingo_full">Sábado y Domingo Full (08:00 – 17:00)</option>
                </optgroup>
              </select>
              <ChevronDown size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(74,179,216,0.5)" }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <button type="button" className="ts-btn-secondary" style={secondaryBtn} onClick={() => { setModalMatricula(false); setMatriculaTarget(null); }}>
              Cancelar
            </button>
            <button type="submit" className="ts-btn-primary" style={primaryBtn} disabled={submitting}>
              <BookOpen size={14} />
              {submitting ? "Matriculando…" : "Registrar Matrícula"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Ver Detalle Alumno ── */}
      <Modal open={modalVer} onClose={() => { setModalVer(false); setVerTarget(null); }} title="Ficha del Alumno">
        {verTarget && (() => {
          const v = verTarget;
          const empty = <span style={{ color: "rgba(74,179,216,.2)", fontStyle: "italic", fontSize: 12 }}>—</span>;
          const row = (label: string, value?: string | null) => (
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "2px 10px", padding: "7px 0", borderBottom: "1px solid rgba(42,109,181,.07)" }}>
              <span style={{ fontSize: 11, color: "rgba(74,179,216,.45)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", paddingTop: 2 }}>{label}</span>
              <span style={{ fontSize: 13, color: value ? "#dbeafe" : "inherit", wordBreak: "break-word" }}>{value || empty}</span>
            </div>
          );
          const sec = (title: string, icon: React.ReactNode) => (
            <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "16px 0 4px", paddingBottom: 5, borderBottom: "2px solid rgba(42,109,181,.2)" }}>
              {icon}<span style={{ fontSize: 10, fontWeight: 800, color: "rgba(74,179,216,.7)", textTransform: "uppercase", letterSpacing: ".12em" }}>{title}</span>
            </div>
          );
          return (
            <div style={{ maxHeight: "65vh", overflowY: "auto", paddingRight: 4, fontSize: 13 }}>
              {sec("Identificación", <Users size={12} style={{ color: "rgba(74,179,216,.7)" }} />)}
              {row("DNI", v.dni)}
              {row("Nombres", v.nombres)}
              {row("Apellidos", v.apellidos)}
              {row("Carrera", v.carrera)}

              {sec("Datos de Nacimiento", <MapPin size={12} style={{ color: "rgba(74,179,216,.7)" }} />)}
              {row("Fecha de Nacimiento", v.fecha_nacimiento ? new Date(v.fecha_nacimiento + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" }) : null)}
              {row("Distrito", v.nac_distrito)}
              {row("Provincia", v.nac_provincia)}
              {row("Departamento", v.nac_departamento)}

              {sec("Domicilio", <MapPin size={12} style={{ color: "rgba(74,179,216,.7)" }} />)}
              {row("Dirección", v.direccion)}
              {row("Distrito", v.dir_distrito)}
              {row("Referencia", v.dir_referencia)}

              {sec("Contacto", <Phone size={12} style={{ color: "rgba(74,179,216,.7)" }} />)}
              {row("Teléfono", v.telefono)}
              {row("Correo electrónico", v.correo)}
              {row("Facebook", v.facebook)}
              {row("Colegio", v.colegio)}
              {row("Distrito del Colegio", v.colegio_distrito)}

              {sec("Apoderado", <Users size={12} style={{ color: "rgba(74,179,216,.7)" }} />)}
              {row("Nombre", v.apoderado_nombre)}
              {row("Parentesco", v.apoderado_parentesco)}
              {row("Celular", v.apoderado_celular)}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 10, borderTop: "1px solid rgba(42,109,181,.12)" }}>
                <button className="ts-btn-secondary" style={secondaryBtn} onClick={() => { setModalVer(false); setVerTarget(null); }}>Cerrar</button>
                <button className="ts-btn-primary" style={primaryBtn} onClick={() => { setModalVer(false); setEditForm({ ...v }); setModalEditar(true); setFormTab("basico"); }}>
                  <Pencil size={13} /> Editar
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Modal: Módulos Matriculados ── */}
      <Modal open={modalMatriculados} onClose={() => { setModalMatriculados(false); setMatriculadosTarget(null); setMatriculasList([]); }} title="Módulos Matriculados">
        {matriculadosTarget && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ padding: "10px 14px", background: "rgba(42,109,181,0.1)", borderRadius: 10, border: "1px solid rgba(42,109,181,0.2)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#dbeafe" }}>{matriculadosTarget.apellidos}, {matriculadosTarget.nombres}</div>
              <div style={{ fontSize: 11, color: "rgba(74,179,216,0.8)" }}>{matriculadosTarget.carrera}</div>
            </div>

            {loadingMatriculas ? (
              <div style={{ textAlign: "center", padding: "20px", color: "rgba(74,179,216,0.6)" }}>
                Cargando módulos...
              </div>
            ) : matriculasList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 20px", color: "rgba(74,179,216,0.4)" }}>
                <Layers size={32} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
                <p style={{ fontSize: 13 }}>El alumno no tiene matrículas registradas</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "50vh", overflowY: "auto", paddingRight: 4 }}>
                {matriculasList.map(mat => {
                  const isFinished = new Date() > new Date(mat.modulos?.fecha_fin || "2099-12-31");
                  return (
                    <div key={mat.id} style={{
                      padding: "12px 16px", borderRadius: 10,
                      background: "rgba(8,16,34,0.6)",
                      border: "1px solid rgba(42,109,181,0.15)",
                      display: "flex", flexDirection: "column", gap: 6
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#dbeafe" }}>{mat.modulos?.nombre || "Módulo Eliminado"}</div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                          background: isFinished ? "rgba(52,211,153,0.15)" : "rgba(74,179,216,0.15)",
                          color: isFinished ? "#34d399" : "#4ab3d8",
                          border: isFinished ? "1px solid rgba(52,211,153,0.3)" : "1px solid rgba(74,179,216,0.3)",
                          whiteSpace: "nowrap"
                        }}>
                          {isFinished ? "FINALIZADO" : "EN CURSO"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(180,210,240,0.6)" }}>
                        <Users size={11} style={{ color: "rgba(74,179,216,0.5)" }} /> Docente: <span style={{ color: "rgba(180,210,240,0.8)" }}>{mat.modulos?.profesor || "No asignado"}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "rgba(180,210,240,0.6)", marginTop: 2 }}>
                        <span>Turno: {mat.turno}</span>
                        <span>{mat.modulos?.fecha_inicio} al {mat.modulos?.fecha_fin}</span>
                      </div>
                      <div style={{ marginTop: 4, display: "flex", gap: 6 }}>
                        <ReporteMatriculaBtn matriculaId={mat.id} label="Constancia" />
                        <ReporteAsistenciaBtn matriculaId={mat.id} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid rgba(42,109,181,.12)", paddingTop: 14 }}>
              <button className="ts-btn-secondary" style={secondaryBtn} onClick={() => { setModalMatriculados(false); setMatriculadosTarget(null); }}>Cerrar</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Confirmar Eliminación ── */}
      <ConfirmDialog
        open={modalEliminar}
        onClose={() => setModalEliminar(false)}
        onConfirm={handleDeleteAlumno}
        loading={submitting}
        title="Confirmar Eliminación"
        description="Esta acción no se puede deshacer."
      >
        {deleteTarget && (
          <p style={{ fontSize: 13, color: "rgba(120,160,210,0.75)" }}>
            <strong style={{ color: "#4ab3d8" }}>{deleteTarget.apellidos}, {deleteTarget.nombres}</strong>
            <br />
            <span style={{ fontFamily: "monospace", fontSize: 12 }}>DNI: {deleteTarget.dni}</span>
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}