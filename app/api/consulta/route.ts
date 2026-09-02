import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

// Patrón para código de alumno (alfanumérico, 4-20 caracteres)
const CODIGO_PATTERN = /^[A-Za-z0-9\-]{4,20}$/;
// Patrón estricto para DNI peruano (exactamente 8 dígitos)
const DNI_PATTERN = /^\d{8}$/;

/**
 * GET /api/consulta?codigo=xxx  ó  /api/consulta?dni=12345678
 *
 * Este endpoint es una API Route de Next.js — se ejecuta en el SERVIDOR,
 * nunca en el browser. Puede hacer consultas directas a Supabase de forma segura.
 *
 * La página pública /consulta llama a este endpoint (no a Supabase directamente),
 * por lo que la estructura de las tablas nunca se expone al cliente anónimo.
 */
export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get("codigo")?.trim() ?? "";
  const dni = request.nextUrl.searchParams.get("dni")?.trim() ?? "";

  const val = (codigo || dni).trim();

  if (!val) {
    return Response.json({ error: "Se requiere código o DNI del alumno." }, { status: 400 });
  }

  // ── Validación / sanitización del input ──────────────────────────────────
  const esDNI = DNI_PATTERN.test(val);
  const esCodigo = CODIGO_PATTERN.test(val);

  if (!esDNI && !esCodigo) {
    return Response.json(
      { error: "El identificador no es válido. Use un DNI de 8 dígitos o su código de alumno." },
      { status: 400 }
    );
  }

  // ── 1. Buscar alumno ──────────────────────────────────────────────────────
  const { data: alumno, error: alumnoError } = await supabase
    .from("alumnos")
    .select("*")
    .or(`codigo.eq.${val},dni.eq.${val}`)
    .maybeSingle();

  if (alumnoError) {
    console.error("[consulta] alumno error:", alumnoError.message);
    return Response.json({ error: "Error al consultar alumno." }, { status: 500 });
  }
  if (!alumno) {
    return Response.json({ error: "Alumno no encontrado." }, { status: 404 });
  }

  // ── 2. Matrículas con módulos ─────────────────────────────────────────────
  const { data: matriculas, error: matriculasError } = await supabase
    .from("matriculas")
    .select(`id, fecha_registro, modulo_id, modulos(id, nombre, fecha_inicio, fecha_fin, modalidad, duracion)`)
    .eq("alumno_id", alumno.id);

  if (matriculasError) {
    return Response.json({ error: "Error al obtener matrículas." }, { status: 500 });
  }

  const matriculaIds = (matriculas ?? []).map(m => m.id);
  const moduloIds = (matriculas ?? []).map((m: any) => m.modulo_id).filter(Boolean);

  let cursosData: any[] = [];
  let notas_cursos: any[] = [];
  let asistencias: any[] = [];

  if (matriculaIds.length > 0) {
    const [cRes, nRes, aRes] = await Promise.all([
      supabase.from("cursos").select("id, nombre, orden, modulo_id").in("modulo_id", moduloIds),
      supabase.from("notas_cursos").select("id, matricula_id, curso_id, nota, cursos(id, nombre, orden)").in("matricula_id", matriculaIds),
      supabase.from("asistencias").select("id, matricula_id, estado").in("matricula_id", matriculaIds),
    ]);
    cursosData = cRes.data ?? [];
    notas_cursos = nRes.data ?? [];
    asistencias = aRes.data ?? [];
  }

  // ── 3. Pensiones ─────────────────────────────────────────────────────────
  const { data: pensiones } = await supabase
    .from("pensiones")
    .select("*, modulos(nombre)")
    .eq("alumno_id", alumno.id);

  // ── 4. Composición de respuesta ───────────────────────────────────────────
  const modulosConNotas = (matriculas ?? []).map((mat: any) => {
    const notasMod = notas_cursos.filter(n => n.matricula_id === mat.id);
    const asistMod = asistencias.filter(a => a.matricula_id === mat.id);
    const cursosMod = cursosData.filter(c => c.modulo_id === mat.modulo_id);

    const notas_cursosMapped = cursosMod
      .map(c => {
        const notaObj = notasMod.find(n => n.curso_id === c.id);
        return { curso_id: c.id, nota: notaObj?.nota ?? null, cursos: { nombre: c.nombre } };
      })
      .sort((a, b) => {
        const oA = cursosMod.find(c => c.id === a.curso_id)?.orden ?? 99;
        const oB = cursosMod.find(c => c.id === b.curso_id)?.orden ?? 99;
        return oA - oB;
      });

    const total = asistMod.length;
    const presentes = asistMod.filter(a => ["presente", "tardanza", "justificado"].includes(a.estado)).length;
    const asistencia_total = total > 0 ? Math.round((presentes / total) * 100) : null;

    return {
      matricula_id: mat.id,
      fecha_registro: mat.fecha_registro,
      modulo: mat.modulos,
      notas_cursos: notas_cursosMapped,
      asistencia_total,
    };
  });

  return Response.json({
    alumno,
    modulos: modulosConNotas,
    pensiones: pensiones ?? [],
  });
}
