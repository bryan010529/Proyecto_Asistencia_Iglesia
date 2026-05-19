import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Avatar, Badge, Button, Input, Modal } from '../components/Primitives';
import { useAuth } from '../context/AuthContext';

const TODAY = new Date().toISOString().slice(0, 10);

const EMPTY_CAMP_FORM = {
  nombre: '',
  descripcion: '',
  fechaInicio: TODAY,
  fechaFin: TODAY,
  capacidadMaxima: '',
  precioBase: '',
  estado: 'activo',
};

const EMPTY_INSCRIPCION_FORM = {
  miembroId: '',
  fechaInscripcion: TODAY,
  estado: 'pendiente',
};

const EMPTY_PAGO_FORM = {
  monto: '',
  fechaPago: TODAY,
  metodoPago: 'efectivo',
  referencia: '',
  nota: '',
};

const EMPTY_DESCUENTO_FORM = {
  motivo: '',
  monto: '',
};

const EMPTY_GASTO_FORM = {
  concepto: '',
  monto: '',
  fechaGasto: TODAY,
  nota: '',
};

const EMPTY_CABANA_FORM = {
  nombre: '',
  capacidad: '',
};

function getErrorMessage(error, fallback) {
  return error?.message || error?.response?.data?.error || fallback;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('es-DO');
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('es-DO', {
    style: 'currency',
    currency: 'DOP',
    maximumFractionDigits: 2,
  });
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function mapCamp(camp) {
  return {
    ...camp,
    fechaInicio: camp.fecha_inicio,
    fechaFin: camp.fecha_fin,
    capacidadMaxima: camp.capacidad_maxima,
    precioBase: Number(camp.precio_base || 0),
  };
}

function mapInscripcion(inscripcion, cabanaAsignada = null) {
  return {
    ...inscripcion,
    miembroId: inscripcion.miembro_id,
    miembroNombre: inscripcion.miembros?.nombre || '',
    miembroCedula: inscripcion.miembros?.cedula || '',
    fechaInscripcion: inscripcion.fecha_inscripcion,
    totalPagado: Number(inscripcion.total_pagado || 0),
    totalDescuentos: Number(inscripcion.total_descuentos || 0),
    saldo: Number(inscripcion.saldo || 0),
    cabanaAsignada,
  };
}

function mapPago(pago) {
  return {
    ...pago,
    fechaPago: pago.fecha_pago,
    metodoPago: pago.metodo_pago,
  };
}

function mapGasto(gasto) {
  return {
    ...gasto,
    concepto: gasto.descripcion,
    fechaGasto: gasto.fecha,
    nota: gasto.categoria || '',
    registradoPorNombre: '',
  };
}

const ESTADO_CAMP_LABEL = { activo: 'Activo', cerrado: 'Cerrado', cancelado: 'Cancelado' };
const ESTADO_INSC_LABEL = { pendiente: 'Pendiente', confirmada: 'Confirmada', cancelada: 'Cancelada' };
const ESTADO_INSC_VARIANT = { pendiente: 'neutral', confirmada: 'success', cancelada: 'danger' };

export default function CampamentoScreen({ toast }) {
  const { user } = useAuth();
  const [selectedCampId, setSelectedCampId] = useState(null);
  const [tab, setTab] = useState('inscripciones');
  const [memberSearch, setMemberSearch] = useState('');
  const [updatingEstadoId, setUpdatingEstadoId] = useState(null);
  const [deletingPagoId, setDeletingPagoId] = useState(null);
  const [deletingDescuentoId, setDeletingDescuentoId] = useState(null);
  const [deletingGastoId, setDeletingGastoId] = useState(null);
  const [desasignandoInscId, setDesasignandoInscId] = useState(null);

  const [campModalOpen, setCampModalOpen] = useState(false);
  const [editingCamp, setEditingCamp] = useState(null);
  const [campForm, setCampForm] = useState(EMPTY_CAMP_FORM);
  const [savingCamp, setSavingCamp] = useState(false);

  const [inscModalOpen, setInscModalOpen] = useState(false);
  const [inscForm, setInscForm] = useState(EMPTY_INSCRIPCION_FORM);
  const [savingInsc, setSavingInsc] = useState(false);
  const [quickPersonMode, setQuickPersonMode] = useState(false);
  const [quickForm, setQuickForm] = useState({ nombre: '', correo: '', celula: '' });

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedInsc, setSelectedInsc] = useState(null);
  const [deletingInscId, setDeletingInscId] = useState(null);
  const [inscripcionesState, setInscripcionesState] = useState([]);
  const [cabanasState, setCabanasState] = useState([]);
  const [gastosState, setGastosState] = useState([]);
  const [inscDetailState, setInscDetailState] = useState(null);
  const [reporteState, setReporteState] = useState(null);
  const [pagoForm, setPagoForm] = useState(EMPTY_PAGO_FORM);
  const [savingPago, setSavingPago] = useState(false);
  const [descuentoForm, setDescuentoForm] = useState(EMPTY_DESCUENTO_FORM);
  const [savingDescuento, setSavingDescuento] = useState(false);
  const [gastoForm, setGastoForm] = useState(EMPTY_GASTO_FORM);
  const [savingGasto, setSavingGasto] = useState(false);

  const [cabanaModalOpen, setCabanaModalOpen] = useState(false);
  const [cabanaForm, setCabanaForm] = useState(EMPTY_CABANA_FORM);
  const [savingCabana, setSavingCabana] = useState(false);

  const [asignarModalOpen, setAsignarModalOpen] = useState(false);
  const [asignarCabanaId, setAsignarCabanaId] = useState('');
  const [asignarInscId, setAsignarInscId] = useState('');
  const [savingAsignacion, setSavingAsignacion] = useState(false);
  const [campamentos, setCampamentos] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  async function cargarCampamentos() {
    setLoading(true);
    const { data, error } = await supabase
      .from('campamentos')
      .select('*')
      .order('fecha_inicio', { ascending: false });

    if (error) {
      setLoading(false);
      throw error;
    }

    setCampamentos((data || []).map(mapCamp));
    setLoading(false);
  }

  async function cargarMiembros() {
    const { data, error } = await supabase
      .from('miembros')
      .select('id, nombre, cedula, estado')
      .eq('estado', 'activo')
      .order('nombre');

    if (error) {
      throw error;
    }

    setMembers(data || []);
  }

  async function cargarInscripciones(campamentoId = selectedCampId) {
    if (!campamentoId) {
      setInscripcionesState([]);
      return [];
    }

    const { data, error } = await supabase
      .from('inscripciones_campamento')
      .select('*, miembros(nombre, cedula)')
      .eq('campamento_id', campamentoId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const inscripciones = data || [];
    const ids = inscripciones.map((item) => item.id);
    let cabanasPorInscripcion = new Map();

    if (ids.length) {
      const { data: asignacionesData } = await supabase
        .from('asignaciones_cabana')
        .select('inscripcion_id, cabanas(nombre)')
        .in('inscripcion_id', ids);

      cabanasPorInscripcion = new Map((asignacionesData || []).map((item) => [item.inscripcion_id, item.cabanas?.nombre || null]));
    }

    const nextInscripciones = inscripciones.map((item) => mapInscripcion(item, cabanasPorInscripcion.get(item.id) || null));
    setInscripcionesState(nextInscripciones);
    return nextInscripciones;
  }

  async function cargarCabanas(campamentoId = selectedCampId) {
    if (!campamentoId) {
      setCabanasState([]);
      return [];
    }

    const { data, error } = await supabase
      .from('cabanas')
      .select('*')
      .eq('campamento_id', campamentoId)
      .order('nombre');

    if (error) {
      throw error;
    }

    const cabanas = data || [];
    const cabanaIds = cabanas.map((item) => item.id);
    let miembrosPorCabana = new Map();

    if (cabanaIds.length) {
      const { data: asignacionesData } = await supabase
        .from('asignaciones_cabana')
        .select('inscripcion_id, cabana_id, inscripciones_campamento(id, estado, miembros(nombre, cedula))')
        .in('cabana_id', cabanaIds);

      miembrosPorCabana = (asignacionesData || []).reduce((accumulator, item) => {
        const current = accumulator.get(item.cabana_id) || [];
        current.push({
          inscripcionId: item.inscripcion_id,
          miembroNombre: item.inscripciones_campamento?.miembros?.nombre || '',
          miembroCedula: item.inscripciones_campamento?.miembros?.cedula || '',
          estado: item.inscripciones_campamento?.estado || 'pendiente',
        });
        accumulator.set(item.cabana_id, current);
        return accumulator;
      }, new Map());
    }

    const nextCabanas = cabanas.map((item) => {
      const miembrosAsignados = miembrosPorCabana.get(item.id) || [];
      return {
        ...item,
        miembros: miembrosAsignados,
        asignados: miembrosAsignados.length,
      };
    });

    setCabanasState(nextCabanas);
    return nextCabanas;
  }

  async function cargarGastos(campamentoId = selectedCampId) {
    if (!campamentoId) {
      setGastosState([]);
      return [];
    }

    const { data, error } = await supabase
      .from('gastos_campamento')
      .select('*')
      .eq('campamento_id', campamentoId)
      .order('fecha', { ascending: false });

    if (error) {
      throw error;
    }

    const nextGastos = (data || []).map(mapGasto);
    setGastosState(nextGastos);
    return nextGastos;
  }

  async function cargarDetalleInscripcion(inscripcionId = selectedInsc?.id) {
    if (!inscripcionId) {
      setInscDetailState(null);
      return null;
    }

    const { data, error } = await supabase
      .from('inscripciones_campamento')
      .select('*, miembros(nombre, cedula)')
      .eq('id', inscripcionId)
      .single();

    if (error) {
      throw error;
    }

    const [{ data: pagosData }, { data: descuentosData }, { data: asignacionData }] = await Promise.all([
      supabase.from('pagos_campamento').select('*').eq('inscripcion_id', inscripcionId).order('fecha_pago', { ascending: false }),
      supabase.from('descuentos_campamento').select('*').eq('inscripcion_id', inscripcionId).order('created_at', { ascending: false }),
      supabase.from('asignaciones_cabana').select('cabanas(nombre)').eq('inscripcion_id', inscripcionId).maybeSingle(),
    ]);

    const detail = {
      ...mapInscripcion(data, asignacionData?.cabanas?.nombre || null),
      pagos: (pagosData || []).map(mapPago),
      descuentos: descuentosData || [],
    };

    setInscDetailState(detail);
    return detail;
  }

  async function cargarReporte(campamentoId = selectedCampId) {
    if (!campamentoId || tab !== 'reporte') {
      setReporteState(null);
      return null;
    }

    const [{ data: inscripcionesData, error: inscripcionesError }, { data: gastosData, error: gastosError }] = await Promise.all([
      supabase.from('inscripciones_campamento').select('id, estado, saldo, total_pagado, total_descuentos, miembros(tipo_miembro_id, tipos_miembro(nombre))').eq('campamento_id', campamentoId),
      supabase.from('gastos_campamento').select('monto').eq('campamento_id', campamentoId),
    ]);

    if (inscripcionesError || gastosError) {
      throw inscripcionesError || gastosError;
    }

    const inscripcionIds = (inscripcionesData || []).map((item) => item.id);
    let pagosData = [];

    if (inscripcionIds.length) {
      const { data } = await supabase
        .from('pagos_campamento')
        .select('monto, metodo_pago, inscripcion_id')
        .in('inscripcion_id', inscripcionIds);
      pagosData = data || [];
    }

    const porMetodoPagoMap = pagosData.reduce((accumulator, item) => {
      accumulator.set(item.metodo_pago, (accumulator.get(item.metodo_pago) || 0) + Number(item.monto || 0));
      return accumulator;
    }, new Map());

    const nextReporte = {
      totalInscritos: (inscripcionesData || []).length,
      confirmados: (inscripcionesData || []).filter((item) => item.estado === 'confirmada').length,
      pendientes: (inscripcionesData || []).filter((item) => item.estado === 'pendiente').length,
      cancelados: (inscripcionesData || []).filter((item) => item.estado === 'cancelada').length,
      totalIngresos: pagosData.reduce((sum, item) => sum + Number(item.monto || 0), 0),
      totalDescuentos: (inscripcionesData || []).reduce((sum, item) => sum + Number(item.total_descuentos || 0), 0),
      totalGastos: (gastosData || []).reduce((sum, item) => sum + Number(item.monto || 0), 0),
      saldoPendiente: (inscripcionesData || []).reduce((sum, item) => sum + Number(item.saldo || 0), 0),
      porMetodoPago: Array.from(porMetodoPagoMap.entries()).map(([metodoPago, total]) => ({ metodoPago, total })),
      porTipoMiembro: (() => {
        const map = new Map();
        (inscripcionesData || []).filter((i) => i.estado !== 'cancelada').forEach((i) => {
          const tipo = i.miembros?.tipos_miembro?.nombre || 'Sin tipo';
          map.set(tipo, (map.get(tipo) || 0) + 1);
        });
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([tipo, cantidad]) => ({ tipo, cantidad }));
      })(),
    };

    setReporteState(nextReporte);
    return nextReporte;
  }

  async function recalcularInscripcion(inscripcionId) {
    const [{ data: inscripcionData, error: inscripcionError }, { data: pagosData, error: pagosError }, { data: descuentosData, error: descuentosError }] = await Promise.all([
      supabase.from('inscripciones_campamento').select('id, campamentos(precio_base)').eq('id', inscripcionId).single(),
      supabase.from('pagos_campamento').select('monto').eq('inscripcion_id', inscripcionId),
      supabase.from('descuentos_campamento').select('monto').eq('inscripcion_id', inscripcionId),
    ]);

    if (inscripcionError || pagosError || descuentosError) {
      throw inscripcionError || pagosError || descuentosError;
    }

    const totalPagado = (pagosData || []).reduce((sum, item) => sum + Number(item.monto || 0), 0);
    const totalDescuentos = (descuentosData || []).reduce((sum, item) => sum + Number(item.monto || 0), 0);
    const precioBase = Number(inscripcionData?.campamentos?.precio_base || selectedCamp?.precioBase || 0);
    const saldo = Math.max(0, precioBase - totalPagado - totalDescuentos);
    const { error } = await supabase
      .from('inscripciones_campamento')
      .update({ total_pagado: totalPagado, total_descuentos: totalDescuentos, saldo })
      .eq('id', inscripcionId);

    if (error) {
      throw error;
    }
  }

  useEffect(() => {
    Promise.all([cargarCampamentos(), cargarMiembros()]).catch((error) => {
      toast({ type: 'error', title: 'No se pudieron cargar los campamentos', msg: getErrorMessage(error, 'Intenta nuevamente.') });
    });
  }, [toast]);

  useEffect(() => {
    if (!campamentos.length) {
      setSelectedCampId(null);
      return;
    }

    const exists = campamentos.some((camp) => camp.id === selectedCampId);
    if (!exists) {
      setSelectedCampId(campamentos[0].id);
    }
  }, [campamentos, selectedCampId]);

  useEffect(() => {
    Promise.all([
      cargarInscripciones(selectedCampId),
      cargarCabanas(selectedCampId),
      cargarGastos(selectedCampId),
    ]).catch((error) => {
      if (selectedCampId) {
        toast({ type: 'error', title: 'No se pudo cargar el detalle del campamento', msg: getErrorMessage(error, 'Intenta nuevamente.') });
      }
    });

    if (!selectedCampId) {
      setSelectedInsc(null);
      setInscDetailState(null);
    }
  }, [selectedCampId, toast]);

  useEffect(() => {
    cargarDetalleInscripcion(selectedInsc?.id).catch((error) => {
      if (selectedInsc?.id) {
        toast({ type: 'error', title: 'No se pudo cargar la inscripción', msg: getErrorMessage(error, 'Intenta nuevamente.') });
      }
    });
  }, [selectedInsc?.id, toast]);

  useEffect(() => {
    cargarReporte(selectedCampId).catch((error) => {
      if (selectedCampId && tab === 'reporte') {
        toast({ type: 'error', title: 'No se pudo cargar el reporte', msg: getErrorMessage(error, 'Intenta nuevamente.') });
      }
    });
  }, [selectedCampId, tab, toast]);

  useEffect(() => {
    const channel = supabase
      .channel('camp-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campamentos' }, () => {
        cargarCampamentos().catch(() => {});
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inscripciones_campamento' }, () => {
        if (selectedCampId) cargarInscripciones(selectedCampId).catch(() => {});
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos_campamento' }, () => {
        if (selectedInsc?.id) cargarDetalleInscripcion(selectedInsc.id).catch(() => {});
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [selectedCampId, selectedInsc?.id]);

  const selectedCamp = useMemo(
    () => campamentos.find((c) => c.id === selectedCampId) || null,
    [campamentos, selectedCampId],
  );

  const filteredMembers = useMemo(() => {
    const q = normalizeText(memberSearch);
    return members
      .filter((m) => !q || normalizeText(m.nombre).includes(q) || normalizeText(m.cedula).includes(q))
      .slice(0, 8);
  }, [memberSearch, members]);

  const totalRecaudado = useMemo(
    () => inscripcionesState.reduce((sum, i) => sum + Number(i.totalPagado || 0), 0),
    [inscripcionesState],
  );

  const totalGastos = useMemo(
    () => gastosState.reduce((sum, item) => sum + Number(item.monto || 0), 0),
    [gastosState],
  );

  const balanceNeto = useMemo(
    () => totalRecaudado - totalGastos,
    [totalGastos, totalRecaudado],
  );

  const inscripcionesSinCabana = useMemo(
    () => inscripcionesState.filter((i) => !i.cabanaAsignada),
    [inscripcionesState],
  );

  const sinInscribir = useMemo(() => {
    if (!selectedCampId) return null;
    const inscritosIds = new Set(inscripcionesState.filter((i) => i.estado !== 'cancelada').map((i) => i.miembroId));
    return members.filter((m) => !inscritosIds.has(m.id)).length;
  }, [selectedCampId, inscripcionesState, members]);

  function syncInscripcionState(updated) {
    if (!updated?.id) return;

    setInscripcionesState((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
    setSelectedInsc((current) => (current?.id === updated.id ? { ...current, ...updated } : current));
    setInscDetailState((current) => (current?.id === updated.id ? { ...current, ...updated } : current));
  }

  function applyDetalleActualizado(updatedDetail) {
    setInscDetailState(updatedDetail);
    setSelectedInsc((current) => (current?.id === updatedDetail?.id ? { ...current, ...updatedDetail } : current));
    setInscripcionesState((current) => current.map((item) => (
      item.id === updatedDetail.id
        ? {
          ...item,
          estado: updatedDetail.estado,
          totalPagado: updatedDetail.totalPagado,
          totalDescuentos: updatedDetail.totalDescuentos,
          saldo: updatedDetail.saldo,
          cabanaAsignada: updatedDetail.cabanaAsignada || null,
        }
        : item
    )));
  }

  function openNewCamp() {
    setEditingCamp(null);
    setCampForm(EMPTY_CAMP_FORM);
    setCampModalOpen(true);
  }

  function openEditCamp() {
    if (!selectedCamp) return;
    setEditingCamp(selectedCamp);
    setCampForm({
      nombre: selectedCamp.nombre || '',
      descripcion: selectedCamp.descripcion || '',
      fechaInicio: selectedCamp.fechaInicio || TODAY,
      fechaFin: selectedCamp.fechaFin || TODAY,
      capacidadMaxima: selectedCamp.capacidadMaxima ? String(selectedCamp.capacidadMaxima) : '',
      precioBase: selectedCamp.precioBase ? String(selectedCamp.precioBase) : '',
      estado: selectedCamp.estado || 'activo',
    });
    setCampModalOpen(true);
  }

  function openDetail(insc) {
    setSelectedInsc(insc);
    setPagoForm(EMPTY_PAGO_FORM);
    setDescuentoForm(EMPTY_DESCUENTO_FORM);
    setDetailModalOpen(true);
  }

  async function saveCamp() {
    setSavingCamp(true);
    try {
      const payload = {
        nombre: campForm.nombre,
        descripcion: campForm.descripcion || null,
        fecha_inicio: campForm.fechaInicio,
        fecha_fin: campForm.fechaFin,
        capacidad_maxima: campForm.capacidadMaxima ? Number(campForm.capacidadMaxima) : null,
        precio_base: Number(campForm.precioBase) || 0,
        estado: campForm.estado,
      };
      if (editingCamp) {
        const { error } = await supabase.from('campamentos').update(payload).eq('id', editingCamp.id);
        if (error) {
          throw error;
        }
        toast({ type: 'success', title: 'Campamento actualizado', msg: campForm.nombre });
      } else {
        const { data: created, error } = await supabase.from('campamentos').insert(payload).select().single();
        if (error) {
          throw error;
        }
        toast({ type: 'success', title: 'Campamento creado', msg: campForm.nombre });
        setSelectedCampId(created.id);
      }
      setCampModalOpen(false);
      await cargarCampamentos();
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo guardar', msg: getErrorMessage(error, 'Intenta nuevamente.') });
    } finally {
      setSavingCamp(false);
    }
  }

  async function getOrCreateTipoCampamento() {
    const { data } = await supabase.from('tipos_miembro').select('id').eq('nombre', 'Campamento').maybeSingle();
    if (data) return data.id;
    const { data: created, error } = await supabase.from('tipos_miembro').insert({ nombre: 'Campamento', activo: true }).select('id').single();
    if (error) {
      // Race condition: another request inserted first — re-fetch
      if (error.code === '23505') {
        const { data: existing } = await supabase.from('tipos_miembro').select('id').eq('nombre', 'Campamento').maybeSingle();
        if (existing) return existing.id;
      }
      throw error;
    }
    return created.id;
  }

  async function saveInscripcion() {
    if (!selectedCamp) return;
    setSavingInsc(true);
    try {
      const { error } = await supabase.from('inscripciones_campamento').insert({
        campamento_id: selectedCamp.id,
        miembro_id: Number(inscForm.miembroId),
        fecha_inscripcion: inscForm.fechaInscripcion,
        estado: inscForm.estado,
        saldo: Number(selectedCamp.precioBase) || 0,
        registrado_por: user.id,
      });
      if (error) throw error;
      toast({ type: 'success', title: 'Inscripción registrada' });
      setInscModalOpen(false);
      setInscForm(EMPTY_INSCRIPCION_FORM);
      await cargarInscripciones(selectedCamp.id);
      if (tab === 'reporte') await cargarReporte(selectedCamp.id);
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo inscribir', msg: getErrorMessage(error, 'Intenta nuevamente.') });
    } finally {
      setSavingInsc(false);
    }
  }

  async function inscribirPersonaNueva() {
    if (!selectedCamp || !quickForm.nombre.trim()) return;
    setSavingInsc(true);
    let createdMiembroId = null;
    try {
      const tipo_miembro_id = await getOrCreateTipoCampamento();
      const cedula = `CAMP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const { data: miembro, error: miembroError } = await supabase
        .from('miembros')
        .insert({ nombre: quickForm.nombre.trim(), cedula, correo: quickForm.correo || null, celula: quickForm.celula || null, rol: 'Visitante', tipo_miembro_id, estado: 'activo' })
        .select('id')
        .single();
      if (miembroError) throw miembroError;
      createdMiembroId = miembro.id;
      const { error: inscError } = await supabase.from('inscripciones_campamento').insert({
        campamento_id: selectedCamp.id,
        miembro_id: miembro.id,
        fecha_inscripcion: inscForm.fechaInscripcion,
        estado: inscForm.estado,
        saldo: Number(selectedCamp.precioBase) || 0,
        registrado_por: user.id,
      });
      if (inscError) throw inscError;
      createdMiembroId = null; // inscription succeeded — keep the member
      toast({ type: 'success', title: 'Inscripción registrada', msg: `${quickForm.nombre.trim()} agregado como participante de campamento.` });
      setInscModalOpen(false);
      setInscForm(EMPTY_INSCRIPCION_FORM);
      setQuickForm({ nombre: '', correo: '', celula: '' });
      setQuickPersonMode(false);
      await cargarInscripciones(selectedCamp.id);
      if (tab === 'reporte') await cargarReporte(selectedCamp.id);
    } catch (error) {
      // Roll back the created member if the inscription step failed
      if (createdMiembroId) {
        await supabase.from('miembros').delete().eq('id', createdMiembroId);
      }
      toast({ type: 'error', title: 'No se pudo inscribir', msg: getErrorMessage(error, 'Intenta nuevamente.') });
    } finally {
      setSavingInsc(false);
    }
  }

  async function savePago() {
    if (!selectedInsc?.id) return;
    setSavingPago(true);
    try {
      const monto = Number(pagoForm.monto);
      const { error } = await supabase.from('pagos_campamento').insert({
        inscripcion_id: selectedInsc.id,
        monto,
        fecha_pago: pagoForm.fechaPago,
        metodo_pago: pagoForm.metodoPago,
        referencia: pagoForm.referencia || null,
        nota: pagoForm.nota || null,
        registrado_por: user.id,
      });
      if (error) {
        throw error;
      }
      await recalcularInscripcion(selectedInsc.id);
      toast({ type: 'success', title: 'Pago registrado', msg: formatMoney(pagoForm.monto) });
      setPagoForm(EMPTY_PAGO_FORM);
      const [detailData, inscripcionesData, reporteData] = await Promise.all([
        cargarDetalleInscripcion(selectedInsc.id),
        cargarInscripciones(selectedCampId),
        tab === 'reporte' ? cargarReporte(selectedCampId) : Promise.resolve(reporteState),
      ]);
      if (detailData) applyDetalleActualizado(detailData);
      setInscripcionesState(inscripcionesData || []);
      setReporteState(reporteData || null);
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo registrar el pago', msg: getErrorMessage(error, 'Intenta nuevamente.') });
    } finally {
      setSavingPago(false);
    }
  }

  async function saveDescuento() {
    if (!selectedInsc?.id) return;
    setSavingDescuento(true);
    try {
      const { error } = await supabase.from('descuentos_campamento').insert({
        inscripcion_id: selectedInsc.id,
        motivo: descuentoForm.motivo,
        monto: Number(descuentoForm.monto),
        registrado_por: user.id,
      });
      if (error) {
        throw error;
      }
      await recalcularInscripcion(selectedInsc.id);
      toast({ type: 'success', title: 'Descuento aplicado', msg: formatMoney(descuentoForm.monto) });
      setDescuentoForm(EMPTY_DESCUENTO_FORM);
      const [detailData, inscripcionesData, reporteData] = await Promise.all([
        cargarDetalleInscripcion(selectedInsc.id),
        cargarInscripciones(selectedCampId),
        tab === 'reporte' ? cargarReporte(selectedCampId) : Promise.resolve(reporteState),
      ]);
      if (detailData) applyDetalleActualizado(detailData);
      setInscripcionesState(inscripcionesData || []);
      setReporteState(reporteData || null);
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo aplicar el descuento', msg: getErrorMessage(error, 'Intenta nuevamente.') });
    } finally {
      setSavingDescuento(false);
    }
  }

  async function saveCabana() {
    if (!selectedCampId) return;
    setSavingCabana(true);
    try {
      const { error } = await supabase.from('cabanas').insert({
        campamento_id: selectedCampId,
        nombre: cabanaForm.nombre,
        capacidad: Number(cabanaForm.capacidad),
      });
      if (error) {
        throw error;
      }
      toast({ type: 'success', title: 'Cabaña creada', msg: cabanaForm.nombre });
      setCabanaModalOpen(false);
      setCabanaForm(EMPTY_CABANA_FORM);
      const updated = await cargarCabanas(selectedCampId);
      setCabanasState(updated || []);
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo crear la cabaña', msg: getErrorMessage(error, 'Intenta nuevamente.') });
    } finally {
      setSavingCabana(false);
    }
  }

  async function saveGasto() {
    if (!selectedCampId) return;
    setSavingGasto(true);
    try {
      const { error } = await supabase.from('gastos_campamento').insert({
        campamento_id: selectedCampId,
        descripcion: gastoForm.concepto,
        monto: Number(gastoForm.monto),
        fecha: gastoForm.fechaGasto,
        categoria: gastoForm.nota || null,
        registrado_por: user.id,
      });
      if (error) {
        throw error;
      }
      toast({ type: 'success', title: 'Gasto registrado', msg: gastoForm.concepto });
      setGastoForm(EMPTY_GASTO_FORM);
      const [gastosData, reporteData] = await Promise.all([
        cargarGastos(selectedCampId),
        cargarReporte(selectedCampId).catch(() => reporteState),
      ]);
      setGastosState(gastosData || []);
      setReporteState(reporteData || null);
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo registrar el gasto', msg: getErrorMessage(error, 'Intenta nuevamente.') });
    } finally {
      setSavingGasto(false);
    }
  }

  async function saveAsignacion() {
    if (!asignarInscId || !asignarCabanaId) return;
    setSavingAsignacion(true);
    try {
      const { error } = await supabase.from('asignaciones_cabana').insert({
        inscripcion_id: Number(asignarInscId),
        cabana_id: Number(asignarCabanaId),
      });
      if (error) {
        throw error;
      }
      toast({ type: 'success', title: 'Cabaña asignada' });
      setAsignarModalOpen(false);
      setAsignarCabanaId('');
      setAsignarInscId('');
      const [cabanasData, inscripcionesData, detailData] = await Promise.all([
        cargarCabanas(selectedCampId),
        cargarInscripciones(selectedCampId),
        selectedInsc?.id ? cargarDetalleInscripcion(selectedInsc.id) : Promise.resolve(inscDetailState),
      ]);
      setCabanasState(cabanasData || []);
      setInscripcionesState(inscripcionesData || []);
      if (detailData) applyDetalleActualizado(detailData);
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo asignar la cabaña', msg: getErrorMessage(error, 'Intenta nuevamente.') });
    } finally {
      setSavingAsignacion(false);
    }
  }

  async function changeInscripcionEstado(inscripcionId, estado) {
    setUpdatingEstadoId(inscripcionId);
    try {
      const { error } = await supabase.from('inscripciones_campamento').update({ estado }).eq('id', inscripcionId);
      if (error) {
        throw error;
      }
      const updated = { id: inscripcionId, estado };
      syncInscripcionState(updated);
      if (tab === 'reporte') {
        const reporteActualizado = await cargarReporte(selectedCampId);
        setReporteState(reporteActualizado);
      }
      toast({ type: 'success', title: 'Estado actualizado', msg: ESTADO_INSC_LABEL[estado] || estado });
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo cambiar el estado', msg: getErrorMessage(error, 'Intenta nuevamente.') });
    } finally {
      setUpdatingEstadoId(null);
    }
  }

  async function deletePago(pagoId) {
    if (!selectedInsc?.id) return;
    const confirmed = window.confirm('Se eliminará este pago.');
    if (!confirmed) return;

    setDeletingPagoId(pagoId);
    try {
      const { error } = await supabase.from('pagos_campamento').delete().eq('id', pagoId);
      if (error) {
        throw error;
      }
      await recalcularInscripcion(selectedInsc.id);
      const updatedDetail = await cargarDetalleInscripcion(selectedInsc.id);
      if (updatedDetail) applyDetalleActualizado(updatedDetail);
      if (tab === 'reporte') {
        const reporteActualizado = await cargarReporte(selectedCampId);
        setReporteState(reporteActualizado);
      }
      await cargarInscripciones(selectedCampId);
      toast({ type: 'success', title: 'Pago eliminado' });
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo eliminar el pago', msg: getErrorMessage(error, 'Intenta nuevamente.') });
    } finally {
      setDeletingPagoId(null);
    }
  }

  async function deleteDescuento(descuentoId) {
    if (!selectedInsc?.id) return;
    const confirmed = window.confirm('Se eliminará este descuento.');
    if (!confirmed) return;

    setDeletingDescuentoId(descuentoId);
    try {
      const { error } = await supabase.from('descuentos_campamento').delete().eq('id', descuentoId);
      if (error) {
        throw error;
      }
      await recalcularInscripcion(selectedInsc.id);
      const updatedDetail = await cargarDetalleInscripcion(selectedInsc.id);
      if (updatedDetail) applyDetalleActualizado(updatedDetail);
      if (tab === 'reporte') {
        const reporteActualizado = await cargarReporte(selectedCampId);
        setReporteState(reporteActualizado);
      }
      await cargarInscripciones(selectedCampId);
      toast({ type: 'success', title: 'Descuento eliminado' });
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo eliminar el descuento', msg: getErrorMessage(error, 'Intenta nuevamente.') });
    } finally {
      setDeletingDescuentoId(null);
    }
  }

  async function deleteInscripcion() {
    if (!selectedInsc?.id) return;
    const confirmed = window.confirm(`¿Eliminar la inscripción de ${selectedInsc.miembroNombre}? Se borrarán también sus pagos y descuentos.`);
    if (!confirmed) return;
    setDeletingInscId(selectedInsc.id);
    try {
      await supabase.from('asignaciones_cabana').delete().eq('inscripcion_id', selectedInsc.id);
      await supabase.from('pagos_campamento').delete().eq('inscripcion_id', selectedInsc.id);
      await supabase.from('descuentos_campamento').delete().eq('inscripcion_id', selectedInsc.id);
      const { error } = await supabase.from('inscripciones_campamento').delete().eq('id', selectedInsc.id);
      if (error) throw error;
      toast({ type: 'success', title: 'Inscripción eliminada', msg: selectedInsc.miembroNombre });
      setDetailModalOpen(false);
      setSelectedInsc(null);
      await cargarInscripciones(selectedCampId);
      if (tab === 'reporte') await cargarReporte(selectedCampId);
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo eliminar', msg: getErrorMessage(error, 'Intenta nuevamente.') });
    } finally {
      setDeletingInscId(null);
    }
  }

  async function deleteGasto(gastoId) {
    const confirmed = window.confirm('Se eliminará este gasto.');
    if (!confirmed) return;

    setDeletingGastoId(gastoId);
    try {
      const { error } = await supabase.from('gastos_campamento').delete().eq('id', gastoId);
      if (error) {
        throw error;
      }
      const [gastosData, reporteData] = await Promise.all([
        cargarGastos(selectedCampId),
        cargarReporte(selectedCampId).catch(() => reporteState),
      ]);
      setGastosState(gastosData || []);
      setReporteState(reporteData || null);
      toast({ type: 'success', title: 'Gasto eliminado' });
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo eliminar el gasto', msg: getErrorMessage(error, 'Intenta nuevamente.') });
    } finally {
      setDeletingGastoId(null);
    }
  }

  async function desasignarCabana(cabanaId, inscripcionId) {
    const confirmed = window.confirm('Se desasignará este inscrito de la cabaña.');
    if (!confirmed) return;

    setDesasignandoInscId(inscripcionId);
    try {
      const { error } = await supabase.from('asignaciones_cabana').delete().eq('inscripcion_id', inscripcionId);
      if (error) {
        throw error;
      }
      await Promise.all([
        cargarCabanas(selectedCampId),
        cargarInscripciones(selectedCampId),
        selectedInsc?.id === inscripcionId ? cargarDetalleInscripcion(inscripcionId) : Promise.resolve(null),
      ]);
      toast({ type: 'success', title: 'Miembro desasignado' });
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo desasignar', msg: getErrorMessage(error, 'Intenta nuevamente.') });
    } finally {
      setDesasignandoInscId(null);
    }
  }

  async function deleteCamp() {
    if (!selectedCamp) return;

    const confirmed = window.confirm(`Se eliminará el campamento "${selectedCamp.nombre}".`);

    if (!confirmed) return;

    try {
      const { error } = await supabase.from('campamentos').delete().eq('id', selectedCamp.id);
      if (error) {
        throw error;
      }
      toast({ type: 'success', title: 'Campamento eliminado', msg: selectedCamp.nombre });
      setSelectedCampId(null);
      setSelectedInsc(null);
      setDetailModalOpen(false);
      setReporteState(null);
      await Promise.all([cargarCampamentos(), cargarInscripciones(null), cargarCabanas(null), cargarGastos(null)]);
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo eliminar', msg: getErrorMessage(error, 'Intenta nuevamente.') });
    }
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>Campamentos</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            Gestión de campamentos, inscripciones, pagos y cabañas.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button variant="ghost" icon="trash-2" onClick={deleteCamp} disabled={!selectedCamp}>
            Borrar
          </Button>
          <Button variant="secondary" icon="pencil" onClick={openEditCamp} disabled={!selectedCamp}>
            Editar
          </Button>
          <Button variant="primary" icon="plus" onClick={openNewCamp}>
            Nuevo campamento
          </Button>
        </div>
      </div>

      <div className="grid-kpi">
        <div className="card kpi">
          <div className="label">Campamentos activos</div>
          <div className="value">{campamentos.filter((c) => c.estado === 'activo').length}</div>
          <div className="muted">Catálogo vigente</div>
        </div>
        <div className="card kpi">
          <div className="label">Inscritos</div>
          <div className="value">{inscripcionesState.length}</div>
          <div className="muted">{selectedCamp ? selectedCamp.nombre : 'Selecciona un campamento'}</div>
        </div>
        <div className="card kpi">
          <div className="label">Confirmados</div>
          <div className="value">{inscripcionesState.filter((i) => i.estado === 'confirmada').length}</div>
          <div className="muted">Inscripciones confirmadas</div>
        </div>
        <div className="card kpi">
          <div className="label">Total recaudado</div>
          <div className="value" style={{ fontSize: 20 }}>{formatMoney(totalRecaudado)}</div>
          <div className="muted">Suma de pagos registrados</div>
        </div>
        <div className="card kpi">
          <div className="label">Total de gastos</div>
          <div className="value" style={{ fontSize: 20 }}>{formatMoney(totalGastos)}</div>
          <div className="muted">{selectedCamp ? 'Gastos del campamento seleccionado' : 'Sin campamento seleccionado'}</div>
        </div>
        <div className="card kpi">
          <div className="label">Balance neto</div>
          <div className="value" style={{ fontSize: 20 }}>{formatMoney(balanceNeto)}</div>
          <div className="muted">Ingresos menos gastos</div>
        </div>
        <div className="card kpi">
          <div className="label">Sin inscribir</div>
          <div className="value">{sinInscribir ?? '—'}</div>
          <div className="muted">Miembros activos no inscritos</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="card-title" style={{ margin: 0 }}>Eventos</div>
            <Badge variant="neutral">{campamentos.length}</Badge>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {campamentos.map((camp) => (
              <button
                key={camp.id}
                type="button"
                className={`btn ${selectedCampId === camp.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{ justifyContent: 'space-between', width: '100%', padding: 12, textAlign: 'left' }}
                onClick={() => { setSelectedCampId(camp.id); setTab('inscripciones'); }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontWeight: 600 }}>{camp.nombre}</span>
                  <span style={{ fontSize: 12, opacity: 0.85 }}>
                    {formatDate(camp.fechaInicio)} — {formatDate(camp.fechaFin)}
                  </span>
                </span>
                <Badge variant={camp.estado === 'activo' ? 'success' : 'neutral'}>
                  {ESTADO_CAMP_LABEL[camp.estado] || camp.estado}
                </Badge>
              </button>
            ))}
            {!campamentos.length && <p className="muted">Aún no hay campamentos registrados.</p>}
          </div>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          {selectedCamp ? (
            <>
              <div className="card" style={{ padding: 16 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="card-title" style={{ marginBottom: 4 }}>{selectedCamp.nombre}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {formatDate(selectedCamp.fechaInicio)} al {formatDate(selectedCamp.fechaFin)}
                      {selectedCamp.capacidadMaxima ? ` · Capacidad: ${selectedCamp.capacidadMaxima}` : ''}
                      {' · '}Precio base: {formatMoney(selectedCamp.precioBase)}
                    </div>
                    {selectedCamp.descripcion && (
                      <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{selectedCamp.descripcion}</div>
                    )}
                  </div>
                  <Badge variant={selectedCamp.estado === 'activo' ? 'success' : 'neutral'}>
                    {ESTADO_CAMP_LABEL[selectedCamp.estado]}
                  </Badge>
                </div>
              </div>

              <div className="row" style={{ gap: 4 }}>
                {[['inscripciones', 'Inscripciones'], ['cabanas', 'Cabañas'], ['reporte', 'Reporte']].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`btn ${tab === key ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setTab(key)}
                  >
                    {label}
                    {key === 'inscripciones' && <Badge variant="neutral">{inscripcionesState.length}</Badge>}
                    {key === 'cabanas' && <Badge variant="neutral">{cabanasState.length}</Badge>}
                  </button>
                ))}
              </div>

              {tab === 'inscripciones' && (
                <div className="card" style={{ padding: 16 }}>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                    <div className="card-title" style={{ margin: 0 }}>Inscripciones</div>
                    <Button variant="primary" icon="user-plus" onClick={() => { setInscForm(EMPTY_INSCRIPCION_FORM); setQuickForm({ nombre: '', correo: '', celula: '' }); setQuickPersonMode(false); setMemberSearch(''); setInscModalOpen(true); }}>
                      Inscribir miembro
                    </Button>
                  </div>
                  {!inscripcionesState.length && <p className="muted">Todavía no hay inscripciones para este campamento.</p>}
                  {inscripcionesState.length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Miembro</th>
                          <th>Fecha</th>
                          <th>Estado</th>
                          <th>Cabaña</th>
                          <th>Pagado</th>
                          <th>Descuentos</th>
                          <th>Saldo</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {inscripcionesState.map((insc) => (
                          <tr key={insc.id}>
                            <td>
                              <div className="row" style={{ gap: 8 }}>
                                <Avatar name={insc.miembroNombre || '?'} size="sm" />
                                <span style={{ fontWeight: 500 }}>{insc.miembroNombre || '—'}</span>
                              </div>
                            </td>
                            <td className="tnum">{formatDate(insc.fechaInscripcion)}</td>
                            <td>
                              <select
                                className="inp"
                                value={insc.estado}
                                disabled={updatingEstadoId === insc.id}
                                onChange={(e) => changeInscripcionEstado(insc.id, e.target.value)}
                                style={{ minWidth: 132 }}
                              >
                                <option value="pendiente">Pendiente</option>
                                <option value="confirmada">Confirmada</option>
                                <option value="cancelada">Cancelada</option>
                              </select>
                            </td>
                            <td>{insc.cabanaAsignada || '—'}</td>
                            <td className="tnum">{formatMoney(insc.totalPagado)}</td>
                            <td className="tnum">{formatMoney(insc.totalDescuentos)}</td>
                            <td className="tnum">{formatMoney(insc.saldo)}</td>
                            <td>
                              <Button variant="ghost" size="sm" icon="file-text" onClick={() => openDetail(insc)}>
                                Detalle
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  )}
                </div>
              )}

              {tab === 'cabanas' && (
                <div className="card" style={{ padding: 16 }}>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                    <div className="card-title" style={{ margin: 0 }}>Cabañas</div>
                    <div className="row" style={{ gap: 8 }}>
                      <Button variant="secondary" icon="arrow-right-left" onClick={() => { setAsignarCabanaId(''); setAsignarInscId(''); setAsignarModalOpen(true); }} disabled={!cabanasState.length || !inscripcionesSinCabana.length}>
                        Asignar cabaña
                      </Button>
                      <Button variant="primary" icon="plus" onClick={() => { setCabanaForm(EMPTY_CABANA_FORM); setCabanaModalOpen(true); }}>
                        Nueva cabaña
                      </Button>
                    </div>
                  </div>
                  {!cabanasState.length && <p className="muted">Todavía no hay cabañas registradas para este campamento.</p>}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                    {cabanasState.map((cabana) => (
                      <div key={cabana.id} className="card" style={{ padding: 14 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{cabana.nombre}</div>
                        <div className="muted" style={{ fontSize: 13 }}>Capacidad: {cabana.capacidad}</div>
                        <div style={{ marginTop: 8 }}>
                          <Badge variant="neutral">
                          {cabana.asignados ?? 0} / {cabana.capacidad} asignados
                          </Badge>
                        </div>
                        <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                          {(cabana.miembros || []).length === 0 && (
                            <div className="muted" style={{ fontSize: 12 }}>Sin miembros asignados.</div>
                          )}
                          {(cabana.miembros || []).map((miembro) => (
                            <div key={miembro.inscripcionId} className="row" style={{ justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{miembro.miembroNombre}</div>
                                <div className="muted" style={{ fontSize: 12 }}>
                                  {miembro.miembroCedula || 'Sin cédula'} · {ESTADO_INSC_LABEL[miembro.estado] || miembro.estado}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon="user-minus"
                                onClick={() => desasignarCabana(cabana.id, miembro.inscripcionId)}
                                disabled={desasignandoInscId === miembro.inscripcionId}
                              >
                                {desasignandoInscId === miembro.inscripcionId ? '...' : 'Desasignar'}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'reporte' && (
                <div className="stack" style={{ gap: 16 }}>
                  <div className="grid-kpi">
                    <div className="card kpi">
                      <div className="label">Inscripciones</div>
                      <div className="value">{reporteState?.totalInscritos ?? 0}</div>
                      <div className="muted">Total registradas</div>
                    </div>
                    <div className="card kpi">
                      <div className="label">Pagos confirmados</div>
                      <div className="value" style={{ fontSize: 20 }}>{formatMoney(reporteState?.totalIngresos ?? 0)}</div>
                      <div className="muted">Ingresos cobrados</div>
                    </div>
                    <div className="card kpi">
                      <div className="label">Descuentos</div>
                      <div className="value" style={{ fontSize: 20 }}>{formatMoney(reporteState?.totalDescuentos ?? 0)}</div>
                      <div className="muted">Monto aplicado</div>
                    </div>
                    <div className="card kpi">
                      <div className="label">Gastos</div>
                      <div className="value" style={{ fontSize: 20 }}>{formatMoney(reporteState?.totalGastos ?? 0)}</div>
                      <div className="muted">Egresos registrados</div>
                    </div>
                    <div className="card kpi">
                      <div className="label">Balance neto</div>
                      <div className="value" style={{ fontSize: 20 }}>
                        {formatMoney((reporteState?.totalIngresos ?? 0) - (reporteState?.totalGastos ?? 0))}
                      </div>
                      <div className="muted">Ingresos menos gastos</div>
                    </div>
                    <div className="card kpi">
                      <div className="label">Saldo pendiente</div>
                      <div className="value" style={{ fontSize: 20 }}>{formatMoney(reporteState?.saldoPendiente ?? 0)}</div>
                      <div className="muted">Pendiente por cobrar</div>
                    </div>
                  </div>

                  <div className="card" style={{ padding: 16 }}>
                    <div className="card-title" style={{ marginBottom: 12 }}>Resumen de inscripciones</div>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Total</th>
                          <th>Confirmadas</th>
                          <th>Pendientes</th>
                          <th>Canceladas</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="tnum">{reporteState?.totalInscritos ?? 0}</td>
                          <td className="tnum">{reporteState?.confirmados ?? 0}</td>
                          <td className="tnum">{reporteState?.pendientes ?? 0}</td>
                          <td className="tnum">{reporteState?.cancelados ?? 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="card" style={{ padding: 16 }}>
                    <div className="card-title" style={{ marginBottom: 12 }}>Ingresos por método de pago</div>
                    {!(reporteState?.porMetodoPago || []).length && (
                      <p className="muted">No hay pagos registrados para este campamento.</p>
                    )}
                    {!!(reporteState?.porMetodoPago || []).length && (
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>Método</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reporteState.porMetodoPago.map((item) => (
                            <tr key={item.metodoPago}>
                              <td style={{ textTransform: 'capitalize' }}>{item.metodoPago}</td>
                              <td className="tnum">{formatMoney(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="card" style={{ padding: 16 }}>
                    <div className="card-title" style={{ marginBottom: 12 }}>Clasificación por tipo de miembro</div>
                    {!(reporteState?.porTipoMiembro || []).length && (
                      <p className="muted">No hay inscripciones activas para clasificar.</p>
                    )}
                    {!!(reporteState?.porTipoMiembro || []).length && (
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>Tipo de miembro</th>
                            <th>Cantidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reporteState.porTipoMiembro.map((item) => (
                            <tr key={item.tipo}>
                              <td>{item.tipo}</td>
                              <td className="tnum">{item.cantidad}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="card" style={{ padding: 16 }}>
                    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
                      <div className="card-title" style={{ margin: 0 }}>Gastos del campamento</div>
                      <Badge variant="neutral">{gastosState.length}</Badge>
                    </div>

                    <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                      <div style={{ flex: '1 1 220px' }}>
                        <Input
                          label="Concepto"
                          value={gastoForm.concepto}
                          onChange={(e) => setGastoForm((current) => ({ ...current, concepto: e.target.value }))}
                        />
                      </div>
                      <div style={{ flex: '1 1 140px' }}>
                        <Input
                          label="Monto (DOP)"
                          type="number"
                          min="0"
                          step="0.01"
                          value={gastoForm.monto}
                          onChange={(e) => setGastoForm((current) => ({ ...current, monto: e.target.value }))}
                        />
                      </div>
                      <div style={{ flex: '1 1 160px' }}>
                        <Input
                          label="Fecha"
                          type="date"
                          value={gastoForm.fechaGasto}
                          onChange={(e) => setGastoForm((current) => ({ ...current, fechaGasto: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                      <div style={{ flex: '1 1 320px' }}>
                        <Input
                          label="Nota"
                          value={gastoForm.nota}
                          onChange={(e) => setGastoForm((current) => ({ ...current, nota: e.target.value }))}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Button
                          variant="primary"
                          icon="wallet"
                          onClick={saveGasto}
                          disabled={savingGasto || !gastoForm.concepto || !gastoForm.monto}
                        >
                          {savingGasto ? 'Registrando...' : 'Registrar gasto'}
                        </Button>
                      </div>
                    </div>

                    {!gastosState.length && <p className="muted">Todavía no hay gastos registrados para este campamento.</p>}
                    {!!gastosState.length && (
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Concepto</th>
                            <th>Nota</th>
                            <th>Registrado por</th>
                            <th>Monto</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {gastosState.map((gasto) => (
                            <tr key={gasto.id}>
                              <td className="tnum">{formatDate(gasto.fechaGasto)}</td>
                              <td>{gasto.concepto}</td>
                              <td>{gasto.nota || '—'}</td>
                              <td>{gasto.registradoPorNombre || '—'}</td>
                              <td className="tnum">{formatMoney(gasto.monto)}</td>
                              <td>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon="trash-2"
                                  onClick={() => deleteGasto(gasto.id)}
                                  disabled={deletingGastoId === gasto.id}
                                >
                                  {deletingGastoId === gasto.id ? 'Eliminando...' : 'Eliminar'}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card" style={{ padding: 24 }}>
              <p className="muted">Selecciona un campamento para gestionar sus inscripciones y cabañas.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal nuevo/editar campamento */}
      <Modal
        open={campModalOpen}
        title={editingCamp ? 'Editar campamento' : 'Nuevo campamento'}
        onClose={() => setCampModalOpen(false)}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setCampModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={saveCamp} disabled={savingCamp}>
              {savingCamp ? 'Guardando...' : 'Guardar'}
            </Button>
          </>
        )}
      >
        <div className="stack">
          <Input
            label="Nombre"
            value={campForm.nombre}
            onChange={(e) => setCampForm((c) => ({ ...c, nombre: e.target.value }))}
          />
          <div className="field">
            <label>Descripción</label>
            <textarea
              className="inp"
              rows="3"
              value={campForm.descripcion}
              onChange={(e) => setCampForm((c) => ({ ...c, descripcion: e.target.value }))}
            />
          </div>
          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Fecha de inicio"
                type="date"
                value={campForm.fechaInicio}
                onChange={(e) => setCampForm((c) => ({ ...c, fechaInicio: e.target.value }))}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Input
                label="Fecha de fin"
                type="date"
                value={campForm.fechaFin}
                onChange={(e) => setCampForm((c) => ({ ...c, fechaFin: e.target.value }))}
              />
            </div>
          </div>
          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Capacidad máxima"
                type="number"
                min="1"
                value={campForm.capacidadMaxima}
                onChange={(e) => setCampForm((c) => ({ ...c, capacidadMaxima: e.target.value }))}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Input
                label="Precio base (DOP)"
                type="number"
                min="0"
                step="0.01"
                value={campForm.precioBase}
                onChange={(e) => setCampForm((c) => ({ ...c, precioBase: e.target.value }))}
              />
            </div>
          </div>
          <div className="field">
            <label>Estado</label>
            <select
              className="inp"
              value={campForm.estado}
              onChange={(e) => setCampForm((c) => ({ ...c, estado: e.target.value }))}
            >
              <option value="activo">Activo</option>
              <option value="cerrado">Cerrado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Modal inscribir miembro */}
      <Modal
        open={inscModalOpen}
        title="Inscribir participante"
        onClose={() => { setInscModalOpen(false); setQuickPersonMode(false); }}
        footer={(
          <>
            <Button variant="ghost" onClick={() => { setInscModalOpen(false); setQuickPersonMode(false); }}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={quickPersonMode ? inscribirPersonaNueva : saveInscripcion}
              disabled={savingInsc || (quickPersonMode ? !quickForm.nombre.trim() : !inscForm.miembroId)}
            >
              {savingInsc ? 'Guardando...' : 'Inscribir'}
            </Button>
          </>
        )}
      >
        <div className="stack">
          {/* Toggle modo */}
          <div className="row" style={{ gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <button
              type="button"
              style={{ flex: 1, padding: '8px 12px', background: !quickPersonMode ? 'var(--primary)' : 'transparent', color: !quickPersonMode ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: !quickPersonMode ? 600 : 400 }}
              onClick={() => setQuickPersonMode(false)}
            >
              Miembro registrado
            </button>
            <button
              type="button"
              style={{ flex: 1, padding: '8px 12px', background: quickPersonMode ? 'var(--primary)' : 'transparent', color: quickPersonMode ? '#fff' : 'var(--text-muted)', border: 'none', borderLeft: '1px solid var(--border)', cursor: 'pointer', fontWeight: quickPersonMode ? 600 : 400 }}
              onClick={() => setQuickPersonMode(true)}
            >
              Persona nueva
            </button>
          </div>

          {!quickPersonMode ? (
            <>
              <div className="field">
                <label>Buscar miembro</label>
                <input
                  className="inp"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Nombre o cédula"
                />
              </div>
              <div className="field">
                <label>Seleccionar miembro</label>
                <select
                  className="inp"
                  value={inscForm.miembroId}
                  onChange={(e) => setInscForm((f) => ({ ...f, miembroId: e.target.value }))}
                >
                  <option value="">Selecciona un miembro</option>
                  {filteredMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre} · {m.cedula}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>Se creará como participante de campamento. Solo el nombre es obligatorio.</p>
              <Input
                label="Nombre *"
                value={quickForm.nombre}
                onChange={(e) => setQuickForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre completo"
              />
              <Input
                label="Correo"
                type="email"
                value={quickForm.correo}
                onChange={(e) => setQuickForm((f) => ({ ...f, correo: e.target.value }))}
                placeholder="opcional"
              />
              <Input
                label="Célula"
                value={quickForm.celula}
                onChange={(e) => setQuickForm((f) => ({ ...f, celula: e.target.value }))}
                placeholder="opcional"
              />
            </>
          )}

          <Input
            label="Fecha de inscripción"
            type="date"
            value={inscForm.fechaInscripcion}
            onChange={(e) => setInscForm((f) => ({ ...f, fechaInscripcion: e.target.value }))}
          />
          <div className="field">
            <label>Estado inicial</label>
            <select
              className="inp"
              value={inscForm.estado}
              onChange={(e) => setInscForm((f) => ({ ...f, estado: e.target.value }))}
            >
              <option value="pendiente">Pendiente</option>
              <option value="confirmada">Confirmada</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Modal detalle de inscripción — pagos y descuentos */}
      <Modal
        open={detailModalOpen}
        title={`Detalle · ${selectedInsc?.miembroNombre || 'Inscripción'}`}
        onClose={() => { setDetailModalOpen(false); setSelectedInsc(null); }}
        footer={(
          <div className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
            <Button variant="danger" icon="trash-2" onClick={deleteInscripcion} disabled={!!deletingInscId}>
              {deletingInscId ? 'Eliminando...' : 'Eliminar inscripción'}
            </Button>
            <Button variant="primary" onClick={() => { setDetailModalOpen(false); setSelectedInsc(null); }}>Cerrar</Button>
          </div>
        )}
      >
        {selectedInsc && (
          <div className="stack">
            <div className="filters">
              <Badge variant={ESTADO_INSC_VARIANT[selectedInsc.estado] || 'neutral'}>
                {ESTADO_INSC_LABEL[selectedInsc.estado]}
              </Badge>
              <span className="muted">Pagado: {formatMoney(inscDetailState?.totalPagado ?? selectedInsc.totalPagado)}</span>
              <span className="muted">Descuentos: {formatMoney(inscDetailState?.totalDescuentos ?? selectedInsc.totalDescuentos)}</span>
              <span className="muted">Saldo: {formatMoney(inscDetailState?.saldo ?? selectedInsc.saldo)}</span>
            </div>

            <div className="card-title">Pagos registrados</div>
            {(inscDetailState?.pagos || []).length === 0 && <p className="muted">Sin pagos registrados.</p>}
            {(inscDetailState?.pagos || []).map((p) => (
              <div key={p.id} className="row" style={{ justifyContent: 'space-between', border: '1px solid var(--ls-border)', borderRadius: 8, padding: 10 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{formatMoney(p.monto)}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{p.metodoPago} · {formatDate(p.fechaPago)}{p.referencia ? ` · ${p.referencia}` : ''}</div>
                </div>
                <Button variant="ghost" size="sm" icon="trash-2" onClick={() => deletePago(p.id)} disabled={deletingPagoId === p.id}>
                  {deletingPagoId === p.id ? 'Eliminando...' : 'Eliminar'}
                </Button>
              </div>
            ))}

            <div className="card-title" style={{ marginTop: 8 }}>Registrar pago</div>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 140px' }}>
                <Input
                  label="Monto (DOP)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={pagoForm.monto}
                  onChange={(e) => setPagoForm((f) => ({ ...f, monto: e.target.value }))}
                />
              </div>
              <div style={{ flex: '1 1 140px' }}>
                <Input
                  label="Fecha"
                  type="date"
                  value={pagoForm.fechaPago}
                  onChange={(e) => setPagoForm((f) => ({ ...f, fechaPago: e.target.value }))}
                />
              </div>
              <div style={{ flex: '1 1 140px' }}>
                <div className="field">
                  <label>Método</label>
                  <select className="inp" value={pagoForm.metodoPago} onChange={(e) => setPagoForm((f) => ({ ...f, metodoPago: e.target.value }))}>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <Input
                  label="Referencia"
                  value={pagoForm.referencia}
                  onChange={(e) => setPagoForm((f) => ({ ...f, referencia: e.target.value }))}
                />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <Input
                  label="Nota"
                  value={pagoForm.nota}
                  onChange={(e) => setPagoForm((f) => ({ ...f, nota: e.target.value }))}
                />
              </div>
            </div>
            <Button variant="primary" icon="save" onClick={savePago} disabled={savingPago || !pagoForm.monto}>
              {savingPago ? 'Registrando...' : 'Registrar pago'}
            </Button>

            <div style={{ borderTop: '1px solid var(--ls-border)', paddingTop: 12 }}>
              <div className="card-title">Descuentos aplicados</div>
              {(inscDetailState?.descuentos || []).length === 0 && <p className="muted">Sin descuentos aplicados.</p>}
              {(inscDetailState?.descuentos || []).map((d) => (
                <div key={d.id} className="row" style={{ justifyContent: 'space-between', border: '1px solid var(--ls-border)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{formatMoney(d.monto)}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{d.motivo}</div>
                  </div>
                  <Button variant="ghost" size="sm" icon="trash-2" onClick={() => deleteDescuento(d.id)} disabled={deletingDescuentoId === d.id}>
                    {deletingDescuentoId === d.id ? 'Eliminando...' : 'Eliminar'}
                  </Button>
                </div>
              ))}

              <div className="card-title" style={{ marginTop: 8 }}>Aplicar descuento</div>
              <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                <div style={{ flex: '1 1 200px' }}>
                  <Input
                    label="Motivo"
                    value={descuentoForm.motivo}
                    onChange={(e) => setDescuentoForm((f) => ({ ...f, motivo: e.target.value }))}
                  />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                  <Input
                    label="Monto (DOP)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={descuentoForm.monto}
                    onChange={(e) => setDescuentoForm((f) => ({ ...f, monto: e.target.value }))}
                  />
                </div>
              </div>
              <Button variant="secondary" icon="tag" onClick={saveDescuento} disabled={savingDescuento || !descuentoForm.motivo || !descuentoForm.monto}>
                {savingDescuento ? 'Aplicando...' : 'Aplicar descuento'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal nueva cabaña */}
      <Modal
        open={cabanaModalOpen}
        title="Nueva cabaña"
        onClose={() => setCabanaModalOpen(false)}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setCabanaModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={saveCabana} disabled={savingCabana || !cabanaForm.nombre || !cabanaForm.capacidad}>
              {savingCabana ? 'Guardando...' : 'Guardar'}
            </Button>
          </>
        )}
      >
        <div className="stack">
          <Input
            label="Nombre"
            value={cabanaForm.nombre}
            onChange={(e) => setCabanaForm((f) => ({ ...f, nombre: e.target.value }))}
          />
          <Input
            label="Capacidad"
            type="number"
            min="1"
            value={cabanaForm.capacidad}
            onChange={(e) => setCabanaForm((f) => ({ ...f, capacidad: e.target.value }))}
          />
        </div>
      </Modal>

      {/* Modal asignar cabaña */}
      <Modal
        open={asignarModalOpen}
        title="Asignar cabaña a inscrito"
        onClose={() => setAsignarModalOpen(false)}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setAsignarModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={saveAsignacion} disabled={savingAsignacion || !asignarCabanaId || !asignarInscId}>
              {savingAsignacion ? 'Asignando...' : 'Asignar'}
            </Button>
          </>
        )}
      >
        <div className="stack">
          <div className="field">
            <label>Inscrito</label>
            <select className="inp" value={asignarInscId} onChange={(e) => setAsignarInscId(e.target.value)}>
              <option value="">Selecciona un inscrito</option>
              {inscripcionesSinCabana.map((i) => (
                <option key={i.id} value={i.id}>{i.miembroNombre || `#${i.id}`}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Cabaña</label>
            <select className="inp" value={asignarCabanaId} onChange={(e) => setAsignarCabanaId(e.target.value)}>
              <option value="">Selecciona una cabaña</option>
              {cabanasState.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} ({c.asignados ?? 0}/{c.capacidad})</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
