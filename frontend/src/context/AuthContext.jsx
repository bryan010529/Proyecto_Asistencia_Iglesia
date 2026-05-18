import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  async function cargarPerfil(authUser) {
    if (!authUser) { setPerfil(null); return; }
    const { data } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', authUser.id)
      .single();
    setPerfil(data);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      cargarPerfil(session?.user ?? null).finally(() => setLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      cargarPerfil(nextUser);
      if (!session) setSessionExpired(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function login(correo, password) {
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password });
    if (error) throw error;
    setSessionExpired(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setPerfil(null);
  }

  function clearSessionExpired() {
    setSessionExpired(false);
  }

  const userNormalizado = useMemo(() => {
    if (!user || !perfil) return null;
    return {
      id: user.id,
      nombre: perfil.nombre,
      rol: perfil.rol,
      correo: user.email,
    };
  }, [user, perfil]);

  const value = useMemo(() => ({
    user: userNormalizado,
    login,
    logout,
    sessionExpired,
    clearSessionExpired,
  }), [userNormalizado, sessionExpired]);

  if (loading) return null;

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
