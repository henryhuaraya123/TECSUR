import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ── Singleton: evita múltiples instancias de GoTrueClient en el mismo contexto ──
// En Next.js con App Router + HMR, los módulos se re-ejecutan en desarrollo.
// Almacenar la instancia en globalThis garantiza que solo exista una.
declare global {
  // eslint-disable-next-line no-var
  var __supabaseClient: SupabaseClient | undefined
}

export const supabase: SupabaseClient =
  globalThis.__supabaseClient ??
  (globalThis.__supabaseClient = createClient(supabaseUrl, supabaseAnonKey))

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Carrera {
  id: string
  nombre: string
  descripcion?: string | null
  created_at: string
  updated_at?: string
  created_by?: string | null
  // from view v_carreras_resumen
  total_modulos?: number
  total_alumnos?: number
  total_matriculas?: number
}

export interface Docente {
  id: string
  nombres: string
  apellidos: string
  email: string
  dni?: string | null
  created_at?: string
  updated_at?: string
}

export interface Alumno {
  id: string
  dni: string
  codigo?: string | null
  nombres: string
  apellidos: string
  carrera: string            // legacy text field (kept for compatibility)
  // Datos personales
  fecha_nacimiento?: string | null
  nac_distrito?: string | null
  nac_provincia?: string | null
  nac_departamento?: string | null
  // Domicilio
  direccion?: string | null
  dir_distrito?: string | null
  dir_referencia?: string | null
  // Contacto
  telefono?: string | null
  celular?: string | null
  correo?: string | null
  facebook?: string | null
  // Colegio
  colegio?: string | null
  colegio_distrito?: string | null
  // Apoderado
  apoderado_nombre?: string | null
  apoderado_parentesco?: string | null
  apoderado_celular?: string | null
}

export interface Modulo {
  id: string
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  modalidad: 'presencial' | 'virtual' | 'semipresencial'
  duracion?: string | null   // duracion
  carrera_id?: string | null
  profesor?: string | null
  local?: string | null
  aula?: string | null
  horario?: string | null
  created_at?: string
  updated_at?: string
  created_by?: string | null
  // relations
  carreras?: Carrera | null
  cursos?: Curso[]
}

export interface Curso {
  id: string
  modulo_id: string
  nombre: string
  descripcion?: string | null
  orden: number
  creditos?: number
  docente_id?: string | null
  created_at?: string
  created_by?: string | null
  // relations
  modulos?: Pick<Modulo, 'id' | 'nombre'> | null
  docentes?: Docente | null
}

export interface Matricula {
  id: string
  alumno_id: string
  modulo_id: string
  carrera_id?: string | null
  turno: 'mañana' | 'tarde' | 'noche' | 'sabado_am' | 'sabado_full' | 'domingo_am' | 'domingo_full'
  fecha_registro: string
  created_at?: string
  created_by?: string | null
  // relations
  alumnos?: Alumno
  modulos?: Modulo
  carreras?: Carrera | null
}

export interface Asistencia {
  id: string
  matricula_id: string
  modulo_id: string
  fecha: string
  estado: 'presente' | 'tardanza' | 'falta' | 'justificado'
  hora_entrada?: string | null
  hora_salida?: string | null
  duracion_min?: number | null
  observacion?: string | null
  created_at?: string
  // relations
  matriculas?: Matricula
  modulos?: Pick<Modulo, 'id' | 'nombre'>
}

export interface NotaCurso {
  id: string
  matricula_id: string
  curso_id: string
  nota?: number | null          // 0–20 escala vigesimal
  observacion?: string | null
  created_at?: string
  updated_at?: string
  // relations
  cursos?: Curso
  matriculas?: Matricula
}

/** Legacy: tabla notas (columnas fijas) */
export interface Nota {
  id: string
  matricula_id: string
  inspeccion: number | null
  mantenimiento: number | null
  sistema_hidraulico: number | null
  seguridad: number | null
  ingles: number | null
  operacion: number | null
  promedio: number | null
  asistencia_total: number | null
}

export interface Pension {
  id: string
  alumno_id: string
  modulo_id: string
  nro_recibo: string
  monto_pagado: number
  deuda_pendiente: number
  fecha_pago: string
  alumnos?: Alumno
  modulos?: Modulo
}

export interface Ingreso {
  id: string
  dni_alumno: string
  fecha_ingreso: string
  hora_ingreso: string
  created_at: string
  alumnos?: Pick<Alumno, 'nombres' | 'apellidos' | 'carrera'>
}

/** Turnos con su descripción horaria */
export const TURNOS_LABELS: Record<string, string> = {
  'mañana': 'Mañana (08:00 – 12:00)',
  'tarde': 'Tarde (13:00 – 17:00)',
  'noche': 'Noche (17:00 – 20:30)',
  'sabado_am': 'Sábado AM (08:00 – 13:00)',
  'sabado_full': 'Sábado Full (08:00 – 17:00)',
  'domingo_am': 'Domingo AM (08:00 – 13:00)',
  'domingo_full': 'Domingo Full (08:00 – 17:00)',
}
