import { supabase } from "@/lib/supabase";



function gradeToWords(grade: number | null | undefined): string {
  if (grade === null || grade === undefined) return "PENDIENTE";
  const rounded = Math.round(grade);
  if (rounded < 14) return "DESAPROBADO";
  else return "APROBADO";
}

export default async function ReporteHistorialPage({ searchParams }: { searchParams: Promise<{ dni?: string, token?: string }> }) {
  const resolvedParams = await searchParams;
  let dni = resolvedParams.dni;
  const token = resolvedParams.token;

  if (!dni && token) {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      if (decoded.startsWith('TS-')) {
        dni = decoded.substring(3); // Remove 'TS-'
      }
    } catch (e) { }
  }

  if (!dni) {
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Error: Se requiere el identificador del alumno (token o dni).</div>;
  }

  // 1. Cargar datos del alumno
  const { data: alumno, error: errAlum } = await supabase
    .from("alumnos")
    .select("*")
    .eq("dni", dni)
    .single();

  if (errAlum || !alumno) {
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Error: No se encontró el alumno con el DNI proporcionado.</div>;
  }

  // 2. Cargar matrículas y módulos asociados (con sus cursos)
  const { data: matriculas, error: errMat } = await supabase
    .from("matriculas")
    .select(`
      id,
      turno,
      fecha_registro,
      modulos (
        *,
        cursos (*)
      )
    `)
    .eq("alumno_id", alumno.id)
    .order("fecha_registro", { ascending: true });

  const listaMatriculas = matriculas || [];

  // 3. Cargar notas de cursos para estas matrículas
  const matriculaIds = listaMatriculas.map(m => m.id);
  const { data: notasCursos } = await supabase
    .from("notas_cursos")
    .select(`
      *,
      cursos (*)
    `)
    .in("matricula_id", matriculaIds.length > 0 ? matriculaIds : ["none"])
    .order("orden", { referencedTable: "cursos", ascending: true });

  // Agrupar las notas por matricula_id
  const notasMapByMatricula = new Map<string, any[]>();
  (notasCursos || []).forEach(n => {
    if (!notasMapByMatricula.has(n.matricula_id)) {
      notasMapByMatricula.set(n.matricula_id, []);
    }
    notasMapByMatricula.get(n.matricula_id)!.push(n);
  });

  return (
    <>
      <title>{`${alumno.apellidos}_${alumno.nombres}_RecordAcademico_${alumno.codigo || alumno.dni}`.toUpperCase().replace(/\s+/g, "_")}</title>
      <style dangerouslySetInnerHTML={{
        __html: `
        body { margin: 0; padding: 0; background: #e5e7eb; font-family: 'Arial', sans-serif; color: #000; }
        .a4-container {
          background: #fff;
          width: 210mm;
          min-height: 297mm;
          margin: 30px auto;
          padding: 15mm;
          box-sizing: border-box;
          box-shadow: 0 10px 25px rgba(0,0,0,0.08);
          border: 1px solid #d1d5db;
        }
        @media print {
          body { background: #fff; }
          .a4-container { margin: 0; box-shadow: none; width: 100%; min-height: auto; padding: 5mm; border: none; }
          .no-print { display: none !important; }
        }
        
        /* Header structure */
        .header-section { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0066cc; padding-bottom: 12px; margin-bottom: 15px; }
        .logo-box { display: flex; align-items: center; }
        .logo-box img { height: 60px; object-fit: contain; }
        .institution-title { color: #0066cc; font-size: 16px; font-weight: bold; text-align: right; text-transform: uppercase; margin: 0; }
        .record-title { color: #555; font-size: 13px; font-weight: bold; text-align: right; text-transform: uppercase; margin: 2px 0 0 0; letter-spacing: 0.5px; }
        
        /* Info Grid */
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .info-table td { border: none !important; padding: 4px 6px; font-size: 11px; vertical-align: top; }
        .info-label { color: #0066cc; font-weight: bold; font-size: 10px; display: inline-block; width: 130px; text-transform: uppercase; }
        .info-value { color: #000; font-weight: bold; }
        
        /* Table styles */
        .record-table { width: 100%; border-collapse: collapse; margin-top: 5px; margin-bottom: 10px; border: 1px solid #0066cc; }
        .record-table th, .record-table td { border: 1px solid #0066cc; padding: 5px 8px; font-size: 11px; color: #000; }
        .record-table th { background-color: #f0f7ff; color: #0066cc; font-weight: bold; font-size: 9px; text-transform: uppercase; }
        
        /* Fail styles */
        .grade-fail { color: #ef4444 !important; font-weight: bold; }
        
        /* Summary Table */
        .summary-table { width: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 25px; border: 1px solid #0066cc; }
        .summary-table th, .summary-table td { border: 1px solid #0066cc; padding: 4px 8px; font-size: 10px; color: #000; }
        .summary-table th { background-color: #f0f7ff; color: #0066cc; font-weight: bold; font-size: 8px; text-transform: uppercase; }
        
        .modulo-header-strip {
          font-size: 12px;
          font-weight: bold;
          color: #0066cc;
          margin-top: 15px;
          margin-bottom: 4px;
          text-transform: uppercase;
          border-bottom: 1px solid #0066cc;
          padding-bottom: 3px;
        }
      `}} />

      <div className="no-print" style={{ textAlign: "center", padding: "15px 0" }}>
        <button
          id="print-btn"
          style={{ background: "#0066cc", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 4px 6px -1px rgba(0,102,204,0.2)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Imprimir Record Académico
        </button>
      </div>

      <div className="a4-container">
        <div className="header-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="logo-box">
            <img src="/img/logo.png" alt="Tecsur Logo" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
            <div style={{ textAlign: "right" }}>
              <h1 className="institution-title">TECSUR</h1>
              <h2 className="record-title">RECORD ACADÉMICO</h2>
            </div>
            <div style={{ border: "1px solid #0066cc", padding: 3, borderRadius: 4, background: "#fff", display: "inline-block", flexShrink: 0 }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(
                  `https://tecsur.edu.pe/reportes/historial?token=${token || Buffer.from(`TS-${dni}`).toString('base64')}`
                )}`}
                alt="QR Verificación"
                style={{ width: 70, height: 70, display: "block" }}
              />
            </div>
          </div>
        </div>

        <table className="info-table">
          <tbody>
            <tr>
              <td style={{ width: "60%" }}>
                <span className="info-label">Estudiante:</span>
                <span className="info-value">{(alumno.apellidos + ", " + alumno.nombres).toUpperCase()}</span>
              </td>
              <td style={{ width: "40%" }}>
                <span className="info-label">Código / DNI:</span>
                <span className="info-value">{alumno.codigo || "—"} / {alumno.dni}</span>
              </td>
            </tr>
            <tr>
              <td>
                <span className="info-label">Especialidad:</span>
                <span className="info-value">{(alumno.carrera || "No asignada").toUpperCase()}</span>
              </td>
              <td>
                <span className="info-label">Carrera Actual:</span>
                <span className="info-value">{(alumno.carrera || "No asignada").toUpperCase()}</span>
              </td>
            </tr>
            <tr>
              <td>
                <span className="info-label">Período Emisión:</span>
                <span className="info-value">{new Date().getFullYear()}-I</span>
              </td>
              <td>
                <span className="info-label">Fecha Emisión:</span>
                <span className="info-value">{new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {listaMatriculas.length === 0 ? (
          <p style={{ padding: 30, textAlign: "center", color: "#6b7280", background: "#f9fafb", border: "1px dashed #d1d5db", borderRadius: 8, marginTop: 15 }}>
            No registra módulos académicos matriculados en la institución.
          </p>
        ) : (
          listaMatriculas.map((mat, idxModulo) => {
            const notas = notasMapByMatricula.get(mat.id) || [];
            const modulo = Array.isArray(mat.modulos) ? mat.modulos[0] : mat.modulos;
            const coursesOfModulo = (modulo?.cursos || []).sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));

            // Mergear para que se muestren todos los cursos del módulo, incluso si no tienen notas registradas
            const mergedNotas = coursesOfModulo.map((c: any) => {
              const existingNota = notas.find((n: any) => n.curso_id === c.id);
              if (existingNota) {
                return {
                  ...existingNota,
                  cursos: c
                };
              }
              return {
                id: `placeholder-${c.id}`,
                matricula_id: mat.id,
                curso_id: c.id,
                nota: null,
                cursos: c
              };
            });

            // Cálculos del ciclo
            const validNotas = mergedNotas.filter((n: any) => n.nota !== null);
            const totalCreditos = mergedNotas.reduce((acc: number, n: any) => acc + (n.cursos?.creditos || 1), 0);
            const aprobadosCreditos = mergedNotas.reduce((acc: number, n: any) => acc + (n.nota !== null && n.nota >= 14 ? (n.cursos?.creditos || 1) : 0), 0);

            let sumProd = 0;
            let sumCred = 0;
            validNotas.forEach((n: any) => {
              const cred = n.cursos?.creditos || 1;
              sumProd += n.nota * cred;
              sumCred += cred;
            });
            const weightedAverage = sumCred > 0 ? (sumProd / sumCred) : null;

            // Cálculos acumulados (desde el módulo 0 hasta el módulo actual)
            let cumSumProd = 0;
            let cumSumCred = 0;
            for (let i = 0; i <= idxModulo; i++) {
              const mId = listaMatriculas[i].id;
              const mModulo = Array.isArray(listaMatriculas[i].modulos) ? listaMatriculas[i].modulos[0] : listaMatriculas[i].modulos;
              const mCoursesOfModulo = (mModulo?.cursos || []).sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
              const mNotas = notasMapByMatricula.get(mId) || [];

              mCoursesOfModulo.forEach((c: any) => {
                const existingNota = mNotas.find((n: any) => n.curso_id === c.id);
                const gradeVal = existingNota ? existingNota.nota : null;
                if (gradeVal !== null) {
                  const cred = c.creditos || 1;
                  cumSumProd += gradeVal * cred;
                  cumSumCred += cred;
                }
              });
            }
            const cumulativeWeightedAvg = cumSumCred > 0 ? (cumSumProd / cumSumCred) : null;
            const formatLocaleDate = (dateStr?: string | null) => {
              if (!dateStr) return "—";
              const parts = dateStr.split("-");
              if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
              }
              return dateStr;
            };

            const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
            const roman = ROMAN_NUMERALS[idxModulo] || String(idxModulo + 1);

            return (
              <div key={mat.id} style={{ pageBreakInside: "avoid" }}>
                <div className="modulo-header-strip">
                  MODULO {modulo?.nombre} &nbsp;&nbsp;&nbsp;&nbsp;
                  <span style={{ fontSize: "11px", fontWeight: "normal", textTransform: "none", color: "#475569" }}>
                    (Del {formatLocaleDate(modulo?.fecha_inicio)} al {formatLocaleDate(modulo?.fecha_fin)})
                  </span>
                </div>

                <table className="record-table">
                  <thead>
                    <tr>
                      <th rowSpan={2} style={{ width: "55%" }}>Curso</th>
                      <th rowSpan={2} style={{ width: "10%", textAlign: "center" }}>Créditos</th>
                      <th colSpan={2} style={{ width: "20%", textAlign: "center" }}>Promedio Final</th>
                      <th rowSpan={2} style={{ width: "7%", textAlign: "center" }}>Nº Veces</th>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "center", borderTop: "1px solid #0066cc" }}>NOTA</th>
                      <th style={{ textAlign: "center", borderTop: "1px solid #0066cc" }}>ESTADO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergedNotas.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", color: "#6b7280", fontStyle: "italic" }}>
                          No hay asignaturas registradas para este módulo.
                        </td>
                      </tr>
                    ) : (
                      mergedNotas.map((n: any) => {
                        const isFailed = n.nota !== null && n.nota < 14;
                        return (
                          <tr key={n.id}>
                            <td style={{ fontWeight: "bold" }}>
                              {n.cursos?.orden ? String(n.cursos.orden).padStart(3, "0") : "000"} - {n.cursos?.nombre.toUpperCase()}
                            </td>
                            <td style={{ textAlign: "center" }}>{(n.cursos?.creditos || 1).toFixed(1)}</td>
                            <td style={{ textAlign: "center", fontWeight: "bold" }} className={isFailed ? "grade-fail" : ""}>
                              {n.nota !== null ? String(n.nota).padStart(2, "0") : "—"}
                            </td>
                            <td style={{ fontWeight: "bold" }} className={isFailed ? "grade-fail" : ""}>
                              {gradeToWords(n.nota)}
                            </td>
                            <td style={{ textAlign: "center" }}>1</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                <table className="summary-table">
                  <thead>
                    <tr>
                      <th rowSpan={2} style={{ textAlign: "center", width: "10%" }}>Ciclo</th>
                      <th colSpan={2} style={{ textAlign: "center", width: "30%" }}>Créditos</th>
                      <th colSpan={2} style={{ textAlign: "center", width: "30%" }}>Ponderado</th>

                    </tr>
                    <tr>
                      <th style={{ textAlign: "center" }}>Totales</th>
                      <th style={{ textAlign: "center" }}>Aprobados</th>
                      <th style={{ textAlign: "center" }}>Actual</th>
                      <th style={{ textAlign: "center" }}>Acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ textAlign: "center", fontWeight: "bold" }}>{idxModulo + 1}</td>
                      <td style={{ textAlign: "center" }}>{totalCreditos.toFixed(1)}</td>
                      <td style={{ textAlign: "center" }}>{aprobadosCreditos.toFixed(2)}</td>
                      <td style={{ textAlign: "center", fontWeight: "bold" }}>{weightedAverage !== null ? weightedAverage.toFixed(2) : "—"}</td>
                      <td style={{ textAlign: "center", fontWeight: "bold" }}>{cumulativeWeightedAvg !== null ? cumulativeWeightedAvg.toFixed(2) : "—"}</td>
                    </tr>
                    <tr>
                      <td colSpan={7} style={{ textAlign: "left", fontSize: "10px", padding: "6px 10px", background: "#f9fafb" }}>
                        <strong>Observaciones:</strong> ---
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })
        )}
      </div>

      <script dangerouslySetInnerHTML={{
        __html: `
        document.getElementById('print-btn').addEventListener('click', function() {
          window.print();
        });
      `}} />
    </>
  );
}
