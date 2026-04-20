import { useEffect, useMemo, useState } from 'react';
import api from '../api/axiosConfig';
import { Avatar, Badge, Button, Input, Modal, SearchField } from '../components/Primitives';
import { useApi } from '../hooks/useApi';

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);
const EMPTY_CELL_FORM = {
  nombre: '',
  sector: '',
  liderMiembroId: '',
  diaReunion: '',
  horaReunion: '',
  activa: true,
};
const EMPTY_MEETING_FORM = {
  fecha: '',
  tema: '',
  comentarios: '',
};
const EMPTY_REPORT_FORM = {
  visitantes: 0,
  conversiones: 0,
  ofrenda: 0,
  observaciones: '',
  animo: 'Bien',
};

function getErrorMessage(error, fallback) {
  return error?.response?.data?.error || fallback;
}

function formatDate(value) {
  if (!value) {
    return '—';
  }

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

export default function CellsScreen({ toast }) {
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [selectedCellId, setSelectedCellId] = useState(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [cellModalOpen, setCellModalOpen] = useState(false);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [cellForm, setCellForm] = useState(EMPTY_CELL_FORM);
  const [meetingForm, setMeetingForm] = useState(EMPTY_MEETING_FORM);
  const [attendanceDraft, setAttendanceDraft] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [visitorComment, setVisitorComment] = useState('');
  const [savingCell, setSavingCell] = useState(false);
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [reportForm, setReportForm] = useState(EMPTY_REPORT_FORM);

  const {
    data: cells = [],
    refetch: refetchCells,
  } = useApi(async () => {
    const response = await api.get('/celulas');
    return response.data.data || [];
  }, { initialData: [] });

  const {
    data: summary = [],
    refetch: refetchSummary,
  } = useApi(async () => {
    const response = await api.get('/celulas/resumen', { params: { mes: month } });
    return response.data.data || [];
  }, { deps: [month], initialData: [] });

  const {
    data: members = [],
  } = useApi(async () => {
    const response = await api.get('/miembros', { params: { estado: 'activo' } });
    return response.data.data || [];
  }, { initialData: [] });

  const {
    data: meetings = [],
    loading: loadingMeetings,
    refetch: refetchMeetings,
  } = useApi(async () => {
    if (!selectedCellId) {
      return [];
    }

    const response = await api.get(`/celulas/${selectedCellId}/reuniones`, { params: { mes: month } });
    return response.data.data || [];
  }, { deps: [month, selectedCellId], initialData: [] });

  const {
    data: meetingDetail,
    loading: loadingMeetingDetail,
    refetch: refetchMeetingDetail,
  } = useApi(async () => {
    if (!selectedMeetingId) {
      return null;
    }

    const response = await api.get(`/celulas/reuniones/${selectedMeetingId}`);
    return response.data.data || null;
  }, { deps: [selectedMeetingId], initialData: null });

  useEffect(() => {
    if (!cells.length) {
      setSelectedCellId(null);
      return;
    }

    const exists = cells.some((cell) => cell.id === selectedCellId);

    if (!exists) {
      setSelectedCellId(cells[0].id);
    }
  }, [cells, selectedCellId]);

  useEffect(() => {
    if (!meetings.length) {
      setSelectedMeetingId(null);
      return;
    }

    const exists = meetings.some((meeting) => meeting.id === selectedMeetingId);

    if (!exists) {
      setSelectedMeetingId(meetings[0].id);
    }
  }, [meetings, selectedMeetingId]);

  useEffect(() => {
    if (!meetingDetail) {
      setAttendanceDraft([]);
      setReportForm(EMPTY_REPORT_FORM);
      return;
    }

    setAttendanceDraft(
      (meetingDetail.asistencia || []).map((item) => ({
        key: item.miembroId ? `miembro-${item.miembroId}` : `visitante-${item.id}`,
        miembroId: item.miembroId || null,
        visitanteNombre: item.visitanteNombre || '',
        comentario: item.comentario || '',
        miembro: item.miembro || null,
      }))
    );

    setReportForm({
      visitantes: meetingDetail.reporte?.visitantes ?? 0,
      conversiones: meetingDetail.reporte?.conversiones ?? 0,
      ofrenda: meetingDetail.reporte?.ofrenda ?? 0,
      observaciones: meetingDetail.reporte?.observaciones || '',
      animo: meetingDetail.reporte?.animo || 'Bien',
    });
  }, [meetingDetail]);

  const selectedCell = useMemo(
    () => cells.find((cell) => cell.id === selectedCellId) || null,
    [cells, selectedCellId]
  );

  const selectedSummary = useMemo(
    () => summary.find((item) => item.id === selectedCellId) || null,
    [selectedCellId, summary]
  );

  const suggestedMembers = useMemo(() => {
    const query = normalizeText(memberSearch);
    const selectedName = normalizeText(selectedCell?.nombre);

    return members
      .filter((member) => {
        if (!query) {
          return true;
        }

        return normalizeText(member.nombre).includes(query)
          || normalizeText(member.cedula).includes(query);
      })
      .sort((left, right) => {
        const leftCellMatch = normalizeText(left.celula) === selectedName ? 0 : 1;
        const rightCellMatch = normalizeText(right.celula) === selectedName ? 0 : 1;

        if (leftCellMatch !== rightCellMatch) {
          return leftCellMatch - rightCellMatch;
        }

        return left.nombre.localeCompare(right.nombre, 'es');
      })
      .slice(0, 8);
  }, [memberSearch, members, selectedCell?.nombre]);

  const eligibleLeaders = useMemo(
    () => members.filter((member) => member.estado === 'activo' && ['Líder', 'Pastor'].includes(member.rol)),
    [members]
  );

  function openNewCell() {
    setEditingCell(null);
    setCellForm(EMPTY_CELL_FORM);
    setCellModalOpen(true);
  }

  function openEditCell() {
    if (!selectedCell) {
      return;
    }

    setEditingCell(selectedCell);
    setCellForm({
      nombre: selectedCell.nombre || '',
      sector: selectedCell.sector || '',
      liderMiembroId: selectedCell.liderMiembroId ? String(selectedCell.liderMiembroId) : '',
      diaReunion: selectedCell.diaReunion || '',
      horaReunion: selectedCell.horaReunion || '',
      activa: selectedCell.activa !== false,
    });
    setCellModalOpen(true);
  }

  function openNewMeeting() {
    if (!selectedCell) {
      return;
    }

    setMeetingForm({
      ...EMPTY_MEETING_FORM,
      fecha: `${month}-01`,
    });
    setMeetingModalOpen(true);
  }

  function addMemberAttendance(member) {
    setAttendanceDraft((current) => {
      if (current.some((item) => Number(item.miembroId) === Number(member.id))) {
        return current;
      }

      return [
        ...current,
        {
          key: `miembro-${member.id}`,
          miembroId: member.id,
          visitanteNombre: '',
          comentario: '',
          miembro: member,
        },
      ];
    });
  }

  function addVisitorAttendance() {
    const name = String(visitorName || '').trim();

    if (!name) {
      return;
    }

    setAttendanceDraft((current) => [
      ...current,
      {
        key: `visitante-${Date.now()}`,
        miembroId: null,
        visitanteNombre: name,
        comentario: visitorComment.trim(),
        miembro: null,
      },
    ]);
    setVisitorName('');
    setVisitorComment('');
  }

  function removeAttendanceItem(key) {
    setAttendanceDraft((current) => current.filter((item) => item.key !== key));
  }

  async function saveCell() {
    setSavingCell(true);

    try {
      const payload = {
        ...cellForm,
        liderMiembroId: cellForm.liderMiembroId ? Number(cellForm.liderMiembroId) : undefined,
      };

      if (editingCell) {
        await api.put(`/celulas/${editingCell.id}`, payload);
        toast({ type: 'success', title: 'Célula actualizada', msg: cellForm.nombre });
      } else {
        await api.post('/celulas', payload);
        toast({ type: 'success', title: 'Célula creada', msg: cellForm.nombre });
      }

      setCellModalOpen(false);
      await Promise.all([refetchCells(), refetchSummary()]);
    } catch (error) {
      toast({
        type: 'error',
        title: 'No se pudo guardar la célula',
        msg: getErrorMessage(error, 'Intenta nuevamente.'),
      });
    } finally {
      setSavingCell(false);
    }
  }

  async function saveMeeting() {
    if (!selectedCell) {
      return;
    }

    setSavingMeeting(true);

    try {
      const response = await api.post('/celulas/reuniones', {
        celulaId: selectedCell.id,
        ...meetingForm,
      });

      const created = response.data.data;
      toast({ type: 'success', title: 'Reunión creada', msg: `${selectedCell.nombre} · ${meetingForm.fecha}` });
      setMeetingModalOpen(false);
      await Promise.all([refetchMeetings(), refetchSummary()]);
      setSelectedMeetingId(created.id);
    } catch (error) {
      toast({
        type: 'error',
        title: 'No se pudo crear la reunión',
        msg: getErrorMessage(error, 'Intenta nuevamente.'),
      });
    } finally {
      setSavingMeeting(false);
    }
  }

  async function saveAttendance() {
    if (!selectedMeetingId) {
      return;
    }

    setSavingAttendance(true);

    try {
      await api.post(`/celulas/reuniones/${selectedMeetingId}/asistencia`, {
        registros: attendanceDraft.map((item) => ({
          miembroId: item.miembroId || undefined,
          visitanteNombre: item.visitanteNombre || undefined,
          comentario: item.comentario || undefined,
        })),
      });

      toast({
        type: 'success',
        title: 'Asistencia guardada',
        msg: `${attendanceDraft.length} registros procesados`,
      });

      await Promise.all([refetchMeetingDetail(), refetchMeetings(), refetchSummary()]);
    } catch (error) {
      toast({
        type: 'error',
        title: 'No se pudo guardar la asistencia',
        msg: getErrorMessage(error, 'Intenta nuevamente.'),
      });
    } finally {
      setSavingAttendance(false);
    }
  }

  async function saveReport() {
    if (!selectedMeetingId) {
      return;
    }

    setSavingReport(true);

    try {
      await api.put(`/celulas/reuniones/${selectedMeetingId}/reporte`, {
        visitantes: Number(reportForm.visitantes || 0),
        conversiones: Number(reportForm.conversiones || 0),
        ofrenda: Number(reportForm.ofrenda || 0),
        observaciones: reportForm.observaciones,
        animo: reportForm.animo,
      });

      toast({
        type: 'success',
        title: 'Reporte de célula guardado',
        msg: selectedCell?.nombre || 'Reunión actualizada',
      });

      await Promise.all([refetchMeetingDetail(), refetchSummary()]);
    } catch (error) {
      toast({
        type: 'error',
        title: 'No se pudo guardar el reporte',
        msg: getErrorMessage(error, 'Intenta nuevamente.'),
      });
    } finally {
      setSavingReport(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>Células</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            Control de reuniones, asistencia y resultado semanal por célula.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <input className="inp" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          <Button variant="secondary" icon="pencil" onClick={openEditCell} disabled={!selectedCell}>
            Editar célula
          </Button>
          <Button variant="primary" icon="plus" onClick={openNewCell}>
            Nueva célula
          </Button>
        </div>
      </div>

      <div className="grid-kpi">
        <div className="card kpi">
          <div className="label">Células activas</div>
          <div className="value">{cells.filter((item) => item.activa).length}</div>
          <div className="muted">Catálogo vigente</div>
        </div>
        <div className="card kpi">
          <div className="label">Reuniones del mes</div>
          <div className="value">{summary.reduce((sum, item) => sum + item.reuniones, 0)}</div>
          <div className="muted">Mes seleccionado</div>
        </div>
        <div className="card kpi">
          <div className="label">Asistentes del mes</div>
          <div className="value">{summary.reduce((sum, item) => sum + item.asistentes, 0)}</div>
          <div className="muted">Sumatoria de controles</div>
        </div>
        <div className="card kpi">
          <div className="label">Visitantes reportados</div>
          <div className="value">{summary.reduce((sum, item) => sum + item.visitantes, 0)}</div>
          <div className="muted">Reportes por reunión</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 16 }}>
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="card-title" style={{ margin: 0 }}>Catálogo de células</div>
            <Badge variant="neutral">{cells.length}</Badge>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            {cells.map((cell) => {
              const resume = summary.find((item) => item.id === cell.id);
              return (
                <button
                  key={cell.id}
                  type="button"
                  className={`btn ${selectedCellId === cell.id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ justifyContent: 'space-between', width: '100%', padding: 12, textAlign: 'left' }}
                  onClick={() => setSelectedCellId(cell.id)}
                >
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontWeight: 600 }}>{cell.nombre}</span>
                    <span style={{ fontSize: 12, opacity: 0.85 }}>
                      {cell.liderNombre || 'Sin líder'} · {cell.diaReunion || 'Día pendiente'}
                    </span>
                  </span>
                  <span style={{ fontSize: 12, opacity: 0.9 }}>
                    {resume?.reuniones ?? 0} reun.
                  </span>
                </button>
              );
            })}
            {!cells.length && <p className="muted">Aún no hay células creadas.</p>}
          </div>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div className="card-title" style={{ marginBottom: 4 }}>{selectedCell?.nombre || 'Selecciona una célula'}</div>
                <div className="muted">
                  {selectedCell
                    ? `${selectedCell.sector || 'Sector pendiente'} · ${selectedCell.liderNombre || 'Líder pendiente'} · ${selectedCell.diaReunion || 'Día pendiente'} ${selectedCell.horaReunion || ''}`
                    : 'Elige una célula para administrar sus reuniones y reportes.'}
                </div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                {selectedCell && (
                  <Button variant="primary" icon="calendar-plus" onClick={openNewMeeting}>
                    Nueva reunión
                  </Button>
                )}
              </div>
            </div>

            {selectedSummary && (
              <div className="filters" style={{ marginBottom: 0 }}>
                <Badge variant="neutral">Reuniones: {selectedSummary.reuniones}</Badge>
                <Badge variant="neutral">Asistentes: {selectedSummary.asistentes}</Badge>
                <Badge variant="neutral">Promedio: {selectedSummary.promedioAsistencia}</Badge>
                <Badge variant="neutral">Visitantes: {selectedSummary.visitantes}</Badge>
                <Badge variant="neutral">Ofrenda: {formatMoney(selectedSummary.ofrenda)}</Badge>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '360px minmax(0, 1fr)', gap: 16 }}>
            <div className="card">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="card-title" style={{ margin: 0 }}>Reuniones del mes</div>
                <Badge variant="neutral">{meetings.length}</Badge>
              </div>
              {loadingMeetings && <p className="muted">Cargando reuniones...</p>}
              <div className="stack" style={{ gap: 10 }}>
                {meetings.map((meeting) => (
                  <button
                    key={meeting.id}
                    type="button"
                    className={`btn ${selectedMeetingId === meeting.id ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ justifyContent: 'space-between', width: '100%', padding: 12, textAlign: 'left' }}
                    onClick={() => setSelectedMeetingId(meeting.id)}
                  >
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span style={{ fontWeight: 600 }}>{meeting.tema}</span>
                      <span style={{ fontSize: 12, opacity: 0.85 }}>{formatDate(meeting.fecha)}</span>
                    </span>
                    <span style={{ fontSize: 12, opacity: 0.9 }}>
                      {meeting.asistentes || 0} asis.
                    </span>
                  </button>
                ))}
                {!loadingMeetings && !meetings.length && (
                  <p className="muted">No hay reuniones registradas para este mes.</p>
                )}
              </div>
            </div>

            <div className="stack" style={{ gap: 16 }}>
              <div className="card">
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div className="card-title" style={{ marginBottom: 4 }}>Control de asistencia</div>
                    <div className="muted">
                      {meetingDetail
                        ? `${meetingDetail.tema} · ${formatDate(meetingDetail.fecha)}`
                        : 'Selecciona una reunión para registrar asistencia.'}
                    </div>
                  </div>
                  {meetingDetail && (
                    <Badge variant={meetingDetail.estado === 'completada' ? 'success' : 'neutral'}>
                      {meetingDetail.estado}
                    </Badge>
                  )}
                </div>

                {loadingMeetingDetail && <p className="muted">Cargando detalle de la reunión...</p>}

                {meetingDetail && (
                  <>
                    <SearchField
                      value={memberSearch}
                      onChange={setMemberSearch}
                      placeholder="Buscar miembro por nombre o cédula"
                    />

                    <div className="stack" style={{ gap: 8, margin: '12px 0 16px' }}>
                      {suggestedMembers.map((member) => (
                        <div
                          key={member.id}
                          className="row"
                          style={{ justifyContent: 'space-between', border: '1px solid var(--ls-border)', borderRadius: 8, padding: 10 }}
                        >
                          <div className="row" style={{ gap: 10, minWidth: 0 }}>
                            <Avatar name={member.nombre} size="sm" />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600 }}>{member.nombre}</div>
                              <div className="muted" style={{ fontSize: 12 }}>
                                {member.celula || 'Sin célula'} · {member.rol}
                              </div>
                            </div>
                          </div>
                          <Button variant="secondary" size="sm" onClick={() => addMemberAttendance(member)}>
                            Agregar
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="row" style={{ gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
                      <div style={{ flex: '1 1 220px' }}>
                        <Input
                          label="Visitante rápido"
                          value={visitorName}
                          onChange={(event) => setVisitorName(event.target.value)}
                        />
                      </div>
                      <div style={{ flex: '1 1 220px' }}>
                        <Input
                          label="Comentario"
                          value={visitorComment}
                          onChange={(event) => setVisitorComment(event.target.value)}
                        />
                      </div>
                      <Button variant="secondary" icon="user-plus" onClick={addVisitorAttendance}>
                        Agregar visitante
                      </Button>
                    </div>

                    <div className="stack" style={{ gap: 8, marginBottom: 16 }}>
                      {attendanceDraft.map((item) => (
                        <div
                          key={item.key}
                          className="row"
                          style={{ justifyContent: 'space-between', border: '1px solid var(--ls-border)', borderRadius: 8, padding: 10 }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600 }}>
                              {item.miembro?.nombre || item.visitanteNombre || 'Visitante'}
                            </div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {item.miembro ? `${item.miembro.celula || 'Sin célula'} · ${item.miembro.rol}` : 'Visitante'}
                              {item.comentario ? ` · ${item.comentario}` : ''}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" icon="trash-2" onClick={() => removeAttendanceItem(item.key)}>
                            Quitar
                          </Button>
                        </div>
                      ))}
                      {!attendanceDraft.length && (
                        <p className="muted">Todavía no hay asistentes cargados para esta reunión.</p>
                      )}
                    </div>

                    <Button variant="primary" icon="save" onClick={saveAttendance} disabled={savingAttendance}>
                      {savingAttendance ? 'Guardando...' : 'Guardar asistencia'}
                    </Button>
                  </>
                )}
              </div>

              <div className="card">
                <div className="card-title" style={{ marginBottom: 12 }}>Reporte de cómo les fue</div>

                {meetingDetail ? (
                  <div className="stack">
                    <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 160px' }}>
                        <Input
                          label="Visitantes"
                          type="number"
                          min="0"
                          value={reportForm.visitantes}
                          onChange={(event) => setReportForm((current) => ({ ...current, visitantes: event.target.value }))}
                        />
                      </div>
                      <div style={{ flex: '1 1 160px' }}>
                        <Input
                          label="Conversiones"
                          type="number"
                          min="0"
                          value={reportForm.conversiones}
                          onChange={(event) => setReportForm((current) => ({ ...current, conversiones: event.target.value }))}
                        />
                      </div>
                      <div style={{ flex: '1 1 160px' }}>
                        <Input
                          label="Ofrenda"
                          type="number"
                          min="0"
                          step="0.01"
                          value={reportForm.ofrenda}
                          onChange={(event) => setReportForm((current) => ({ ...current, ofrenda: event.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label>Ánimo de la reunión</label>
                      <select
                        className="inp"
                        value={reportForm.animo}
                        onChange={(event) => setReportForm((current) => ({ ...current, animo: event.target.value }))}
                      >
                        {['Excelente', 'Bien', 'Regular', 'Difícil'].map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label>Observaciones</label>
                      <textarea
                        className="inp"
                        rows="4"
                        value={reportForm.observaciones}
                        onChange={(event) => setReportForm((current) => ({ ...current, observaciones: event.target.value }))}
                      />
                    </div>

                    <Button variant="primary" icon="save" onClick={saveReport} disabled={savingReport}>
                      {savingReport ? 'Guardando...' : 'Guardar reporte'}
                    </Button>
                  </div>
                ) : (
                  <p className="muted">Selecciona una reunión para completar su reporte.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div className="card-title" style={{ marginBottom: 12 }}>Resumen mensual por célula</div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Célula</th>
              <th>Líder</th>
              <th>Reuniones</th>
              <th>Asistentes</th>
              <th>Promedio</th>
              <th>Visitantes</th>
              <th>Conversiones</th>
              <th>Ofrenda</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((item) => (
              <tr key={item.id}>
                <td>{item.nombre}</td>
                <td>{item.liderNombre || '—'}</td>
                <td className="tnum">{item.reuniones}</td>
                <td className="tnum">{item.asistentes}</td>
                <td className="tnum">{item.promedioAsistencia}</td>
                <td className="tnum">{item.visitantes}</td>
                <td className="tnum">{item.conversiones}</td>
                <td className="tnum">{formatMoney(item.ofrenda)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={cellModalOpen}
        title={editingCell ? 'Editar célula' : 'Nueva célula'}
        onClose={() => setCellModalOpen(false)}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setCellModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={saveCell} disabled={savingCell}>
              {savingCell ? 'Guardando...' : 'Guardar'}
            </Button>
          </>
        )}
      >
        <div className="stack">
          <Input label="Nombre" value={cellForm.nombre} onChange={(event) => setCellForm((current) => ({ ...current, nombre: event.target.value }))} />
          <Input label="Sector" value={cellForm.sector} onChange={(event) => setCellForm((current) => ({ ...current, sector: event.target.value }))} />
          <div className="field">
            <label>Líder</label>
            <select
              className="inp"
              value={cellForm.liderMiembroId}
              onChange={(event) => setCellForm((current) => ({ ...current, liderMiembroId: event.target.value }))}
            >
              <option value="">Selecciona un líder o pastor</option>
              {eligibleLeaders.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.nombre} · {member.rol}
                </option>
              ))}
            </select>
          </div>
          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Input label="Día de reunión" value={cellForm.diaReunion} onChange={(event) => setCellForm((current) => ({ ...current, diaReunion: event.target.value }))} />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Hora" value={cellForm.horaReunion} onChange={(event) => setCellForm((current) => ({ ...current, horaReunion: event.target.value }))} />
            </div>
          </div>
          <div className="field">
            <label>Estado</label>
            <select
              className="inp"
              value={cellForm.activa ? '1' : '0'}
              onChange={(event) => setCellForm((current) => ({ ...current, activa: event.target.value === '1' }))}
            >
              <option value="1">Activa</option>
              <option value="0">Inactiva</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        open={meetingModalOpen}
        title="Nueva reunión de célula"
        onClose={() => setMeetingModalOpen(false)}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setMeetingModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={saveMeeting} disabled={savingMeeting}>
              {savingMeeting ? 'Guardando...' : 'Guardar reunión'}
            </Button>
          </>
        )}
      >
        <div className="stack">
          <Input label="Fecha" type="date" value={meetingForm.fecha} onChange={(event) => setMeetingForm((current) => ({ ...current, fecha: event.target.value }))} />
          <Input label="Tema" value={meetingForm.tema} onChange={(event) => setMeetingForm((current) => ({ ...current, tema: event.target.value }))} />
          <div className="field">
            <label>Comentarios</label>
            <textarea
              className="inp"
              rows="4"
              value={meetingForm.comentarios}
              onChange={(event) => setMeetingForm((current) => ({ ...current, comentarios: event.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
