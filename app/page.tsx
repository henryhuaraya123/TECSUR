"use client";

import { useState, useEffect } from "react";
import {
  Search,
  GraduationCap,
  CreditCard,
  BookOpen,
  Menu,
  X,
  ChevronRight,
  LogOut,
  ScanLine,
  Users,
  Loader2,
  Key,
  ShieldUser
} from "lucide-react";
import Image from "next/image";
import Modal from "@/components/Modal";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import ConsultaAdminView from "@/components/ConsultaAdminView";
import DocentesView from "@/components/DocentesView";
import PensionesView from "@/components/PensionesView";
import AlumnosView from "@/components/AlumnosView";
import ModulosView from "@/components/ModulosView";
import IngresoView from "@/components/IngresoView";
import CarrerasView from "@/components/CarrerasView";
import GestionDocentesView from "@/components/GestionDocentesView";

// ── Paleta TECSUR ─────────────────────────────────────────────
// Azul acero   : #2a6db5
// Cyan metálico: #4ab3d8
// Azul profundo: #1a4a7a
// Fondo oscuro : #060d18
// -------------------------------------------------------------

type View = "consulta" | "docentes" | "pensiones" | "alumnos" | "modulos" | "ingreso" | "carreras" | "gestion-docentes";

interface NavItem {
  id: View;
  label: string;
  icon: any;
  description: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "CONTROL DE INGRESO DE ESTUDIANTES",
    items: [
      { id: "ingreso", label: "CONTROL DE INGRESO", icon: ScanLine, description: "Asistencia por DNI" },
    ],
  },
  {
    title: "CONTROL Y EVALUACIÓN ACADÉMICA",
    items: [
      { id: "carreras", label: "PLAN DE ESTUDIOS", icon: GraduationCap, description: "Gestión de carreras y modulos" },
      { id: "gestion-docentes", label: "DOCENTES", icon: ShieldUser, description: "Crear y gestionar cuentas de los docentes" },
      { id: "alumnos", label: "ALUMNOS", icon: Users, description: "Registro y matrícula" },
      { id: "docentes", label: "REGISTRO DE ASISTENCIA Y NOTAS", icon: BookOpen, description: "Notas y asistencias" },
    ],
  },
  {
    title: "ADMINISTRACIÓN Y FINANZAS",
    items: [
      { id: "pensiones", label: "PENSIONES Y PAGOS", icon: CreditCard, description: "Gestión de pagos y recibos" },
      { id: "consulta", label: "CONSULTA DE ALUMNOS", icon: Search, description: "Búsqueda DNI e historial" },
    ],
  },
];

const navItems: NavItem[] = navGroups.flatMap(g => g.items);

