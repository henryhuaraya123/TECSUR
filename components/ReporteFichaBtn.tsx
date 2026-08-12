"use client";
import { Printer } from "lucide-react";
import { useState } from "react";
import Modal from "./Modal";

interface Props {
  matriculaId?: string;
  alumnoId?: string;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

export default function ReporteFichaBtn({ matriculaId, alumnoId, className, style, label = "Ficha" }: Props) {
  const [open, setOpen] = useState(false);
  const [atendidoPor, setAtendidoPor] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const href = alumnoId ? `/reportes/ficha?alumno=${alumnoId}` : `/reportes/ficha?matricula=${matriculaId}`;
    window.open(`${href}&atendido_por=${encodeURIComponent(atendidoPor)}`, "_blank");
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || "ts-btn-secondary md-action"}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 8px", borderRadius: 7,
          border: "1px solid rgba(59, 130, 246, 0.3)",
          background: "rgba(59, 130, 246, 0.1)",
          color: "rgba(59, 130, 246, 0.9)",
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          textDecoration: "none",
          cursor: "pointer",
          transition: "all .2s",
          whiteSpace: "nowrap",
          ...style
        }}
        title="Ficha de Matrícula"
      >
        <Printer size={12} />
        {label}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Generar Ficha de Matrícula">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(74,179,216,0.8)", marginBottom: 4, display: "block" }}>ATENDIDO POR (Asesor de Ventas):</label>
            <input
              autoFocus
              style={{ width: "100%", height: 38, background: "rgba(10,22,44,0.6)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", padding: "0 12px", outline: "none" }}
              value={atendidoPor}
              onChange={(e) => setAtendidoPor(e.target.value)}
              placeholder="Ej. Juan Pérez..."
              required
            />
          </div>
          <button type="submit" style={{ padding: "10px 16px", background: "#2563eb", border: "none", color: "#fff", borderRadius: 8, fontWeight: 700, cursor: "pointer", alignSelf: "flex-end" }}>
            Generar Ficha
          </button>
        </form>
      </Modal>
    </>
  );
}
