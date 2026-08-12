"use client";

import { useState, useEffect } from "react";
import { carreraBadgeStyle } from "@/lib/carreraColors";
import {
  Search,
  User,
  BookOpen,
  CreditCard,
  Award,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import AlertDialog from "./AlertDialog";
import ReporteModuloBtn from "./ReporteModuloBtn";
import ReporteMatriculaBtn from "./ReporteMatriculaBtn";
import ReporteAsistenciaBtn from "./ReporteAsistenciaBtn";
import ReporteFichaBtn from "./ReporteFichaBtn";
import ReporteHistorialBtn from "./ReporteHistorialBtn";

interface AlumnoData {
  alumno: {
    id: string;
    dni: string;
    nombres: string;
    apellidos: string;
    carrera: string;
  };
  modulos: Array<{
    matricula_id: string;
    fecha_registro: string;
    modulo: {
      id: string;
      nombre: string;
      fecha_inicio: string;
      fecha_fin: string;
      modalidad: string;
      duracion?: string | number | null;
    };
    notas_cursos: Array<{
      curso_id: string;
      nota: number | null;
      cursos: { nombre: string };
    }>;
    asistencia_total: number | null;
  }>;
  pensiones: Array<{
    id: string;
    nro_recibo: string;
    monto_pagado: number;
    deuda_pendiente: number;
    fecha_pago: string;
    modulos: { nombre: string };
  }>;
}

function scoreClass(score: number | null): string {
  if (score === null) return "";
  return score >= 13 ? "text-white" : "text-gray-400";
}

function ScoreCell({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: "rgba(255,255,255,0.4)" }}>—</span>;
  return <span className={`font-bold ${scoreClass(value)}`} style={{ fontSize: 13 }}>{value}</span>;
}

