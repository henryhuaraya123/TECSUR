import { supabase } from "@/lib/supabase";
import Image from "next/image";

export default async function ReporteCursoPage({
  searchParams,
}: {
  searchParams: Promise<{ curso_id: string; modulo_id: string }>;
}) {
  const params = await searchParams;
  const cursoId = params.curso_id;
  const moduloId = params.modulo_id;

  if (!cursoId || !moduloId) {
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Error: Faltan parámetros (curso_id, modulo_id).</div>;
  }

  // 1. Obtener datos del curso y módulo
  const { data: curso, error: errCurso } = await supabase
    .from("cursos")
    .select(`
      *,
      modulos (id, nombre, fecha_inicio, fecha_fin, modalidad, local, aula, carreras(id, nombre)),
      docentes (id, nombres, apellidos)
    `)
    .eq("id", cursoId)
    .single();

  if (errCurso || !curso) {
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Error: No se encontró el curso o la relación con el módulo.</div>;
  }

  const modulo = curso.modulos as any;
  const docente = curso.docentes as any;
  const docenteStr = docente ? `${docente.nombres} ${docente.apellidos}`.toUpperCase() : "NO ASIGNADO";
  const carreraStr = modulo?.carreras?.nombre ? modulo.carreras.nombre.toUpperCase() : "NO ASIGNADA";

  // 2. Obtener alumnos matriculados
  const { data: matriculas } = await supabase
    .from("matriculas")
    .select("id, turno, alumnos(dni, nombres, apellidos, carrera)")
    .eq("modulo_id", moduloId)
    .order("apellidos", { referencedTable: "alumnos", ascending: true });

  const listaMatriculas = matriculas || [];
  const turnoStr = listaMatriculas.length > 0 ? listaMatriculas[0].turno.replace(/_/g, " ").toUpperCase() : "NO ASIGNADO";

  // 3. Obtener notas para este curso
  const { data: notasCursos } = await supabase
    .from("notas_cursos")
    .select("*")
    .eq("curso_id", cursoId);

  const notasMap: Record<string, number> = {}; // matriculaId -> nota
  (notasCursos || []).forEach(n => {
    if (n.nota !== null) notasMap[n.matricula_id] = n.nota;
  });

  // 4. Obtener asistencias de este curso específico
  const { data: asistencias } = await supabase
    .from("asistencias")
    .select("matricula_id, fecha, estado")
    .eq("modulo_id", moduloId)
    .eq("curso_id", cursoId);

  const fechasSet = new Set<string>();
  const asistenciaMap: Record<string, Record<string, string>> = {}; // matriculaId -> { fecha -> estado }

  (asistencias || []).forEach(a => {
    fechasSet.add(a.fecha);
    if (!asistenciaMap[a.matricula_id]) asistenciaMap[a.matricula_id] = {};
    asistenciaMap[a.matricula_id][a.fecha] = a.estado;
  });

  let fechasValidas = Array.from(fechasSet).sort();

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @page { size: A4 landscape; margin: 0; }
        body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; font-size: 10px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: #fff !important; }
        .full-screen-wrapper { background: #fff; min-height: 100vh; padding: 20px; width: 100%; box-sizing: border-box; position: absolute; top: 0; left: 0; z-index: 50; }
        .page-container { width: 100%; background: #fff; }
        
        .header-logo-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
        .header-title { font-family: 'Georgia', serif; font-size: 20px; font-weight: bold; text-align: center; flex: 1; letter-spacing: 2px; color: #000 !important; }
        
        .main-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
        .matrix-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9px; table-layout: fixed; word-wrap: break-word; }
        .main-table th, .main-table td, .matrix-table th, .matrix-table td { border: 1px solid #000; padding: 3px 2px; color: #000; }
        
        .bg-blue { background-color: #a2d2df !important; font-weight: bold; }
        .bg-yellow { background-color: #ffff00 !important; font-weight: bold; }
        .bg-orange { background-color: #f7b924 !important; }
        .bg-gray { background-color: #e5e7eb !important; }
        
        .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); text-align: left; padding: 5px 2px; height: 120px; font-size: 9px; white-space: nowrap; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        
        .header-section td { text-transform: uppercase; }
        
        @media print {
          body { background: #fff; margin: 0; }
          .full-screen-wrapper { padding: 0; position: static; }
          .page-container { margin: 0; max-width: 100%; padding: 10mm; box-sizing: border-box; }
          .no-print { display: none !important; }
        }
      `}} />

      <div className="no-print" style={{ textAlign: "center", padding: "10px 0", background: "#f3f4f6", borderBottom: "1px solid #d1d5db" }}>
        <button
          id="btnPrint"
          style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 4px 6px -1px rgba(37,99,235,0.2)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Imprimir / Guardar PDF
        </button>
      </div>

      <div className="full-screen-wrapper">
        <div className="page-container">
          <div className="header-logo-container">
            <div style={{ width: 150 }}>
              <Image src="/img/logo.png" alt="Tecsur Logo" width={100} height={35} style={{ objectFit: "contain" }} />
            </div>
            <div className="header-title">REGISTRO DE NOTAS Y ASISTENCIA DEL CURSO</div>
            <div style={{ width: 150, textAlign: "right" }}></div>
          </div>

          <table className="main-table" style={{ marginBottom: 0, borderBottom: "none" }}>
            <tbody className="header-section">
              <tr>
                <td colSpan={5} className="bg-blue text-center" style={{ fontSize: 11 }}>
                  CARRERA: {carreraStr}
                </td>
              </tr>
              <tr>
                <td className="bg-yellow" style={{ width: "25%" }}>CURSO: {curso.nombre.toUpperCase()} ({curso.creditos || 1} CR)</td>
                <td className="bg-blue" style={{ width: "15%" }}>DOCENTE:</td>
                <td className="bg-blue" style={{ width: "30%", background: "#dbeef3", fontWeight: "normal" }}>{docenteStr}</td>
                <td className="bg-blue" style={{ width: "15%" }}>FECHA DE INICIO:</td>
                <td style={{ width: "15%", fontWeight: "bold", fontStyle: "italic", textAlign: "right", paddingRight: 10 }}>{modulo.fecha_inicio}</td>
              </tr>
              <tr>
                <td className="bg-blue">MÓDULO : {modulo.nombre.toUpperCase()}</td>
                <td className="bg-blue">HORARIO / TURNO:</td>
                <td style={{ fontWeight: "bold", textAlign: "center" }}>{turnoStr}</td>
                <td className="bg-blue">FECHA DE TÉRMINO:</td>
                <td style={{ fontWeight: "bold", fontStyle: "italic", textAlign: "right", paddingRight: 10 }}>{modulo.fecha_fin}</td>
              </tr>
              <tr>
                <td className="bg-blue">LOCAL : {modulo.local || "AV. SAN MARTIN N° 817"}</td>
                <td className="bg-yellow">AULA: "{modulo.aula || "POR ASIGNAR"}"</td>
                <td colSpan={3} className="bg-blue text-center">MODALIDAD: {modulo.modalidad.toUpperCase()}</td>
              </tr>
            </tbody>
          </table>

          <table className="matrix-table" style={{ borderTop: "none" }}>
            <colgroup>
              <col style={{ width: "3%" }} />
              <col style={{ width: "25%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "3%" }} />
              {fechasValidas.length === 0 ? (
                <col style={{ width: "10%" }} />
              ) : (
                fechasValidas.map(f => <col key={f} style={{ width: `${Math.max(2, 45 / fechasValidas.length)}%` }} />)
              )}
              <col style={{ width: "5%" }} />
              <col style={{ width: "8%" }} />
            </colgroup>

            {/* SECTION: MATRIX HEADERS */}
            <thead>
              <tr>
                <th rowSpan={2} className="bg-blue text-center">N°</th>
                <th rowSpan={2} className="bg-blue text-center">APELLIDOS Y NOMBRES</th>
                <th rowSpan={2} className="bg-yellow text-center" style={{ fontSize: 10 }}>NOTA</th>
                <th rowSpan={2} className="bg-yellow text-center" style={{ fontSize: 9 }}>ESTADO</th>
                <th rowSpan={2} className="bg-gray text-center">N°</th>
                <th colSpan={fechasValidas.length || 1} className="bg-blue text-center">CONTROL DE ASISTENCIA</th>
                <th rowSpan={2} className="bg-gray text-center" style={{ fontSize: 8 }}>TOTAL<br />INASIS.</th>
                <th rowSpan={2} className="bg-gray text-center">OBSERV.</th>
              </tr>
              <tr>
                {fechasValidas.length === 0 ? (
                  <th className="bg-orange vertical-text text-center">Sin clases</th>
                ) : (
                  fechasValidas.map((f, i) => {
                    const parts = f.split("-");
                    const shortDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : f;
                    return (
                      <th key={i} className="bg-orange vertical-text text-center">{shortDate}</th>
                    );
                  })
                )}
              </tr>
            </thead>

            {/* SECTION: DATA ROWS */}
            <tbody>
              {listaMatriculas.length === 0 ? (
                <tr><td colSpan={100} className="text-center" style={{ padding: 20 }}>No hay alumnos matriculados.</td></tr>
              ) : (
                listaMatriculas.map((m, idx) => {
                  const alum = m.alumnos as any;
                  const nota = notasMap[m.id];
                  const approved = nota !== undefined && nota >= 14;
                  const hasNota = nota !== undefined;

                  // Inasistencias
                  let faltas = 0;
                  fechasValidas.forEach(f => {
                    const est = asistenciaMap[m.id]?.[f];
                    if (est === "falta") faltas++;
                  });

                  return (
                    <tr key={m.id}>
                      <td className="text-center">{idx + 1}</td>
                      <td className="text-left" style={{ textTransform: "uppercase", paddingLeft: 5 }}>
                        {alum.apellidos}, {alum.nombres}
                      </td>
                      <td className="text-center" style={{ fontWeight: "bold", fontSize: 11, color: hasNota ? (approved ? "#047857" : "#b91c1c") : "#6b7280" }}>
                        {hasNota ? nota : "—"}
                      </td>
                      <td className="text-center" style={{ fontWeight: "bold", fontSize: 8, color: hasNota ? (approved ? "#047857" : "#b91c1c") : "#6b7280" }}>
                        {hasNota ? (approved ? "APROBADO" : "DESAPROBADO") : "SIN NOTA"}
                      </td>
                      <td className="bg-gray text-center">{idx + 1}</td>
                      {fechasValidas.length === 0 ? (
                        <td className="text-center">—</td>
                      ) : (
                        fechasValidas.map(f => {
                          const est = asistenciaMap[m.id]?.[f];
                          let val = " ";
                          let cellBg = "";
                          if (est === "presente") { val = "●"; }
                          else if (est === "tardanza") { val = "T"; cellBg = "#fef3c7"; }
                          else if (est === "falta") { val = "F"; cellBg = "#fee2e2"; }
                          else if (est === "justificado") { val = "J"; cellBg = "#e0e7ff"; }
                          return (
                            <td key={f} className="text-center" style={{ background: cellBg, fontWeight: "bold", fontSize: 9 }}>{val}</td>
                          );
                        })
                      )}
                      <td className="text-center bg-gray" style={{ fontWeight: "bold", color: faltas > 0 ? "#b91c1c" : "#000" }}>{faltas}</td>
                      <td className="text-center" style={{ fontSize: 8, color: "#4b5563" }}>
                        {faltas > 2 ? "Riesgo Inas." : "Regular"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div style={{ marginTop: 60, display: "flex", justifyContent: "space-around" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 200, borderTop: "1px solid #000", margin: "0 auto 10px" }}></div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>Firma del Docente</div>
              <div style={{ fontSize: 11, color: "#4b5563" }}>{docenteStr}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 200, borderTop: "1px solid #000", margin: "0 auto 10px" }}></div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>Coordinación Académica</div>
              <div style={{ fontSize: 11, color: "#4b5563" }}>Sello y Firma</div>
            </div>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{
        __html: `
        document.getElementById('btnPrint').addEventListener('click', function() {
          window.print();
        });
      `}} />
    </>
  );
}
