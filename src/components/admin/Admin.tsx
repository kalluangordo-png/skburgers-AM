import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Lock, ArrowLeft, Settings, ChefHat, Utensils, ClipboardList, Loader2, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../services/utils';
import AdminDashboard from './AdminDashboard';
import AdminConfig from './AdminConfig';
import AdminKDS from './AdminKDS';
import AdminProducts from './AdminProducts';
import AdminOrders from './AdminOrders';
import { Order, Product, StoreConfig } from '../../types';
import { collection, onSnapshot, query, doc, setDoc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../ToastContext';
import FacebookPixel from '../FacebookPixel';

const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'kds' | 'settings'>('dashboard');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [config, setConfig] = useState<StoreConfig | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    setLoading(true);
    
    // Listeners em tempo real
    const unsubOrders = onSnapshot(query(collection(db, 'pedidos'), orderBy('createdAt', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    const unsubConfig = onSnapshot(doc(db, 'config', 'store'), async (snapshot) => {
      if (snapshot.exists()) {
        setConfig(snapshot.data() as StoreConfig);
      } else {
        // Auto-inicialização silenciosa se o documento não existir
        try {
          const { seedInitialData } = await import('../../services/seedService');
          await seedInitialData();
          console.log("Configuração 'store' inicializada automaticamente.");
        } catch (e) {
          console.error("Erro na auto-inicialização:", e);
        }
      }
      setLoading(false);
    });

    return () => {
      unsubOrders();
      unsubProducts();
      unsubConfig();
    };
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1214') {
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  const handleSaveConfig = async (newConfig: StoreConfig) => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'config', 'store'), newConfig, { merge: true });
      showToast("Configurações salvas!", "success");
    } catch (e) {
      console.error("Firebase Error:", e);
      showToast("Erro ao salvar configurações", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFixAddress = async () => {
    if (!config?.cep && !config?.storeAddress) {
      showToast("Preencha o endereço ou CEP da loja!", "error");
      return;
    }

    setIsSaving(true);
    try {
      // Tenta geocodificar o endereço completo da loja
      const fullAddress = `${config.storeAddress || ''}, ${config.storeNumber || ''}, ${config.storeNeighborhood || ''}, CEP ${config.cep || ''}`;
      const query = encodeURIComponent(`${fullAddress}, Manaus, AM`);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        
        await setDoc(doc(db, 'config', 'store'), { 
          storeCoords: { lat, lng } 
        }, { merge: true });

        showToast("Localização da Sede atualizada!", "success");
      } else {
        // Tenta apenas pelo CEP se o endereço completo falhar
        if (config.cep) {
          const cepQuery = encodeURIComponent(`${config.cep}, Manaus, AM`);
          const cepResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${cepQuery}&limit=1`);
          const cepData = await cepResponse.json();
          
          if (cepData && cepData.length > 0) {
            const lat = parseFloat(cepData[0].lat);
            const lng = parseFloat(cepData[0].lon);
            await setDoc(doc(db, 'config', 'store'), { storeCoords: { lat, lng } }, { merge: true });
            showToast("Localização atualizada pelo CEP!", "success");
            return;
          }
        }
        showToast("Não foi possível localizar o endereço da loja.", "error");
      }
    } catch (e) {
      showToast("Erro ao atualizar coordenadas.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleProductStatus = async (product: Product) => {
    try {
      await updateDoc(doc(db, 'products', product.id), { isPaused: !product.isPaused });
      showToast(`${product.name} ${!product.isPaused ? 'pausado' : 'ativado'}`, "success");
    } catch (e) {
      showToast("Erro ao alterar status", "error");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    console.log('Deleting product:', id);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card w-full max-w-md space-y-8"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold">Acesso Administrativo</h2>
            <p className="text-zinc-500 text-sm mt-2">Área restrita para gestores.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha"
              className={cn(
                "input-field w-full text-center text-2xl tracking-[0.5em]",
                error && "border-red-500"
              )}
              autoFocus
            />
            <button type="submit" className="btn-primary w-full">Entrar</button>
          </form>

          <Link to="/" className="flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar ao Início
          </Link>
        </motion.div>
      </div>
    );
  }

  if (loading && isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-yellow-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-6">
      <FacebookPixel pixelId={config.facebookPixelId} />
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="text-yellow-500 w-8 h-8" />
          <h1 className="text-xl md:text-2xl font-bold">Painel Administrativo</h1>
        </div>
        
        <nav className="flex bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar max-w-full">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'products', icon: Utensils, label: 'Cardápio' },
            { id: 'orders', icon: ClipboardList, label: 'Pedidos' },
            { id: 'kds', icon: ChefHat, label: 'Cozinha' },
            { id: 'settings', icon: Settings, label: 'Config' },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 md:px-6 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
                activeTab === tab.id ? "bg-yellow-500 text-black" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </nav>

        <Link to="/" className="btn-primary !bg-zinc-800 hover:!bg-zinc-700 text-xs py-2 px-4">Sair</Link>
      </header>

      {config ? (
        <>
          {activeTab === 'dashboard' && (
            <AdminDashboard 
              orders={orders} 
              config={config}
            />
          )}
          
          {activeTab === 'products' && (
            <AdminProducts 
              products={products}
              config={config}
              onUpdateConfig={handleSaveConfig}
              onToggleStatus={handleToggleProductStatus}
              onDelete={handleDeleteProduct}
            />
          )}

          {activeTab === 'orders' && (
            <AdminOrders 
              orders={orders}
            />
          )}

          {activeTab === 'kds' && (
            <AdminKDS 
              orders={orders}
              products={products}
            />
          )}

          {activeTab === 'settings' && (
            <AdminConfig 
              config={config}
              onSave={handleSaveConfig}
              onFixAddress={handleFixAddress}
              isSaving={isSaving}
            />
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
          <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center">
            <Settings className="w-10 h-10 text-yellow-500 animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Sistema Não Inicializado</h2>
            <p className="text-zinc-500 mt-2">Parece que é a primeira vez que você acessa o painel.</p>
          </div>
          <button 
            onClick={async () => {
              setIsSaving(true);
              try {
                const { seedInitialData } = await import('../../services/seedService');
                await seedInitialData();
                showToast("Sistema Inicializado com Sucesso!", "success");
              } catch (e) {
                showToast("Erro ao inicializar sistema", "error");
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving}
            className="btn-primary px-10 py-4 flex items-center gap-3"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <Rocket className="w-5 h-5" />}
            INICIALIZAR BANCO DE DADOS
          </button>
        </div>
      )}
    </div>
  );
};
export default Admin;
