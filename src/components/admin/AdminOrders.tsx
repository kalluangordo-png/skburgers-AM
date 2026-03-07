import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Clock, Star, Printer, MessageSquare, Loader2 
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Order, OrderStatus } from '../../types';
import { useToast } from '../ToastContext';
import { formatCurrency, printOrderTicket, sendWhatsAppStatus } from '../../utils';
import PrintTicket from './PrintTicket';

interface AdminOrdersProps {
  orders: Order[];
}

const AdminOrders: React.FC<AdminOrdersProps> = ({ orders }) => {
  const [now, setNow] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Timer otimizado para atualizar o tempo de fila globalmente
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const getPrepTime = (date: any) => {
    if (!date) return 0;
    const startDate = date?.toDate ? date.toDate() : new Date(date);
    return Math.floor((now.getTime() - startDate.getTime()) / 60000);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus, successMsg: string) => {
    setProcessingId(orderId);
    try {
      const orderRef = doc(db, 'pedidos', orderId);
      const updateData: any = { status: newStatus };
      
      // Gatilhos de timestamp automáticos
      if (newStatus === OrderStatus.DELIVERING) updateData['deliveryStart'] = serverTimestamp();
      if (newStatus === OrderStatus.COMPLETED) updateData['completedAt'] = serverTimestamp();

      await updateDoc(orderRef, updateData);
      showToast(successMsg, "success");
    } catch (error) {
      showToast("Erro na comunicação com o banco.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startOfOperationalDay = new Date(now);
    if (now.getHours() < 6) {
      startOfOperationalDay.setDate(now.getDate() - 1);
    }
    startOfOperationalDay.setHours(6, 0, 0, 0);

    return orders.filter(o => {
      const orderDate = o.createdAt ? new Date(o.createdAt) : new Date();
      const isToday = orderDate >= startOfOperationalDay;
      const matchesSearch = o.cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           o.numeroComanda.includes(searchTerm);
      return isToday && matchesSearch;
    });
  }, [orders, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">Central de Comando</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-1">Fluxo de Produção em Tempo Real</p>
        </div>
        
        <div className="bg-zinc-900/80 border border-white/5 p-1 rounded-2xl flex items-center gap-2 w-full md:w-auto">
          <div className="pl-4 text-zinc-600"><Search size={16} /></div>
          <input 
            type="text" 
            placeholder="NOME OU COMANDA..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-transparent py-3 pr-4 text-[10px] font-black uppercase text-white outline-none w-full md:w-64 placeholder:text-zinc-700"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.map(order => {
          const prepTime = getPrepTime(order.preparacaoIniciadaEm || order.dataCriacao);
          const isLate = prepTime > 20 && [OrderStatus.PENDING, OrderStatus.PREPARING].includes(order.status);
          
          return (
            <div key={order.id} className={`bg-zinc-900/40 border-2 rounded-[2rem] p-6 transition-all duration-500 flex flex-col md:flex-row items-center gap-6 ${isLate ? 'border-red-500/30 bg-red-500/[0.02]' : 'border-white/5'}`}>
              
              {/* Info Comanda */}
              <div className="flex flex-col items-center md:items-start min-w-[120px]">
                <span className="text-3xl font-black text-white italic tracking-tighter">#{order.numeroComanda}</span>
                <div className={`flex items-center gap-1.5 mt-1 text-[9px] font-black uppercase ${isLate ? 'text-red-500 animate-pulse' : 'text-zinc-600'}`}>
                  <Clock size={12} /> {prepTime} MIN
                </div>
              </div>

              {/* Info Cliente */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <h4 className="text-lg font-black text-zinc-200 uppercase italic tracking-tight">{order.cliente.nome}</h4>
                  {(order.cliente as any).totalPurchases >= 5 && <Star size={16} className="text-yellow-500 fill-yellow-500" />}
                </div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                  {order.cliente.bairro || 'RETIRADA'} • {order.itens.length} ITENS • {order.pagamento}
                  {(order as any).trocoPara && (
                    <span className="text-yellow-500 ml-2 animate-pulse">
                      [TROCO PARA {(order as any).trocoPara}]
                    </span>
                  )}
                </p>
              </div>

              {/* Status e Valor */}
              <div className="flex flex-col items-center md:items-end min-w-[150px]">
                <div className="text-xl font-black text-white italic">{formatCurrency(order.total)}</div>
                <span className={`mt-2 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                  order.status === OrderStatus.READY ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {order.status.replace('_', ' ')}
                </span>
              </div>

              {/* Ações Rápidas */}
              <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                <button onClick={() => printOrderTicket(order.id)} className="p-4 bg-zinc-800 text-zinc-400 hover:text-white rounded-2xl transition-all">
                  <Printer size={20} />
                </button>
                
                <button 
                  onClick={() => sendWhatsAppStatus(order, order.status === OrderStatus.READY ? 'entrega' : 'preparo')}
                  className="p-4 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black rounded-2xl transition-all border border-emerald-500/20"
                >
                  <MessageSquare size={20} />
                </button>

                {order.status === OrderStatus.READY && (
                  <button 
                    onClick={() => handleUpdateStatus(order.id, OrderStatus.DELIVERING, "Saiu para entrega!")}
                    disabled={!!processingId}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-yellow-500/20 active:scale-95"
                  >
                    {processingId === order.id ? <Loader2 className="animate-spin" size={18}/> : 'Despachar'}
                  </button>
                )}
              </div>
              <PrintTicket order={order} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminOrders;
