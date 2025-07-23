import React from 'react';
     import styles from './LicenseExpirations.module.css';

     const LicenseExpirations: React.FC = () => {
       return (
         <div className={styles.container}>
           <h1>Vencimientos de Licencia</h1>
           <p>Próximamente: Lista de clientes con fechas de vencimiento de licencias.</p>
         </div>
       );
     };

     export default LicenseExpirations;