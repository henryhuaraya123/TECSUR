import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/modulos?carrera_id=xxx — lista módulos (filtrables por carrera o docente)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const carreraId = searchParams.get("carrera_id");
  const docenteId = searchParams.get("docente_id");

  let selectQuery = `
    *,
    carreras (id, nombre),
    cursos (id, nombre, orden, docente_id)
  `;

  if (docenteId) {
    selectQuery = `
      *,
      carreras (id, nombre),
      cursos!inner (id, nombre, orden, docente_id)
    `;
  }

  let query = supabase
    .from("modulos")
    .select(selectQuery)
    .order("created_at", { ascending: false });

  if (carreraId) query = query.eq("carrera_id", carreraId);
  if (docenteId) query = query.eq("cursos.docente_id", docenteId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

// POST /api/modulos — crear módulo
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    nombre, fecha_inicio, fecha_fin, modalidad, duracion,
    carrera_id, profesor, local, aula, horario, turno
  } = body;

  if (!nombre || !fecha_inicio || !fecha_fin || !modalidad) {
    return Response.json({ error: "nombre, fecha_inicio, fecha_fin y modalidad son requeridos" }, { status: 400 });
  }

  const modalidadesValidas = ["presencial", "virtual", "semipresencial"];
  if (!modalidadesValidas.includes(modalidad)) {
    return Response.json({ error: `modalidad debe ser: ${modalidadesValidas.join(", ")}` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("modulos")
    .insert([{
      nombre,
      fecha_inicio,
      fecha_fin,
      modalidad,
      duracion: duracion || null,
      carrera_id: carrera_id || null,
      profesor: profesor || null,
      local: local || null,
      aula: aula || null,
      horario: horario || null,
      turno: turno || "mañana",
    }])
    .select(`*, carreras(id, nombre)`)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
