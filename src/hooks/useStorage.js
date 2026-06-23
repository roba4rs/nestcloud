import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useStorage() {
  const { user } = useAuth();
  const [storage, setStorage] = useState(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_storage')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setStorage(data));
  }, [user]);

  return { storage };
}