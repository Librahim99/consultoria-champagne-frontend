import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styles from './LoginGoogle.module.css';

export default function LoginGoogle() {
  const navigate = useNavigate();

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        localStorage.setItem('google_access_token', tokenResponse.access_token);

        const googleRes = await axios.get(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          }
        );

        const { email, name, picture, sub } = googleRes.data;

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
    scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    flow: 'implicit',
  });

  return (
    <button className={styles.googleBtn} onClick={() => login()}>
      <span className={styles.iconWrapper}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.5 32.4 29.1 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.4 1.1 7.3 2.8l6.4-6.4C33.7 5.4 29.1 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.6 0 19.5-7.7 20.9-18h-1.3z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.2 16.1 18.7 13 24 13c2.8 0 5.4 1.1 7.3 2.8l6.4-6.4C33.7 5.4 29.1 3 24 3 16.2 3 9.3 7.8 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 45c5.1 0 9.8-1.9 13.3-5.1l-6.2-5.2C29.3 36.3 26.8 37 24 37c-5 0-9.3-3.2-10.8-7.6l-6.6 5.1C9.3 40.2 16.2 45 24 45z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.6-6.5 6.7l6.2 5.2c3.6-3.3 5.9-8.2 5.9-13.9 0-1.1-.1-2.1-.3-3.1z"/>
        </svg>
      </span>
      <span>Iniciar sesión con Google</span>
    </button>
  );
}
