import React, { useState } from 'react';
     import axios from 'axios';
     import { useNavigate, Link } from 'react-router-dom';
     import styles from './Register.module.css';

     const Register: React.FC = () => {
       const [username, setUsername] = useState<string>('');
       const [password, setPassword] = useState<string>('');
       const [error, setError] = useState<string>('');
       const navigate = useNavigate();

       const handleSubmit = async (e: React.FormEvent) => {
         e.preventDefault();
         try {
           const res = await axios.post<{ token: string }>('http://localhost:5000/api/auth/register', { username, password });
           localStorage.setItem('token', res.data.token);
           navigate('/dashboard');
         } catch (err: any) {
           setError(err.response?.data?.message || 'Error al registrarse');
         }
       };

       return (
         <div className={styles.authContainer}>
           <div className={styles.authBox}>
             <h2>Registrarse</h2>
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
               <button type="submit">Registrarse</button>
             </form>
             <div className={styles.link}>
               <p>¿Ya tienes cuenta? <Link to="/">Inicia sesión aquí</Link></p>
             </div>
           </div>
         </div>
       );
     };

     export default Register;