import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { ranks } from '../../utils/enums';
import styles from '../Login/Auth.module.css';
import logoImage from '../../assets/logo-mantis.png';

interface FormData {
  username: string;
  password: string;
}

const schema = yup.object({
  username: yup.string().required('Usuario requerido').min(3, 'Mínimo 3 caracteres'),
  password: yup.string().required('Contraseña requerida').min(8, 'Mínimo 8 caracteres'),
});

const Register: React.FC = () => {
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/register`, {
        ...data,
        rank: ranks.GUEST,
      });
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrarse');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <img src={logoImage} alt="Logo Mantis" className={styles.logo} />
        <h1 className={styles.title}>Consultoría Mantis Software IT</h1>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.authBox}>
          <h2>Registrarse</h2>
          {error && <p className={styles.loginError}>{error}</p>}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className={styles.formGroup}>
              <input {...register('username')} placeholder=" " autoComplete="off" />
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

            <button type="submit">Registrarse</button>
          </form>

          <div className={styles.link}>
            <p>¿Ya tienes cuenta? <Link to="/">Inicia sesión aquí</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;