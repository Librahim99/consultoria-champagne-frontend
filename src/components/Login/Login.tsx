import React, { useState } from 'react';
     import axios from 'axios';
     import { useNavigate, Link } from 'react-router-dom';
     import styles from './Login.module.css';

     const Login: React.FC = () => {
       const [username, setUsername] = useState<string>('');
       const [password, setPassword] = useState<string>('');
       const [error, setError] = useState<string>('');
       const navigate = useNavigate();

       const handleSubmit = async (e: React.FormEvent) => {
         e.preventDefault();
         try {
           const res = await axios.post<{ token: string }>(`${process.env.REACT_APP_API_URL}/api/auth/login`, { username, password });
           localStorage.setItem('token', res.data.token);
           navigate('/dashboard');
         } catch (err: any) {
           setError(err.response?.data?.message || 'Error al iniciar sesión');
         }
       };

       return (
         <div className={styles.authContainer}>
           <div className={styles.authBox}>
             <h2>Iniciar Sesión</h2>
             {error && <p className={styles.error}>{error}</p>}
             <form onSubmit={handleSubmit}>
               <div className={styles.formGroup}>
                 <label>Usuario</label>
                 <input
                   type="text"
                   value={username}
                   onChange={(e) => setUsername(e.target.value)}
                   required
                 />
               </div>
               <div className={styles.formGroup}>
                 <label>Contraseña</label>
                 <input
                   type="password"
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   required
                 />
               </div>
               <button type="submit">Iniciar Sesión</button>
             </form>
             <div className={styles.link}>
               <p>¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link></p>
             </div>
           </div>
         </div>
       );
     };

     export default Login;