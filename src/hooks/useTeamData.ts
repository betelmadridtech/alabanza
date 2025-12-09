// src/hooks/useTeamData.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types'; // Solo necesitamos User
import { GENERIC_ROLES } from '@/lib/constants'; // Importamos la lista fija

export function useTeamData() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshTeam = useCallback(async () => {
    try {
      setLoading(true);
      
      // AHORA SOLO CARGAMOS USUARIOS
      // (La columna 'roles' ya viene incluida en el select '*')
      const { data: usersData, error } = await supabase
        .from('users')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;

      if (usersData) {
        setUsers(usersData);
      }
      
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTeam();
  }, [refreshTeam]);

  return { 
    users, 
    roles: GENERIC_ROLES, // Devolvemos la constante para que quien use este hook tenga la lista
    loading, 
    refreshTeam 
  };
}