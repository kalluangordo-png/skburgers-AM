import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ToastContext';

// Importação dos componentes (Certifique-se que os caminhos estão corretos na sua pasta src)
import Admin from './components/admin/Admin';
import CustomerApp from './components/customer/CustomerApp';
import Home from './components/Home';
import Kitchen from './components/Kitchen';

const App: React.FC = () => {
  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          {/* Tela Inicial da SK Burger */}
          <Route path="/" element={<Home />} />

          {/* Área do Cliente - Cardápio e Pedidos */}
          <Route path="/order" element={<CustomerApp />} />

          {/* Área Administrativa (Protegida pela Senha 1214 nas diretrizes) */}
          <Route path="/admin" element={<Admin />} />

          {/* KDS - Tela da Cozinha (Timer de 20 min) */}
          <Route path="/kitchen" element={<Kitchen />} />

          {/* Rota de Segurança: Se digitar qualquer coisa errada, volta para o início */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ToastProvider>
  );
};

export default App;
