import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { ThemeContext } from '../../contexts/ThemeContext';
import styles from './Login.module.css';
import logoImage from '../../assets/logo-mantis.png';

interface FormData {
  username: string;
  password: string;
}

const schema = yup.object({
  username: yup.string().required('Usuario requerido').min(3, 'Mínimo 3 caracteres'),
  password: yup.string().required('Contraseña requerida').min(8, 'Mínimo 8 caracteres'),
});

const Login: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
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

      navigate('/dashboard');
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
        <button onClick={toggleTheme} className={styles.themeButton}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
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

          <div className={styles.link}>
            <p>¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
