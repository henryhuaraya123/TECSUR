import { supabase } from "@/lib/supabase";
import Image from "next/image";

export default async function ReporteModuloPage({
  searchParams,
}: {
  searchParams: Promise<{ modulo_id: string }>;
}) {
  const params = await searchParams;
  const moduloId = params.modulo_id;

  if (!moduloId) {
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Error: Faltan parámetros (modulo_id).</div>;
  }

  // 1. Obtener datos del módulo
  const { data: modulo, error: errMod } = await supabase
    .from("modulos")
    .select("*")
    .eq("id", moduloId)
    .single();

  if (errMod || !modulo) {
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Error: No se encontró el módulo.</div>;
  }

  // 2. Obtener alumnos matriculados
  const { data: matriculas } = await supabase
    .from("matriculas")
    .select("id, turno, alumnos(dni, nombres, apellidos, carrera)")
    .eq("modulo_id", moduloId)
    .order("apellidos", { referencedTable: "alumnos", ascending: true });

  const listaMatriculas = matriculas || [];
  const carreraStr = listaMatriculas.length > 0 ? (listaMatriculas[0].alumnos as any).carrera : "NO ASIGNADA";
  const turnoStr = listaMatriculas.length > 0 ? listaMatriculas[0].turno.replace(/_/g, " ") : "NO ASIGNADO";
  // 3. Obtener cursos del módulo
  const { data: cursos } = await supabase
    .from("cursos")
    .select("id, nombre, creditos, docente_id, docentes(nombres, apellidos)")
    .eq("modulo_id", moduloId)
    .order("orden", { ascending: true });

  const listaCursos = cursos || [];

  // 4. Obtener notas de estos cursos para estos alumnos
  const { data: notasCursos } = await supabase
    .from("notas_cursos")
    .select("*")
    .in("curso_id", listaCursos.map(c => c.id));

  const notasMap: Record<string, Record<string, number>> = {}; // matriculaId -> { cursoId -> nota }
  (notasCursos || []).forEach(n => {
    if (!notasMap[n.matricula_id]) notasMap[n.matricula_id] = {};
    if (n.nota !== null) notasMap[n.matricula_id][n.curso_id] = n.nota;
  });

  // 5. Obtener asistencias
  const { data: asistencias } = await supabase
    .from("asistencias")
    .select("matricula_id, fecha, estado")
    .eq("modulo_id", moduloId);

  const fechasSet = new Set<string>();
  const asistenciaMap: Record<string, Record<string, string>> = {}; // matriculaId -> { fecha -> estado }

  (asistencias || []).forEach(a => {
    fechasSet.add(a.fecha);
    if (!asistenciaMap[a.matricula_id]) asistenciaMap[a.matricula_id] = {};
    asistenciaMap[a.matricula_id][a.fecha] = a.estado;
  });

  let fechasValidas: string[] = [];
  const hoyStr = new Date().toISOString().split("T")[0];

  if (modulo.fecha_inicio && modulo.fecha_fin) {
    try {
      let actual = new Date(modulo.fecha_inicio + "T00:00:00");
      const final = new Date(modulo.fecha_fin + "T00:00:00");
      while (actual <= final) {
        const fechaStr = actual.toISOString().split("T")[0];

        if (fechaStr <= hoyStr) {
          // Si la fecha ya pasó o es hoy, SOLO la incluimos si hubo clases registradas
          // Esto filtra automáticamente feriados, huelgas, fines de semana o días sin clases
          if (fechasSet.has(fechaStr)) {
            fechasValidas.push(fechaStr);
          }
        } else {
          // Si es fecha futura, mostramos la plantilla vacía asumiendo Lunes a Viernes
          const day = actual.getDay();
          if (day !== 0 && day !== 6) {
            fechasValidas.push(fechaStr);
          }
        }
        actual.setDate(actual.getDate() + 1);
      }
    } catch (e) { }
  }

  // Fallback si no hay fechas válidas o no se configuraron bien
  if (fechasValidas.length === 0) {
    fechasValidas = Array.from(fechasSet).sort();
  }

  const uniqueTeachers = Array.from(
    new Set(
      listaCursos
        .map(c => {
          const doc = (c as any).docentes;
          const d = Array.isArray(doc) ? doc[0] : doc;
          return d ? `${d.nombres} ${d.apellidos}`.trim() : null;
        })
        .filter(Boolean)
    )
  );
  const profesoresStr = uniqueTeachers.length > 0 ? uniqueTeachers.join(", ") : (modulo.profesor || "POR ASIGNAR");

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @page { size: A4 landscape; margin: 0; }
        body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; font-size: 10px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: #fff !important; }
        .full-screen-wrapper { background: #fff; min-height: 100vh; padding: 20px; width: 100%; box-sizing: border-box; position: absolute; top: 0; left: 0; z-index: 50; }
        .page-container { width: 100%; background: #fff; }
        
        .header-logo-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
        .header-title { font-family: 'Georgia', serif; font-size: 24px; font-weight: bold; text-align: center; flex: 1; letter-spacing: 2px; color: #000 !important; }
        
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

      <div className="full-screen-wrapper">
        <div className="page-container">
          <div className="header-logo-container">
            <div style={{ width: 150 }}>
              <Image src="/img/logo.png" alt="Tecsur Logo" width={100} height={35} style={{ objectFit: "contain" }} />
            </div>
            <div className="header-title">REGISTRO DE NOTAS {new Date().getFullYear()}</div>
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
                <td className="bg-yellow" style={{ width: "25%" }}>MÁQUINA: {modulo.nombre}</td>
                <td className="bg-blue" style={{ width: "15%" }}>PROFESOR:</td>
                <td className="bg-blue" style={{ width: "30%", background: "#dbeef3", fontWeight: "normal" }}>{profesoresStr}</td>
                <td className="bg-blue" style={{ width: "15%" }}>FECHA DE INICIO:</td>
                <td style={{ width: "15%", fontWeight: "bold", fontStyle: "italic", textAlign: "right", paddingRight: 10 }}>{modulo.fecha_inicio}</td>
              </tr>
              <tr>
                <td className="bg-blue">CARRERA : {carreraStr.substring(0, 30)}...</td>
                <td className="bg-blue">HORARIO:</td>
                <td style={{ fontWeight: "bold", textAlign: "center" }}>{turnoStr}</td>
                <td className="bg-blue">FECHA DE TÉRMINO:</td>
                <td style={{ fontWeight: "bold", fontStyle: "italic", textAlign: "right", paddingRight: 10 }}>{modulo.fecha_fin}</td>
              </tr>
              <tr>
                <td className="bg-blue">LOCAL : {modulo.local || "SEDE PRINCIPAL"}</td>
                <td className="bg-yellow">AULA: "{modulo.aula || "POR ASIGNAR"}"</td>
                <td colSpan={3} className="bg-blue text-center">MODALIDAD: {modulo.modalidad}</td>
              </tr>
            </tbody>
          </table>

          <table className="matrix-table" style={{ borderTop: "none" }}>
            <colgroup>
              <col style={{ width: "2%" }} />
              <col style={{ width: "20%" }} />
              {listaCursos.map(c => <col key={c.id} style={{ width: "2%" }} />)}
              <col style={{ width: "3%" }} />
              <col style={{ width: "2%" }} />
              {fechasValidas.length === 0 ? (
                <col style={{ width: "5%" }} />
              ) : (
                fechasValidas.map(f => <col key={f} style={{ width: "1.5%" }} />)
              )}
              <col style={{ width: "3%" }} />
              <col style={{ width: "5%" }} />
            </colgroup>

            {/* SECTION: MATRIX HEADERS */}
            <tbody>
              <tr>
                <th rowSpan={2} className="bg-blue text-center">N°</th>
                <th rowSpan={2} className="bg-blue text-center">APELLIDOS Y NOMBRES</th>
                {listaCursos.map((c, i) => (
                  <th key={c.id} rowSpan={2} className="bg-gray vertical-text text-center">
                    {c.nombre.toUpperCase()} {c.creditos ? `(${c.creditos} CR)` : "(1 CR)"}
                  </th>
                ))}
                <th rowSpan={2} className="bg-blue vertical-text text-center">Prom.</th>
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

              {/* SECTION: DATA ROWS */}
              {listaMatriculas.length === 0 ? (
                <tr><td colSpan={100} className="text-center" style={{ padding: 20 }}>No hay alumnos matriculados.</td></tr>
              ) : (
                listaMatriculas.map((m, idx) => {
                  const alum = m.alumnos as any;

                  // Calculo de Promedio
                  let sum = 0;
                  let count = 0;
                  listaCursos.forEach(c => {
                    const n = notasMap[m.id]?.[c.id];
                    if (n !== undefined) { sum += n; count++; }
                  });
                  const prom = count > 0 ? Math.round(sum / count) : null;

                  // Calculo de Inasistencias
                  let inasis = 0;
                  fechasValidas.forEach(f => {
                    const est = asistenciaMap[m.id]?.[f];
                    if (est === "falta") inasis++;
                    else if (!est) inasis++; // si la clase se dio pero el alumno no tiene registro, es falta
                  });

                  return (
                    <tr key={m.id} style={{ backgroundColor: idx % 2 === 0 ? "#f3f4f6" : "#fff" }}>
                      <td className="text-center font-bold" style={{ borderRight: "2px solid #9ca3af" }}>{idx + 1}</td>
                      <td style={{ fontWeight: "bold", borderRight: "2px solid #9ca3af" }}>{alum.apellidos}, {alum.nombres}</td>

                      {/* Notas Cursos */}
                      {listaCursos.map(c => {
                        const val = notasMap[m.id]?.[c.id];
                        return (
                          <td key={c.id} className="text-center font-bold" style={{ color: val !== undefined && val < 14 ? "red" : "black" }}>
                            {val !== undefined ? val : ""}
                          </td>
                        );
                      })}

                      {/* Promedio */}
                      <td className="bg-blue text-center font-bold" style={{ color: prom !== null && prom < 14 ? "red" : "black", borderRight: "2px solid #9ca3af" }}>
                        {prom !== null ? prom : ""}
                      </td>

                      <td className="text-center" style={{ borderRight: "2px solid #9ca3af" }}>{idx + 1}</td>

                      {/* Asistencias (Check o Vacio) */}
                      {fechasValidas.length === 0 ? (
                        <td className="text-center"></td>
                      ) : (
                        fechasValidas.map(f => {
                          const est = asistenciaMap[m.id]?.[f];
                          // Presente, Tardanza, Justificado cuentan como que asistió. Falta o vacio no se pinta
                          const asistio = est === "presente" || est === "tardanza" || est === "justificado";
                          return (
                            <td key={f} className="text-center" style={{ color: "black", fontWeight: "bold" }}>
                              {asistio ? "•" : ""}
                            </td>
                          );
                        })
                      )}

                      {/* Total Inasistencias */}
                      <td className="text-center font-bold" style={{ color: inasis > 0 ? "red" : "black" }}>
                        {inasis > 0 ? inasis : ""}
                      </td>

                      {/* Observaciones */}
                      <td></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <script dangerouslySetInnerHTML={{
            __html: `
          setTimeout(() => { window.print(); }, 500);
        `}} />
        </div>
      </div>
    </>
  );
}
