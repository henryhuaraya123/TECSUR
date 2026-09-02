"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Mail, Lock, LogIn, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { toast, Toaster } from "sonner";

// ── Paleta extraída del logo TECSUR ──────────────────────────
// Azul acero principal : #2a6db5
// Cyan metálico claro  : #4ab3d8
// Azul oscuro profundo : #1a4a7a
// Fondo oscuro         : #060d18
// -------------------------------------------------------------

// ── Constantes de rate limiting ──────────────────────────────
const MAX_INTENTOS = 3;
const COOLDOWN_SEGUNDOS = 60;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Rate limiting: contador de intentos fallidos y cooldown
  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const [cooldownRestante, setCooldownRestante] = useState(0);
  const cooldownRef = React.useRef<NodeJS.Timeout | null>(null);

  // Activar cooldown cuando se alcanzan MAX_INTENTOS
  function activarCooldown() {
    let segundos = COOLDOWN_SEGUNDOS;
    setCooldownRestante(segundos);
    cooldownRef.current = setInterval(() => {
      segundos -= 1;
      setCooldownRestante(segundos);
      if (segundos <= 0) {
        clearInterval(cooldownRef.current!);
        setCooldownRestante(0);
        setIntentosFallidos(0);
      }
    }, 1000);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (cooldownRestante > 0) return;
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setLoading(false);
      const nuevoConteo = intentosFallidos + 1;
      setIntentosFallidos(nuevoConteo);

      // Manejar bloqueo de Supabase (HTTP 429)
      if ((authError as any).status === 429 || authError.message?.toLowerCase().includes("rate limit")) {
        toast.error(
          "Demasiados intentos fallidos. Por seguridad, su acceso ha sido bloqueado temporalmente. Intente nuevamente en unos minutos.",
          { duration: 8000 }
        );
        activarCooldown();
        return;
      }

      // Cooldown local luego de 3 intentos fallidos consecutivos
      if (nuevoConteo >= MAX_INTENTOS) {
        activarCooldown();
      }

      // Mensaje genérico — NUNCA revela si el correo existe o no
      toast.error(
        "Credenciales de acceso incorrectas o cuenta no autorizada.",
        { duration: 4000 }
      );
      return;
    }

    toast.success("Acceso concedido. Redirigiendo…", { duration: 1500 });
    setTimeout(() => {
      window.location.href = "/";
    }, 800);
  }

  return (
    <>
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

      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{ background: "#060d18" }}
      >
        {/* ── Fondo animado ─────────────────────────────────────── */}
        <div className="absolute inset-0 pointer-events-none">
          {/* cuadrícula en azul acero muy tenue */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(42,109,181,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(42,109,181,0.08) 1px, transparent 1px)",
              backgroundSize: "36px 36px",
              animation: "gridPan 20s linear infinite",
            }}
          />
          {/* orbe azul acero — esquina superior izquierda */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 380, height: 380,
              top: -100, left: -80,
              background: "radial-gradient(circle, rgba(42,109,181,0.28) 0%, transparent 70%)",
              filter: "blur(72px)",
              animation: "orbFloat 9s ease-in-out infinite alternate",
            }}
          />
          {/* orbe cyan metálico — esquina inferior derecha */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 300, height: 300,
              bottom: -70, right: -50,
              background: "radial-gradient(circle, rgba(74,179,216,0.22) 0%, transparent 70%)",
              filter: "blur(72px)",
              animationName: "orbFloat",
              animationDuration: "11s",
              animationTimingFunction: "ease-in-out",
              animationIterationCount: "infinite",
              animationDirection: "alternate",
              animationDelay: "-3s",
            }}
          />
          {/* orbe azul profundo — centro difuso */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 220, height: 220,
              top: "55%", left: "50%",
              transform: "translate(-50%,-50%)",
              background: "radial-gradient(circle, rgba(26,74,122,0.18) 0%, transparent 70%)",
              filter: "blur(60px)",
              animationName: "orbFloat",
              animationDuration: "7s",
              animationTimingFunction: "ease-in-out",
              animationIterationCount: "infinite",
              animationDirection: "alternate",
              animationDelay: "-5s",
            }}
          />
        </div>

        {/* ── Keyframes + estilos de campo ──────────────────────── */}
        <style>{`
          @keyframes gridPan {
            0%   { background-position: 0 0; }
            100% { background-position: 36px 36px; }
          }
          @keyframes orbFloat {
            0%   { transform: translateY(0) scale(1); }
            100% { transform: translateY(-22px) scale(1.06); }
          }
          @keyframes cardIn {
            from { opacity: 0; transform: translateY(28px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes barShift {
            0%   { background-position: 0% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes shimmer {
            0%        { transform: translateX(-100%); }
            50%, 100% { transform: translateX(100%); }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          /* ── Campo con label flotante ── */
          .tecsur-field { position: relative; }

          .tecsur-input {
            width: 100%;
            height: 54px;
            background: rgba(10, 22, 44, 0.65);
            border: 1px solid rgba(42,109,181,0.22);
            border-radius: 12px;
            padding: 20px 44px 6px 48px;
            color: #dbeafe;
            font-size: 14px;
            font-family: inherit;
            outline: none;
            transition: border-color .25s, background .25s, box-shadow .25s;
            -webkit-appearance: none;
          }

          .tecsur-input:-webkit-autofill {
            -webkit-box-shadow: 0 0 0 40px #0a1628 inset !important;
            -webkit-text-fill-color: #dbeafe !important;
          }

          .tecsur-input::placeholder { color: transparent; }

          .tecsur-input:focus {
            border-color: rgba(74,179,216,0.6);
            background: rgba(16, 38, 74, 0.75);
            box-shadow: 0 0 0 3px rgba(74,179,216,0.12), 0 0 22px rgba(42,109,181,0.1);
          }

          .tecsur-label {
            position: absolute;
            left: 48px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 13px;
            color: rgba(120,160,210,0.75);
            pointer-events: none;
            transition: top .22s cubic-bezier(.4,0,.2,1),
                        transform .22s cubic-bezier(.4,0,.2,1),
                        font-size .22s cubic-bezier(.4,0,.2,1),
                        color .22s;
            white-space: nowrap;
          }

          .tecsur-input:focus   ~ .tecsur-label,
          .tecsur-input.filled  ~ .tecsur-label {
            top: 10px;
            transform: none;
            font-size: 10px;
            color: rgba(74,179,216,0.95);
            letter-spacing: 0.04em;
          }

          .tecsur-icon-left {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: rgba(80,130,190,0.65);
            pointer-events: none;
            transition: color .25s;
            display: flex;
            z-index: 1;
          }

          .tecsur-input:focus ~ .tecsur-label ~ .tecsur-icon-left {
            color: rgba(74,179,216,0.9);
          }

          .tecsur-eye {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            color: rgba(80,130,190,0.6);
            padding: 4px;
            display: flex;
            align-items: center;
            border-radius: 6px;
            transition: color .2s;
          }
          .tecsur-eye:hover { color: rgba(74,179,216,0.9); }
        `}</style>

        {/* ── Card ─────────────────────────────────────────────── */}
        <div
          className="relative w-full mx-4"
          style={{
            maxWidth: 500,
            background: "rgba(8, 16, 34, 0.9)",
            border: "1px solid rgba(42,109,181,0.22)",
            borderRadius: 20,
            overflow: "hidden",
            backdropFilter: "blur(22px)",
            animation: "cardIn .7s cubic-bezier(.16,1,.3,1) both",
            boxShadow:
              "0 0 0 1px rgba(74,179,216,0.05) inset, 0 40px 80px rgba(0,0,0,0.55)",
          }}
        >
          {/* barra superior — gradiente con colores del logo */}
          <div
            style={{
              height: 3,
              background:
                "linear-gradient(90deg, #1a4a7a, #2a6db5, #4ab3d8, #2a6db5, #1a4a7a)",
              backgroundSize: "200% 100%",
              animation: "barShift 3s linear infinite",
            }}
          />

          <div style={{ padding: "30px 30px 24px" }}>

            {/* Logo */}
            <div
              className="flex justify-center"
              style={{ marginBottom: 28, animation: "fadeUp .6s .1s both" }}
            >
              <Image
                src="/img/white.png"
                alt="TECSUR logo"
                width={190}
                height={85}
                style={{
                  objectFit: "contain",
                  filter: "drop-shadow(0 4px 20px rgba(42,109,181,0.5))",
                }}
                priority
              />
            </div>

            {/* Divider */}
            <div
              className="flex items-center gap-3"
              style={{ marginBottom: 24, animation: "fadeUp .6s .2s both" }}
            >
              <div style={{ flex: 1, height: 1, background: "rgba(42,109,181,0.2)" }} />
              <span
                style={{
                  fontSize: 10, fontWeight: 500,
                  color: "rgba(74,179,216,0.55)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                Acceso Administrativo
              </span>
              <div style={{ flex: 1, height: 1, background: "rgba(42,109,181,0.2)" }} />
            </div>

            {/* Formulario */}
            <form onSubmit={handleLogin}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                {/* ── Email ── */}
                <div
                  className="tecsur-field"
                  style={{ animation: "fadeUp .6s .3s both" }}
                >
                  <input
                    id="login-email-input"
                    type="email"
                    className={`tecsur-input${email ? " filled" : ""}`}
                    placeholder="admin@tecsur.edu.pe"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    disabled={loading}
                  />
                  <label className="tecsur-label" htmlFor="login-email-input">
                    Correo Electrónico
                  </label>
                  <span className="tecsur-icon-left">
                    <Mail size={15} />
                  </span>
                </div>

                {/* ── Contraseña ── */}
                <div
                  className="tecsur-field"
                  style={{ animation: "fadeUp .6s .38s both" }}
                >
                  <input
                    id="login-password-input"
                    type={showPassword ? "text" : "password"}
                    className={`tecsur-input${password ? " filled" : ""}`}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    style={{ paddingRight: 44 }}
                  />
                  <label className="tecsur-label" htmlFor="login-password-input">
                    Contraseña
                  </label>
                  <span className="tecsur-icon-left">
                    <Lock size={15} />
                  </span>
                  <button
                    type="button"
                    className="tecsur-eye"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

              </div>

              {/* Aviso de cooldown */}
              {cooldownRestante > 0 && (
                <div
                  style={{
                    marginTop: 14, padding: "10px 14px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.22)",
                    borderRadius: 10, fontSize: 12,
                    color: "rgba(252,165,165,0.9)",
                    textAlign: "center", lineHeight: 1.5,
                    animation: "fadeUp .3s both",
                  }}
                >
                  Acceso bloqueado por {intentosFallidos >= MAX_INTENTOS ? "demasiados intentos fallidos" : "solicitud de Supabase"}.<br />
                  Podrá intentarlo nuevamente en <strong>{cooldownRestante}s</strong>.
                </div>
              )}

              {/* Botón submit */}
              <button
                id="login-submit-btn"
                type="submit"
                disabled={loading || cooldownRestante > 0}
                style={{
                  width: "100%",
                  height: 50,
                  marginTop: 22,
                  border: "none",
                  borderRadius: 12,
                  cursor: (loading || cooldownRestante > 0) ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  fontSize: 15, fontWeight: 700,
                  color: "#fff",
                  letterSpacing: "0.04em",
                  background: cooldownRestante > 0
                    ? "rgba(42,109,181,0.2)"
                    : "linear-gradient(135deg, #1a4a7a 0%, #2a6db5 55%, #4ab3d8 100%)",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  opacity: (loading || cooldownRestante > 0) ? 0.6 : 1,
                  transition: "transform .18s, box-shadow .25s, opacity .2s, background .3s",
                  boxShadow: cooldownRestante > 0 ? "none" : "0 4px 22px rgba(42,109,181,0.45)",
                  animation: "fadeUp .6s .46s both",
                }}
                onMouseEnter={(e) => {
                  if (!loading && cooldownRestante === 0) {
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "0 8px 30px rgba(74,179,216,0.45)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    cooldownRestante > 0 ? "none" : "0 4px 22px rgba(42,109,181,0.45)";
                }}
              >
                {/* shimmer */}
                {cooldownRestante === 0 && (
                  <span
                    aria-hidden
                    style={{
                      position: "absolute", inset: 0,
                      background:
                        "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
                      animation: "shimmer 2.5s ease-in-out infinite",
                    }}
                  />
                )}
                {loading ? (
                  <span style={{ opacity: 0.85, position: "relative" }}>
                    Verificando…
                  </span>
                ) : cooldownRestante > 0 ? (
                  <span style={{ position: "relative" }}>Bloqueado ({cooldownRestante}s)</span>
                ) : (
                  <>
                    <LogIn size={17} style={{ position: "relative" }} />
                    <span style={{ position: "relative" }}>Iniciar Sesión</span>
                  </>
                )}
              </button>
            </form>

            {/* Aviso */}
            <div
              style={{
                marginTop: 20,
                background: "rgba(26,74,122,0.14)",
                border: "1px solid rgba(42,109,181,0.18)",
                borderRadius: 10,
                padding: "12px 14px",
                textAlign: "center",
                fontSize: 11.5,
                color: "rgba(120,160,210,0.75)",
                lineHeight: 1.6,
                animation: "fadeUp .6s .54s both",
              }}
            >
              Sistema de uso exclusivo para{" "}
              <strong style={{ color: "rgba(74,179,216,0.75)", fontWeight: 500 }}>
                personal autorizado
              </strong>
              .<br />
              Los alumnos no tienen acceso a esta plataforma.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="absolute bottom-6 text-xs"
          style={{ color: "rgba(42,109,181,0.4)" }}
        >
          TECSUR © {new Date().getFullYear()} · Instituto Tecnológico de Juliaca
        </div>
      </div>
    </>
  );
}