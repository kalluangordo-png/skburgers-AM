import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Order, OrderStatus } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Clock, CheckCircle2, Bike, Flame, 
  ChefHat, PackageCheck, MapPin, Phone
} from 'lucide-react';
import { formatCurrency } from '../../utils';

const Tracking: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    const unsub = onSnapshot(doc(db, 'pedidos', orderId), (snapshot) => {
      if (snapshot.exists()) {
        setOrder({ id: snapshot.id, ...snapshot.data() } as Order);
      }
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar pedido:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [orderId]);

  const getStatusStep = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 1;
      case OrderStatus.PREPARING: return 2;
      case OrderStatus.READY: return 3;
      case OrderStatus.DELIVERING: return 4;
      case OrderStatus.COMPLETED: return 5;
      default: return 1;
    }
  };

  const steps = [
    { id: 1, label: 'Recebido', icon: PackageCheck, color: 'text-zinc-400', activeColor: 'text-emerald-500' },
    { id: 2, label: 'Na Brasa', icon: Flame, color: 'text-zinc-400', activeColor: 'text-orange-500' },
    { id: 3, label: 'Pronto', icon: ChefHat, color: 'text-zinc-400', activeColor: 'text-yellow-500' },
    { id: 4, label: 'A Caminho', icon: Bike, color: 'text-zinc-400', activeColor: 'text-blue-500' },
    { id: 5, label: 'Entregue', icon: CheckCircle2, color: 'text-zinc-400', activeColor: 'text-emerald-500' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 font-black uppercase text-[10px] tracking-widest">Localizando Comanda...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-zinc-900 p-8 rounded-[3rem] border border-white/5 space-y-6 max-w-sm">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <Clock size={40} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase italic">Pedido não encontrado</h2>
          <p className="text-zinc-500 text-xs font-bold uppercase leading-relaxed">
            Não conseguimos localizar esse pedido. Verifique o link ou entre em contato conosco.
          </p>
          <button 
            onClick={() => navigate('/order')}
            className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest"
          >
            VOLTAR AO CARDÁPIO
          </button>
        </div>
      </div>
    );
  }

  const currentStep = getStatusStep(order.status);

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <header className="p-6 flex items-center gap-4 border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <button onClick={() => navigate('/order')} className="p-3 bg-zinc-900 rounded-2xl text-zinc-400">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black text-white italic uppercase tracking-tighter">Acompanhar Pedido</h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Comanda #{order.numeroComanda}</p>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-6 space-y-8">
        {/* Status Card */}
        <div className="bg-zinc-900/50 rounded-[3rem] border border-white/5 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Flame size={120} className="text-yellow-500" />
          </div>
          
          <div className="relative z-10 space-y-8">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em]">Status Atual</p>
              <h2 className="text-4xl font-black text-white uppercase italic leading-none">
                {order.status === OrderStatus.PENDING && 'Aguardando...'}
                {order.status === OrderStatus.PREPARING && 'Na Grelha! 🔥'}
                {order.status === OrderStatus.READY && 'Prontinho! ✨'}
                {order.status === OrderStatus.DELIVERING && 'A Caminho! 🛵'}
                {order.status === OrderStatus.COMPLETED && 'Entregue! ✅'}
              </h2>
            </div>

            {/* Progress Bar Vertical */}
            <div className="space-y-6">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isActive = currentStep >= step.id;
                const isCurrent = currentStep === step.id;
                
                return (
                  <div key={step.id} className="flex items-center gap-6 relative">
                    {idx < steps.length - 1 && (
                      <div className={`absolute left-6 top-10 w-[2px] h-8 ${currentStep > step.id ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
                    )}
                    
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                      isActive ? 'bg-zinc-800 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-zinc-900 border border-white/5'
                    }`}>
                      <Icon size={20} className={isActive ? 'text-emerald-500' : 'text-zinc-600'} />
                    </div>
                    
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-zinc-600'}`}>
                        {step.label}
                      </span>
                      {isCurrent && (
                        <span className="text-[8px] font-bold text-emerald-500 uppercase animate-pulse">Acontecendo agora</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detalhes do Pedido */}
        <div className="bg-zinc-900/30 rounded-[2.5rem] border border-white/5 p-8 space-y-6">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Resumo da Comanda</h3>
          
          <div className="space-y-4">
            {order.itens.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-white font-black text-xs uppercase italic">{item.qtd}x {item.name}</span>
                  {item.bebida && <span className="text-[9px] text-zinc-500 font-bold uppercase">🥤 {item.bebida}</span>}
                </div>
                <span className="text-zinc-400 font-black text-xs">{formatCurrency(item.price * item.qtd)}</span>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-white/5 flex justify-between items-center">
            <span className="text-zinc-500 font-black text-[10px] uppercase">Total Pago</span>
            <span className="text-yellow-500 font-black text-xl italic">{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-zinc-900/30 rounded-[2.5rem] border border-white/5 p-8 flex items-start gap-4">
          <div className="p-4 bg-zinc-800 rounded-2xl text-yellow-500">
            <MapPin size={24} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Local de Entrega</p>
            <p className="text-white font-black text-xs uppercase leading-relaxed">
              {order.cliente.endereco}, {order.cliente.numeroCasa}<br/>
              {order.cliente.bairro}
            </p>
          </div>
        </div>

        {/* Suporte */}
        <button 
          onClick={() => window.open(`https://wa.me/5592999999999`, '_blank')}
          className="w-full py-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] flex items-center justify-center gap-3 text-emerald-500 font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 hover:text-black transition-all"
        >
          <Phone size={18} /> Falar com Atendente
        </button>
      </main>
    </div>
  );
};

export default Tracking;
