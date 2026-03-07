import React, { useState, useEffect } from 'react';
import { Order, Product, OrderStatus } from '../../types';
import { Clock, Play, CheckCircle, Star, IceCream, AlertCircle } from 'lucide-react';
import * as Firestore from 'firebase/firestore';
const { doc, serverTimestamp, runTransaction, increment, updateDoc } = Firestore as any;
import { db } from '../../services/firebase';
import { useToast } from '../ToastContext';
import { printOrderTicket, getAddonEmoji } from '../../utils';
import PrintTicket from './PrintTicket';

interface AdminKDSProps {
  orders: Order[];
  products: Product[];
}

const AdminKDS: React.FC<AdminKDSProps> = ({ orders, products }) => {
  const [now, setNow] = useState(new Date());
  const { showToast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Ordenação: Preparando primeiro, depois por tempo de criação
  const activeOrders = orders
    .filter(o => [OrderStatus.PENDING, OrderStatus.PREPARING].includes(o.status))
    .sort((a, b) => {
      const timeA = a.dataCriacao?.seconds || a.dataCriacao || 0;
      const timeB = b.dataCriacao?.seconds || b.dataCriacao || 0;
      
      if (a.status === b.status) return Number(timeA) - Number(timeB);
      return a.status === OrderStatus.PREPARING ? -1 : 1;
    });

  const handleStartProduction = async (order: Order) => {
    try {
      // Impressão automática imediata
      printOrderTicket(order.id);
      
      const orderRef = doc(db, 'pedidos', order.id);
      await updateDoc(orderRef, { 
        status: OrderStatus.PREPARING,
        preparacaoIniciadaEm: serverTimestamp() 
      });

      showToast(`Pedido #${order.numeroComanda} na chapa!`, "success");
    } catch (e) {
      showToast("Erro ao iniciar produção.", "error");
    }
  };

  const handleFinishProduction = async (id: string) => {
    try {
      const orderRef = doc(db, 'pedidos', id);
      await updateDoc(orderRef, { 
        status: OrderStatus.READY,
        finalizadoEm: serverTimestamp()
      });
      showToast("Pedido pronto para entrega!", "success");
    } catch (e) {
      showToast("Erro ao finalizar.", "error");
    }
  };

  const getElapsedMinutes = (startTime: any) => {
    if (!startTime) return 0;
    const start = startTime?.toDate ? startTime.toDate() : new Date(startTime);
    return Math.floor((now.getTime() - start.getTime()) / 60000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Produção KDS</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-1">Cozinha em Tempo Real • SK BURGERS</p>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 px-6 py-3 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
            <span className="text-[10px] font-black uppercase text-white">{activeOrders.length} EM ABERTO</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {activeOrders.map(order => {
          const minutes = getElapsedMinutes(order.preparacaoIniciadaEm || order.dataCriacao);
          const isLate = minutes >= 20;
          const isVip = (order.cliente as any).totalPurchases >= 5;

          return (
            <div key={order.id} className={`bg-zinc-900 border-2 rounded-[2.5rem] flex flex-col overflow-hidden transition-all duration-500 ${isLate ? 'border-red-600/50 bg-red-950/10' : 'border-white/5'}`}>
              <div className={`p-6 border-b border-white/5 flex justify-between items-start ${order.status === OrderStatus.PREPARING ? 'bg-yellow-500/5' : 'bg-black/20'}`}>
                <div>
                   <div className="flex items-center gap-2">
                     <span className="text-2xl font-black text-white italic leading-none">#{order.numeroComanda}</span>
                     {isVip && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                   </div>
                   <p className="text-[10px] text-zinc-400 font-bold uppercase mt-2 tracking-widest truncate max-w-[150px]">{order.cliente.nome}</p>
                </div>
                <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5 border ${isLate ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-300 border-white/5'}`}>
                   <Clock size={12}/> {minutes}m
                </div>
              </div>

              <div className="p-6 flex-1 space-y-4 max-h-[350px] overflow-y-auto no-scrollbar">
                {order.itens.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-start gap-3">
                      <div className="bg-yellow-500 text-black w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0">
                        {item.qtd}
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-zinc-100 text-sm uppercase leading-tight italic flex items-center gap-2">
                          {item.name}
                          {(item as any).isCombo && (
                            <span className="bg-emerald-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-md not-italic">COMBO</span>
                          )}
                        </p>
                        
                        {item.addons && item.addons.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {item.addons.map((addon, i) => (
                              <span key={i} className="text-[8px] bg-white/5 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded-md uppercase font-black flex items-center gap-1">
                                {getAddonEmoji(addon.name)} {addon.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Observações de Cozinha (Crucial) */}
                        {item.obsExtras && item.obsExtras.length > 0 && (
                          <div className="mt-2 flex items-center gap-1 text-red-500 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                            <AlertCircle size={12} strokeWidth={3} />
                            <span className="text-[9px] font-black uppercase italic">{item.obsExtras.join(' | ')}</span>
                          </div>
                        )}

                        {item.name.toLowerCase().includes('copo') && (
                          <div className="mt-2 flex items-center gap-1.5 text-pink-500">
                            <IceCream size={14} />
                            <span className="text-[9px] font-black uppercase italic">Item de Freezer</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-5 bg-black/40">
                <button 
                  onClick={() => order.status === OrderStatus.PENDING ? handleStartProduction(order) : handleFinishProduction(order.id)} 
                  className={`w-full py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl
                    ${order.status === OrderStatus.PENDING 
                      ? 'bg-white text-black hover:bg-yellow-500 hover:text-white' 
                      : 'bg-emerald-500 text-black shadow-emerald-500/20'}`}
                >
                  {order.status === OrderStatus.PENDING ? (
                    <><Play size={16} fill="currentColor"/> INICIAR CHAPA</>
                  ) : (
                    <><CheckCircle size={20}/> FINALIZADO</>
                  )}
                </button>
              </div>
              <PrintTicket order={order} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminKDS;
