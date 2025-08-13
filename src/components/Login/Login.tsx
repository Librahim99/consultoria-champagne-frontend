import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import styles from './Auth.module.css';
import logoImage from '../../assets/logo-mantis.png';
import LoginGoogle from './LoginGoogle';

const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

interface FormData {
  username: string;
  password: string;
}

const schema = yup.object({
  username: yup.string().required('Usuario requerido').min(3, 'Mínimo 3 caracteres'),
  password: yup.string().required('Contraseña requerida').min(8, 'Mínimo 8 caracteres'),
});

const Login: React.FC = () => {
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const rememberedUser = localStorage.getItem('rememberedUser') || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      username: rememberedUser,
      password: '',
    },
  });

  useEffect(() => {
    if (rememberedUser) {
      setRememberMe(true);
    }
  }, [rememberedUser]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/login`, data);
      localStorage.setItem('token', res.data.token);

      if (rememberMe) {
        localStorage.setItem('rememberedUser', data.username);
      } else {
        localStorage.removeItem('rememberedUser');
      }

      navigate('/clients');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <img src={logoImage} alt="Logo" className={styles.logo} />
        <h1 className={styles.title}>Consultoría Mantis Software IT</h1>
      </div>
      <div className={styles.rightPanel}>
        <div className={styles.authBox}>
          <h2>Iniciar Sesión</h2>
          {error && <p className={styles.loginError}>{error}</p>}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className={styles.formGroup}>
              <input
                {...register('username')}
                placeholder=" "
                autoComplete="off"
              />
              <label>Usuario</label>
              {errors.username && <p className={styles.error}>{errors.username.message}</p>}
            </div>

            <div className={styles.formGroup}>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder=" "
                  autoComplete="off"
                />
                <label>Contraseña</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.eyeButton}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.password && <p className={styles.error}>{errors.password.message}</p>}
            </div>

            <div className={styles.switchContainer}>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                />
                <span className={styles.slider}></span>
                <span className={styles.labelText}>Recordarme</span>
              </label>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>
          {/* Google login aquí */}
          {googleClientId && (
            <div style={{ marginTop: '20px' }}>
              <LoginGoogle />
            </div>
          )}

          {/* <div className={styles.link}>
            <p>¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link></p>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default Login;