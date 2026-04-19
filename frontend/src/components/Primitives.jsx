import { useState } from 'react';

// ---- Avatar ----
const AVATAR_COLORS = ['#2E75B6', '#385723', '#17A2B8', '#8A6D04', '#6A4FB6', '#B6552E'];

export function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function Avatar({ name, size = 'md', color }) {
  return (
    <span className={`av av-${size}`} style={{ background: color || avatarColor(name) }}>
      {initials(name)}
    </span>
  );
}

// ---- Button ----
export function Button({ variant = 'primary', size, icon, children, onClick, disabled, type = 'button' }) {
  const cls = ['btn', `btn-${variant}`, size && `btn-${size}`].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {icon && <i data-lucide={icon}></i>}
      {children}
    </button>
  );
}

// ---- Input ----
export function Input({ label, error, helper, ...props }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      <input className={`inp ${error ? 'error' : ''}`} {...props} />
      {(helper || error) && <div className={`helper ${error ? 'err' : ''}`}>{error || helper}</div>}
    </div>
  );
}

// ---- Search ----
export function SearchField({ value, onChange, placeholder = 'Buscar…', autoFocus }) {
  return (
    <div className="search">
      <i data-lucide="search"></i>
      <input
        className="inp"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </div>
  );
}

// ---- Badge ----
export function Badge({ variant = 'neutral', children, icon }) {
  return <span className={`badge badge-${variant}`}>{icon && <span>{icon}</span>}{children}</span>;
}

// ---- Toast system ----
export function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => onDismiss(t.id)}>
          <div className="icon">{t.type === 'success' ? '✓' : t.type === 'error' ? '!' : 'i'}</div>
          <div>
            <div className="title">{t.title}</div>
            {t.msg && <div className="msg">{t.msg}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = (t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(s => [...s, { ...t, id }]);
    setTimeout(() => setToasts(s => s.filter(x => x.id !== id)), 3200);
  };
  const dismiss = (id) => setToasts(s => s.filter(x => x.id !== id));
  return { toasts, push, dismiss };
}

// ---- Modal ----
export function Modal({ open, title, children, onClose, footer }) {
  if (!open) return null;
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="x" onClick={onClose} aria-label="Cerrar"><i data-lucide="x"></i></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
