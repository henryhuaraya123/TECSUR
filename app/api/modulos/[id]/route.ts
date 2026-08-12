import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { data, error } = await supabase
    .from("modulos")
    .select(`*, carreras(id,nombre), cursos(id,nombre,orden)`)
    .eq("id", id)
    .single();
  if (error) return Response.json({ error: error.message }, { status: 404 });
  return Response.json(data);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const { nombre, fecha_inicio, fecha_fin, modalidad, duracion, carrera_id, profesor, local, aula, horario, turno } = body;

  const modalidadesValidas = ["presencial", "virtual", "semipresencial"];
  if (modalidad && !modalidadesValidas.includes(modalidad)) {
    return Response.json({ error: `modalidad inválida` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("modulos")
    .update({
      nombre, fecha_inicio, fecha_fin, modalidad,
      duracion: duracion !== undefined ? (duracion || null) : undefined,
      carrera_id: carrera_id || null,
      profesor: profesor || null,
      local: local || null,
      aula: aula || null,
      horario: horario || null,
      turno: turno || "mañana",
    })
    .eq("id", id)
    .select(`*, carreras(id,nombre)`)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error } = await supabase.from("modulos").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
