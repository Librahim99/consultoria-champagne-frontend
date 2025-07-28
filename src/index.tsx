import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import './utils/gridConfig'; // Importa el archivo como módulo secundario
import 'ag-grid-community/styles/ag-grid.css'; // Correcto para v34
import 'ag-grid-community/styles/ag-theme-alpine.css'; // Light

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);