import { supabase } from "@/lib/supabase";

function calculateAge(birthDateStr?: string | null) {
  if (!birthDateStr) return "—";
  const birthDate = new Date(birthDateStr);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return isNaN(age) ? "—" : `${age} años`;
}

function normalizeText(text: string) {
  return (text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
}

const CARRERAS_INFO: Record<string, { duracion: string; matricula: string; mensualidad: string }> = {
  "OPERACION Y MANTENIMIENTO DE MAQUINARIA PESADA": { duracion: "1 AÑO", matricula: "150.00", mensualidad: "400.00" },
  "SEGURIDAD MINERA E INDUSTRIAL": { duracion: "1 AÑO", matricula: "150.00", mensualidad: "350.00" },
  "TOPOGRAFIA Y GEODESIA": { duracion: "1 AÑO", matricula: "150.00", mensualidad: "450.00" }
};

export default async function ReporteFichaPage({ searchParams }: { searchParams: Promise<{ alumno?: string; matricula?: string; atendido_por?: string }> }) {
  const resolvedParams = await searchParams;
  const alumnoId = resolvedParams.alumno;
  const matriculaId = resolvedParams.matricula;
  const atendidoPor = resolvedParams.atendido_por;

  if (!alumnoId && !matriculaId) {
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Error: Se requiere el ID del alumno o de la matrícula.</div>;
  }

  let matricula: any = null;
  let alumno: any = null;

  if (matriculaId) {
    const { data: mat } = await supabase
      .from("matriculas")
      .select(`
        *,
        alumnos (*),
        modulos (*)
      `)
      .eq("id", matriculaId)
      .single();

    if (mat) {
      matricula = mat;
      alumno = mat.alumnos;
    }
  } else if (alumnoId) {
    const { data: alum } = await supabase
      .from("alumnos")
      .select("*")
      .eq("id", alumnoId)
      .single();

    if (alum) {
      alumno = alum;

      const { data: latestMat } = await supabase
        .from("matriculas")
        .select(`
          *,
          modulos (*)
        `)
        .eq("alumno_id", alumnoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestMat) {
        matricula = latestMat;
      }
    }
  }

  if (!alumno) {
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Error: No se encontró el registro del alumno o de la matrícula.</div>;
  }

  let totalPagado = 0;
  let saldoPendiente = 400.00;
  if (matricula) {
    const { data: pensiones } = await supabase
      .from("pensiones")
      .select("*")
      .eq("alumno_id", matricula.alumno_id)
      .eq("modulo_id", matricula.modulo_id);

    totalPagado = pensiones?.reduce((sum, p) => sum + Number(p.monto_pagado), 0) || 0;
    saldoPendiente = pensiones && pensiones.length > 0
      ? Number(pensiones[pensiones.length - 1].deuda_pendiente)
      : 400.00;
  }

  let profesorStr = "Por asignar";
  if (matricula) {
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
    profesorStr = uniqueTeachers.length > 0 ? uniqueTeachers.join(", ") : (matricula.modulos?.profesor || "Por asignar");
  }

  const formatTurno = (t: string) => t ? t.replace(/_/g, " ").toUpperCase() : "—";
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const formatDateVerbose = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr + "T00:00:00");
    if (isNaN(date.getTime())) return "—";
    const months = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    return `${date.getDate()} DE ${months[date.getMonth()]} DE ${date.getFullYear()}`;
  };

  const fechaRegistro = matricula ? matricula.fecha_registro : alumno.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const carrera = alumno.carrera || "";
  const carreraData = CARRERAS_INFO[normalizeText(carrera)] || { duracion: "", matricula: "", mensualidad: "" };
  const duracion = carreraData.duracion || (matricula?.modulos?.duracion ? String(matricula.modulos.duracion) : "—");
  const turno = matricula ? matricula.turno : "—";
  const horario = matricula?.modulos?.horario || "—";
  const modalidad = matricula?.modulos?.modalidad || "—";
  const moduloNombre = matricula?.modulos?.nombre || "General / Por asignar";
  const moduloFechaInicio = matricula?.modulos?.fecha_inicio || null;
  const celularOTelefono = alumno.celular || alumno.telefono || "—";
  const moduloFechaFin = matricula?.modulos?.fecha_fin || null;

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        body { margin: 0; padding: 0; background: #e5e7eb; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #000; }
        
        .a4-container {
          background: #fff;
          width: 210mm;
          min-height: 297mm;
          margin: 40px auto;
          padding: 12mm 15mm;
          box-sizing: border-box;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          position: relative;
        }
        
        @page { margin: 0; }
        @media print {
          body { background: #fff; margin: 0; }
          .a4-container { margin: 0; box-shadow: none; width: 100%; min-height: auto; padding: 10mm 15mm !important; }
          .no-print { display: none !important; }
        }

        h1, h2, h3, h4, p { margin: 0; }

        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .title-container {
          text-align: center;
          flex: 1;
        }

        .main-title {
          font-family: 'DM Sans', sans-serif;
          font-size: 20px;
          font-weight: 800;
          text-decoration: underline;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .photo-box {
          border: 1px solid #000;
          width: 4cm;
          height: 4cm;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          background: #fff;
          font-size: 10px;
          font-weight: bold;
          color: #9ca3af;
        }

        .section-bar {
          background: #e5e7eb;
          border: 1px solid #000;
          border-bottom: none;
          text-align: center;
          padding: 4px 0;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .field-grid {
          display: flex;
          flex-direction: column;
          border-top: 1px solid #000;
          margin-bottom: 12px;
        }

        .field-row {
          display: flex;
          width: 100%;
        }

        .field-cell {
          border: 1px solid #000;
          border-top: none;
          padding: 5px 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          box-sizing: border-box;
          min-height: 28px;
        }

        .field-cell:not(:first-child) {
          border-left: none;
        }

        .field-label {
          font-size: 10.5px;
          font-weight: 700;
          color: #000;
          white-space: nowrap;
        }

        .field-value {
          font-size: 9px;
          color: #1d4ed8 !important; /* Azul para los datos extraídos */
          font-weight: 600;
          text-transform: uppercase;
          word-break: break-word;
        }

        .split-section {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }

        .split-col {
          border: 1px solid #000;
          display: flex;
          flex-direction: column;
        }

        .split-title {
          background: #e5e7eb;
          border-bottom: 1px solid #000;
          text-align: center;
          padding: 4px 0;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .req-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          padding: 8px 10px;
          gap: 8px;
          background: #fff;
        }

        .req-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10.5px;
          font-weight: 600;
        }

        .check-box {
          width: 15px;
          height: 15px;
          border: 1px solid #000;
          display: inline-block;
          box-sizing: border-box;
        }

        .contact-box {
          flex: 1;
          padding: 8px;
          min-height: 48px;
          font-size: 9px;
          color: #1d4ed8;
          font-weight: 600;
        }

        .inversion-container {
          display: flex;
          border: 1px solid #000;
          border-top: none;
          min-height: 160px;
        }

        .inversion-col {
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }

        .inversion-col:not(:first-child) {
          border-left: 1px solid #000;
        }

        .inversion-title {
          font-size: 11px;
          font-weight: 800;
          text-align: center;
          padding: 4px 0;
          border-bottom: 1px solid #000;
          background: #f3f4f6;
        }

        .obs-content {
          padding: 8px;
          font-size: 11px;
          line-height: 1.5;
          flex: 1;
        }

        .inv-row {
          display: flex;
          border-bottom: 1px solid #000;
          font-size: 10.5px;
          min-height: 24px;
          align-items: center;
          box-sizing: border-box;
        }

        .inv-row:last-child {
          border-bottom: none;
        }

        .inv-label {
          padding: 0 8px;
          font-weight: 600;
          width: 50%;
          box-sizing: border-box;
        }

        .inv-val {
          padding: 0 8px;
          color: #1d4ed8;
          font-weight: 700;
          width: 50%;
          border-left: 1px solid #000;
          height: 100%;
          display: flex;
          align-items: center;
          box-sizing: border-box;
        }

        .inv-input-row {
          display: flex;
          border-bottom: 1px solid #000;
          font-size: 10.5px;
          min-height: 24px;
          align-items: center;
          box-sizing: border-box;
        }

        .inv-input-row:last-child {
          border-bottom: none;
        }

        .inv-inp-cell {
          width: 50%;
          height: 100%;
          display: flex;
          align-items: center;
          padding: 0 6px;
          box-sizing: border-box;
        }

        .inv-inp-cell:not(:first-child) {
          border-left: 1px solid #000;
        }

        .signatures-section {
          margin-top: 90px;
          display: flex;
          justify-content: space-between;
          padding: 0 10px;
        }

        .signature-block {
          text-align: center;
          width: 30%;
        }

        .signature-line {
          border-top: 1px solid #000;
          margin-bottom: 4px;
          width: 100%;
        }

        .signature-label {
          font-size: 10.5px;
          font-weight: 700;
          color: #4b5563;
        }
      `}} />

      {/* Control de impresión */}
      <div className="no-print" style={{ textAlign: "center", padding: "15px 0", background: "#1f2937" }}>
        <button
          id="print-btn"
          style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Imprimir Ficha de Matrícula
        </button>
      </div>

      <div className="a4-container">
        {/* Cabecera */}
        <div className="header-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          {/* Logo TECSUR */}
          <div style={{ width: "210px", display: "flex", justifyContent: "flex-start" }}>
            <img src="/img/logo.png" alt="TECSUR Logo" style={{ height: "95px", objectFit: "contain" }} />
          </div>

          {/* Título Central */}
          <div className="title-container" style={{ textAlign: "center", flex: 1 }}>
            <h2 className="main-title" style={{ fontSize: "18px" }}>Ficha de Matrícula</h2>
          </div>

          {/* Bloque Derecha: MINEDU Logo y Espacio para Foto */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", width: "200px" }}>
            <img src="/img/minedu.png" alt="MINEDU Logo" style={{ width: "4cm", height: "auto", objectFit: "contain" }} />
            <div className="photo-box">
              <span>FOTO</span>
            </div>
          </div>
        </div>

        {/* Bloque 1: Datos de Matrícula */}
        <div className="field-grid">
          <div className="field-row">
            <div className="field-cell" style={{ width: "22%" }}>
              <span className="field-label">Fecha:</span>
              <span className="field-value">{formatDate(fechaRegistro)}</span>
            </div>
            <div className="field-cell" style={{ width: "53%" }}>
              <span className="field-label">Especialización:</span>
              <span className="field-value">{carrera}</span>
            </div>
            <div className="field-cell" style={{ width: "25%" }}>
              <span className="field-label">Duración:</span>
              <span className="field-value">{duracion}</span>
            </div>
          </div>
          <div className="field-row">
            <div className="field-cell" style={{ width: "16%" }}>
              <span className="field-label">Turno:</span>
              <span className="field-value">{formatTurno(turno)}</span>
            </div>
            <div className="field-cell" style={{ width: "28%" }}>
              <span className="field-label">Horario:</span>
              <span className="field-value">{horario}</span>
            </div>
            <div className="field-cell" style={{ width: "28%" }}>
              <span className="field-label">Modalidad:</span>
              <span className="field-value">{modalidad}</span>
            </div>
            <div className="field-cell" style={{ width: "28%" }}>
              <span className="field-label">Atendido por:</span>
              <span className="field-value">{atendidoPor || "—"}</span>
            </div>
          </div>
        </div>

        {/* Sección: Datos Personales */}
        <div className="section-bar">Datos Personales</div>
        <div className="field-grid">
          <div className="field-row">
            <div className="field-cell" style={{ width: "100%" }}>
              <span className="field-label">Apellidos y Nombres:</span>
              <span className="field-value" style={{ fontWeight: 700 }}>
                {alumno.apellidos}, {alumno.nombres}
              </span>
            </div>
          </div>
          <div className="field-row">
            <div className="field-cell" style={{ width: "40%" }}>
              <span className="field-label">Fec. Nac:</span>
              <span className="field-value">{formatDate(alumno.fecha_nacimiento)}</span>
            </div>
            <div className="field-cell" style={{ width: "35%" }}>
              <span className="field-label">DNI:</span>
              <span className="field-value">{alumno.dni}</span>
            </div>
            <div className="field-cell" style={{ width: "25%" }}>
              <span className="field-label">Edad:</span>
              <span className="field-value">{calculateAge(alumno.fecha_nacimiento)}</span>
            </div>
          </div>

          <div className="field-row">
            <div className="field-cell" style={{ width: "40%" }}>
              <span className="field-label">Nac. Distrito:</span>
              <span className="field-value">{alumno.nac_distrito || "—"}</span>
            </div>
            <div className="field-cell" style={{ width: "35%" }}>
              <span className="field-label">Provincia:</span>
              <span className="field-value">{alumno.nac_provincia || "—"}</span>
            </div>
            <div className="field-cell" style={{ width: "25%" }}>
              <span className="field-label">Departamento:</span>
              <span className="field-value">{alumno.nac_departamento || "—"}</span>
            </div>
          </div>

          <div className="field-row">
            <div className="field-cell" style={{ width: "68%" }}>
              <span className="field-label">Dirección:</span>
              <span className="field-value">{alumno.direccion || "—"}</span>
            </div>
            <div className="field-cell" style={{ width: "32%" }}>
              <span className="field-label">Distrito:</span>
              <span className="field-value">{alumno.dir_distrito || "—"}</span>
            </div>
          </div>

          <div className="field-row">
            <div className="field-cell" style={{ width: "68%" }}>
              <span className="field-label">Referencia:</span>
              <span className="field-value">{alumno.dir_referencia || "—"}</span>
            </div>
            <div className="field-cell" style={{ width: "32%" }}>
              <span className="field-label">Teléfono:</span>
              <span className="field-value">{celularOTelefono}</span>
            </div>
          </div>

          <div className="field-row">
            <div className="field-cell" style={{ width: "68%" }}>
              <span className="field-label">Colegio:</span>
              <span className="field-value">{alumno.colegio || "—"}</span>
            </div>
            <div className="field-cell" style={{ width: "32%" }}>
              <span className="field-label">Distrito:</span>
              <span className="field-value">{alumno.colegio_distrito || "—"}</span>
            </div>
          </div>

          <div className="field-row">
            <div className="field-cell" style={{ width: "27%" }}>
              <span className="field-label">Celular:</span>
              <span className="field-value">{celularOTelefono}</span>
            </div>
            <div className="field-cell" style={{ width: "41%" }}>
              <span className="field-label">Facebook:</span>
              <span className="field-value" style={{ textTransform: "none" }}>{alumno.facebook || "—"}</span>
            </div>
            <div className="field-cell" style={{ width: "32%" }}>
              <span className="field-label">Correo:</span>
              <span className="field-value" style={{ textTransform: "none" }}>{alumno.correo || "—"}</span>
            </div>
          </div>

          <div className="field-row">
            <div className="field-cell" style={{ width: "50%" }}>
              <span className="field-label">Apoderado:</span>
              <span className="field-value">{alumno.apoderado_nombre || "—"}</span>
            </div>
            <div className="field-cell" style={{ width: "25%" }}>
              <span className="field-label">Parentesco:</span>
              <span className="field-value">{alumno.apoderado_parentesco || "—"}</span>
            </div>
            <div className="field-cell" style={{ width: "25%" }}>
              <span className="field-label">Cel. Apod:</span>
              <span className="field-value">{alumno.apoderado_celular || "—"}</span>
            </div>
          </div>
        </div>

        {/* Fila Dividida: Requisitos y Medio de Contacto */}
        <div className="split-section">
          {/* Requisitos */}
          <div className="split-col" style={{ width: "58%" }}>
            <div className="split-title">Requisitos</div>
            <div className="req-grid">
              <div className="req-item">
                <span>Copia de DNI:</span>
                <span className="check-box"></span>
              </div>
              <div className="req-item">
                <span>Certificado de estudios:</span>
                <span className="check-box"></span>
              </div>
              <div className="req-item">
                <span>3 fotos T. Carnet:</span>
                <span className="check-box"></span>
              </div>
              <div className="req-item">
                <span>Partida de Nacimiento:</span>
                <span className="check-box"></span>
              </div>
            </div>
          </div>

          {/* Medio de Contacto */}
          <div className="split-col" style={{ width: "42%" }}>
            <div className="split-title">Medio de Contacto</div>
            <div className="contact-box">
              {alumno.celular ? `Llamada/WhatsApp: ${alumno.celular}` : ""}
              {alumno.correo ? ` | Email: ${alumno.correo}` : ""}
            </div>
          </div>
        </div>

        {/* Sección: Inversión */}
        <div className="section-bar" style={{ marginBottom: 0 }}>INVERSIÓN</div>
        <div style={{ display: "flex", border: "1px solid #000", borderTop: "none", minHeight: "150px" }}>
          {/* Observaciones */}
          <div style={{ width: "35%", display: "flex", flexDirection: "column", borderRight: "1px solid #000" }}>
            <div style={{ fontWeight: 800, fontSize: 11, textAlign: "center", borderBottom: "1px solid #000", padding: "4px 0", background: "#f3f4f6" }}>
              Observaciones
            </div>
            <div style={{ padding: 8, fontSize: 11, flex: 1 }}>
            </div>
          </div>

          {/* Precio Real */}
          <div style={{ width: "32.5%", display: "flex", flexDirection: "column", borderRight: "1px solid #000" }}>
            <div style={{ fontWeight: 800, fontSize: 11, textAlign: "center", borderBottom: "1px solid #000", padding: "4px 0", background: "#f3f4f6" }}>
              Precio Real
            </div>
            <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
              <div style={{ display: "flex", borderBottom: "1px solid #000", flex: 1 }}>
                <div style={{ width: "50%", padding: "2px 8px", fontSize: 10, display: "flex", alignItems: "center", borderRight: "1px solid #000", fontWeight: 600 }}>Matrícula:</div>
                <div style={{ width: "50%", padding: "2px 8px", fontSize: 10, display: "flex", alignItems: "center" }}>
                  S/. {carreraData.matricula && <span className="field-value" style={{ marginLeft: 4 }}>{carreraData.matricula}</span>}
                </div>
              </div>
              <div style={{ display: "flex", borderBottom: "1px solid #000", flex: 1 }}>
                <div style={{ width: "50%", padding: "2px 8px", fontSize: 10, display: "flex", alignItems: "center", borderRight: "1px solid #000", fontWeight: 600 }}>Mensualidad:</div>
                <div style={{ width: "50%", padding: "2px 8px", fontSize: 10, display: "flex", alignItems: "center" }}>
                  S/. {carreraData.mensualidad && <span className="field-value" style={{ marginLeft: 4 }}>{carreraData.mensualidad}</span>}
                </div>
              </div>
              <div style={{ display: "flex", borderBottom: "1px solid #000", flex: 1 }}>
                <div style={{ width: "100%", padding: "2px 8px", fontSize: 10, display: "flex", alignItems: "center", fontWeight: 600 }}>A cuenta:</div>
              </div>
              <div style={{ display: "flex", borderBottom: "1px solid #000", flex: 1 }}>
                <div style={{ width: "100%", padding: "2px 8px", fontSize: 10, display: "flex", alignItems: "center", fontWeight: 600 }}>Saldo Pendiente:</div>
              </div>
              <div style={{ display: "flex", borderBottom: "1px solid #000", flex: 1 }}>
                <div style={{ width: "100%", padding: "2px 8px", fontSize: 10, display: "flex", alignItems: "center", fontWeight: 600 }}>Fecha de Vencimiento:</div>
              </div>
              <div style={{ display: "flex", flex: 1 }}>
                <div style={{ width: "100%", padding: "2px 8px", fontSize: 10, display: "flex", alignItems: "center", fontWeight: 600 }}>Fecha de inicio de Módulo:</div>
              </div>
            </div>
          </div>

          {/* Precio de Promoción */}
          <div style={{ width: "32.5%", display: "flex", flexDirection: "column" }}>
            <div style={{ fontWeight: 800, fontSize: 11, textAlign: "center", borderBottom: "1px solid #000", padding: "4px 0", background: "#f3f4f6" }}>
              Precio de Promoción
            </div>
            <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
              <div style={{ display: "flex", borderBottom: "1px solid #000", flex: 1 }}>
                <div style={{ width: "50%", padding: "2px 8px", fontSize: 10, display: "flex", alignItems: "center", borderRight: "1px solid #000", fontWeight: 600 }}>Matrícula: S/.</div>
                <div style={{ width: "50%", padding: "2px 8px", fontSize: 10, display: "flex", alignItems: "center", fontWeight: 600 }}>Boleta N°:</div>
              </div>
              <div style={{ display: "flex", borderBottom: "1px solid #000", flex: 1 }}>
                <div style={{ width: "50%", padding: "2px 8px", fontSize: 10, display: "flex", alignItems: "center", borderRight: "1px solid #000", fontWeight: 600 }}>Mensualidad: S/.</div>
                <div style={{ width: "50%", padding: "2px 8px", fontSize: 10, display: "flex", alignItems: "center", fontWeight: 600 }}>Boleta N°:</div>
              </div>
              <div style={{ display: "flex", borderBottom: "1px solid #000", flex: 1 }}>
                <div style={{ width: "100%", padding: "2px 8px", fontSize: 10, display: "flex", alignItems: "center", fontWeight: 600 }}>S/.</div>
              </div>
              <div style={{ display: "flex", borderBottom: "1px solid #000", flex: 1 }}>
                <div style={{ width: "100%", padding: "2px 8px", fontSize: 10, display: "flex", alignItems: "center", fontWeight: 600 }}>S/.</div>
              </div>
              <div style={{ display: "flex", borderBottom: "1px solid #000", flex: 1 }}>
                <div style={{ width: "100%", padding: "2px 8px", fontSize: 10, display: "flex", alignItems: "center" }}></div>
              </div>
              <div style={{ display: "flex", flex: 1 }}>
                <div style={{ width: "100%", padding: "2px 8px", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "#1d4ed8", fontWeight: "bold", textTransform: "uppercase" }}>

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Firmas */}
        <div className="signatures-section">
          <div className="signature-block">
            <div className="signature-line"></div>
            <div className="signature-label">Firma del Estudiante</div>
          </div>
          <div className="signature-block">
            <div className="signature-line"></div>
            <div className="signature-label">Firma del Ejecutivo de Ventas</div>
          </div>
          <div className="signature-block">
            <div className="signature-line"></div>
            <div className="signature-label">Firma de Control de Recepción</div>
          </div>
        </div>
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