export default function HomePage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<View>("ingreso");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hovered, setHovered] = useState<View | null>(null);

  const [userRole, setUserRole] = useState<"admin" | "docente" | null>(null);
  const [docenteId, setDocenteId] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  // Cambio de contraseña
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Contraseña actualizada exitosamente");
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar la contraseña");
    } finally {
      setUpdatingPassword(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace("/login"); return; }
      const email = (data.session.user?.email ?? "").toLowerCase().trim();
      const userId = data.session.user.id;
      setUserEmail(email);

      // ── 1. Verificar si es administrador ──────────────────────────────────
      const { data: adminData, error: adminError } = await supabase
        .from("administradores")
        .select("id")
        .or(`email.eq.${email},id.eq.${userId}`)
        .maybeSingle();

      if (adminError) {
        console.error("[auth] Error consultando administradores:", adminError.message, adminError.code);
      }

      if (adminData) {
        setUserRole("admin");
        setActiveView("ingreso");
        setLoadingRole(false);
        return;
      }

      // ── 2. Verificar si es docente ─────────────────────────────────────────
      const { data: docData, error: docError } = await supabase
        .from("docentes")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (docError) {
        console.error("[auth] Error consultando docentes:", docError.message, docError.code);
      }

      if (docData) {
        setUserRole("docente");
        setDocenteId(userId);
        setActiveView("docentes");
        setLoadingRole(false);
        return;
      }

      // ── 3. Ningún perfil encontrado ────────────────────────────────────────
      // Solo expulsar si NO hubo errores técnicos (para no expulsar por fallo de RLS)
      if (!adminError && !docError) {
        toast.error("Acceso denegado. Perfil de usuario no autorizado.");
        await supabase.auth.signOut();
        setTimeout(() => { window.location.href = "/login"; }, 1000);
      } else {
        // Error de consulta: no cerrar sesión, mostrar aviso
        toast.error(
          "No se pudo verificar el perfil. Verifica tu conexión o contacta al administrador.",
          { duration: 6000 }
        );
        setLoadingRole(false);
      }
    });
  }, [router]);

  // Cierre de sesión por inactividad (10 minutos)
  useEffect(() => {
    if (loadingRole || !userRole) return;

    let timeoutId: NodeJS.Timeout;
    const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutos

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        toast.warning("Sesión cerrada por inactividad.");
        await supabase.auth.signOut();
        setTimeout(() => { window.location.href = "/login"; }, 1000);
      }, INACTIVITY_LIMIT);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [loadingRole, userRole]);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada correctamente");
    setTimeout(() => { window.location.href = "/login"; }, 800);
  }

  // Filtrar grupos de navegación basados en el rol
  const filteredNavGroups = navGroups.map(group => {
    const items = group.items.filter(item => {
      if (userRole === "docente") {
        return item.id === "docentes";
      }
      return true;
    });
    return { ...group, items };
  }).filter(group => group.items.length > 0);

  const filteredNavItems = filteredNavGroups.flatMap(g => g.items);
  const currentItem = filteredNavItems.find((n) => n.id === activeView) || filteredNavItems[0] || navItems[0];
  const Icon = currentItem.icon;

  if (loadingRole) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#060d18", color: "#4ab3d8", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
        <Loader2 className="animate-spin" style={{ marginRight: 8 }} size={18} /> Cargando sistema...
      </div>
    );
  }

  // Initials from email
  const initials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : "AD";

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#060d18", fontFamily: "'DM Sans', sans-serif" }}
    >
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#0e1f38",
            color: "#e0eaf8",
            border: "1px solid rgba(42,109,181,0.35)",
            borderRadius: "10px",
            fontSize: "13px",
          },
        }}
      />

      {/* ── Estilos globales ─────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes sidebarIn {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes barShift {
          0%   { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(74,179,216,0.4); }
          50%       { box-shadow: 0 0 0 5px rgba(74,179,216,0); }
        }
        @keyframes shimmer {
          0%        { transform: translateX(-100%); }
          50%, 100% { transform: translateX(150%); }
        }

        /* ── nav items ── */
        .ts-nav-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          text-align: left;
          transition: background .2s, border-color .2s, transform .15s;
          overflow: hidden;
        }
        .ts-nav-item:hover {
          background: rgba(42,109,181,0.1);
          border-color: rgba(42,109,181,0.18);
          transform: translateX(2px);
        }
        .ts-nav-item.active {
          background: rgba(42,109,181,0.15);
          border-color: rgba(74,179,216,0.3);
        }
        .ts-nav-item .shimmer-layer {
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(74,179,216,0.08) 50%, transparent 100%);
          transform: translateX(-100%);
          pointer-events: none;
        }
        .ts-nav-item.active .shimmer-layer {
          animation: shimmer 2.8s ease-in-out infinite;
        }

        /* ── sidebar accent bar ── */
        .ts-active-bar {
          position: absolute;
          left: 0; top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          border-radius: 0 3px 3px 0;
          background: linear-gradient(180deg, #4ab3d8, #2a6db5);
          transition: height .2s, opacity .2s;
        }

        /* ── scrollbar ── */
        .ts-scroll::-webkit-scrollbar { width: 4px; }
        .ts-scroll::-webkit-scrollbar-track { background: transparent; }
        .ts-scroll::-webkit-scrollbar-thumb {
          background: rgba(42,109,181,0.25);
          border-radius: 4px;
        }

        /* ── main fade ── */
        .ts-view-fade {
          animation: fadeUp .35s cubic-bezier(.16,1,.3,1) both;
        }

        /* ── logout btn ── */
        .ts-logout {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 10px 12px;
          border-radius: 10px; border: 1px solid transparent;
          background: transparent; cursor: pointer; text-align: left;
          transition: background .2s, border-color .2s;
          color: #f87171; font-size: 13px; font-family: inherit;
        }
        .ts-logout:hover {
          background: rgba(248,113,113,0.08);
          border-color: rgba(248,113,113,0.2);
        }
      `}</style>

      {/* ════════════════════════════════════════════════════════
          SIDEBAR
      ════════════════════════════════════════════════════════ */}
      <aside
        style={{
          width: sidebarOpen ? 268 : 0,
          minWidth: sidebarOpen ? 268 : 0,
          transition: "width .3s cubic-bezier(.4,0,.2,1), min-width .3s cubic-bezier(.4,0,.2,1)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: "rgba(8,16,34,0.97)",
          borderRight: "1px solid rgba(42,109,181,0.18)",
          backdropFilter: "blur(20px)",
          position: "relative",
          zIndex: 20,
        }}
      >
        {/* barra superior animada */}
        <div style={{
          height: 3,
          background: "linear-gradient(90deg, #1a4a7a, #2a6db5, #4ab3d8, #2a6db5, #1a4a7a)",
          backgroundSize: "200% 100%",
          animation: "barShift 3s linear infinite",
          flexShrink: 0,
        }} />

        {/* ── Logo ── */}
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid rgba(42,109,181,0.12)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Image
              src="/img/white.png"
              alt="TECSUR"
              width={148}
              height={56}
              style={{
                objectFit: "contain",
                filter: "drop-shadow(0 2px 12px rgba(42,109,181,0.4))",
              }}
              priority
            />
          </div>
        </div>

        {/* ── User pill ── */}
        <div style={{ padding: "14px 16px 8px", flexShrink: 0 }}>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(42,109,181,0.1)",
              border: "1px solid rgba(42,109,181,0.2)",
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg, #1a4a7a 0%, #4ab3d8 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: "#fff",
              flexShrink: 0,
              boxShadow: "0 0 0 2px rgba(74,179,216,0.25)",
              fontFamily: "'Syne', sans-serif",
            }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 600,
                color: "#dbeafe",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {userRole === "admin" ? "Administrador" : "Docente"}
              </div>
              <div style={{
                fontSize: 11,
                color: "rgba(74,179,216,0.7)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {userEmail ?? ""}
              </div>
            </div>
            {/* online dot */}
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "#4ab3d8",
              marginLeft: "auto", flexShrink: 0,
              animation: "pulse-dot 2s ease-in-out infinite",
            }} />
          </div>
        </div>

        {/* Separadores dinámicos por grupo en el Nav */}

        {/* ── Navigation ── */}
        <nav
          className="ts-scroll"
          style={{ flex: 1, padding: "4px 12px", overflowY: "auto" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredNavGroups.map((group, groupIdx) => (
              <div key={group.title} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{
                  padding: "4px 8px",
                  display: "flex", alignItems: "center", gap: 8,
                  marginTop: groupIdx > 0 ? 8 : 4,
                }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(42,109,181,0.15)" }} />
                  <span style={{
                    fontSize: 9, fontWeight: 600,
                    color: "rgba(74,179,216,0.45)",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                  }}>
                    {group.title}
                  </span>
                  <div style={{ flex: 1, height: 1, background: "rgba(42,109,181,0.15)" }} />
                </div>

                {group.items.map((item, i) => {
                  const NavIcon = item.icon;
                  const isActive = activeView === item.id;
                  const isHovered = hovered === item.id;

                  return (
                    <button
                      key={item.id}
                      className={`ts-nav-item${isActive ? " active" : ""}`}
                      onClick={() => setActiveView(item.id)}
                      onMouseEnter={() => setHovered(item.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        animationName: "sidebarIn",
                        animationDuration: ".4s",
                        animationTimingFunction: "cubic-bezier(.16,1,.3,1)",
                        animationFillMode: "both",
                        animationDelay: `${(groupIdx * 3 + i) * 0.05}s`,
                      }}
                    >
                      {/* shimmer en item activo */}
                      <span className="shimmer-layer" />

                      {/* barra lateral activa */}
                      {isActive && <span className="ts-active-bar" />}

                      {/* ícono con fondo */}
                      <div style={{
                        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isActive
                          ? "linear-gradient(135deg, #1a4a7a 0%, #2a6db5 100%)"
                          : isHovered
                            ? "rgba(42,109,181,0.18)"
                            : "rgba(42,109,181,0.08)",
                        border: isActive
                          ? "1px solid rgba(74,179,216,0.35)"
                          : "1px solid rgba(42,109,181,0.12)",
                        transition: "background .2s, border-color .2s",
                        boxShadow: isActive ? "0 2px 10px rgba(42,109,181,0.35)" : "none",
                      }}>
                        <NavIcon
                          size={16}
                          style={{
                            color: isActive ? "#4ab3d8" : isHovered ? "#7cc8e8" : "rgba(120,160,210,0.7)",
                            transition: "color .2s",
                          }}
                        />
                      </div>

                      {/* texto */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: isActive ? 600 : 500,
                          color: isActive ? "#dbeafe" : "rgba(180,210,240,0.8)",
                          transition: "color .2s",
                          lineHeight: 1.3,
                        }}>
                          {item.label}
                        </div>
                        <div style={{
                          fontSize: 11,
                          color: isActive ? "rgba(74,179,216,0.65)" : "rgba(100,140,190,0.5)",
                          transition: "color .2s",
                          marginTop: 1,
                        }}>
                          {item.description}
                        </div>
                      </div>

                      {/* chevron */}
                      <ChevronRight
                        size={13}
                        style={{
                          color: isActive ? "rgba(74,179,216,0.7)" : "transparent",
                          transition: "color .2s, transform .2s",
                          transform: isActive ? "translateX(0)" : "translateX(-4px)",
                          flexShrink: 0,
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </nav>

        {/* ── Footer del sidebar ── */}
        <div style={{
          padding: "12px 12px 16px",
          borderTop: "1px solid rgba(42,109,181,0.12)",
          flexShrink: 0,
        }}>
          <button
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "10px 12px",
              borderRadius: 10, border: "1px solid transparent",
              background: "transparent", cursor: "pointer", textAlign: "left",
              transition: "background .2s, border-color .2s",
              color: "rgba(120,160,210,0.85)", fontSize: 13, fontFamily: "inherit",
              marginBottom: 6
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(42,109,181,0.08)";
              e.currentTarget.style.borderColor = "rgba(42,109,181,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "transparent";
            }}
            onClick={() => setShowPasswordModal(true)}
          >
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(42,109,181,0.08)",
              border: "1px solid rgba(42,109,181,0.15)",
            }}>
              <Key size={14} style={{ color: "#4ab3d8" }} />
            </div>
            <span style={{ fontWeight: 500 }}>Cambiar Contraseña</span>
          </button>

          <button className="ts-logout" onClick={handleLogout}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.15)",
            }}>
              <LogOut size={14} style={{ color: "#f87171" }} />
            </div>
            <span style={{ fontWeight: 500 }}>Cerrar Sesión</span>
          </button>

          <div style={{
            marginTop: 10, textAlign: "center",
            fontSize: 10,
            color: "rgba(42,109,181,0.35)",
            letterSpacing: "0.04em",
          }}>
            TECSUR © {new Date().getFullYear()} · Maquinaria Pesada
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Header ── */}
        <header style={{
          display: "flex", alignItems: "center", gap: 16,
          padding: "0 28px",
          minHeight: 62,
          background: "rgba(8,16,34,0.95)",
          borderBottom: "1px solid rgba(42,109,181,0.15)",
          backdropFilter: "blur(16px)",
          flexShrink: 0,
        }}>
          {/* Toggle sidebar */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
            style={{
              width: 36, height: 36,
              borderRadius: 9,
              background: "rgba(42,109,181,0.1)",
              border: "1px solid rgba(42,109,181,0.2)",
              color: "rgba(74,179,216,0.8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              transition: "background .2s, border-color .2s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(42,109,181,0.2)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(74,179,216,0.4)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(42,109,181,0.1)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(42,109,181,0.2)";
            }}
          >
            {sidebarOpen ? <X size={17} /> : <Menu size={17} />}
          </button>

          {/* Breadcrumb / título */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #1a4a7a 0%, #2a6db5 100%)",
              border: "1px solid rgba(74,179,216,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 10px rgba(42,109,181,0.3)",
            }}>
              <Icon size={15} style={{ color: "#4ab3d8" }} />
            </div>
            <div>
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: "#dbeafe",
                fontFamily: "'Syne', sans-serif",
                lineHeight: 1.2,
              }}>
                {currentItem.label}
              </div>
              <div style={{ fontSize: 11, color: "rgba(74,179,216,0.6)" }}>
                {currentItem.description}
              </div>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* Estado del sistema */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px",
            borderRadius: 20,
            background: "rgba(74,179,216,0.08)",
            border: "1px solid rgba(74,179,216,0.18)",
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#4ab3d8",
              animation: "pulse-dot 2s ease-in-out infinite",
            }} />
            <span style={{ fontSize: 11, color: "rgba(74,179,216,0.8)", fontWeight: 500 }}>
              Sistema en línea
            </span>
          </div>
        </header>

        {/* ── Page content ── */}
        <main
          className="ts-scroll"
          style={{
            flex: 1, overflowY: "auto",
            background: "#060d18",
            padding: "32px 32px 48px",
          }}
        >
          <div className="ts-view-fade" key={activeView}>
            {activeView === "consulta" && <ConsultaAdminView />}
            {activeView === "docentes" && <DocentesView docenteId={docenteId} />}
            {activeView === "pensiones" && <PensionesView />}
            {activeView === "alumnos" && <AlumnosView />}
            {activeView === "modulos" && <ModulosView onNavigate={(view) => setActiveView(view as any)} />}
            {activeView === "ingreso" && <IngresoView />}
            {activeView === "carreras" && <CarrerasView />}
            {activeView === "gestion-docentes" && <GestionDocentesView />}
          </div>
        </main>
      </div>

      {/* Modal: Cambiar Contraseña */}
      <Modal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Cambiar Contraseña" maxWidth="400px">
        <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(74,179,216,0.75)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Nueva Contraseña *</label>
            <input
              type="password"
              style={{ width: "100%", height: 44, boxSizing: "border-box", background: "rgba(10,22,44,0.7)", border: "1px solid rgba(42,109,181,0.22)", borderRadius: 10, padding: "0 14px", color: "#dbeafe", fontSize: 13, outline: "none" }}
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(74,179,216,0.75)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Confirmar Nueva Contraseña *</label>
            <input
              type="password"
              style={{ width: "100%", height: 44, boxSizing: "border-box", background: "rgba(10,22,44,0.7)", border: "1px solid rgba(42,109,181,0.22)", borderRadius: 10, padding: "0 14px", color: "#dbeafe", fontSize: 13, outline: "none" }}
              placeholder="Repita la nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
            <button type="button" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 10, background: "rgba(42,109,181,0.1)", border: "1px solid rgba(42,109,181,0.22)", color: "rgba(120,160,210,0.85)", fontSize: 13, fontWeight: 500, cursor: "pointer" }} onClick={() => setShowPasswordModal(false)}>
              Cancelar
            </button>
            <button type="submit" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #1a4a7a 0%, #2a6db5 55%, #4ab3d8 100%)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 15px rgba(42,109,181,0.25)" }} disabled={updatingPassword}>
              {updatingPassword ? "Actualizando..." : "Actualizar Contraseña"}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}