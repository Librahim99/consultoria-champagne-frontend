import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { ranks } from '../utils/enums'; // Asegúrate de que sea el import correcto
import { DecodedToken } from '../utils/interfaces';

type Rank = typeof ranks[keyof typeof ranks]; // Unión de todos los valores: 'Acceso Total' | 'Consultor' | etc.

export const UserContext = createContext<{ userRank: Rank; userId: string }>({
  userRank: ranks.GUEST,
  userId: '',
});

export const UserContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRank, setUserRank] = useState<Rank>(ranks.GUEST);
  const [userId, setUserId] = useState<string>('');
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded: DecodedToken = jwtDecode(token);
      setUserRank(decoded.rank as Rank); // Cast para asegurar que coincida con Rank
      setUserId(decoded.id);
    }
  }, []);
  return <UserContext.Provider value={{ userRank, userId }}>{children}</UserContext.Provider>;
};