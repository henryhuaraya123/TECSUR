import { supabase } from "@/lib/supabase";

export default async function ReporteMatriculaPage({ searchParams }: { searchParams: Promise<{ matricula?: string }> }) {
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
      alumnos (*),
      modulos (*)
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
  const profesorStr = uniqueTeachers.length > 0 ? uniqueTeachers.join(", ") : (matricula.modulos.profesor || "Por asignar");

  const formatTurno = (t: string) => t ? t.replace(/_/g, " ") : "";

  return (
    <>
      <title>{`${matricula.alumnos.apellidos}_${matricula.alumnos.nombres}_ConstanciaMatricula_${matricula.alumnos.codigo || matricula.alumnos.dni}`.toUpperCase().replace(/\s+/g, "_")}</title>
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
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        td { border: 1px solid #d1d5db; padding: 12px; font-size: 13px; text-align: left; }
        .label-td { background-color: #f3f4f6; font-weight: 700; color: #374151; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; width: 30%; }
        
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 25px; }
        .logo-box { display: flex; align-items: center; gap: 15px; }
        
        .section-title {
          font-size: 14px;
          font-weight: 800;
          color: #fff;
          background: #1e3a8a;
          padding: 8px 12px;
          border-radius: 4px;
          margin-top: 30px;
          margin-bottom: 10px;
        }
      `}} />

      <div className="no-print" style={{ textAlign: "center", padding: "20px 0" }}>
        <button
          style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 4px 6px -1px rgba(37,99,235,0.2)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Imprimir Ficha de Matrícula
        </button>
      </div>

      <div className="a4-container">
        <div className="header">
          <div className="logo-box">
            <img src="/img/logo.png" alt="Tecsur Logo" style={{ height: 85, objectFit: "contain" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ textAlign: "right" }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 4 }}>CONSTANCIA DE MATRÍCULA</h2>
              <p style={{ fontSize: 12, color: "#6b7280" }}>{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <p style={{ fontSize: 12, color: "#2563eb", fontWeight: 700, marginTop: 4 }}>CÓD: {matricula.id.split("-")[0].toUpperCase()}</p>
            </div>
            <div style={{ border: "1px solid #d1d5db", padding: 4, borderRadius: 6, background: "#fff", display: "inline-block", flexShrink: 0 }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=85x85&data=${encodeURIComponent(
                  `TECSUR Constancia Matrícula\nEstudiante: ${matricula.alumnos.apellidos}, ${matricula.alumnos.nombres}\nDNI: ${matricula.alumnos.dni}\nMódulo: ${matricula.modulos.nombre}\nCódigo: ${matricula.id}`
                )}`}
                alt="QR Verificación"
                style={{ width: 85, height: 85, display: "block" }}
              />
            </div>
          </div>
        </div>

        <div style={{ padding: "0 10px" }}>
          <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, marginBottom: 20 }}>
            Por el presente documento, se certifica que el estudiante detallado a continuación ha sido matriculado satisfactoriamente en los registros académicos del <strong>Instituto Superior Tecnológico TECSUR</strong>.
          </p>

          <div className="section-title">DATOS DEL ESTUDIANTE</div>
          <table>
            <tbody>
              <tr>
                <td className="label-td">Apellidos y Nombres</td>
                <td style={{ fontWeight: 600 }}>{matricula.alumnos.apellidos}, {matricula.alumnos.nombres}</td>
              </tr>
              <tr>
                <td className="label-td">Documento de Identidad</td>
                <td>{matricula.alumnos.dni}</td>
              </tr>
              <tr>
                <td className="label-td">Carrera / Especialidad</td>
                <td>{matricula.alumnos.carrera || "No asignada"}</td>
              </tr>
              <tr>
                <td className="label-td">Celular de Contacto</td>
                <td>{matricula.alumnos.celular || "—"}</td>
              </tr>
              <tr>
                <td className="label-td">Correo Electrónico</td>
                <td>{matricula.alumnos.correo || "—"}</td>
              </tr>
            </tbody>
          </table>

          <div className="section-title">DATOS DEL MÓDULO</div>
          <table>
            <tbody>
              <tr>
                <td className="label-td">Módulo Académico</td>
                <td style={{ fontWeight: 600, color: "#1e3a8a" }}>{matricula.modulos.nombre}</td>
              </tr>
              <tr>
                <td className="label-td">Turno</td>
                <td style={{ textTransform: "capitalize" }}>{formatTurno(matricula.turno)}</td>
              </tr>
              <tr>
                <td className="label-td">Docente / Instructor</td>
                <td>{profesorStr}</td>
              </tr>
              <tr>
                <td className="label-td">Modalidad</td>
                <td style={{ textTransform: "capitalize" }}>{matricula.modulos.modalidad}</td>
              </tr>
              <tr>
                <td className="label-td">Fechas Programadas</td>
                <td>{matricula.modulos.fecha_inicio} al {matricula.modulos.fecha_fin}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 40, padding: 15, background: "#f9fafb", border: "1px solid #d1d5db", borderRadius: 8 }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#374151" }}>DECLARACIÓN Y COMPROMISO</h4>
            <p style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5 }}>
              El estudiante declara conocer y aceptar el reglamento interno, así como los términos y condiciones académicos y económicos del Instituto TECSUR.
              La presente matrícula queda sujeta a la validación de los requisitos de admisión y pago de los derechos correspondientes.
            </p>
          </div>

          <div style={{ marginTop: 80, display: "flex", justifyContent: "space-between", padding: "0 30px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 220, borderTop: "1px solid #9ca3af", margin: "0 auto 10px" }}></div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Firma del Estudiante</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>DNI: {matricula.alumnos.dni}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 220, borderTop: "1px solid #9ca3af", margin: "0 auto 10px" }}></div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Oficina de Admisión / Dirección</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>TECSUR</div>
            </div>
          </div>

        </div>
      </div>

      <script dangerouslySetInnerHTML={{
        __html: `
        document.querySelector('button').addEventListener('click', function() {
          window.print();
        });
      `}} />
    </>
  );
}