export default function ConsultaAdminView() {
  const [dni, setDni] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AlumnoData | null>(null);
  const [expandedModulo, setExpandedModulo] = useState<string | null>(null);
  const [showReniecModal, setShowReniecModal] = useState(false);
  const [hoveredModulo, setHoveredModulo] = useState<string | null>(null);

  // Search by name support
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showList, setShowList] = useState(false);

  const fetchStudentData = async (studentDni: string) => {
    setLoading(true);
    setError(null);
    setData(null);
    setShowList(false);
    try {
      const res = await fetch(`/api/consulta?dni=${encodeURIComponent(studentDni.trim())}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Error al consultar");
      } else {
        setData(json);
        if (json.modulos?.length > 0) setExpandedModulo(json.modulos[0].matricula_id);
      }
    } catch {
      setError("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!dni.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    setSearchResults([]);
    setShowList(false);

    try {
      // 1. Check if the query matches multiple students
      const res = await fetch(`/api/alumnos?search=${encodeURIComponent(dni.trim())}&page=1&pageSize=20`);
      const listData = await res.json();

      if (!res.ok) {
        setError(listData.error || "Error al buscar");
        setLoading(false);
        return;
      }

      const found = listData.data || [];
      if (found.length === 0) {
        setError("No se encontró ningún estudiante con ese DNI o nombre.");
      } else if (found.length === 1) {
        // Exactly one match -> show details
        setDni(found[0].dni);
        await fetchStudentData(found[0].dni);
      } else {
        // Multiple matches -> show list
        setSearchResults(found);
        setShowList(true);
      }
    } catch {
      setError("Error de conexión con el servidor al buscar.");
    } finally {
      setLoading(false);
    }
  }

  const [cargos, setCargos] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/cargos_modulo")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCargos(data);
      })
      .catch(err => console.error("Error al cargar cargos", err));
  }, []);

  const totalPagado = data?.pensiones.reduce((s, p) => s + p.monto_pagado, 0) || 0;

  // Calcular deuda de forma dinámica y retrocompatible
  let totalDeuda = 0;
  if (data) {
    data.modulos.forEach(item => {
      const modId = item.modulo?.id;
      if (!modId) return;

      const cargosModulo = cargos.filter((c: any) => c.modulo_id === modId);

      if (cargosModulo.length > 0) {
        const costTotal = cargosModulo.reduce((s: number, c: any) => s + Number(c.monto), 0);
        const paidTotal = data.pensiones.filter((p: any) => p.modulo_id === modId).reduce((s: number, p: any) => s + p.monto_pagado, 0);
        totalDeuda += Math.max(0, costTotal - paidTotal);
      } else {
        // Fallback: usar la última deuda_pendiente registrada en pagos
        const pagosModulo = data.pensiones.filter((p: any) => p.modulo_id === modId)
          .sort((a: any, b: any) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime());
        if (pagosModulo.length > 0) {
          totalDeuda += pagosModulo[0].deuda_pendiente;
        }
      }
    });
  }

  // Calculate overall attendance
  const modulosConAsistencia = data?.modulos.filter(m => m.asistencia_total !== null) || [];
  const promedioAsistencia = modulosConAsistencia.length > 0
    ? Math.round(modulosConAsistencia.reduce((a, b) => a + (b.asistencia_total || 0), 0) / modulosConAsistencia.length)
    : null;

  // Sort pagos
  const pagosSorted = data?.pensiones ? [...data.pensiones].sort((a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime()) : [];
  const ultimosPagos = pagosSorted.slice(0, 4);

  return (
    <div className="w-full pb-12" style={{ display: "flex", flexDirection: "column", gap: 32, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── BÚSQUEDA CENTRADA Y FORMAL ── */}
      <div style={{ display: "flex", justifyContent: "center", width: "100%", padding: "20px 0" }}>
        <div className="glass-card" style={{
          padding: "32px",
          border: "1px solid rgba(42,109,181,0.18)",
          width: "100%",
          maxWidth: 600,
          textAlign: "center",
          background: "rgba(10, 22, 44, 0.45)",
          borderRadius: 14
        }}>
          <h2 className="text-xl font-bold text-white tracking-wide uppercase" style={{ color: "#dbeafe", marginBottom: 14 }}>Consulta General de Alumnos</h2>
          <p className="text-xs text-blue-300 opacity-60" style={{ marginBottom: 24, lineHeight: 1.5 }}>Ingrese el Código de Alumno o DNI para verificar el historial académico y de matrícula.</p>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(74,179,216,0.4)" }} />
              <input
                id="consulta-dni-input"
                className="w-full text-white rounded-lg outline-none text-xs"
                style={{ height: 42, paddingLeft: 38, paddingRight: 16, background: "rgba(10,22,44,0.6)", border: "1px solid rgba(42,109,181,0.25)" }}
                placeholder="Nombres, Apellidos, DNI o Código..."
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                autoComplete="off"
              />
            </div>
            <button
              id="consulta-submit-btn"
              type="submit"
              disabled={loading}
              className="rounded-lg font-bold text-white transition-all disabled:opacity-50 hover:bg-blue-600 text-xs"
              style={{ height: 42, padding: "0 20px", background: "#1a4a7a", border: "1px solid rgba(74,179,216,0.25)", cursor: "pointer" }}
            >
              {loading ? "Buscando..." : "Consultar"}
            </button>
          </form>

          {showList && searchResults.length > 0 && (
            <div style={{ marginTop: 20, textAlign: "left" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8, textTransform: "uppercase" }}>
                Se encontraron varios estudiantes ({searchResults.length}):
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 250, overflowY: "auto", paddingRight: 4 }}>
                {searchResults.map((stu) => (
                  <button
                    key={stu.id}
                    onClick={() => {
                      setDni(stu.dni);
                      fetchStudentData(stu.dni);
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      width: "100%", padding: "10px 14px",
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8, cursor: "pointer", transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(42,109,181,0.2)"; e.currentTarget.style.borderColor = "rgba(74,179,216,0.4)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "#1a4a7a" }}>
                      {stu.nombres?.[0]}{stu.apellidos?.[0]}
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className="text-sm font-bold text-white" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        {stu.apellidos}, {stu.nombres}
                        <span style={{
                          fontSize: "10px", fontWeight: 600, color: "#93c5fd",
                          background: "rgba(30, 58, 138, 0.4)", padding: "2px 8px",
                          borderRadius: "4px", border: "1px solid rgba(59, 130, 246, 0.4)", textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}>
                          DNI: {stu.dni} {stu.codigo ? `• Cód: ${stu.codigo}` : ""}
                        </span>
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-blue-300 border border-blue-900 px-2 py-0.5 rounded uppercase">Seleccionar</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <AlertDialog open={!!error} onClose={() => setError(null)} message={error || ""} type="error" />
        </div>
      </div>

      {data && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6 w-full max-w-6xl mx-auto">

          {/* ── 1. HEADER / KEY STATS ── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

            {/* Student Profile Card */}
            <div className="md:col-span-2 relative overflow-hidden rounded-2xl border" style={{ minHeight: "160px", background: "linear-gradient(135deg, #0a1628 0%, #172b4d 100%)", borderColor: "rgba(74,179,216,0.3)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
              <div className="absolute top-0 right-0 p-4 opacity-50"><User size={80} style={{ color: "rgba(255,255,255,0.05)" }} /></div>
              <div className="relative flex flex-col justify-between h-full" style={{ padding: "26px 32px" }}>
                <div className="flex justify-between items-start">
                  <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg shrink-0"
                      style={{ background: "linear-gradient(135deg, #2a6db5 0%, #4ab3d8 100%)" }}>
                      {data.alumno.nombres[0]}{data.alumno.apellidos[0]}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white leading-tight" style={{ display: "flex", alignItems: "baseline", gap: "16px", flexWrap: "wrap" }}>
                        <span>{data.alumno.apellidos}, <span className="font-medium text-blue-100">{data.alumno.nombres}</span></span>

                        {/* DNI & Código integrados a la derecha del nombre */}
                        <span className="text-xs text-gray-400 font-normal">
                          DNI: {data.alumno.dni} {(data.alumno as any).codigo ? ` | Cód: ${(data.alumno as any).codigo}` : ""}
                        </span>
                      </h2>
                      <p className="text-xs text-blue-300 font-semibold uppercase tracking-wider mt-1">{data.alumno.carrera}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Stat */}
            <div className="rounded-2xl border flex flex-col justify-center" style={{ padding: "24px", background: "rgba(10,22,44,0.7)", borderColor: "rgba(42,109,181,0.2)" }}>
              <div className="flex justify-between items-start">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Asistencia Global</h3>
                <CheckCircle size={16} className={promedioAsistencia !== null && promedioAsistencia >= 70 ? "text-emerald-400" : "text-gray-600"} />
              </div>
              <div className="mt-4">
                {promedioAsistencia !== null ? (
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-black ${promedioAsistencia >= 70 ? "text-white" : "text-red-400"}`}>{promedioAsistencia}%</span>
                  </div>
                ) : (
                  <span className="text-xl font-medium text-gray-500">Sin registros</span>
                )}
                <div className="text-[10px] text-gray-500 mt-2 uppercase">Promedio de módulos cursados</div>
              </div>
            </div>

            {/* Debt Stat */}
            <div className="rounded-2xl border flex flex-col justify-center" style={{ padding: "24px", background: "rgba(10,22,44,0.7)", borderColor: totalDeuda > 0 ? "rgba(248,113,113,0.3)" : "rgba(52,211,153,0.3)" }}>
              <div className="flex justify-between items-start">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estado Financiero</h3>
                {totalDeuda > 0 ? <AlertTriangle size={16} className="text-red-400" /> : <CheckCircle size={16} className="text-emerald-400" />}
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-black ${totalDeuda > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    S/ {totalDeuda.toFixed(2)}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 mt-2 uppercase">Deuda actual pendiente</div>
              </div>
            </div>

          </div>

          {/* ── 2. MAIN DASHBOARD AREA ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LADO IZQUIERDO: Módulos (2/3) */}
            <div className="lg:col-span-2 flex flex-col gap-5">

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <BookOpen size={16} className="text-blue-400" /> Historial Académico
                </h3>
                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-md">{data.modulos.length} Módulos matriculados</span>
              </div>

              {data.modulos.length === 0 ? (
                <div className="border border-dashed border-gray-700 rounded-xl p-8 text-center text-gray-500 text-sm">
                  El alumno no registra matrículas.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {data.modulos.map((item) => {
                    const isOpen = expandedModulo === item.matricula_id;
                    const notas = item.notas_cursos;
                    const promediosParciales = notas.filter(n => n.nota !== null).map(n => n.nota!);
                    const promedioFinal = promediosParciales.length > 0
                      ? promediosParciales.reduce((a, b) => a + b, 0) / promediosParciales.length
                      : null;

                    return (
                      <div key={item.matricula_id} className="rounded-xl border overflow-hidden transition-all duration-300"
                        style={{
                          background: isOpen ? "rgba(15,30,55,0.6)" : "rgba(10,22,44,0.4)",
                          border: `1px solid ${isOpen ? 'rgba(74,179,216,0.3)' : 'rgba(42,109,181,0.15)'}`,
                          boxShadow: isOpen ? "0 10px 25px rgba(0,0,0,0.2)" : "none"
                        }}>

                        {/* MODULE HEADER BAR */}
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          style={{ padding: "20px 24px", transition: "background 0.2s" }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(42,109,181,0.2)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                          onClick={() => setExpandedModulo(isOpen ? null : item.matricula_id)}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 rounded-full bg-blue-900 bg-opacity-40 border border-blue-500 border-opacity-30 flex items-center justify-center shrink-0">
                              <Award size={20} className="text-blue-300" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-100">{item.modulo?.nombre ?? "Módulo sin nombre"}</h4>
                              <div className="flex gap-3 text-[11px] text-gray-400 mt-1 font-medium">
                                <span className="uppercase">{item.modulo?.modalidad}</span>
                                <span>•</span>
                                <span>{item.modulo?.fecha_inicio} a {item.modulo?.fecha_fin}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 shrink-0 mr-4">
                            <div className="text-right hidden sm:block">
                              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Asistencia</div>
                              <div className="text-sm font-bold text-gray-200">
                                {item.asistencia_total !== null ? `${item.asistencia_total}%` : "S/R"}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Promedio</div>
                              <div className={`text-sm font-bold ${promedioFinal !== null ? (promedioFinal >= 13 ? "text-blue-300" : "text-red-400") : "text-gray-500"}`}>
                                {promedioFinal !== null ? promedioFinal.toFixed(1) : "S/N"}
                              </div>
                            </div>
                          </div>
                          <div className="w-6 flex justify-center">
                            {isOpen ? <ChevronUp size={18} className="text-blue-400" /> : <ChevronDown size={18} className="text-gray-500" />}
                          </div>
                        </div>

                        {/* MODULE CONTENT */}
                        {isOpen && (
                          <div className="bg-black bg-opacity-20 border-t border-blue-900 border-opacity-30" style={{ padding: "24px 32px" }}>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {/* Left: Grades */}
                              <div>
                                <h5 className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-4 border-b border-gray-800 pb-2">Notas Oficiales</h5>
                                {notas && notas.length > 0 ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    {notas.map((n, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-xs rounded-lg border border-white border-opacity-5" style={{ padding: "12px", background: "rgba(255,255,255,0.03)" }}>
                                        <span className="text-gray-300 truncate pr-2 max-w-[230px]" title={n.cursos?.nombre}>{n.cursos?.nombre}</span>
                                        <span className={`font-bold px-2 py-1 rounded text-white ${n.nota !== null && n.nota >= 13 ? "bg-blue-900 bg-opacity-40 border border-blue-800" : n.nota !== null ? "bg-red-900 bg-opacity-40 border border-red-800" : "bg-gray-800"}`}>
                                          {n.nota !== null ? n.nota : "—"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500 italic p-4 rounded-lg border border-dashed border-gray-700 text-center">No hay notas registradas.</div>
                                )}
                              </div>

                              {/* Right: Quick actions y Finanzas */}
                              <div className="flex flex-col gap-6">
                                <div>
                                  <h5 className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-4 border-b border-gray-800 pb-2">Reportes del Módulo</h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "12px" }}>
                                    <div className="md:col-span-2">
                                      <ReporteFichaBtn matriculaId={item.matricula_id} label="Descargar Ficha de Matrícula" />
                                    </div>
                                    <ReporteAsistenciaBtn matriculaId={item.matricula_id} />
                                    <ReporteMatriculaBtn matriculaId={item.matricula_id} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* LADO DERECHO: Datos personales & Pagos (1/3) */}
            <div className="flex flex-col gap-6">

              {/* Personal Data Card */}
              <div className="rounded-xl border" style={{ padding: "24px", background: "rgba(10,22,44,0.4)", borderColor: "rgba(42,109,181,0.15)" }}>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5 border-b border-gray-800 pb-3">Información de Contacto</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-semibold tracking-wide">Teléfono / Celular</div>
                    <div className="text-sm font-medium text-gray-200 mt-1">{(data.alumno as any).celular || "No registrado"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-semibold tracking-wide">Correo Electrónico</div>
                    <div className="text-sm font-medium text-gray-200 mt-1">{(data.alumno as any).correo || "No registrado"}</div>
                  </div>
                </div>

                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-8 mb-5 border-b border-gray-800 pb-3">Acciones del Alumno</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <ReporteHistorialBtn dni={data.alumno.dni} />
                </div>
              </div>

              {/* Recent Payments Card */}
              <div className="rounded-xl border" style={{ padding: "24px", background: "rgba(10,22,44,0.4)", borderColor: "rgba(42,109,181,0.15)" }}>
                <div className="flex justify-between items-end mb-5 border-b border-gray-800 pb-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Últimos Pagos</h3>
                  <span className="text-[10px] text-blue-400 bg-blue-900 bg-opacity-30 px-2 py-1 rounded font-bold uppercase tracking-wider">Total: S/ {totalPagado.toFixed(2)}</span>
                </div>

                {ultimosPagos.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {ultimosPagos.map((p) => (
                      <div key={p.id} className="flex justify-between items-center bg-black bg-opacity-30 rounded-xl border border-white border-opacity-10 transition-all hover:bg-opacity-50" style={{ padding: "12px 16px" }}>
                        <div>
                          <div className="text-sm font-bold text-gray-200">S/ {p.monto_pagado.toFixed(2)}</div>
                          <div className="text-[11px] text-gray-500 mt-0.5 font-medium">{p.fecha_pago} • {p.nro_recibo}</div>
                        </div>
                        {p.deuda_pendiente > 0 ? (
                          <div className="text-[11px] text-red-400 font-bold bg-red-900 bg-opacity-20 px-2.5 py-1.5 rounded uppercase tracking-wide">Deuda S/{p.deuda_pendiente}</div>
                        ) : (
                          <div className="text-[11px] text-emerald-400 font-bold bg-emerald-900 bg-opacity-20 px-2.5 py-1.5 rounded uppercase tracking-wide">Al día</div>
                        )}
                      </div>
                    ))}
                    {pagosSorted.length > 4 && (
                      <div className="text-center text-[10px] text-gray-500 pt-3 uppercase tracking-wide font-medium">
                        + {pagosSorted.length - 4} pagos anteriores
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-center text-gray-500 italic py-6 bg-black bg-opacity-20 rounded-xl border border-dashed border-gray-700">No hay pagos registrados.</div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
