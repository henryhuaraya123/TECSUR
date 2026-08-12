"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  User,
  BookOpen,
  History,
  Clock,
  Trash2,
  Settings,
  Layers,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Grid,
  Download,
  Users,
  Pencil
} from "lucide-react";
import Modal from "./Modal";
import AlertDialog from "./AlertDialog";
import ConfirmDialog from "./ConfirmDialog";

interface Alumno {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  carrera: string;
}

interface Pension {
  id: string;
  modulo_id: string;
  nro_recibo: string;
  monto_pagado: number;
  deuda_pendiente: number;
  fecha_pago: string;
  concepto: "PENSION" | "MATRICULA" | "OTROS";
  detalles?: string | null;
  modulos: { nombre: string } | null;
  alumnos?: { dni: string; nombres: string; apellidos: string } | null;
}

interface Matricula {
  id: string;
  modulo_id: string;
  modulos: {
    id: string;
    nombre: string;
    horario?: string | null;
    fecha_inicio?: string | null;
    fecha_fin?: string | null;
    modalidad?: string | null;
    aula?: string | null;
    local?: string | null;
  } | null;
}

interface Cargo {
  id: string;
  modulo_id: string;
  concepto: "PENSION" | "MATRICULA" | "OTROS";
  monto: number;
  descripcion?: string | null;
}

