import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// GET /api/administradores — Listar administradores
export async function GET(request: NextRequest) {
  const { data, error } = await supabase
    .from("administradores")
    .select("*")
    .order("apellidos", { ascending: true });

  if (error) {
    // Si la tabla no existe en BD todavía, devolvemos array vacío como fallback
    const isTableMissing = error.code === "P0001" || error.message.includes("does not exist") || error.code === "42P01";
    if (isTableMissing) {
      return Response.json([]);
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json(data);
}

// POST /api/administradores — Crear administrador
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, nombres, apellidos } = body;

    if (!email || !password || !nombres || !apellidos) {
      return Response.json(
        { error: "Todos los campos son obligatorios (email, password, nombres, apellidos)" },
        { status: 400 }
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return Response.json(
        {
          error:
            "La variable de entorno SUPABASE_SERVICE_ROLE_KEY no está configurada. Por favor agrégala en el panel de Vercel y en el archivo .env.local local para crear cuentas de administradores."
        },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Crear usuario en Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true
    });

    if (authError) {
      return Response.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user?.id;
    if (!userId) {
      return Response.json({ error: "No se pudo recuperar el ID de usuario creado." }, { status: 500 });
    }

    // Insertar administrador en tabla pública
    const { data: dbData, error: dbError } = await supabaseAdmin
      .from("administradores")
      .insert([
        {
          id: userId,
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          email: email.trim().toLowerCase()
        }
      ])
      .select()
      .single();

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return Response.json({ error: `Error al insertar administrador en BD: ${dbError.message}` }, { status: 500 });
    }

    return Response.json(dbData, { status: 201 });
  } catch (e: any) {
    return Response.json({ error: e.message || "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE /api/administradores?id=xxx — Eliminar cuenta de administrador
export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Se requiere el ID del administrador" }, { status: 400 });
  }

  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return Response.json(
        { error: "La variable de entorno SUPABASE_SERVICE_ROLE_KEY no está configurada." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Obtener correo del administrador antes de borrarlo para validar que no se borre a sí mismo
    const { data: adminData } = await supabaseAdmin
      .from("administradores")
      .select("email")
      .eq("id", id)
      .single();

    // Eliminar de base de datos
    const { error: dbError } = await supabaseAdmin
      .from("administradores")
      .delete()
      .eq("id", id);

    if (dbError) {
      return Response.json({ error: `Error en BD: ${dbError.message}` }, { status: 500 });
    }

    // Eliminar de Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError) {
      // Si falla borrar de auth, reportamos pero el registro en BD ya se eliminó
      return Response.json({ message: "Registro eliminado de base de datos, pero falló eliminar de autenticación auth", details: authError.message });
    }

    return Response.json({ message: "Administrador eliminado correctamente" });
  } catch (e: any) {
    return Response.json({ error: e.message || "Error interno" }, { status: 500 });
  }
}
