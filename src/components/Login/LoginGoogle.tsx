import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { FaGoogle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import styles from './LoginGoogle.module.css';

export default function LoginGoogle() {
  const navigate = useNavigate();

  const login = useGoogleLogin({
  onSuccess: async (tokenResponse) => {
    try {
      // 🔽 Guardamos el access_token
      localStorage.setItem('google_access_token', tokenResponse.access_token);

      // 🔽 Obtenemos datos del usuario
      const googleRes = await axios.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        }
      );

      const { email, name, picture, sub } = googleRes.data;

      // 🔽 Enviamos los datos al backend para login
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/google`, {
        email,
        name,
        picture,
        googleId: sub,
      });

      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
    }
  },
  onError: () => console.error('❌ Error en login con Google'),

  // ⬅️ Scope necesario para Calendar + Meet
  scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
  flow: 'implicit',
});


  return (
    <button className={styles.googleBtn} onClick={() => login()}>
      <FaGoogle className={styles.icon} />
      Iniciar sesión con Google
    </button>
  );
}
