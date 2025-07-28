import React, { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { ranks } from '../../utils/enums';
import { ThemeContext } from '../../contexts/ThemeContext';
import styles from './Register.module.css';

interface FormData {
  username: string;
  password: string;
}

const schema = yup.object({
  username: yup.string().required('Usuario requerido').min(3, 'Mínimo 3 caracteres'),
  password: yup.string().required('Contraseña requerida').min(8, 'Mínimo 8 caracteres'),
});

const Register: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: yupResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await axios.post<{ token: string }>(`${process.env.REACT_APP_API_URL}/api/auth/register`, { ...data, rank: ranks.GUEST });
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrarse');
    }
  };

  return (
    <div className={styles.authContainer}>
      <button onClick={toggleTheme} className={styles.themeButton} title="Cambiar tema (claro/oscuro)">
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
      <div className={styles.authBox}>
        <h2>Registrarse</h2>
        {error && <p className={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.formGroup}>
            <label>Usuario</label>
            <input {...register('username')} placeholder="Ingresa tu usuario" />
            {errors.username && <p className={styles.error}>{errors.username.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label>Contraseña</label>
            <div className={styles.passwordWrapper}>
              <input type={showPassword ? 'text' : 'password'} {...register('password')} placeholder="Ingresa una contraseña segura (mínimo 8 caracteres)" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className={styles.eyeButton} title="Mostrar/ocultar contraseña">
                {showPassword ? (
                  // @ts-ignore
                <FaEyeSlash />
                ) : ( 
                  // @ts-ignore
                 <FaEye />
                 )}
              </button>
            </div>
            {errors.password && <p className={styles.error}>{errors.password.message}</p>}
          </div>
          <button type="submit" title="Registrarse y acceder al dashboard">Registrarse</button>
        </form>
        <div className={styles.link}>
          <p>¿Ya tienes cuenta? <Link to="/">Inicia sesión aquí</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;