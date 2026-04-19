import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { setUnauthorizedHandler } from '../api/axiosConfig';

const AuthContext = createContext(null);

function normalizeUser(userData = {}) {
  const id = userData.id;
  const nombre = userData.nombre || userData.name || '';
  const rol = userData.rol || userData.role || '';

  return {
    id,
    nombre,
    rol,
    name: nombre,
    role: rol,
    correo: userData.correo || '',
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? normalizeUser(JSON.parse(stored)) : null;
  });
  const [sessionExpired, setSessionExpired] = useState(false);

  function login(userData, token) {
    const normalizedUser = normalizeUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setSessionExpired(false);
    setUser(normalizedUser);
  }

  function logout(options = {}) {
    const { expired = false } = options;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setSessionExpired(expired);
    setUser(null);
  }

  function clearSessionExpired() {
    setSessionExpired(false);
  }

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout({ expired: true });
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  const value = useMemo(() => ({
    user,
    login,
    logout,
    sessionExpired,
    clearSessionExpired,
  }), [sessionExpired, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
