"use client";
import { FileText } from "lucide-react";
import Link from "next/link";

interface Props {
  dni: string;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

export default function ReporteHistorialBtn({ dni, className, style, label = "Historial Académico" }: Props) {
  const token = typeof window !== "undefined" ? btoa(`TS-${dni}`) : btoa(`TS-${dni}`);
  const href = `/reportes/historial?token=${token}`;
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className || "ts-btn-secondary md-action"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 14px", borderRadius: 8,
        border: "1px solid rgba(167, 139, 250, 0.3)",
        background: "rgba(167, 139, 250, 0.1)",
        color: "rgba(167, 139, 250, 0.9)",
        fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        textDecoration: "none",
        cursor: "pointer",
        transition: "all .2s",
        whiteSpace: "nowrap",
        ...style
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(167, 139, 250, 0.2)"; e.currentTarget.style.borderColor = "rgba(167, 139, 250, 0.6)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(167, 139, 250, 0.1)"; e.currentTarget.style.borderColor = "rgba(167, 139, 250, 0.3)"; }}
      title="Historial de Notas Completo"
    >
      <FileText size={14} />
      {label}
    </Link>
  );
}
