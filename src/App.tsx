import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ToastContext';

// Importação dos componentes (Certifique-se que os caminhos estão corretos na sua pasta src)
import Admin from './components/admin/Admin';
import CustomerApp from './components/customer/CustomerApp';
import Home from './components/Home';
import Kitchen from './components/Kitchen';
import Tracking from './components/customer/Tracking';
import PWAInstallPrompt from './components/PWAInstallPrompt';

const App: React.FC = () => {
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (apiKey && !document.getElementById('google-maps-script')) {
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=pt-BR&region=BR`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          {/* Tela Inicial da SK Burger */}
          <Route path="/" element={<Home />} />

          {/* Área do Cliente - Cardápio e Pedidos */}
          <Route path="/order" element={<CustomerApp />} />

          {/* Rastreio de Pedido */}
          <Route path="/track/:orderId" element={<Tracking />} />

          {/* Área Administrativa (Protegida pela Senha 1214 nas diretrizes) */}
          <Route path="/admin" element={<Admin />} />

          {/* KDS - Tela da Cozinha (Timer de 20 min) */}
          <Route path="/kitchen" element={<Kitchen />} />

          {/* Rota de Segurança: Se digitar qualquer coisa errada, volta para o início */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <PWAInstallPrompt />
      </HashRouter>
    </ToastProvider>
  );
};

export default App;
