import { supabase } from "@/lib/supabase";

export default async function ReporteAsistenciaPage({ searchParams }: { searchParams: Promise<{ matricula?: string }> }) {
  const resolvedParams = await searchParams;
  const matriculaId = resolvedParams.matricula;

  if (!matriculaId) {
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Error: Se requiere el ID de la matrícula.</div>;
  }

  // Cargar datos de la matrícula, alumno y módulo
  const { data: matricula, error: errMat } = await supabase
    .from("matriculas")
    .select(`
      *,
      alumnos (dni, nombres, apellidos, carrera, celular),
      modulos (nombre, profesor, fecha_inicio, fecha_fin, modalidad, duracion)
    `)
    .eq("id", matriculaId)
    .single();

  if (errMat || !matricula) {
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Error: No se encontró la matrícula o fue eliminada.</div>;
  }

  // Cargar cursos del módulo para obtener los nombres de los docentes
  const { data: cursos } = await supabase
    .from("cursos")
    .select("id, nombre, docente_id, docentes(nombres, apellidos)")
    .eq("modulo_id", matricula.modulo_id);

  const uniqueTeachers = Array.from(
    new Set(
      (cursos || []).map(c => {
        const doc = (c as any).docentes;
        const d = Array.isArray(doc) ? doc[0] : doc;
        return d ? `${d.nombres} ${d.apellidos}`.trim() : null;
      }).filter(Boolean)
    )
  );
  const profesorStr = uniqueTeachers.length > 0 ? uniqueTeachers.join(", ") : (matricula.modulos.profesor || "No asignado");

  // Cargar TODAS las fechas en las que se tomó asistencia para este módulo
  const { data: fechasModulo } = await supabase
    .from("asistencias")
    .select("fecha")
    .eq("modulo_id", matricula.modulo_id);

  const fechasUnicas = Array.from(new Set((fechasModulo || []).map(f => f.fecha))).sort();

  // Filtrar fechas que sean desde la fecha de inicio hasta hoy
  const hoyStr = new Date().toISOString().split("T")[0];
  const fechasValidas = fechasUnicas.filter(f => f >= matricula.modulos.fecha_inicio && f <= hoyStr);

  // Cargar las asistencias del ALUMNO
  const { data: asistenciasAlumno } = await supabase
    .from("asistencias")
    .select("*")
    .eq("matricula_id", matriculaId);

  const asistenciasMap = new Map();
  (asistenciasAlumno || []).forEach(a => asistenciasMap.set(a.fecha, a));

  const listaAsistencias = fechasValidas.map((fecha) => {
    if (asistenciasMap.has(fecha)) {
      return asistenciasMap.get(fecha);
    } else {
      return { id: `faltante-${fecha}`, fecha, estado: "falta", observacion: "No registrado" };
    }
  });

  // Calcular estadísticas
  const presentes = listaAsistencias.filter(a => a.estado === "presente" || a.estado === "tardanza" || a.estado === "justificado").length;
  const faltas = listaAsistencias.filter(a => a.estado === "falta").length;

  return (
    <>
      <title>{`${matricula.alumnos.apellidos}_${matricula.alumnos.nombres}_ReporteAsistencia_${matricula.alumnos.codigo || matricula.alumnos.dni}`.toUpperCase().replace(/\s+/g, "_")}</title>
      <style dangerouslySetInnerHTML={{
        __html: `
        body { margin: 0; padding: 0; background: #e5e7eb; font-family: 'Inter', system-ui, sans-serif; color: #111827; }
        .a4-container {
          background: #fff;
          width: 210mm;
          min-height: 297mm;
          margin: 40px auto;
          padding: 20mm;
          box-sizing: border-box;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        @page { margin: 0; }
        @media print {
          body { background: #fff; margin: 0; }
          .a4-container { margin: 0; box-shadow: none; width: 100%; min-height: auto; padding: 10mm 15mm !important; }
          .no-print { display: none !important; }
        }
        h1, h2, h3, h4, p { margin: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #d1d5db; padding: 8px 12px; font-size: 13px; text-align: left; }
        th { background-color: #f3f4f6; font-weight: 700; color: #374151; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 25px; }
        .logo-box { display: flex; align-items: center; gap: 15px; }
        .info-grid { display: grid; grid-template-columns: 1fr; gap: 30px; margin-bottom: 35px; }
        .info-box { background: #f9fafb; border: 1px solid #d1d5db; border-radius: 12px; padding: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .info-label { font-size: 11px; text-transform: uppercase; color: #4b5563; font-weight: 700; margin-bottom: 6px; letter-spacing: 0.05em; }
        .info-value { font-size: 15px; font-weight: 600; color: #111827; }
        .flex-row { display: flex; gap: 30px; margin-top: 20px; }
        .flex-row > div { flex: 1; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
        .badge-presente { background: #d1fae5; color: #065f46; }
        .badge-tardanza { background: #fef3c7; color: #92400e; }
        .badge-falta { background: #fee2e2; color: #991b1b; }
        .badge-justificado { background: #e0e7ff; color: #3730a3; }
        .stats-box { display: flex; gap: 20px; margin-top: 30px; border-top: 2px solid #e5e7eb; padding-top: 20px; }
        .stat-item { flex: 1; text-align: center; }
        .stat-val { font-size: 24px; font-weight: 800; color: #2563eb; }
        .stat-lbl { font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
      `}} />

      <div className="no-print" style={{ textAlign: "center", padding: "20px 0" }}>
        <button
          style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 4px 6px -1px rgba(37,99,235,0.2)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Imprimir / Guardar PDF
        </button>
      </div>

      <div className="a4-container">
        <div className="header">
          <div className="logo-box">
            <img src="/img/logo.png" alt="Tecsur Logo" style={{ height: 85, objectFit: "contain" }} />
          </div>
          <div style={{ textAlign: "right" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 4 }}>Reporte de Asistencia</h2>
            <p style={{ fontSize: 12, color: "#6b7280" }}>Generado el {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="info-grid">
          <div className="info-box">
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1f2937", marginBottom: 20, borderBottom: "2px solid #e5e7eb", paddingBottom: 10 }}>Datos del Alumno</h3>
            <div className="info-label">Apellidos y Nombres</div>
            <div className="info-value">{matricula.alumnos.apellidos}, {matricula.alumnos.nombres}</div>

            <div className="flex-row">
              <div>
                <div className="info-label">DNI</div>
                <div className="info-value">{matricula.alumnos.dni}</div>
              </div>
              <div>
                <div className="info-label">Celular</div>
                <div className="info-value">{matricula.alumnos.celular || "—"}</div>
              </div>
              <div>
                <div className="info-label">Carrera</div>
                <div className="info-value">{matricula.alumnos.carrera || "No asignada"}</div>
              </div>
            </div>
          </div>

          <div className="info-box">
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1f2937", marginBottom: 20, borderBottom: "2px solid #e5e7eb", paddingBottom: 10 }}>Datos del Módulo</h3>

            <div className="flex-row" style={{ marginTop: 0 }}>
              <div>
                <div className="info-label">Módulo / Máquina</div>
                <div className="info-value">{matricula.modulos.nombre}</div>
              </div>
              <div>
                <div className="info-label">Docente</div>
                <div className="info-value">{profesorStr}</div>
              </div>
              <div>
                <div className="info-label">Modalidad</div>
                <div className="info-value" style={{ textTransform: "capitalize" }}>{matricula.modulos.modalidad}</div>
              </div>
              <div>
                <div className="info-label">Turno</div>
                <div className="info-value" style={{ textTransform: "capitalize" }}>{matricula.turno.replace(/_/g, " ")}</div>
              </div>
            </div>

            <div className="flex-row">
              <div>
                <div className="info-label">Fecha de Inicio</div>
                <div className="info-value">{matricula.modulos.fecha_inicio}</div>
              </div>
              <div>
                <div className="info-label">Fecha de Fin</div>
                <div className="info-value">{matricula.modulos.fecha_fin}</div>
              </div>
              <div>
                <div className="info-label">Local</div>
                <div className="info-value">{matricula.modulos.local || "Sede Principal"}</div>
              </div>
              <div>
                <div className="info-label">Aula</div>
                <div className="info-value">{matricula.modulos.aula || "No asignada"}</div>
              </div>
            </div>
          </div>
        </div>

        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 12, marginTop: 10 }}>Registro Detallado</h3>

        {listaAsistencias.length === 0 ? (
          <p style={{ padding: 30, textAlign: "center", color: "#6b7280", background: "#f9fafb", border: "1px dashed #d1d5db", borderRadius: 8 }}>
            No hay registros de asistencia para este alumno en este módulo.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>N°</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Observación</th>
              </tr>
            </thead>
            <tbody>
              {listaAsistencias.map((asist, idx) => {
                // Formatear la fecha YYYY-MM-DD a DD/MM/YYYY sin problemas de zona horaria
                const fechaParts = asist.fecha.split("-");
                const fechaFormateada = fechaParts.length === 3 ? `${fechaParts[2]}/${fechaParts[1]}/${fechaParts[0]}` : asist.fecha;
                return (
                  <tr key={asist.id}>
                    <td style={{ textAlign: "center", color: "#6b7280" }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{fechaFormateada}</td>
                    <td>
                      <span className={`badge badge-${asist.estado}`}>
                        {asist.estado}
                      </span>
                    </td>
                    <td style={{ color: "#6b7280", fontStyle: asist.observacion ? "normal" : "italic" }}>
                      {asist.observacion || "Ninguna"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="stats-box">
          <div className="stat-item">
            <div className="stat-val" style={{ color: "#059669" }}>{presentes}</div>
            <div className="stat-lbl">Asistencias</div>
          </div>
          <div className="stat-item">
            <div className="stat-val" style={{ color: "#dc2626" }}>{faltas}</div>
            <div className="stat-lbl">Faltas</div>
          </div>
        </div>

        <div style={{ marginTop: 60, display: "flex", justifyContent: "space-around" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 200, borderTop: "1px solid #9ca3af", margin: "0 auto 10px" }}></div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Firma del Docente</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{profesorStr}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 200, borderTop: "1px solid #9ca3af", margin: "0 auto 10px" }}></div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Coordinación Académica</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>Sello y Firma</div>
          </div>
        </div>
      </div>

      {/* Client Component para el botón de imprimir */}
      <script dangerouslySetInnerHTML={{
        __html: `
        document.querySelector('button').addEventListener('click', function() {
          window.print();
        });
      `}} />
    </>
  );
}
