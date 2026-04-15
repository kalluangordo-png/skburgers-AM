import React, { useState, useEffect, useRef } from 'react';
import { 
  ChefHat, Clock, CheckCircle, AlertTriangle, Lock, 
  ArrowLeft, Loader2, Flame, Volume2, VolumeX,
  Timer, User, Hash, MessageSquare, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../services/utils';
import { Link } from 'react-router-dom';
import { 
  collection, query, where, onSnapshot, doc, 
  updateDoc, serverTimestamp, getDoc, orderBy, addDoc 
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Order, OrderStatus } from '../types';
import { useToast } from './ToastContext';

const ALERT_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

interface KitchenCardProps {
  order: Order;
  minutes: number;
  isChecked: (idx: number) => boolean;
  onToggleCheck: (idx: number) => void;
  onUpdateStatus: (orderId: string, currentStatus: OrderStatus) => void;
}

const KitchenCard: React.FC<KitchenCardProps> = ({ 
  order, 
  minutes, 
  isChecked, 
  onToggleCheck, 
  onUpdateStatus 
}) => {
  const isOld = minutes >= 20;
  const isCritical = minutes >= 30;
  const isPreparing = order.status === OrderStatus.PREPARING;

  return (
    <div className={`flex flex-col rounded-[2.5rem] border transition-all duration-500 overflow-hidden bg-zinc-900/40 backdrop-blur-xl group h-fit shrink-0 w-[350px]
      ${isCritical ? 'kds-warning' : isOld ? 'border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.1)]' : 'border-white/5'}
      ${isPreparing && !isCritical ? 'border-emerald-500/40' : 'hover:border-white/20'}`}
    >
      <div className={`p-6 border-b transition-colors duration-500 flex justify-between items-start ${isPreparing ? 'bg-emerald-500/5 border-emerald-500/10' : 'border-white/5'}`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded-lg transition-colors ${isPreparing ? 'bg-emerald-500 text-black' : isOld ? 'bg-red-600 text-white' : 'bg-yellow-500 text-black'}`}>
                <Hash size={14} strokeWidth={4} />
            </div>
            <span className={`text-3xl font-black italic leading-none tracking-tighter transition-colors ${isPreparing ? 'text-emerald-500' : isOld ? 'text-red-500' : 'text-yellow-500'}`}>
              {order.numeroComanda}
            </span>
          </div>
          <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest truncate max-w-[120px]">
            {order.cliente.nome.split(' ')[0]}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-black tabular-nums transition-all
            ${isOld ? 'bg-red-500/20 border-red-500/50 text-red-500' : 'bg-white/5 border-white/5 text-zinc-500'}`}>
            <Clock size={14} strokeWidth={3} />
            {minutes}'
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-5 bg-black/10">
        {order.itens.map((item, idx) => (
          <div 
            key={idx} 
            onClick={() => onToggleCheck(idx)}
            className="flex items-start gap-4 cursor-pointer group/item"
          >
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all shrink-0
              ${isChecked(idx) ? 'bg-emerald-500 border-emerald-500 text-black' : 'bg-zinc-800 border-white/10 text-zinc-600 group-hover/item:border-yellow-500'}`}>
              <Check size={18} strokeWidth={4} className={isChecked(idx) ? 'scale-100 opacity-100' : 'scale-50 opacity-0'} />
            </div>

            <div className="flex-1">
              <div className="flex items-baseline gap-3">
                <span className={`font-black text-lg italic ${isChecked(idx) ? 'text-zinc-400' : 'text-yellow-500'}`}>
                  {item.qtd}x
                </span>
                <p className={`text-base font-black leading-tight transition-all duration-300 uppercase italic flex items-center gap-2
                  ${isChecked(idx) ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
                  {item.name}
                  {(item as any).isCombo && !isChecked(idx) && (
                    <span className="bg-emerald-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-md not-italic">COMBO</span>
                  )}
                </p>
              </div>

              {item.addons && item.addons.length > 0 && !isChecked(idx) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.addons.map((a, i) => (
                    <span key={i} className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                      + {a.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 mt-auto">
        <button 
          onClick={() => onUpdateStatus(order.id, order.status)}
          className={`w-full py-6 rounded-[2rem] flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] text-xs transition-all active:scale-95
            ${isPreparing 
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
              : 'bg-zinc-100 text-black hover:bg-yellow-500 hover:text-white'}`}
        >
          {isPreparing ? (
            <><Check size={20} strokeWidth={3}/> FINALIZAR EXPEDIÇÃO</>
          ) : (
            <>INICIAR PRODUÇÃO <Flame size={18} fill="currentColor" /></>
          )}
        </button>
      </div>
    </div>
  );
};

const Kitchen: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allDailyOrders, setAllDailyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [now, setNow] = useState(new Date());
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean[]>>({});
  const prevOrdersLength = useRef(0);
  const { showToast } = useToast();

  useEffect(() => {
    const kitchenAuth = sessionStorage.getItem('sk_kitchen_auth');
    if (kitchenAuth === 'true') setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const playAlert = () => {
    if (!soundEnabled) return;
    const audio = new Audio(ALERT_SOUND_URL);
    audio.play().catch(e => console.warn("Interação necessária para som"));
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const q = query(
      collection(db, 'pedidos'),
      where('status', 'in', [OrderStatus.PENDING, OrderStatus.PREPARING]),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeActive = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      
      if (ordersData.length > prevOrdersLength.current) {
        playAlert();
        showToast("NOVO PEDIDO NA TELA!", "info");
      }
      
      prevOrdersLength.current = ordersData.length;
      setOrders(ordersData);
      setLoading(false);
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const qDaily = query(
      collection(db, 'pedidos'),
      where('createdAt', '>=', startOfDay.getTime()),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeDaily = onSnapshot(qDaily, (snapshot) => {
      const dailyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setAllDailyOrders(dailyData);
    });

    return () => {
      unsubscribeActive();
      unsubscribeDaily();
    };
  }, [isAuthenticated, soundEnabled]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin === '1214') {
      setIsAuthenticated(true);
      sessionStorage.setItem('sk_kitchen_auth', 'true');
      showToast("Produção Liberada!", "success");
      setError(false);
      return;
    }
    showToast("PIN Inválido", "error");
    setError(true);
    setPin('');
  };

  const handleUpdateStatus = async (orderId: string, currentStatus: OrderStatus) => {
    try {
      const nextStatus = currentStatus === OrderStatus.PENDING ? OrderStatus.PREPARING : OrderStatus.READY;
      await updateDoc(doc(db, 'pedidos', orderId), {
        status: nextStatus,
        preparadoEm: nextStatus === OrderStatus.READY ? serverTimestamp() : null,
        preparacaoIniciadaEm: nextStatus === OrderStatus.PREPARING ? serverTimestamp() : null
      });
      showToast(`Pedido ${nextStatus === OrderStatus.READY ? 'Pronto' : 'em Preparo'}!`, "success");
      
      if (nextStatus === OrderStatus.READY) {
        setCheckedItems(prev => {
          const next = { ...prev };
          delete next[orderId];
          return next;
        });
      }
    } catch (error) {
      showToast("Erro ao atualizar status", "error");
    }
  };

  const toggleCheck = (orderId: string, itemIdx: number) => {
    setCheckedItems(prev => {
      const current = prev[orderId] || [];
      const next = [...current];
      next[itemIdx] = !next[itemIdx];
      return { ...prev, [orderId]: next };
    });
  };

  const finishedOrdersToday = allDailyOrders.filter(o => [OrderStatus.READY, OrderStatus.DELIVERING, OrderStatus.DELIVERED, OrderStatus.COMPLETED].includes(o.status));
  const totalBurgersToday = finishedOrdersToday.reduce((acc, order) => {
    const burgerCount = (order.itens || []).reduce((sum, item) => {
      const itemCat = (item.category || '').toUpperCase();
      return itemCat.includes('BURGER') ? sum + (item.qtd || 1) : sum;
    }, 0);
    return acc + burgerCount;
  }, 0);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold">KDS - Cozinha</h2>
            <p className="text-zinc-500 text-sm mt-2">Área operacional para produção.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Digite o PIN" className={cn("input-field w-full text-center text-2xl tracking-[0.5em]", error && "border-red-500")} autoFocus />
            <button type="submit" className="btn-primary w-full">Acessar KDS</button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col overflow-hidden font-sans">
      <header className="h-24 bg-zinc-900/80 border-b border-white/10 flex items-center px-8 justify-between backdrop-blur-3xl z-50">
         <h1 className="text-2xl font-black uppercase italic tracking-tighter">LINHA DE FOGO</h1>
         <div className="flex items-center gap-4">
            <div className="bg-zinc-800/80 border-2 border-orange-500/30 px-6 py-2 rounded-2xl flex items-center gap-4 shadow-xl">
              <ChefHat size={24} className="text-orange-500" />
              <div>
                <p className="text-[7px] font-black text-orange-500 uppercase tracking-widest">Produção Hoje</p>
                <span className="text-xl font-black text-white italic leading-none">{totalBurgersToday} Burgers</span>
              </div>
            </div>
            <button onClick={() => setSoundEnabled(!soundEnabled)} className={cn("p-4 rounded-2xl transition-all border", soundEnabled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500')}>
              {soundEnabled ? <Volume2 size={20}/> : <VolumeX size={20}/>}
            </button>
            <Link to="/" className="p-4 bg-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition-all"><ArrowLeft size={20} /></Link>
         </div>
      </header>
      <main className="flex-1 overflow-x-auto overflow-y-hidden p-8 flex gap-6 items-start">
        <AnimatePresence mode="popLayout">
          {orders.map((order, index) => (
            <motion.div key={order.id} layout initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.8, y: -100 }}>
              <KitchenCard order={order} minutes={Math.floor((Date.now() - order.createdAt) / 60000)} isChecked={(idx) => checkedItems[order.id]?.[idx] || false} onToggleCheck={(idx) => toggleCheck(order.id, idx)} onUpdateStatus={handleUpdateStatus} />
            </motion.div>
          ))}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Kitchen;