export default function PensionesView() {
  const [activeTab, setActiveTab] = useState<"pensiones" | "control" | "configuracion">("control");

  // ── PESTAÑA: CONTROL POR GRUPOS ──
  const [viewingModuleFinances, setViewingModuleFinances] = useState<any | null>(null);
  const [moduleStudents, setModuleStudents] = useState<any[]>([]);
  const [modulePayments, setModulePayments] = useState<any[]>([]);
  const [loadingModuleFinances, setLoadingModuleFinances] = useState(false);

  // ── PESTAÑA: REGISTRAR PAGOS ──
  const [dni, setDni] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedAlumno, setSelectedAlumno] = useState<Alumno | null>(null);
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [pensiones, setPensiones] = useState<Pension[]>([]);
  const [moduleCargos, setModuleCargos] = useState<Cargo[]>([]);

  const [currentModuleCosts, setCurrentModuleCosts] = useState({
    remainingMatricula: 0,
    remainingPension: 0,
    remainingOtros: 0
  });

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ open: boolean; message: string; type: "success" | "error" | "info" }>({ open: false, message: "", type: "info" });

  const [form, setForm] = useState({
    modulo_id: "",
    nro_recibo: "",
    monto_pagado: "",
    deuda_pendiente: "",
    fecha_pago: new Date().toISOString().split("T")[0],
    concepto: "PENSION",
    detalles: "",
  });

  // ── HISTORIAL GENERAL DE PAGOS (TODOS LOS ESTUDIANTES) ──
  const [allPayments, setAllPayments] = useState<Pension[]>([]);
  const [loadingAllPayments, setLoadingAllPayments] = useState(false);

  // Filtros del Historial General
  const [searchGen, setSearchGen] = useState("");
  const [filterConceptoGen, setFilterConceptoGen] = useState("");
  const [filterStartDateGen, setFilterStartDateGen] = useState("");
  const [filterEndDateGen, setFilterEndDateGen] = useState("");
  const [pageGen, setPageGen] = useState(1);
  const [pageSizeGen] = useState(10);

  // ── PESTAÑA: CONFIGURACIÓN DE CARGOS ──
  const [allModulos, setAllModulos] = useState<any[]>([]);
  const [allCargos, setAllCargos] = useState<Cargo[]>([]);
  const [carreras, setCarreras] = useState<any[]>([]);
  const [loadingModulos, setLoadingModulos] = useState(false);

  // Filtros de Configuración de Cargos
  const [searchModConfig, setSearchModConfig] = useState("");
  const [filterCarreraConfig, setFilterCarreraConfig] = useState("");
  const [filterStartDateConfig, setFilterStartDateConfig] = useState("");
  const [filterEndDateConfig, setFilterEndDateConfig] = useState("");

  // Agrupamiento y Carpetas
  const [groupByConfig, setGroupByConfig] = useState<"carrera" | "aula" | "todos">("aula");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Formulario de creación de Cargo
  const [showCargoForm, setShowCargoForm] = useState(false);
  const [cargoTargetModuloId, setCargoTargetModuloId] = useState<string>("");
  const [cargoForm, setCargoForm] = useState({
    concepto: "PENSION",
    monto: "",
    descripcion: ""
  });
  const [submittingCargo, setSubmittingCargo] = useState(false);

  // Cargar historial general al iniciar o al volver
  useEffect(() => {
    if (activeTab === "pensiones" && !selectedAlumno) {
      loadAllPayments();
    }
  }, [activeTab, selectedAlumno]);

  function exportPaymentsToCSV() {
    const headers = ["Fecha Pago", "DNI", "Alumno", "Nro Recibo", "Concepto", "Modulo", "Monto Pagado", "Deuda Pendiente"];
    const csvRows = [
      headers.join(","),
      ...filteredGeneralPayments.map(p => {
        const alum = p.alumnos;
        const studentName = alum ? `${alum.apellidos} ${alum.nombres}` : "—";
        const studentDni = alum ? alum.dni : "—";
        const moduloName = p.modulos?.nombre || "—";
        const row = [
          p.fecha_pago || "—",
          studentDni,
          studentName,
          p.nro_recibo || "—",
          p.concepto || "—",
          moduloName,
          p.monto_pagado.toFixed(2),
          p.deuda_pendiente.toFixed(2)
        ];
        return row.map(val => {
          const escaped = ('' + val).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(",");
      })
    ];
    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pagos_tecsur_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // EDITAR Y ELIMINAR PAGOS
  const [showEditPaymentForm, setShowEditPaymentForm] = useState(false);
  const [editPaymentForm, setEditPaymentForm] = useState({
    id: "",
    nro_recibo: "",
    monto_pagado: 0,
    deuda_pendiente: 0,
    fecha_pago: "",
    concepto: "PENSION" as "PENSION" | "MATRICULA" | "OTROS",
    detalles: "",
    modulo_nombre: ""
  });
  const [submittingEditPayment, setSubmittingEditPayment] = useState(false);
  const [deletePaymentTarget, setDeletePaymentTarget] = useState<any | null>(null);
  const [deletingPayment, setDeletingPayment] = useState(false);

  function openEditPayment(p: any) {
    setEditPaymentForm({
      id: p.id,
      nro_recibo: p.nro_recibo || "",
      monto_pagado: Number(p.monto_pagado) || 0,
      deuda_pendiente: Number(p.deuda_pendiente) || 0,
      fecha_pago: p.fecha_pago || "",
      concepto: p.concepto || "PENSION",
      detalles: p.detalles || "",
      modulo_nombre: p.modulos?.nombre || "—"
    });
    setShowEditPaymentForm(true);
  }

  async function handleEditPaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingEditPayment(true);
    try {
      const res = await fetch(`/api/pensiones/${editPaymentForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nro_recibo: editPaymentForm.nro_recibo,
          monto_pagado: Number(editPaymentForm.monto_pagado),
          deuda_pendiente: Number(editPaymentForm.deuda_pendiente),
          fecha_pago: editPaymentForm.fecha_pago,
          concepto: editPaymentForm.concepto,
          detalles: editPaymentForm.detalles
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertInfo({ open: true, message: data.error || "Error al actualizar pago", type: "error" });
      } else {
        setAlertInfo({ open: true, message: "Pago actualizado correctamente", type: "success" });
        setShowEditPaymentForm(false);
        loadAllPayments();
        if (selectedAlumno) {
          const penRes = await fetch(`/api/pensiones?alumno_id=${selectedAlumno.id}`);
          const penData = await penRes.json();
          setPensiones(Array.isArray(penData) ? penData : []);
        }
      }
    } catch (err) {
      console.error(err);
      setAlertInfo({ open: true, message: "Error al actualizar pago", type: "error" });
    } finally {
      setSubmittingEditPayment(false);
    }
  }

  async function handleDeletePayment() {
    if (!deletePaymentTarget) return;
    setDeletingPayment(true);
    try {
      const res = await fetch(`/api/pensiones/${deletePaymentTarget.id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const data = await res.json();
        setAlertInfo({ open: true, message: data.error || "Error al eliminar pago", type: "error" });
      } else {
        setAlertInfo({ open: true, message: "Pago eliminado correctamente", type: "success" });
        setDeletePaymentTarget(null);
        loadAllPayments();
        if (selectedAlumno) {
          const penRes = await fetch(`/api/pensiones?alumno_id=${selectedAlumno.id}`);
          const penData = await penRes.json();
          setPensiones(Array.isArray(penData) ? penData : []);
        }
      }
    } catch (err) {
      console.error(err);
      setAlertInfo({ open: true, message: "Error al eliminar pago", type: "error" });
    } finally {
      setDeletingPayment(false);
    }
  }

  // Cargar datos de configuración cuando se active la pestaña de configuración o control
  useEffect(() => {
    if (activeTab === "configuracion" || activeTab === "control") {
      loadConfigData();
    }
  }, [activeTab]);

  async function loadAllPayments() {
    setLoadingAllPayments(true);
    try {
      const res = await fetch("/api/pensiones");
      const data = await res.json();
      setAllPayments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error al cargar historial general de pagos", e);
    } finally {
      setLoadingAllPayments(false);
    }
  }

  async function loadConfigData() {
    setLoadingModulos(true);
    try {
      const [modRes, cargosRes, carRes] = await Promise.all([
        fetch("/api/modulos"),
        fetch("/api/cargos_modulo"),
        fetch("/api/carreras")
      ]);
      const modData = await modRes.json();
      const cargosData = await cargosRes.json();
      const carData = await carRes.json();
      setAllModulos(Array.isArray(modData) ? modData : []);
      setAllCargos(Array.isArray(cargosData) ? cargosData : []);
      setCarreras(Array.isArray(carData) ? carData : []);
    } catch (e) {
      console.error("Error al cargar configuración de cargos", e);
    } finally {
      setLoadingModulos(false);
    }
  }

  async function loadModuleFinances(m: any) {
    setViewingModuleFinances(m);
    setLoadingModuleFinances(true);
    try {
      const [matRes, penRes] = await Promise.all([
        fetch(`/api/matriculas?modulo_id=${m.id}`),
        fetch(`/api/pensiones?modulo_id=${m.id}`)
      ]);
      const matData = await matRes.json();
      const penData = await penRes.json();
      setModuleStudents(Array.isArray(matData) ? matData : []);
      setModulePayments(Array.isArray(penData) ? penData : []);
    } catch (e) {
      console.error(e);
      setAlertInfo({ open: true, message: "Error al cargar datos financieros del módulo", type: "error" });
    } finally {
      setLoadingModuleFinances(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!dni.trim()) return;
    setLoadingData(true);
    setError(null);
    setSelectedAlumno(null);
    setMatriculas([]);
    setPensiones([]);
    setModuleCargos([]);

    try {
      // 1. Buscar alumno en la base de datos
      const searchVal = dni.trim();
      const resAlum = await fetch(`/api/alumnos?search=${encodeURIComponent(searchVal)}&pageSize=5`);
      const dataAlum = await resAlum.json();
      const student = dataAlum.data && dataAlum.data.length > 0 ? dataAlum.data[0] : null;

      if (!student) {
        setError("Estudiante no encontrado. Verifique el DNI o Código.");
        return;
      }

      setSelectedAlumno(student);

      // 2. Cargar matrículas, pensiones y cargos
      const [matRes, penRes, cargosRes] = await Promise.all([
        fetch(`/api/matriculas?alumno_id=${student.id}`),
        fetch(`/api/pensiones?alumno_id=${student.id}`),
        fetch(`/api/cargos_modulo`)
      ]);
      const matData = await matRes.json();
      const penData = await penRes.json();
      const cargosData = await cargosRes.json();

      setMatriculas(Array.isArray(matData) ? matData : []);
      setPensiones(Array.isArray(penData) ? penData : []);
      setModuleCargos(Array.isArray(cargosData) ? cargosData : []);
    } catch (e) {
      setError("Error de conexión al cargar registros financieros");
    } finally {
      setLoadingData(false);
    }
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };

      // Si cambia de modulo, recalculamos sus deudas específicas
      if (name === "modulo_id") {
        const m = matriculas.find(x => x.modulo_id === value);
        const cargos = moduleCargos.filter(c => c.modulo_id === value);

        let remMat = 0;
        let remPen = 0;
        let remOtr = 0;

        if (cargos.length > 0) {
          const costMat = cargos.filter(c => c.concepto === "MATRICULA").reduce((s, c) => s + Number(c.monto), 0);
          const costPen = cargos.filter(c => c.concepto === "PENSION").reduce((s, c) => s + Number(c.monto), 0);
          const costOtr = cargos.filter(c => c.concepto === "OTROS").reduce((s, c) => s + Number(c.monto), 0);

          let paidMat = 0;
          let paidPen = 0;
          let paidOtr = 0;
          pensiones.forEach(p => {
            if (p.modulo_id === value) {
              if (p.concepto === "MATRICULA") paidMat += p.monto_pagado;
              if (p.concepto === "PENSION") paidPen += p.monto_pagado;
              if (p.concepto === "OTROS") paidOtr += p.monto_pagado;
            }
          });

          remMat = Math.max(0, costMat - paidMat);
          remPen = Math.max(0, costPen - paidPen);
          remOtr = Math.max(0, costOtr - paidOtr);
        } else {
          // Fallback retrocompatible: usar la deuda_pendiente de la última transacción
          const pagosModulo = pensiones.filter(p => p.modulo_id === value)
            .sort((a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime());
          if (pagosModulo.length > 0) {
            remPen = pagosModulo[0].deuda_pendiente;
          }
        }

        setCurrentModuleCosts({
          remainingMatricula: remMat,
          remainingPension: remPen,
          remainingOtros: remOtr
        });

        // Pre-llenar deuda restante según concepto actual
        const currentConcept = next.concepto;
        const currentMonto = parseFloat(next.monto_pagado || "0");
        if (currentConcept === "MATRICULA") {
          next.deuda_pendiente = String(Math.max(0, remMat - currentMonto));
        } else if (currentConcept === "PENSION") {
          next.deuda_pendiente = String(Math.max(0, remPen - currentMonto));
        } else if (currentConcept === "OTROS") {
          next.deuda_pendiente = String(Math.max(0, remOtr - currentMonto));
        } else {
          next.deuda_pendiente = "0";
        }
      }

      // Auto-calcular deuda_pendiente al modificar monto o concepto
      if (name === "monto_pagado" || name === "concepto") {
        const monto = parseFloat(next.monto_pagado || "0");
        let remaining = 0;
        if (next.concepto === "MATRICULA") {
          remaining = Math.max(0, currentModuleCosts.remainingMatricula - monto);
        } else if (next.concepto === "PENSION") {
          remaining = Math.max(0, currentModuleCosts.remainingPension - monto);
        } else if (next.concepto === "OTROS") {
          remaining = Math.max(0, currentModuleCosts.remainingOtros - monto);
        } else {
          remaining = 0;
        }
        next.deuda_pendiente = String(remaining);
      }

      return next;
    });
  }

  function openPagoModal(modulo_id: string = "") {
    const cargos = moduleCargos.filter(c => c.modulo_id === modulo_id);
    let remainingMatricula = 0;
    let remainingPension = 0;
    let remainingOtros = 0;

    if (cargos.length > 0) {
      const costMatricula = cargos.filter(c => c.concepto === "MATRICULA").reduce((s, c) => s + Number(c.monto), 0);
      const costPension = cargos.filter(c => c.concepto === "PENSION").reduce((s, c) => s + Number(c.monto), 0);
      const costOtros = cargos.filter(c => c.concepto === "OTROS").reduce((s, c) => s + Number(c.monto), 0);

      let paidMatricula = 0;
      let paidPension = 0;
      let paidOtros = 0;
      pensiones.forEach(p => {
        if (p.modulo_id === modulo_id) {
          if (p.concepto === "MATRICULA") paidMatricula += p.monto_pagado;
          if (p.concepto === "PENSION") paidPension += p.monto_pagado;
          if (p.concepto === "OTROS") paidOtros += p.monto_pagado;
        }
      });

      remainingMatricula = Math.max(0, costMatricula - paidMatricula);
      remainingPension = Math.max(0, costPension - paidPension);
      remainingOtros = Math.max(0, costOtros - paidOtros);
    } else {
      // Fallback retrocompatible: usar la deuda_pendiente de la última transacción
      const pagosModulo = pensiones.filter(p => p.modulo_id === modulo_id)
        .sort((a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime());
      if (pagosModulo.length > 0) {
        remainingPension = pagosModulo[0].deuda_pendiente;
      }
    }

    setCurrentModuleCosts({
      remainingMatricula,
      remainingPension,
      remainingOtros
    });

    setForm({
      modulo_id,
      nro_recibo: "",
      monto_pagado: "",
      deuda_pendiente: String(remainingPension),
      fecha_pago: new Date().toISOString().split("T")[0],
      concepto: "PENSION",
      detalles: "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAlumno) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/pensiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          alumno_id: selectedAlumno.id,
          monto_pagado: parseFloat(form.monto_pagado),
          deuda_pendiente: parseFloat(form.deuda_pendiente || "0"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar el pago");
      setAlertInfo({ open: true, message: `Pago registrado: Recibo ${form.nro_recibo}`, type: "success" });
      setShowForm(false);

      // Recargar historial de pagos de este alumno
      const penRes = await fetch(`/api/pensiones?alumno_id=${selectedAlumno.id}`);
      const penData = await penRes.json();
      setPensiones(Array.isArray(penData) ? penData : []);

      // Refrescar también la lista general para cuando vuelva
      loadAllPayments();
    } catch (err) {
      setAlertInfo({ open: true, message: err instanceof Error ? err.message : "Error desconocido", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  // ── ACCIONES: CREAR / ELIMINAR CARGO ──
  function openNewCargo(moduloId: string) {
    setCargoTargetModuloId(moduloId);
    setCargoForm({
      concepto: "PENSION",
      monto: "",
      descripcion: ""
    });
    setShowCargoForm(true);
  }

  async function handleCreateCargo(e: React.FormEvent) {
    e.preventDefault();
    if (!cargoTargetModuloId) return;
    setSubmittingCargo(true);

    try {
      const res = await fetch("/api/cargos_modulo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modulo_id: cargoTargetModuloId,
          ...cargoForm,
          monto: parseFloat(cargoForm.monto)
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al crear cargo");
      setAlertInfo({ open: true, message: "Concepto de pago agregado correctamente", type: "success" });
      setShowCargoForm(false);
      loadConfigData();
    } catch (err) {
      setAlertInfo({ open: true, message: err instanceof Error ? err.message : "Error desconocido", type: "error" });
    } finally {
      setSubmittingCargo(false);
    }
  }

  async function handleDeleteCargo(id: string) {
    if (!confirm("¿Está seguro de eliminar este concepto de cobro?")) return;
    try {
      const res = await fetch(`/api/cargos_modulo?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al eliminar");
      setAlertInfo({ open: true, message: "Concepto de pago eliminado", type: "success" });
      loadConfigData();
    } catch (err) {
      setAlertInfo({ open: true, message: err instanceof Error ? err.message : "Error", type: "error" });
    }
  }

  // ── FILTRAR HISTORIAL GENERAL ──
  const filteredGeneralPayments = allPayments.filter(p => {
    if (searchGen.trim()) {
      const q = searchGen.toLowerCase().trim();
      const recMatch = (p.nro_recibo || "").toLowerCase().includes(q);

      const alum = p.alumnos;
      const dniMatch = alum ? (alum.dni || "").toLowerCase().includes(q) : false;
      const nameMatch = alum ? (alum.nombres || "").toLowerCase().includes(q) : false;
      const apeMatch = alum ? (alum.apellidos || "").toLowerCase().includes(q) : false;

      if (!recMatch && !dniMatch && !nameMatch && !apeMatch) return false;
    }
    if (filterConceptoGen) {
      if (p.concepto !== filterConceptoGen) return false;
    }
    if (filterStartDateGen) {
      if (p.fecha_pago < filterStartDateGen) return false;
    }
    if (filterEndDateGen) {
      if (p.fecha_pago > filterEndDateGen) return false;
    }
    return true;
  });

  const totalGen = filteredGeneralPayments.length;
  const totalPagesGen = Math.ceil(totalGen / pageSizeGen);
  const currentPageGen = Math.min(pageGen, totalPagesGen || 1);
  const paginatedGeneralPayments = filteredGeneralPayments.slice(
    (currentPageGen - 1) * pageSizeGen,
    currentPageGen * pageSizeGen
  );

  // ── FILTRAR CONFIGURACIÓN DE MÓDULOS ──
  const filteredModulosConfig = allModulos.filter(m => {
    if (searchModConfig.trim()) {
      const q = searchModConfig.toLowerCase().trim();
      const nameMatch = (m.nombre || "").toLowerCase().includes(q);
      const profMatch = (m.profesor || "").toLowerCase().includes(q);
      const localMatch = (m.local || "").toLowerCase().includes(q);
      const aulaMatch = (m.aula || "").toLowerCase().includes(q);
      if (!nameMatch && !profMatch && !localMatch && !aulaMatch) return false;
    }
    if (filterCarreraConfig) {
      if (m.carrera_id !== filterCarreraConfig) return false;
    }
    if (filterStartDateConfig) {
      if (m.fecha_inicio < filterStartDateConfig) return false;
    }
    if (filterEndDateConfig) {
      if (m.fecha_fin > filterEndDateConfig) return false;
    }
    return true;
  });

  // Agrupar módulos de manera jerárquica (Carrera -> Aula o Aula -> Carrera)
  const nestedGroupedModulos: Record<string, Record<string, any[]>> = {};
  if (groupByConfig === "carrera") {
    filteredModulosConfig.forEach(m => {
      const topKey = m.carreras?.nombre?.trim() || "Sin Carrera Especificada";
      const subKey = m.aula?.trim() || "Sin Aula Especificada";
      if (!nestedGroupedModulos[topKey]) nestedGroupedModulos[topKey] = {};
      if (!nestedGroupedModulos[topKey][subKey]) nestedGroupedModulos[topKey][subKey] = [];
      nestedGroupedModulos[topKey][subKey].push(m);
    });
  } else if (groupByConfig === "aula") {
    filteredModulosConfig.forEach(m => {
      const topKey = m.aula?.trim() || "Sin Aula Especificada";
      const subKey = m.carreras?.nombre?.trim() || "Sin Carrera Especificada";
      if (!nestedGroupedModulos[topKey]) nestedGroupedModulos[topKey] = {};
      if (!nestedGroupedModulos[topKey][subKey]) nestedGroupedModulos[topKey][subKey] = [];
      nestedGroupedModulos[topKey][subKey].push(m);
    });
  }

  // Ordenar módulos por fecha_inicio descendente (fechas más recientes primero)
  Object.keys(nestedGroupedModulos).forEach(topKey => {
    Object.keys(nestedGroupedModulos[topKey]).forEach(subKey => {
      nestedGroupedModulos[topKey][subKey].sort((a, b) => {
        return (b.fecha_inicio || "").localeCompare(a.fecha_inicio || "");
      });
    });
  });

  // ── CÁLCULOS FINANCIEROS DE LA LISTA DE PAGOS DEL ALUMNO CONSULTADO ──
  let deudaTotal = 0;
  const pagadoPorModulo: Record<string, number> = {};
  const deudaPorModulo: Record<string, number> = {};
  const cargosPorModulo: Record<string, Cargo[]> = {};

  // Agrupar los cargos definidos por módulo
  moduleCargos.forEach(c => {
    if (!c.modulo_id) return;
    if (!cargosPorModulo[c.modulo_id]) cargosPorModulo[c.modulo_id] = [];
    cargosPorModulo[c.modulo_id].push(c);
  });

  // Agrupar pagos por modulo y por concepto
  const pagosPorModuloYConcepto: Record<string, Record<string, number>> = {};
  pensiones.forEach(p => {
    if (!p.modulo_id) return;
    if (!pagosPorModuloYConcepto[p.modulo_id]) {
      pagosPorModuloYConcepto[p.modulo_id] = { MATRICULA: 0, PENSION: 0, OTROS: 0 };
    }
    const conceptoKey = p.concepto || "PENSION";
    pagosPorModuloYConcepto[p.modulo_id][conceptoKey] = (pagosPorModuloYConcepto[p.modulo_id][conceptoKey] || 0) + p.monto_pagado;
  });

  matriculas.forEach(m => {
    const modId = m.modulo_id || m.modulos?.id;
    if (!modId) return;

    const cargos = cargosPorModulo[modId] || [];

    // Si hay cargos configurados, usamos el cálculo automatizado
    if (cargos.length > 0) {
      const costMatricula = cargos.filter(c => c.concepto === "MATRICULA").reduce((s, c) => s + Number(c.monto), 0);
      const costPension = cargos.filter(c => c.concepto === "PENSION").reduce((s, c) => s + Number(c.monto), 0);
      const costOtros = cargos.filter(c => c.concepto === "OTROS").reduce((s, c) => s + Number(c.monto), 0);

      const pagos = pagosPorModuloYConcepto[modId] || { MATRICULA: 0, PENSION: 0, OTROS: 0 };
      const paidMatricula = pagos.MATRICULA || 0;
      const paidPension = pagos.PENSION || 0;
      const paidOtros = pagos.OTROS || 0;

      const remainingMatricula = Math.max(0, costMatricula - paidMatricula);
      const remainingPension = Math.max(0, costPension - paidPension);
      const remainingOtros = Math.max(0, costOtros - paidOtros);

      deudaPorModulo[modId] = remainingMatricula + remainingPension + remainingOtros;
      deudaTotal += remainingMatricula + remainingPension + remainingOtros;
      pagadoPorModulo[modId] = paidMatricula + paidPension + paidOtros;
    } else {
      // Fallback retrocompatible: usar la deuda_pendiente de la última transacción
      const pagosModulo = pensiones.filter(p => p.modulo_id === modId)
        .sort((a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime());

      const pagado = pagosModulo.reduce((sum, p) => sum + p.monto_pagado, 0);
      pagadoPorModulo[modId] = pagado;

      if (pagosModulo.length > 0) {
        deudaPorModulo[modId] = pagosModulo[0].deuda_pendiente;
        deudaTotal += pagosModulo[0].deuda_pendiente;
      } else {
        deudaPorModulo[modId] = 0;
      }
    }
  });

  const totalPagado = pensiones.reduce((sum, p) => sum + p.monto_pagado, 0);

  const card: React.CSSProperties = { background: "rgba(8,16,34,0.85)", border: "1px solid rgba(42,109,181,0.18)", borderRadius: 14, backdropFilter: "blur(12px)" };
  const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "rgba(10,22,44,0.7)", border: "1px solid rgba(42,109,181,0.22)", borderRadius: 10, padding: "0 14px", color: "#dbeafe", outline: "none", fontFamily: "inherit" };
  const btnP: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, border: "none", background: "#a2a1a1ff", color: "#0d0d0dff", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" };
  const btnS: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, background: "rgba(178, 181, 183, 0.1)", border: "1px solid rgba(42,109,181,0.22)", color: "rgba(120,160,210,0.85)", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" };

  return (
    <div className="w-full pb-12" style={{ display: "flex", flexDirection: "column", gap: 24, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Alertas */}
      <AlertDialog open={alertInfo.open} onClose={() => setAlertInfo((p) => ({ ...p, open: false }))} message={alertInfo.message} type={alertInfo.type} />
      <AlertDialog open={!!error} onClose={() => setError(null)} message={error || ""} type="error" />

      {/* Tabs de Navegación Financiera */}
      <div style={{ display: "flex", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 10 }}>
        <button
          onClick={() => { setActiveTab("control"); setViewingModuleFinances(null); }}
          style={{
            background: activeTab === "control" ? "rgba(42,109,181,0.15)" : "transparent",
            border: activeTab === "control" ? "1px solid rgba(42,109,181,0.3)" : "1px solid transparent",
            borderRadius: 8, padding: "8px 16px", color: activeTab === "control" ? "#dbeafe" : "rgba(255,255,255,0.4)",
            fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s"
          }}
        >
          <Layers size={14} /> Control por Grupos (Módulo)
        </button>
        <button
          onClick={() => { setActiveTab("pensiones"); setViewingModuleFinances(null); }}
          style={{
            background: activeTab === "pensiones" ? "rgba(42,109,181,0.15)" : "transparent",
            border: activeTab === "pensiones" ? "1px solid rgba(42,109,181,0.3)" : "1px solid transparent",
            borderRadius: 8, padding: "8px 16px", color: activeTab === "pensiones" ? "#dbeafe" : "rgba(255,255,255,0.4)",
            fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s"
          }}
        >
          <CreditCard size={14} /> Registrar Pago / Historial
        </button>
        <button
          onClick={() => { setActiveTab("configuracion"); setViewingModuleFinances(null); }}
          style={{
            background: activeTab === "configuracion" ? "rgba(42,109,181,0.15)" : "transparent",
            border: activeTab === "configuracion" ? "1px solid rgba(42,109,181,0.3)" : "1px solid transparent",
            borderRadius: 8, padding: "8px 16px", color: activeTab === "configuracion" ? "#dbeafe" : "rgba(255,255,255,0.4)",
            fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s"
          }}
        >
          <Settings size={14} /> Configurar Conceptos de Cobro por Módulo
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB: REGISTRAR PAGOS / HISTORIAL
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "pensiones" && (
        <>
          {/* SECCIÓN DE BÚSQUEDA CENTRADA Y FORMAL */}
          <div style={{ display: "flex", justifyContent: "center", width: "100%", padding: "10px 0" }}>
            <div style={{
              padding: "32px",
              border: "1px solid rgba(255,255,255,0.08)",
              width: "100%",
              maxWidth: 600,
              textAlign: "center",
              background: "#090f1a",
              borderRadius: 14
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 14, textTransform: "uppercase" }}>Control de Pensiones y Pagos</h2>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 24, lineHeight: 1.5 }}>Ingrese el DNI o Código del estudiante para ver cargos de cobro, calcular deudas y registrar pagos.</p>

              <form onSubmit={handleSearch} style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
                  <input
                    id="pensiones-dni-search"
                    style={{ width: "100%", height: 42, paddingLeft: 38, paddingRight: 16, background: "rgba(10,22,44,0.6)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 8, color: "#fff", outline: "none", fontSize: 13 }}
                    placeholder="Código o DNI del estudiante..."
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <button
                  type="submit"
                  id="btn-search-pensiones"
                  disabled={loadingData}
                  style={{ height: 42, padding: "0 20px", background: "#1a4a7a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: loadingData ? "not-allowed" : "pointer" }}
                >
                  {loadingData ? "Buscando..." : "Buscar Alumno"}
                </button>
              </form>
            </div>
          </div>

          {/* HISTORIAL GENERAL DE TRANSACCIONES (SI NO HAY ALUMNO SELECCIONADO) */}
          {!selectedAlumno && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: "#fff", margin: 0, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Historial General de Transacciones (Todos los Estudiantes)
                  </h3>
                  <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", margin: "4px 0 0" }}>
                    Visualice, filtre y busque recibos de pago registrados en todo el instituto.
                  </p>
                </div>
              </div>

              <div style={{ ...card, overflow: "hidden", padding: 0 }}>
                {/* Controles de Búsqueda y Filtro */}
                <div style={{ display: "flex", gap: 12, padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
                    <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)" }} />
                    <input
                      type="text"
                      placeholder="Buscar por nro. recibo, DNI o apellidos/nombres del alumno..."
                      value={searchGen}
                      onChange={e => { setSearchGen(e.target.value); setPageGen(1); }}
                      style={{ ...inp, paddingLeft: 36, height: 38, fontSize: 12 }}
                    />
                  </div>

                  {/* Filtro por Concepto */}
                  <div style={{ position: "relative", width: 160 }}>
                    <select
                      value={filterConceptoGen}
                      onChange={e => { setFilterConceptoGen(e.target.value); setPageGen(1); }}
                      style={{ ...inp, height: 38, fontSize: 12, paddingRight: 30, cursor: "pointer" }}
                    >
                      <option value="">Todos los conceptos</option>
                      <option value="PENSION">Pensión</option>
                      <option value="MATRICULA">Matrícula</option>
                      <option value="OTROS">Otros</option>
                    </select>
                  </div>

                  {/* Filtro Fecha Desde */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>DESDE:</span>
                    <input
                      type="date"
                      value={filterStartDateGen}
                      onChange={e => { setFilterStartDateGen(e.target.value); setPageGen(1); }}
                      style={{ ...inp, width: 130, height: 38, fontSize: 11, padding: "0 8px", cursor: "pointer", colorScheme: "dark" }}
                    />
                  </div>

                  {/* Filtro Fecha Hasta */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>HASTA:</span>
                    <input
                      type="date"
                      value={filterEndDateGen}
                      onChange={e => { setFilterEndDateGen(e.target.value); setPageGen(1); }}
                      style={{ ...inp, width: 130, height: 38, fontSize: 11, padding: "0 8px", cursor: "pointer", colorScheme: "dark" }}
                    />
                  </div>

                  {/* Botón Limpiar Filtros */}
                  {(searchGen || filterConceptoGen || filterStartDateGen || filterEndDateGen) && (
                    <button
                      onClick={() => { setSearchGen(""); setFilterConceptoGen(""); setFilterStartDateGen(""); setFilterEndDateGen(""); setPageGen(1); }}
                      style={{
                        background: "rgba(248,113,113,0.08)",
                        border: "1px solid rgba(248,113,113,0.18)",
                        color: "#f87171",
                        height: 38,
                        padding: "0 12px",
                        borderRadius: 8,
                        fontSize: 10.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4
                      }}
                    >
                      <XCircle size={13} /> Limpiar
                    </button>
                  )}

                  {/* Botón Exportar Excel */}
                  <button
                    type="button"
                    onClick={exportPaymentsToCSV}
                    style={{
                      background: "rgba(52,211,153,0.1)",
                      border: "1px solid rgba(52,211,153,0.2)",
                      color: "#34d399",
                      height: 38,
                      padding: "0 14px",
                      borderRadius: 8,
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      marginLeft: "auto"
                    }}
                  >
                    <Download size={13} /> Exportar Excel
                  </button>
                </div>

                {loadingAllPayments ? (
                  <div style={{ padding: "60px", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>Cargando transacciones globales...</div>
                ) : paginatedGeneralPayments.length === 0 ? (
                  <div style={{ padding: "60px", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
                    <History size={32} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
                    <p style={{ fontSize: 12.5, margin: 0 }}>No se encontraron transacciones con los filtros aplicados.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                        <thead>
                          <tr style={{ background: "rgba(255,255,255,0.02)", color: "rgba(255,255,255,0.5)" }}>
                            <th style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 700 }}>FECHA</th>
                            <th style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 700 }}>ALUMNO / DNI</th>
                            <th style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 700 }}>N° RECIBO</th>
                            <th style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 700 }}>CONCEPTO</th>
                            <th style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 700 }}>MÓDULO</th>
                            <th style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 700, textAlign: "right" }}>PAGADO</th>
                            <th style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 700, textAlign: "right" }}>DEUDA REST.</th>
                            <th style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 700, textAlign: "center" }}>ACCIONES</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedGeneralPayments.map(p => {
                            const alum = p.alumnos;
                            return (
                              <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.2s" }}>
                                <td style={{ padding: "14px 20px", color: "#fff" }}>{p.fecha_pago}</td>
                                <td style={{ padding: "14px 20px" }}>
                                  {alum ? (
                                    <>
                                      <div style={{ fontWeight: 700, color: "#fff" }}>{`${alum.apellidos?.toUpperCase()}, ${alum.nombres?.toUpperCase()}`}</div>
                                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>DNI: {alum.dni}</div>
                                    </>
                                  ) : (
                                    <span style={{ color: "rgba(255,255,255,0.3)" }}>—</span>
                                  )}
                                </td>
                                <td style={{ padding: "14px 20px", color: "#fff", fontFamily: "monospace", fontWeight: 700 }}>{p.nro_recibo}</td>
                                <td style={{ padding: "14px 20px" }}>
                                  <span style={{
                                    fontSize: 9,
                                    fontWeight: 700,
                                    padding: "3px 8px",
                                    borderRadius: 4,
                                    background: p.concepto === "MATRICULA" ? "rgba(59,130,246,0.12)" : p.concepto === "OTROS" ? "rgba(107,114,128,0.15)" : "rgba(16,185,129,0.12)",
                                    color: p.concepto === "MATRICULA" ? "#60a5fa" : p.concepto === "OTROS" ? "#9ca3af" : "#34d399",
                                    border: p.concepto === "MATRICULA" ? "1px solid rgba(59,130,246,0.2)" : p.concepto === "OTROS" ? "1px solid rgba(107,114,128,0.2)" : "1px solid rgba(16,185,129,0.2)"
                                  }}>
                                    {p.concepto}
                                  </span>
                                </td>
                                <td style={{ padding: "14px 20px", color: "#fff" }}>{p.modulos?.nombre || "—"}</td>
                                <td style={{ padding: "14px 20px", color: "#fff", fontWeight: 700, textAlign: "right" }}>S/ {p.monto_pagado.toFixed(2)}</td>
                                <td style={{ padding: "14px 20px", color: p.deuda_pendiente > 0 ? "#f87171" : "rgba(255,255,255,0.3)", fontWeight: 700, textAlign: "right" }}>
                                  {p.deuda_pendiente > 0 ? `S/ ${p.deuda_pendiente.toFixed(2)}` : "AL DÍA"}
                                </td>
                                <td style={{ padding: "14px 20px", textAlign: "center" }}>
                                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                                    <button
                                      type="button"
                                      onClick={() => openEditPayment(p)}
                                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "#60a5fa" }}
                                      title="Editar Pago"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletePaymentTarget(p)}
                                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "#f87171" }}
                                      title="Eliminar Pago"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginación General */}
                    {totalPagesGen > 1 && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: 10 }}>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                          Mostrando {paginatedGeneralPayments.length} de {totalGen} transacciones
                        </span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <button
                            disabled={currentPageGen === 1}
                            onClick={() => setPageGen(p => Math.max(1, p - 1))}
                            style={{
                              ...btnS,
                              padding: "4px 10px",
                              fontSize: 11,
                              height: 28,
                              cursor: currentPageGen === 1 ? "not-allowed" : "pointer",
                              opacity: currentPageGen === 1 ? 0.4 : 1
                            }}
                          >
                            Anterior
                          </button>
                          <span style={{ fontSize: 12, color: "#dbeafe", padding: "0 6px" }}>
                            Página {currentPageGen} de {totalPagesGen}
                          </span>
                          <button
                            disabled={currentPageGen === totalPagesGen}
                            onClick={() => setPageGen(p => Math.min(totalPagesGen, p + 1))}
                            style={{
                              ...btnS,
                              padding: "4px 10px",
                              fontSize: 11,
                              height: 28,
                              cursor: currentPageGen === totalPagesGen ? "not-allowed" : "pointer",
                              opacity: currentPageGen === totalPagesGen ? 0.4 : 1
                            }}
                          >
                            Siguiente
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* INFORME DE PAGOS Y CONTROLES POR ALUMNO SELECCIONADO */}
          {selectedAlumno && (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

              {/* Header del Alumno (Formal y Plano) */}
              <div style={{ padding: "24px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, background: "#090f1a", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                      onClick={() => { setSelectedAlumno(null); setDni(""); }}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6,
                        padding: "6px 12px",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                    >
                      <ChevronLeft size={13} /> Volver al Historial General
                    </button>
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginTop: 14, marginBottom: 0 }}>
                    {selectedAlumno.apellidos.toUpperCase()}, {selectedAlumno.nombres.toUpperCase()}
                  </h2>
                  <div style={{ display: "flex", gap: 20, marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                    <span>DNI: {selectedAlumno.dni}</span>
                    <span>Carrera: {selectedAlumno.carrera.toUpperCase()}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 32 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Total Pagado</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginTop: 4 }}>S/ {totalPagado.toFixed(2)}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Deuda Estimada</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: deudaTotal > 0 ? "#f87171" : "#fff", marginTop: 4 }}>S/ {deudaTotal.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Grillas de Datos en 2 Columnas */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 28, alignItems: "start" }}>

                {/* Columna Izquierda: Módulos y Matrículas */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <h3 style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", margin: 0, textTransform: "uppercase" }}>Módulos del Alumno</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {matriculas.map(m => {
                      const modId = m.modulo_id || m.modulos?.id || "";
                      const deuda = deudaPorModulo[modId] || 0;
                      const pagado = pagadoPorModulo[modId] || 0;

                      const cargos = cargosPorModulo[modId] || [];
                      const costMat = cargos.filter(c => c.concepto === "MATRICULA").reduce((s, c) => s + Number(c.monto), 0);
                      const costPen = cargos.filter(c => c.concepto === "PENSION").reduce((s, c) => s + Number(c.monto), 0);
                      const costOtr = cargos.filter(c => c.concepto === "OTROS").reduce((s, c) => s + Number(c.monto), 0);

                      const pagos = pagosPorModuloYConcepto[modId] || { MATRICULA: 0, PENSION: 0, OTROS: 0 };
                      const paidMat = pagos.MATRICULA || 0;
                      const paidPen = pagos.PENSION || 0;
                      const paidOtr = pagos.OTROS || 0;

                      const remMat = Math.max(0, costMat - paidMat);
                      const remPen = Math.max(0, costPen - paidPen);
                      const remOtr = Math.max(0, costOtr - paidOtr);

                      return (
                        <div key={m.id} style={{ padding: 20, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, background: "#090f1a", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 13, color: "#fff" }}>{m.modulos?.nombre.toUpperCase()}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 6, fontWeight: 500 }}>Horario: {m.modulos?.horario || "Sin horario registrado"}</div>

                            {/* Desglose Detallado de Cargos configurados */}
                            {cargos.length > 0 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 12, background: "rgba(255,255,255,0.01)", padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.03)" }}>
                                <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(74,179,216,0.6)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Desglose de Deuda</div>

                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Matrícula:</span>
                                  <span style={{ fontWeight: 600, color: remMat > 0 ? "#60a5fa" : "rgba(255,255,255,0.3)" }}>
                                    {costMat > 0 ? `Pagado S/ ${paidMat.toFixed(2)} / S/ ${costMat.toFixed(2)} (${remMat > 0 ? `Debe S/ ${remMat.toFixed(2)}` : "Al día"})` : "Sin cargo"}
                                  </span>
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Pensión:</span>
                                  <span style={{ fontWeight: 600, color: remPen > 0 ? "#34d399" : "rgba(255,255,255,0.3)" }}>
                                    {costPen > 0 ? `Pagado S/ ${paidPen.toFixed(2)} / S/ ${costPen.toFixed(2)} (${remPen > 0 ? `Debe S/ ${remPen.toFixed(2)}` : "Al día"})` : "Sin cargo"}
                                  </span>
                                </div>

                                {costOtr > 0 && (
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                                    <span style={{ color: "rgba(255,255,255,0.45)" }}>Otros:</span>
                                    <span style={{ fontWeight: 600, color: remOtr > 0 ? "#fbbf24" : "rgba(255,255,255,0.3)" }}>
                                      {`Pagado S/ ${paidOtr.toFixed(2)} / S/ ${costOtr.toFixed(2)} (Debe S/ ${remOtr.toFixed(2)})`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                            <div>
                              <div style={{ fontSize: 11, color: "#fff", fontWeight: 700 }}>PAGADO: S/ {pagado.toFixed(2)}</div>
                              <div style={{ fontSize: 11, color: deuda > 0 ? "#f87171" : "rgba(255,255,255,0.3)", fontWeight: 700, marginTop: 4 }}>
                                {deuda > 0 ? `DEBE: S/ ${deuda.toFixed(2)}` : "AL DÍA"}
                              </div>
                            </div>
                            <button
                              onClick={() => openPagoModal(modId)}
                              style={{ padding: "6px 12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", borderRadius: 6 }}
                            >
                              <Plus size={12} style={{ display: "inline", marginRight: 4 }} /> REGISTRAR PAGO
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {matriculas.length === 0 && (
                      <div style={{ padding: 32, textAlign: "center", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 10, color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
                        El estudiante no registra matrículas en módulos.
                      </div>
                    )}
                  </div>
                </div>

                {/* Columna Derecha: Historial Financiero del Alumno */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <h3 style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", margin: 0, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                    <History size={13} /> Historial de Transacciones
                  </h3>
                  <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden", background: "#090f1a" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)" }}>
                          <th style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 700 }}>FECHA</th>
                          <th style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 700 }}>N° RECIBO</th>
                          <th style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 700 }}>CONCEPTO</th>
                          <th style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 700 }}>MÓDULO</th>
                          <th style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 700, textAlign: "right" }}>PAGADO</th>
                          <th style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 700, textAlign: "right" }}>DEUDA REST.</th>
                          <th style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 700, textAlign: "center" }}>ACCIONES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pensiones.map(p => (
                          <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s" }}>
                            <td style={{ padding: 14, color: "#fff" }}>{p.fecha_pago}</td>
                            <td style={{ padding: 14, color: "#fff", fontFamily: "monospace", fontWeight: 700 }}>{p.nro_recibo}</td>
                            <td style={{ padding: 14, color: "#fff" }}>
                              <span style={{
                                fontSize: 9,
                                fontWeight: 700,
                                padding: "3px 8px",
                                borderRadius: 4,
                                background: p.concepto === "MATRICULA" ? "rgba(59,130,246,0.12)" : p.concepto === "OTROS" ? "rgba(107,114,128,0.15)" : "rgba(16,185,129,0.12)",
                                color: p.concepto === "MATRICULA" ? "#60a5fa" : p.concepto === "OTROS" ? "#9ca3af" : "#34d399",
                                border: p.concepto === "MATRICULA" ? "1px solid rgba(59,130,246,0.2)" : p.concepto === "OTROS" ? "1px solid rgba(107,114,128,0.2)" : "1px solid rgba(16,185,129,0.2)"
                              }}>
                                {p.concepto}
                              </span>
                              {p.detalles && (
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 6, maxWidth: 180, wordBreak: "break-word" }}>
                                  {p.detalles}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: 14, color: "#fff" }}>{p.modulos?.nombre || "—"}</td>
                            <td style={{ padding: 14, color: "#fff", fontWeight: 700, textAlign: "right" }}>S/ {p.monto_pagado.toFixed(2)}</td>
                            <td style={{ padding: 14, color: p.deuda_pendiente > 0 ? "#f87171" : "rgba(255,255,255,0.3)", fontWeight: 700, textAlign: "right" }}>
                              {p.deuda_pendiente > 0 ? `S/ ${p.deuda_pendiente.toFixed(2)}` : "AL DÍA"}
                            </td>
                            <td style={{ padding: 14, textAlign: "center" }}>
                              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => openEditPayment(p)}
                                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#60a5fa" }}
                                  title="Editar Pago"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletePaymentTarget(p)}
                                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#f87171" }}
                                  title="Eliminar Pago"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {pensiones.length === 0 && (
                          <tr>
                            <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
                              No se registran transacciones de pago para este alumno.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ── MODAL: REGISTRAR PAGO ── */}
          <Modal open={showForm} onClose={() => setShowForm(false)} title="Registrar Pago" maxWidth="500px">
            <form onSubmit={handleSubmit} className="space-y-4" style={{ fontFamily: "'Inter', sans-serif" }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(74,179,216,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>MÓDULO *</label>
                <select name="modulo_id" value={form.modulo_id} onChange={handleFormChange} required className="w-full h-10 text-sm bg-blue-950 bg-opacity-50 border border-blue-800 rounded-lg text-white outline-none" style={{ padding: "0 12px" }}>
                  <option value="">— Seleccionar Módulo —</option>
                  {matriculas.map(m => {
                    const mod = m.modulos;
                    if (!mod) return null;
                    const fInicio = mod.fecha_inicio ? new Date(mod.fecha_inicio + "T00:00:00").toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' }) : "";
                    const fFin = mod.fecha_fin ? new Date(mod.fecha_fin + "T00:00:00").toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' }) : "";
                    const datesStr = fInicio && fFin ? `${fInicio} a ${fFin}` : "";
                    const details = [
                      mod.aula ? `Aula: ${mod.aula}` : null,
                      datesStr ? `Fechas: ${datesStr}` : null,
                      mod.horario ? `Turno: ${mod.horario}` : null,
                      mod.modalidad ? `Mod: ${mod.modalidad}` : null
                    ].filter(Boolean).join(" | ");

                    return (
                      <option key={m.id} value={m.modulo_id}>
                        {mod.nombre.toUpperCase()} {details ? `(${details})` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {form.modulo_id && (
                <div style={{ background: "rgba(255,255,255,0.02)", padding: 14, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", fontSize: 11, color: "rgba(255,255,255,0.6)", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Deuda de Matrícula actual:</span>
                    <span style={{ fontWeight: 700, color: currentModuleCosts.remainingMatricula > 0 ? "#60a5fa" : "rgba(255,255,255,0.3)" }}>S/ {currentModuleCosts.remainingMatricula.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Deuda de Pensión actual:</span>
                    <span style={{ fontWeight: 700, color: currentModuleCosts.remainingPension > 0 ? "#34d399" : "rgba(255,255,255,0.3)" }}>S/ {currentModuleCosts.remainingPension.toFixed(2)}</span>
                  </div>
                  {currentModuleCosts.remainingOtros > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Otros cargos pendientes:</span>
                      <span style={{ fontWeight: 700, color: "#fbbf24" }}>S/ {currentModuleCosts.remainingOtros.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(74,179,216,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>CONCEPTO / MOTIVO *</label>
                <select name="concepto" value={form.concepto} onChange={handleFormChange} required className="w-full h-10 text-sm bg-blue-950 bg-opacity-50 border border-blue-800 rounded-lg text-white outline-none" style={{ padding: "0 12px" }}>
                  <option value="PENSION">PENSIÓN (MENSUALIDAD)</option>
                  <option value="MATRICULA">MATRÍCULA</option>
                  <option value="OTROS">OTROS</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(74,179,216,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>DETALLES DEL PAGO (OPCIONAL)</label>
                <input name="detalles" value={form.detalles} onChange={handleFormChange} placeholder="Ej: Pago de cuota extemporánea o trámites especiales" className="w-full h-10 text-sm bg-blue-950 bg-opacity-50 border border-blue-800 rounded-lg text-white outline-none" style={{ padding: "0 12px" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(74,179,216,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>N° DE RECIBO FÍSICO *</label>
                <input name="nro_recibo" value={form.nro_recibo} onChange={handleFormChange} required placeholder="Ej: REC-1025" className="w-full h-10 text-sm bg-blue-950 bg-opacity-50 border border-blue-800 rounded-lg text-white outline-none" style={{ padding: "0 12px" }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(74,179,216,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>MONTO PAGADO (S/) *</label>
                  <input name="monto_pagado" type="number" min="0" step="0.01" value={form.monto_pagado} onChange={handleFormChange} required placeholder="0.00" className="w-full h-10 text-sm bg-blue-950 bg-opacity-50 border border-emerald-800 rounded-lg text-emerald-400 font-bold outline-none" style={{ padding: "0 12px" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(74,179,216,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>DEUDA RESTANTE (S/)</label>
                  <input name="deuda_pendiente" type="number" min="0" step="0.01" value={form.deuda_pendiente} onChange={handleFormChange} placeholder="0.00" className="w-full h-10 text-sm bg-blue-950 bg-opacity-50 border border-red-800 rounded-lg text-red-400 font-bold outline-none" style={{ padding: "0 12px" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(74,179,216,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>FECHA DE TRANSACCIÓN *</label>
                <input name="fecha_pago" type="date" value={form.fecha_pago} onChange={handleFormChange} required className="w-full h-10 text-sm bg-blue-950 bg-opacity-50 border border-blue-800 rounded-lg text-white outline-none" style={{ padding: "0 12px", colorScheme: "dark" }} />
              </div>
              <div className="flex justify-end gap-3 border-t border-blue-900 border-opacity-30" style={{ paddingTop: 16 }}>
                <button type="button" onClick={() => setShowForm(false)} className="text-xs font-bold text-blue-300 hover:text-white transition-colors" style={{ padding: "8px 16px", background: "transparent", border: "none", cursor: "pointer" }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 transition-colors" style={{ padding: "8px 20px", border: "none", cursor: "pointer", borderRadius: 8 }}>
                  <CreditCard size={14} /> {submitting ? "Confirmar Transacción" : "Confirmar Transacción"}
                </button>
              </div>
            </form>
          </Modal>

          {/* ── MODAL: EDITAR PAGO ── */}
          <Modal open={showEditPaymentForm} onClose={() => setShowEditPaymentForm(false)} title={`Editar Pago (Recibo: ${editPaymentForm.nro_recibo})`} maxWidth="500px">
            <form onSubmit={handleEditPaymentSubmit} className="space-y-4" style={{ fontFamily: "'Inter', sans-serif" }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(74,179,216,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>MÓDULO</label>
                <input
                  type="text"
                  value={editPaymentForm.modulo_nombre}
                  disabled
                  className="w-full h-10 text-sm bg-blue-950 bg-opacity-30 border border-blue-900 border-opacity-30 rounded-lg text-gray-400 outline-none"
                  style={{ padding: "0 12px", cursor: "not-allowed" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(74,179,216,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>N° RECIBO *</label>
                  <input
                    type="text"
                    required
                    value={editPaymentForm.nro_recibo}
                    onChange={e => setEditPaymentForm(p => ({ ...p, nro_recibo: e.target.value }))}
                    className="w-full h-10 text-sm bg-blue-950 bg-opacity-50 border border-blue-800 rounded-lg text-white outline-none"
                    style={{ padding: "0 12px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(74,179,216,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>FECHA PAGO *</label>
                  <input
                    type="date"
                    required
                    value={editPaymentForm.fecha_pago}
                    onChange={e => setEditPaymentForm(p => ({ ...p, fecha_pago: e.target.value }))}
                    className="w-full h-10 text-sm bg-blue-950 bg-opacity-50 border border-blue-800 rounded-lg text-white outline-none"
                    style={{ padding: "0 12px", colorScheme: "dark" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(74,179,216,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>MONTO PAGADO *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPaymentForm.monto_pagado}
                    onChange={e => setEditPaymentForm(p => ({ ...p, monto_pagado: Number(e.target.value) }))}
                    className="w-full h-10 text-sm bg-blue-950 bg-opacity-50 border border-blue-800 rounded-lg text-white outline-none"
                    style={{ padding: "0 12px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(74,179,216,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>DEUDA RESTANTE *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPaymentForm.deuda_pendiente}
                    onChange={e => setEditPaymentForm(p => ({ ...p, deuda_pendiente: Number(e.target.value) }))}
                    className="w-full h-10 text-sm bg-blue-950 bg-opacity-50 border border-blue-800 rounded-lg text-white outline-none"
                    style={{ padding: "0 12px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(74,179,216,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>CONCEPTO / MOTIVO *</label>
                <select
                  value={editPaymentForm.concepto}
                  onChange={e => setEditPaymentForm(p => ({ ...p, concepto: e.target.value as any }))}
                  required
                  className="w-full h-10 text-sm bg-blue-950 bg-opacity-50 border border-blue-800 rounded-lg text-white outline-none"
                  style={{ padding: "0 12px" }}
                >
                  <option value="PENSION">Pensión</option>
                  <option value="MATRICULA">Matrícula</option>
                  <option value="OTROS">Otros</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(74,179,216,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>DETALLES / COMENTARIOS</label>
                <textarea
                  value={editPaymentForm.detalles}
                  onChange={e => setEditPaymentForm(p => ({ ...p, detalles: e.target.value }))}
                  className="w-full text-sm bg-blue-950 bg-opacity-50 border border-blue-800 rounded-lg text-white outline-none"
                  style={{ padding: "8px 12px", minHeight: 60, fontFamily: "inherit" }}
                  placeholder="Información adicional del recibo o motivo..."
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setShowEditPaymentForm(false)}
                  style={{
                    display: "inline-flex", alignItems: "center", padding: "10px 16px",
                    borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, cursor: "pointer"
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingEditPayment}
                  style={{
                    display: "inline-flex", alignItems: "center", padding: "10px 20px",
                    borderRadius: 8, border: "none",
                    background: "linear-gradient(135deg,#1a4a7a 0%,#2a6db5 55%,#4ab3d8 100%)",
                    color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(42,109,181,0.25)", opacity: submittingEditPayment ? 0.6 : 1
                  }}
                >
                  {submittingEditPayment ? "Guardando..." : "Actualizar Pago"}
                </button>
              </div>
            </form>
          </Modal>

          {/* ── DIALOG: CONFIRMAR ELIMINACIÓN DE PAGO ── */}
          <ConfirmDialog
            open={!!deletePaymentTarget}
            onClose={() => setDeletePaymentTarget(null)}
            onConfirm={handleDeletePayment}
            loading={deletingPayment}
            title="¿Eliminar Registro de Pago?"
            description="Se eliminará de forma permanente el registro del recibo y se reajustará el saldo deudor del alumno en base a los cargos del módulo. Esta acción no se puede deshacer."
          >
            {deletePaymentTarget && (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                <div><strong>N° Recibo:</strong> {deletePaymentTarget.nro_recibo}</div>
                <div style={{ marginTop: 4 }}><strong>Monto:</strong> S/ {deletePaymentTarget.monto_pagado.toFixed(2)}</div>
                <div style={{ marginTop: 4 }}><strong>Concepto:</strong> {deletePaymentTarget.concepto}</div>
              </div>
            )}
          </ConfirmDialog>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB: CONFIGURACIÓN DE CONCEPTOS O CONTROL
          ───────────────────────────────────────────────────────────── */}
      {(activeTab === "configuracion" || activeTab === "control") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {viewingModuleFinances && activeTab === "control" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ padding: "16px 20px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, background: "#090f1a", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                      onClick={() => setViewingModuleFinances(null)}
                      style={{
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
                        padding: "6px 12px", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s"
                      }}
                    >
                      <ChevronLeft size={13} /> Volver a Grupos
                    </button>
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginTop: 14, marginBottom: 0 }}>
                    {viewingModuleFinances.nombre.toUpperCase()}
                  </h2>
                </div>
              </div>

              {loadingModuleFinances ? (
                <div style={{ padding: 60, textAlign: "center", color: "rgba(255,255,255,0.4)" }}>Cargando datos...</div>
              ) : (
                <div style={{ overflowX: "auto", background: "#090f1a", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)" }}>
                        <th style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 700 }}>ESTUDIANTE / DNI</th>
                        <th style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 700 }}>MATRÍCULA</th>
                        <th style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 700 }}>PENSIÓN</th>
                        <th style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 700 }}>OTROS</th>
                        <th style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 700, textAlign: "right" }}>DEUDA TOTAL</th>
                        <th style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 700, textAlign: "center" }}>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moduleStudents.map(m => {
                        const alum = m.alumnos;
                        if (!alum) return null;

                        const cargos = allCargos.filter(c => c.modulo_id === viewingModuleFinances.id);
                        const costMat = cargos.filter(c => c.concepto === "MATRICULA").reduce((s, c) => s + Number(c.monto), 0);
                        const costPen = cargos.filter(c => c.concepto === "PENSION").reduce((s, c) => s + Number(c.monto), 0);
                        const costOtr = cargos.filter(c => c.concepto === "OTROS").reduce((s, c) => s + Number(c.monto), 0);

                        let paidMat = 0, paidPen = 0, paidOtr = 0;
                        modulePayments.forEach(p => {
                          if (p.alumno_id === alum.id) {
                            if (p.concepto === "MATRICULA") paidMat += p.monto_pagado;
                            if (p.concepto === "PENSION") paidPen += p.monto_pagado;
                            if (p.concepto === "OTROS") paidOtr += p.monto_pagado;
                          }
                        });

                        const remMat = Math.max(0, costMat - paidMat);
                        const remPen = Math.max(0, costPen - paidPen);
                        const remOtr = Math.max(0, costOtr - paidOtr);
                        const deudaTotalEstudiante = remMat + remPen + remOtr;

                        return (
                          <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <td style={{ padding: "14px 20px" }}>
                              <div style={{ fontWeight: 700, color: "#fff" }}>{`${alum.apellidos?.toUpperCase()}, ${alum.nombres?.toUpperCase()}`}</div>
                              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>DNI: {alum.dni} | Celular: {alum.celular || "N/A"}</div>
                            </td>
                            <td style={{ padding: "14px 20px", color: remMat > 0 ? "#60a5fa" : "rgba(255,255,255,0.3)" }}>
                              {costMat > 0 ? (remMat > 0 ? `Debe S/ ${remMat.toFixed(2)}` : "Pagado") : "—"}
                            </td>
                            <td style={{ padding: "14px 20px", color: remPen > 0 ? "#34d399" : "rgba(255,255,255,0.3)" }}>
                              {costPen > 0 ? (remPen > 0 ? `Debe S/ ${remPen.toFixed(2)}` : "Pagado") : "—"}
                            </td>
                            <td style={{ padding: "14px 20px", color: remOtr > 0 ? "#fbbf24" : "rgba(255,255,255,0.3)" }}>
                              {costOtr > 0 ? (remOtr > 0 ? `Debe S/ ${remOtr.toFixed(2)}` : "Pagado") : "—"}
                            </td>
                            <td style={{ padding: "14px 20px", color: deudaTotalEstudiante > 0 ? "#f87171" : "rgba(255,255,255,0.3)", fontWeight: 700, textAlign: "right" }}>
                              {deudaTotalEstudiante > 0 ? `S/ ${deudaTotalEstudiante.toFixed(2)}` : "AL DÍA"}
                            </td>
                            <td style={{ padding: "14px 20px", textAlign: "center" }}>
                              <button
                                onClick={() => {
                                  setDni(alum.dni);
                                  setActiveTab("pensiones");
                                  setTimeout(() => {
                                    const searchBtn = document.getElementById("btn-search-pensiones");
                                    if (searchBtn) searchBtn.click();
                                  }, 150);
                                }}
                                style={{ background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.3)", borderRadius: 6, padding: "8px 12px", color: "#60a5fa", fontSize: 10, fontWeight: 700, cursor: "pointer", alignSelf: "center", justifySelf: "center" }}
                              >
                                VER ESTADO / COBRAR
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {moduleStudents.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
                            No hay estudiantes matriculados en este módulo.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: 0 }}>
                  {activeTab === "configuracion" ? "Configurar Conceptos de Cobro (Cargos) por Módulo" : "Control Financiero y Estado de Pagos por Módulo"}
                </h2>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "6px 0 16px", lineHeight: 1.4 }}>
                  {activeTab === "configuracion"
                    ? "Defina los montos obligatorios que los estudiantes deben pagar por cada módulo (ej. matrícula, pensión del mes, certificaciones). Al matricularse en el módulo, la deuda se generará en base a estos cargos."
                    : "Seleccione el módulo para visualizar su grupo de estudiantes, monitorear deudas pendientes y llevar un mejor control del estado económico grupal."}
                </p>
              </div>

              {/* Controles de Búsqueda y Filtros de Configuración */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", width: "100%", background: "rgba(255,255,255,0.02)", padding: "16px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                {/* Buscador de módulos */}
                <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
                  <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)" }} />
                  <input
                    type="text"
                    placeholder="Buscar módulo por nombre, aula, profesor o local..."
                    value={searchModConfig}
                    onChange={e => setSearchModConfig(e.target.value)}
                    style={{ ...inp, paddingLeft: 36, height: 38, fontSize: 12 }}
                  />
                </div>

                {/* Selector de Agrupamiento (Organización por carpetas) */}
                <div style={{ display: "flex", gap: 6, background: "rgba(10,22,44,0.7)", padding: "4px", borderRadius: 10, border: "1px solid rgba(42,109,181,0.22)", height: 40, alignItems: "center", boxSizing: "border-box" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setGroupByConfig("todos");
                      setExpandedGroups({});
                    }}
                    style={{
                      background: groupByConfig === "todos" ? "rgba(74,179,216,0.15)" : "transparent",
                      border: "none",
                      borderRadius: 8,
                      padding: "0 12px",
                      height: 32,
                      color: groupByConfig === "todos" ? "#4ab3d8" : "rgba(120, 160, 210, 0.65)",
                      fontWeight: groupByConfig === "todos" ? 700 : 500,
                      fontSize: 11,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.2s"
                    }}
                  >
                    <Grid size={13} />
                    VER TODOS (LISTA)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGroupByConfig("carrera");
                      setExpandedGroups({});
                    }}
                    style={{
                      background: groupByConfig === "carrera" ? "rgba(74,179,216,0.15)" : "transparent",
                      border: "none",
                      borderRadius: 8,
                      padding: "0 12px",
                      height: 32,
                      color: groupByConfig === "carrera" ? "#4ab3d8" : "rgba(120, 160, 210, 0.65)",
                      fontWeight: groupByConfig === "carrera" ? 700 : 500,
                      fontSize: 11,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.2s"
                    }}
                  >
                    <Folder size={13} />
                    POR CARRERA
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGroupByConfig("aula");
                      setExpandedGroups({});
                    }}
                    style={{
                      background: groupByConfig === "aula" ? "rgba(74,179,216,0.15)" : "transparent",
                      border: "none",
                      borderRadius: 8,
                      padding: "0 12px",
                      height: 32,
                      color: groupByConfig === "aula" ? "#4ab3d8" : "rgba(120, 160, 210, 0.65)",
                      fontWeight: groupByConfig === "aula" ? 700 : 500,
                      fontSize: 11,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.2s"
                    }}
                  >
                    <Folder size={13} />
                    POR AULA
                  </button>
                </div>

                {/* Selector de Carrera */}
                <div style={{ position: "relative", width: 220 }}>
                  <select
                    value={filterCarreraConfig}
                    onChange={e => setFilterCarreraConfig(e.target.value)}
                    style={{ ...inp, height: 38, fontSize: 12, paddingRight: 30, cursor: "pointer" }}
                  >
                    <option value="">Todas las Carreras</option>
                    {carreras.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Filtro Fecha Desde */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>DESDE:</span>
                  <input
                    type="date"
                    value={filterStartDateConfig}
                    onChange={e => setFilterStartDateConfig(e.target.value)}
                    style={{ ...inp, width: 130, height: 38, fontSize: 11, padding: "0 8px", cursor: "pointer", colorScheme: "dark" }}
                  />
                </div>

                {/* Filtro Fecha Hasta */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>HASTA:</span>
                  <input
                    type="date"
                    value={filterEndDateConfig}
                    onChange={e => setFilterEndDateConfig(e.target.value)}
                    style={{ ...inp, width: 130, height: 38, fontSize: 11, padding: "0 8px", cursor: "pointer", colorScheme: "dark" }}
                  />
                </div>

                {/* Limpiar Filtros */}
                {(searchModConfig || filterCarreraConfig || filterStartDateConfig || filterEndDateConfig) && (
                  <button
                    onClick={() => { setSearchModConfig(""); setFilterCarreraConfig(""); setFilterStartDateConfig(""); setFilterEndDateConfig(""); }}
                    style={{
                      background: "rgba(248,113,113,0.08)",
                      border: "1px solid rgba(248,113,113,0.18)",
                      color: "#f87171",
                      height: 38,
                      padding: "0 12px",
                      borderRadius: 8,
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    <XCircle size={13} /> Limpiar
                  </button>
                )}
              </div>

              {loadingModulos ? (
                <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                  Cargando módulos y conceptos...
                </div>
              ) : filteredModulosConfig.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 12, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
                  No se encontraron módulos con los filtros aplicados.
                </div>
              ) : groupByConfig === "todos" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
                  {filteredModulosConfig.map(m => {
                    const cargos = allCargos.filter(c => c.modulo_id === m.id);
                    const totalCargos = cargos.reduce((s, c) => s + Number(c.monto), 0);

                    return (
                      <div key={m.id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20, background: "#090f1a", display: "flex", flexDirection: "column", gap: 14 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: "#dbeafe", lineHeight: 1.3 }}>{m.nombre.toUpperCase()}</div>

                          {/* Etiquetas */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                            {/* Modalidad */}
                            <span style={{
                              fontSize: 8.5,
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 12,
                              textTransform: "uppercase",
                              background: m.modalidad === "virtual" ? "rgba(139, 92, 246, 0.15)" : m.modalidad === "semipresencial" ? "rgba(245, 158, 11, 0.15)" : "rgba(59, 130, 246, 0.15)",
                              color: m.modalidad === "virtual" ? "#a78bfa" : m.modalidad === "semipresencial" ? "#fbbf24" : "#60a5fa",
                              border: `1px solid ${m.modalidad === "virtual" ? "rgba(139, 92, 246, 0.2)" : m.modalidad === "semipresencial" ? "rgba(245, 158, 11, 0.2)" : "rgba(59, 130, 246, 0.2)"}`
                            }}>
                              {m.modalidad}
                            </span>

                            {/* Fechas */}
                            {(m.fecha_inicio || m.fecha_fin) && (
                              <span style={{
                                fontSize: 8.5,
                                fontWeight: 600,
                                padding: "2px 6px",
                                borderRadius: 12,
                                background: "rgba(255, 255, 255, 0.05)",
                                color: "rgba(255, 255, 255, 0.6)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3
                              }}>
                                <Calendar size={9} />
                                {m.fecha_inicio ? new Date(m.fecha_inicio + "T00:00:00").toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : "?"} - {m.fecha_fin ? new Date(m.fecha_fin + "T00:00:00").toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : "?"}
                              </span>
                            )}

                            {/* Horario */}
                            {m.horario && (
                              <span style={{
                                fontSize: 8.5,
                                fontWeight: 600,
                                padding: "2px 6px",
                                borderRadius: 12,
                                background: "rgba(16, 185, 129, 0.1)",
                                color: "#34d399",
                                border: "1px solid rgba(16, 185, 129, 0.15)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3
                              }}>
                                <Clock size={9} />
                                {m.horario}
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: 9.5, color: "rgba(74,179,216,0.6)", marginTop: 8, fontWeight: 700, letterSpacing: "0.02em" }}>
                            CARRERA: {m.carreras?.nombre.toUpperCase() || "SIN CARRERA"}
                          </div>
                          {m.aula && (
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                              Aula: <strong style={{ color: "#fff" }}>{m.aula}</strong> {m.local ? `(${m.local})` : ""}
                            </div>
                          )}
                        </div>

                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
                            <span>CONCEPTOS CONFIGURADOS</span>
                            <span style={{ color: "#dbeafe" }}>S/ {totalCargos.toFixed(2)}</span>
                          </div>

                          {cargos.length === 0 ? (
                            <div style={{ padding: "16px 0", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 11, border: "1px dashed rgba(255,255,255,0.04)", borderRadius: 8 }}>
                              Sin cargos. Los alumnos no acumularán deuda.
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {cargos.map(c => (
                                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8 }}>
                                  <div>
                                    <span style={{
                                      fontSize: 8.5,
                                      fontWeight: 700,
                                      padding: "2px 6px",
                                      borderRadius: 3,
                                      background: c.concepto === "MATRICULA" ? "rgba(59,130,246,0.12)" : c.concepto === "OTROS" ? "rgba(107,114,128,0.15)" : "rgba(16,185,129,0.12)",
                                      color: c.concepto === "MATRICULA" ? "#60a5fa" : c.concepto === "OTROS" ? "#9ca3af" : "#34d399",
                                      border: c.concepto === "MATRICULA" ? "1px solid rgba(59,130,246,0.15)" : c.concepto === "OTROS" ? "1px solid rgba(107,114,128,0.15)" : "1px solid rgba(16,185,129,0.15)"
                                    }}>
                                      {c.concepto}
                                    </span>
                                    <div style={{ fontSize: 11, color: "#fff", fontWeight: 700, marginTop: 4 }}>
                                      S/ {Number(c.monto).toFixed(2)}
                                    </div>
                                    {c.descripcion && (
                                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{c.descripcion}</div>
                                    )}
                                  </div>
                                  {activeTab === "configuracion" && (
                                    <button
                                      onClick={() => handleDeleteCargo(c.id)}
                                      style={{
                                        background: "transparent", border: "none", color: "rgba(248,113,113,0.5)",
                                        padding: 6, cursor: "pointer", borderRadius: 6, display: "flex", alignItems: "center"
                                      }}
                                      title="Eliminar Concepto"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {activeTab === "configuracion" ? (
                          <button
                            onClick={() => openNewCargo(m.id)}
                            style={{
                              width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 10, fontWeight: 700,
                              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                              marginTop: "auto"
                            }}
                          >
                            <Plus size={12} /> Agregar Concepto de Cobro
                          </button>
                        ) : (
                          <button
                            onClick={() => loadModuleFinances(m)}
                            style={{
                              width: "100%", background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.3)",
                              borderRadius: 8, padding: "8px 12px", color: "#60a5fa", fontSize: 10, fontWeight: 700,
                              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                              marginTop: "auto"
                            }}
                          >
                            <Users size={12} /> Ver Estado del Grupo
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Controles para expandir/colapsar todas las carpetas */}
                  <div style={{ display: "flex", gap: 16, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => {
                        const next: Record<string, boolean> = {};
                        Object.keys(nestedGroupedModulos).forEach(topKey => {
                          next[topKey] = true;
                          Object.keys(nestedGroupedModulos[topKey]).forEach(subKey => {
                            next[`${topKey}::${subKey}`] = true;
                          });
                        });
                        setExpandedGroups(next);
                      }}
                      style={{
                        background: "transparent", border: "none", color: "#4ab3d8", fontSize: 11, cursor: "pointer", fontWeight: 600
                      }}
                    >
                      [+] Abrir todas las carpetas
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next: Record<string, boolean> = {};
                        Object.keys(nestedGroupedModulos).forEach(topKey => {
                          next[topKey] = false;
                          Object.keys(nestedGroupedModulos[topKey]).forEach(subKey => {
                            next[`${topKey}::${subKey}`] = false;
                          });
                        });
                        setExpandedGroups(next);
                      }}
                      style={{
                        background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", fontWeight: 600
                      }}
                    >
                      [-] Cerrar todas las carpetas
                    </button>
                  </div>

                  {Object.keys(nestedGroupedModulos).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map(topKey => {
                    const subGroups = nestedGroupedModulos[topKey];
                    const isTopOpen = !!expandedGroups[topKey]; // Cerrado por defecto

                    // Calcular total módulos y cargos configurados en este grupo de nivel superior
                    let totalModulesInTop = 0;
                    let totalCargosInTop = 0;
                    Object.keys(subGroups).forEach(subKey => {
                      const subModules = subGroups[subKey];
                      totalModulesInTop += subModules.length;
                      subModules.forEach(m => {
                        const cargos = allCargos.filter(c => c.modulo_id === m.id);
                        totalCargosInTop += cargos.reduce((s, c) => s + Number(c.monto), 0);
                      });
                    });

                    return (
                      <div key={topKey} style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, background: "rgba(8,16,34,0.45)", overflow: "hidden" }}>
                        {/* Header de la carpeta de nivel superior */}
                        <button
                          type="button"
                          onClick={() => setExpandedGroups(prev => ({ ...prev, [topKey]: !isTopOpen }))}
                          style={{
                            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "14px 20px", background: "rgba(255,255,255,0.02)", border: "none", cursor: "pointer",
                            textAlign: "left", transition: "background 0.2s"
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {isTopOpen ? (
                              <FolderOpen size={18} style={{ color: "#4ab3d8" }} />
                            ) : (
                              <Folder size={18} style={{ color: "#4ab3d8" }} />
                            )}
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                                {groupByConfig === "aula" ? `AULA: ${topKey}` : `${topKey}`}
                              </span>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                                {totalModulesInTop} {totalModulesInTop === 1 ? "módulo" : "módulos"} • Cargos configurados: S/ {totalCargosInTop.toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <div>
                            {isTopOpen ? (
                              <ChevronDown size={18} style={{ color: "rgba(255,255,255,0.4)" }} />
                            ) : (
                              <ChevronRight size={18} style={{ color: "rgba(255,255,255,0.4)" }} />
                            )}
                          </div>
                        </button>

                        {/* Contenido de nivel superior (Carpetas internas) */}
                        {isTopOpen && (
                          <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: 12 }}>
                            {Object.keys(subGroups).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map(subKey => {
                              const subModules = subGroups[subKey];
                              const subGroupFullKey = `${topKey}::${subKey}`;
                              const isSubOpen = !!expandedGroups[subGroupFullKey]; // Cerrado por defecto

                              const totalModulesInSub = subModules.length;
                              let totalCargosInSub = 0;
                              subModules.forEach(m => {
                                const cargos = allCargos.filter(c => c.modulo_id === m.id);
                                totalCargosInSub += cargos.reduce((s, c) => s + Number(c.monto), 0);
                              });

                              return (
                                <div key={subKey} style={{ border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, background: "rgba(10,22,44,0.35)", overflow: "hidden" }}>
                                  {/* Sub-header de la carpeta */}
                                  <button
                                    type="button"
                                    onClick={() => setExpandedGroups(prev => ({ ...prev, [subGroupFullKey]: !isSubOpen }))}
                                    style={{
                                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                                      padding: "10px 16px", background: "rgba(255,255,255,0.01)", border: "none", cursor: "pointer",
                                      textAlign: "left", transition: "background 0.2s"
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.01)"}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                      {isSubOpen ? (
                                        <FolderOpen size={16} style={{ color: "#74b9ff" }} />
                                      ) : (
                                        <Folder size={16} style={{ color: "#74b9ff" }} />
                                      )}
                                      <div>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", textTransform: "uppercase" }}>
                                          {groupByConfig === "carrera" ? `AULA: ${subKey}` : `${subKey}`}
                                        </span>
                                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginLeft: 8 }}>
                                          ({totalModulesInSub} {totalModulesInSub === 1 ? "módulo" : "módulos"} • S/ {totalCargosInSub.toFixed(2)})
                                        </span>
                                      </div>
                                    </div>
                                    <div>
                                      {isSubOpen ? (
                                        <ChevronDown size={16} style={{ color: "rgba(255,255,255,0.3)" }} />
                                      ) : (
                                        <ChevronRight size={16} style={{ color: "rgba(255,255,255,0.3)" }} />
                                      )}
                                    </div>
                                  </button>

                                  {/* Grid de módulos en sub-nivel */}
                                  {isSubOpen && (
                                    <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,0.03)", background: "rgba(0,0,0,0.1)" }}>
                                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                                        {subModules.map(m => {
                                          const cargos = allCargos.filter(c => c.modulo_id === m.id);
                                          const totalCargos = cargos.reduce((s, c) => s + Number(c.monto), 0);

                                          return (
                                            <div key={m.id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 18, background: "#090f1a", display: "flex", flexDirection: "column", gap: 12 }}>
                                              <div>
                                                <div style={{ fontWeight: 800, fontSize: 13.5, color: "#dbeafe", lineHeight: 1.3 }}>{m.nombre.toUpperCase()}</div>

                                                {/* Etiquetas */}
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                                                  {/* Modalidad */}
                                                  <span style={{
                                                    fontSize: 8.5,
                                                    fontWeight: 700,
                                                    padding: "2px 6px",
                                                    borderRadius: 12,
                                                    textTransform: "uppercase",
                                                    background: m.modalidad === "virtual" ? "rgba(139, 92, 246, 0.15)" : m.modalidad === "semipresencial" ? "rgba(245, 158, 11, 0.15)" : "rgba(59, 130, 246, 0.15)",
                                                    color: m.modalidad === "virtual" ? "#a78bfa" : m.modalidad === "semipresencial" ? "#fbbf24" : "#60a5fa",
                                                    border: `1px solid ${m.modalidad === "virtual" ? "rgba(139, 92, 246, 0.2)" : m.modalidad === "semipresencial" ? "rgba(245, 158, 11, 0.2)" : "rgba(59, 130, 246, 0.2)"}`
                                                  }}>
                                                    {m.modalidad}
                                                  </span>

                                                  {/* Fechas */}
                                                  {(m.fecha_inicio || m.fecha_fin) && (
                                                    <span style={{
                                                      fontSize: 8.5,
                                                      fontWeight: 600,
                                                      padding: "2px 6px",
                                                      borderRadius: 12,
                                                      background: "rgba(255, 255, 255, 0.05)",
                                                      color: "rgba(255, 255, 255, 0.6)",
                                                      border: "1px solid rgba(255, 255, 255, 0.1)",
                                                      display: "inline-flex",
                                                      alignItems: "center",
                                                      gap: 3
                                                    }}>
                                                      <Calendar size={9} />
                                                      {m.fecha_inicio ? new Date(m.fecha_inicio + "T00:00:00").toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : "?"} - {m.fecha_fin ? new Date(m.fecha_fin + "T00:00:00").toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : "?"}
                                                    </span>
                                                  )}

                                                  {/* Horario */}
                                                  {m.horario && (
                                                    <span style={{
                                                      fontSize: 8.5,
                                                      fontWeight: 600,
                                                      padding: "2px 6px",
                                                      borderRadius: 12,
                                                      background: "rgba(16, 185, 129, 0.1)",
                                                      color: "#34d399",
                                                      border: "1px solid rgba(16, 185, 129, 0.15)",
                                                      display: "inline-flex",
                                                      alignItems: "center",
                                                      gap: 3
                                                    }}>
                                                      <Clock size={9} />
                                                      {m.horario}
                                                    </span>
                                                  )}
                                                </div>

                                                <div style={{ fontSize: 9.5, color: "rgba(74,179,216,0.6)", marginTop: 8, fontWeight: 700, letterSpacing: "0.02em" }}>
                                                  CARRERA: {m.carreras?.nombre.toUpperCase() || "SIN CARRERA"}
                                                </div>
                                                {m.aula && (
                                                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                                                    Aula: <strong style={{ color: "#fff" }}>{m.aula}</strong> {m.local ? `(${m.local})` : ""}
                                                  </div>
                                                )}
                                              </div>

                                              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
                                                <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                                                  <span>CONCEPTOS CONFIGURADOS</span>
                                                  <span style={{ color: "#dbeafe" }}>S/ {totalCargos.toFixed(2)}</span>
                                                </div>

                                                {cargos.length === 0 ? (
                                                  <div style={{ padding: "12px 0", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 10.5, border: "1px dashed rgba(255,255,255,0.04)", borderRadius: 8 }}>
                                                    Sin cargos. Los alumnos no acumularán deuda.
                                                  </div>
                                                ) : (
                                                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                    {cargos.map(c => (
                                                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8 }}>
                                                        <div>
                                                          <span style={{
                                                            fontSize: 8,
                                                            fontWeight: 700,
                                                            padding: "1.5px 5px",
                                                            borderRadius: 3,
                                                            background: c.concepto === "MATRICULA" ? "rgba(59,130,246,0.12)" : c.concepto === "OTROS" ? "rgba(107,114,128,0.15)" : "rgba(16,185,129,0.12)",
                                                            color: c.concepto === "MATRICULA" ? "#60a5fa" : c.concepto === "OTROS" ? "#9ca3af" : "#34d399",
                                                            border: c.concepto === "MATRICULA" ? "1px solid rgba(59,130,246,0.15)" : c.concepto === "OTROS" ? "1px solid rgba(107,114,128,0.15)" : "1px solid rgba(16,185,129,0.15)"
                                                          }}>
                                                            {c.concepto}
                                                          </span>
                                                          <div style={{ fontSize: 10.5, color: "#fff", fontWeight: 700, marginTop: 3 }}>
                                                            S/ {Number(c.monto).toFixed(2)}
                                                          </div>
                                                          {c.descripcion && (
                                                            <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)", marginTop: 1.5 }}>{c.descripcion}</div>
                                                          )}
                                                        </div>
                                                        {activeTab === "configuracion" && (
                                                          <button
                                                            onClick={() => handleDeleteCargo(c.id)}
                                                            style={{
                                                              background: "transparent", border: "none", color: "rgba(248,113,113,0.5)",
                                                              padding: 4, cursor: "pointer", borderRadius: 6, display: "flex", alignItems: "center"
                                                            }}
                                                            title="Eliminar Concepto"
                                                          >
                                                            <Trash2 size={12} />
                                                          </button>
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>

                                              {activeTab === "configuracion" ? (
                                                <button
                                                  onClick={() => openNewCargo(m.id)}
                                                  style={{
                                                    width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                                                    borderRadius: 8, padding: "7px 10px", color: "#fff", fontSize: 9.5, fontWeight: 700,
                                                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                                                    marginTop: "auto"
                                                  }}
                                                >
                                                  <Plus size={11} /> Agregar Concepto de Cobro
                                                </button>
                                              ) : (
                                                <button
                                                  onClick={() => loadModuleFinances(m)}
                                                  style={{
                                                    width: "100%", background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.3)",
                                                    borderRadius: 8, padding: "7px 10px", color: "#60a5fa", fontSize: 9.5, fontWeight: 700,
                                                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                                                    marginTop: "auto"
                                                  }}
                                                >
                                                  <Users size={11} /> Ver Estado del Grupo
                                                </button>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* MODAL: CREAR CONCEPTO DE COBRO */}
              <Modal open={showCargoForm} onClose={() => setShowCargoForm(false)} title="Agregar Concepto de Cobro" maxWidth="450px">
                <form onSubmit={handleCreateCargo} className="space-y-4" style={{ fontFamily: "'Inter', sans-serif" }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(74,179,216,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>CONCEPTO / MOTIVO *</label>
                    <select
                      value={cargoForm.concepto}
                      onChange={e => setCargoForm(p => ({ ...p, concepto: e.target.value }))}
                      required
                      className="w-full h-10 text-sm bg-blue-950 bg-opacity-50 border border-blue-800 rounded-lg text-white outline-none"
                      style={{ padding: "0 12px" }}
                    >
                      <option value="PENSION">PENSIÓN (MENSUALIDAD)</option>
                      <option value="MATRICULA">MATRÍCULA</option>
                      <option value="OTROS">OTROS</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(74,179,216,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>MONTO A COBRAR (S/) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={cargoForm.monto}
                      onChange={e => setCargoForm(p => ({ ...p, monto: e.target.value }))}
                      className="w-full h-10 text-sm bg-blue-950 bg-opacity-50 border border-blue-800 rounded-lg text-white outline-none"
                      style={{ padding: "0 12px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(74,179,216,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>DESCRIPCIÓN / DETALLE</label>
                    <input
                      placeholder="Ej: Cuota 1, Matrícula Semestre I, etc."
                      value={cargoForm.descripcion}
                      onChange={e => setCargoForm(p => ({ ...p, descripcion: e.target.value }))}
                      className="w-full h-10 text-sm bg-blue-950 bg-opacity-50 border border-blue-800 rounded-lg text-white outline-none"
                      style={{ padding: "0 12px" }}
                    />
                  </div>
                  <div className="flex justify-end gap-3 border-t border-blue-900 border-opacity-30" style={{ paddingTop: 16 }}>
                    <button type="button" onClick={() => setShowCargoForm(false)} className="text-xs font-bold text-blue-300 hover:text-white transition-colors" style={{ padding: "8px 16px", background: "transparent", border: "none", cursor: "pointer" }}>Cancelar</button>
                    <button type="submit" disabled={submittingCargo} className="text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 transition-colors" style={{ padding: "8px 20px", border: "none", cursor: "pointer", borderRadius: 8 }}>
                      <Plus size={14} /> {submittingCargo ? "Creando..." : "Crear Concepto"}
                    </button>
                  </div>
                </form>
              </Modal>
            </>
          )}
        </div>
      )}
    </div>
  );
}
