import axios from 'axios';
import { useEffect, useState } from 'react';

interface Props {
  accessToken: string;
  emailCliente: string;
  summary?: string;
  start?: string;
  end?: string;
}

export default function CalendarCreateButton({
  accessToken,
  emailCliente,
  summary = 'Reunión con cliente',
  start = '2025-08-05T15:00:00-03:00',
  end = '2025-08-05T16:00:00-03:00',
}: Props) {
  const [enlaceMeet, setEnlaceMeet] = useState<string | null>(null);

  const crearEvento = async () => {
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/calendar/create`, {
        accessToken,
        summary,
        startTime: start,
        endTime: end,
        attendees: [{ email: emailCliente }],
      });

      setEnlaceMeet(res.data.meetLink);
    } catch (err) {
      console.error('❌ Error al crear el evento:', err);
    }
  };

  return (
    <div>
      <button onClick={crearEvento}>📅 Agendar reunión con Meet</button>
      {enlaceMeet && (
        <p>
          Enlace generado: <a href={enlaceMeet} target="_blank" rel="noreferrer">{enlaceMeet}</a>
        </p>
      )}
    </div>
  );
}
