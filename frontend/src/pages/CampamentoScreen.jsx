import { useEffect, useMemo, useState } from 'react';
import api from '../api/axiosConfig';
import { Avatar, Badge, Button, Input, Modal } from '../components/Primitives';
import { useApi } from '../hooks/useApi';

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
  return error?.response?.data?.error || fallback;
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

const ESTADO_CAMP_LABEL = { activo: 'Activo', cerrado: 'Cerrado', cancelado: 'Cancelado' };
const ESTADO_INSC_LABEL = { pendiente: 'Pendiente', confirmada: 'Confirmada', cancelada: 'Cancelada' };
const ESTADO_INSC_VARIANT = { pendiente: 'neutral', confirmada: 'success', cancelada: 'danger' };

export default function CampamentoScreen({ toast }) {
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

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedInsc, setSelectedInsc] = useState(null);
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

  const {
    data: campamentos = [],
    refetch: refetchCampamentos,
  } = useApi(async () => {
    const res = await api.get('/campamentos');
    return res.data.data || [];
  }, { initialData: [] });

  const {
    data: members = [],
  } = useApi(async () => {
    const res = await api.get('/miembros', { params: { estado: 'activo' } });
    return res.data.data || [];
  }, { initialData: [] });

  const {
    data: inscripciones = [],
    refetch: refetchInscripciones,
  } = useApi(async () => {
    if (!selectedCampId) return [];
    const res = await api.get(`/campamentos/${selectedCampId}/inscripciones`);
    return res.data.data || [];
  }, { deps: [selectedCampId], initialData: [] });

  const {
    data: cabanas = [],
    refetch: refetchCabanas,
  } = useApi(async () => {
    if (!selectedCampId) return [];
    const res = await api.get(`/campamentos/${selectedCampId}/cabanas`);
    return res.data.data || [];
  }, { deps: [selectedCampId], initialData: [] });

  const {
    data: gastos = [],
    refetch: refetchGastos,
  } = useApi(async () => {
    if (!selectedCampId) return [];
    const res = await api.get(`/campamentos/${selectedCampId}/gastos`);
    return res.data.data || [];
  }, { deps: [selectedCampId], initialData: [] });

  const {
    data: inscDetail,
    refetch: refetchDetail,
  } = useApi(async () => {
    if (!selectedInsc?.id) return null;
    const res = await api.get(`/campamentos/inscripciones/${selectedInsc.id}`);
    return res.data.data || null;
  }, { deps: [selectedInsc?.id], initialData: null });

  const {
    data: reporte,
    error: reporteError,
    refetch: refetchReporte,
  } = useApi(async () => {
    if (!selectedCampId || tab !== 'reporte') return null;
    const res = await api.get(`/campamentos/${selectedCampId}/reporte/resumen`);
    return res.data.data || null;
  }, { deps: [selectedCampId, tab], initialData: null });

  useEffect(() => {
    setInscripcionesState(inscripciones);
  }, [inscripciones]);

  useEffect(() => {
    setCabanasState(cabanas);
  }, [cabanas]);

  useEffect(() => {
    setGastosState(gastos);
  }, [gastos]);

  useEffect(() => {
    setInscDetailState(inscDetail);
  }, [inscDetail]);

  useEffect(() => {
    setReporteState(reporte);
  }, [reporte]);

  useEffect(() => {
    if (reporteError && selectedCampId && tab === 'reporte') {
      toast({ type: 'error', title: 'No se pudo cargar el reporte', msg: getErrorMessage(reporteError, 'Intenta nuevamente.') });
    }
  }, [reporteError, selectedCampId, tab, toast]);

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
        ...campForm,
        capacidadMaxima: campForm.capacidadMaxima ? Number(campForm.capacidadMaxima) : null,
        precioBase: campForm.precioBase ? Number(campForm.precioBase) : 0,
      };
      if (editingCamp) {
        await api.put(`/campamentos/${editingCamp.id}`, payload);
        toast({ type: 'success', title: 'Campamento actualizado', msg: campForm.nombre });
      } else {
        const res = await api.post('/campamentos', payload);
        const created = res.data.data;
        toast({ type: 'success', title: 'Campamento creado', msg: campForm.nombre });
        setSelectedCampId(created.id);
      }
      setCampModalOpen(false);
      await refetchCampamentos();
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo guardar', msg: getErrorMessage(error, 'Intenta nuevamente.') });
    } finally {
      setSavingCamp(false);
    }
  }

  async function saveInscripcion() {
    if (!selectedCampId) return;
    setSavingInsc(true);
    try {
      await api.post(`/campamentos/${selectedCampId}/inscripciones`, {
        miembroId: Number(inscForm.miembroId),
        fechaInscripcion: inscForm.fechaInscripcion,
        estado: inscForm.estado,
      });
      toast({ type: 'success', title: 'Inscripción registrada' });
      setInscModalOpen(false);
      setInscForm(EMPTY_INSCRIPCION_FORM);
      const updated = await refetchInscripciones();
      setInscripcionesState(updated || []);
      if (tab === 'reporte') {
        const reporteActualizado = await refetchReporte();
        setReporteState(reporteActualizado);
      }
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo inscribir', msg: getErrorMessage(error, 'Intenta nuevamente.') });
    } finally {
      setSavingInsc(false);
    }
  }

  async function savePago() {
    if (!selectedInsc?.id) return;
    setSavingPago(true);
    try {
      await api.post(`/campamentos/inscripciones/${selectedInsc.id}/pagos`, {
        monto: Number(pagoForm.monto),
        fechaPago: pagoForm.fechaPago,
        metodoPago: pagoForm.metodoPago,
        referencia: pagoForm.referencia || undefined,
        nota: pagoForm.nota || undefined,
      });
      toast({ type: 'success', title: 'Pago registrado', msg: formatMoney(pagoForm.monto) });
      setPagoForm(EMPTY_PAGO_FORM);
      const [detailData, inscripcionesData, reporteData] = await Promise.all([
        refetchDetail(),
        refetchInscripciones(),
        tab === 'reporte' ? refetchReporte() : Promise.resolve(reporteState),
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
      await api.post(`/campamentos/inscripciones/${selectedInsc.id}/descuentos`, {
        motivo: descuentoForm.motivo,
        monto: Number(descuentoForm.monto),
      });
      toast({ type: 'success', title: 'Descuento aplicado', msg: formatMoney(descuentoForm.monto) });
      setDescuentoForm(EMPTY_DESCUENTO_FORM);
      const [detailData, inscripcionesData, reporteData] = await Promise.all([
        refetchDetail(),
        refetchInscripciones(),
        tab === 'reporte' ? refetchReporte() : Promise.resolve(reporteState),
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
      await api.post(`/campamentos/${selectedCampId}/cabanas`, {
        nombre: cabanaForm.nombre,
        capacidad: Number(cabanaForm.capacidad),
      });
      toast({ type: 'success', title: 'Cabaña creada', msg: cabanaForm.nombre });
      setCabanaModalOpen(false);
      setCabanaForm(EMPTY_CABANA_FORM);
      const updated = await refetchCabanas();
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
      await api.post(`/campamentos/${selectedCampId}/gastos`, {
        concepto: gastoForm.concepto,
        monto: Number(gastoForm.monto),
        fechaGasto: gastoForm.fechaGasto,
        nota: gastoForm.nota || undefined,
      });
      toast({ type: 'success', title: 'Gasto registrado', msg: gastoForm.concepto });
      setGastoForm(EMPTY_GASTO_FORM);
      const [gastosData, reporteData] = await Promise.all([
        refetchGastos(),
        refetchReporte().catch(() => reporteState),
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
      await api.post(`/campamentos/cabanas/${asignarCabanaId}/asignar`, {
        inscripcionId: Number(asignarInscId),
      });
      toast({ type: 'success', title: 'Cabaña asignada' });
      setAsignarModalOpen(false);
      setAsignarCabanaId('');
      setAsignarInscId('');
      const [cabanasData, inscripcionesData, detailData] = await Promise.all([
        refetchCabanas(),
        refetchInscripciones(),
        selectedInsc?.id ? refetchDetail() : Promise.resolve(inscDetailState),
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
      const res = await api.patch(`/campamentos/inscripciones/${inscripcionId}/estado`, { estado });
      const updated = res.data.data;
      syncInscripcionState(updated);
      if (tab === 'reporte') {
        const reporteActualizado = await refetchReporte();
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
      await api.delete(`/campamentos/pagos/${pagoId}`);
      const updatedDetail = await refetchDetail();
      if (updatedDetail) applyDetalleActualizado(updatedDetail);
      if (tab === 'reporte') {
        const reporteActualizado = await refetchReporte();
        setReporteState(reporteActualizado);
      }
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
      await api.delete(`/campamentos/descuentos/${descuentoId}`);
      const updatedDetail = await refetchDetail();
      if (updatedDetail) applyDetalleActualizado(updatedDetail);
      if (tab === 'reporte') {
        const reporteActualizado = await refetchReporte();
        setReporteState(reporteActualizado);
      }
      toast({ type: 'success', title: 'Descuento eliminado' });
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo eliminar el descuento', msg: getErrorMessage(error, 'Intenta nuevamente.') });
    } finally {
      setDeletingDescuentoId(null);
    }
  }

  async function deleteGasto(gastoId) {
    const confirmed = window.confirm('Se eliminará este gasto.');
    if (!confirmed) return;

    setDeletingGastoId(gastoId);
    try {
      await api.delete(`/campamentos/gastos/${gastoId}`);
      const [gastosData, reporteData] = await Promise.all([
        refetchGastos(),
        refetchReporte().catch(() => reporteState),
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
      await api.delete(`/campamentos/asignaciones/${inscripcionId}`);

      setCabanasState((current) => current.map((cabana) => (
        cabana.id === cabanaId
          ? {
            ...cabana,
            asignados: Math.max(0, Number(cabana.asignados || 0) - 1),
            miembros: (cabana.miembros || []).filter((miembro) => miembro.inscripcionId !== inscripcionId),
          }
          : cabana
      )));

      syncInscripcionState({ id: inscripcionId, cabanaAsignada: null });

      if (selectedInsc?.id === inscripcionId) {
        setInscDetailState((current) => (current ? { ...current, cabanaAsignada: null } : current));
      }

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
      await api.delete(`/campamentos/${selectedCamp.id}`);
      toast({ type: 'success', title: 'Campamento eliminado', msg: selectedCamp.nombre });
      setSelectedCampId(null);
      setSelectedInsc(null);
      setDetailModalOpen(false);
      await Promise.all([refetchCampamentos(), refetchInscripciones(), refetchCabanas()]);
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="card-title" style={{ margin: 0 }}>Campamentos</div>
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
                    <Button variant="primary" icon="user-plus" onClick={() => { setInscForm(EMPTY_INSCRIPCION_FORM); setInscModalOpen(true); }}>
                      Inscribir miembro
                    </Button>
                  </div>
                  {!inscripcionesState.length && <p className="muted">Todavía no hay inscripciones para este campamento.</p>}
                  {inscripcionesState.length > 0 && (
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
        title="Inscribir miembro"
        onClose={() => setInscModalOpen(false)}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setInscModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={saveInscripcion} disabled={savingInsc || !inscForm.miembroId}>
              {savingInsc ? 'Guardando...' : 'Inscribir'}
            </Button>
          </>
        )}
      >
        <div className="stack">
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
        footer={<Button variant="primary" onClick={() => { setDetailModalOpen(false); setSelectedInsc(null); }}>Cerrar</Button>}
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
