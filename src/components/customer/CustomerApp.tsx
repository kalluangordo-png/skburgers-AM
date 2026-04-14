import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowLeft, Flame, Star, MapPin, Clock, Bike, ChevronRight 
} from 'lucide-react';
import Menu from './Menu';
import { StoreConfig } from '../../types';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import FacebookPixel from '../FacebookPixel';

const CustomerApp: React.FC = () => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>({
    dailyGoal: 400,
    whatsappNumber: '5592999999999',
    rainMode: false,
    overloadMode: false,
    aberta: true,
    pixKey: 'pix@skburgers.com',
    dessertName: 'COPO DA FELICIDADE',
    dessertOfferPrice: 12.00,
    dessertSoloPrice: 15.00,
    addons: []
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'store'), (snapshot) => {
      if (snapshot.exists()) {
        setStoreConfig(snapshot.data() as StoreConfig);
      }
    });
    return () => unsub();
  }, []);

  if (showMenu) return <Menu onBack={() => setShowMenu(false)} config={storeConfig} />;

  return (
    <div className="min-h-screen bg-black pb-32 selection:bg-yellow-500/30 font-sans selection:text-white">
      <FacebookPixel pixelId={storeConfig.facebookPixelId} />
      {/* Botão Voltar Estratégico */}
      <div className="fixed top-8 left-8 z-[100] animate-in fade-in duration-1000">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-3 bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-3 rounded-2xl text-white/40 hover:text-white transition-all active:scale-90 group cursor-pointer touch-manipulation"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sair</span>
        </button>
      </div>

      {/* Alerta de Modo Chuva - Design Industrial */}
      {storeConfig.rainMode && (
        <div className="bg-blue-600 text-white py-4 px-6 text-[10px] font-black uppercase text-center tracking-[0.3em] sticky top-0 z-[60] shadow-2xl flex items-center justify-center gap-3">
          <div className="w-2 h-2 bg-white rounded-full animate-ping" />
          ⚠️ Modo Chuva: Logística operando com cautela (+20min)
        </div>
      )}

      {/* Hero Section com Parallax Suave */}
      <div className="relative h-[65vh] overflow-hidden">
        <img 
          src="https://i.postimg.cc/hGffpKz5/ewto5b4bl3xrdpdswhi5.jpg" 
          className="w-full h-full object-cover opacity-70 scale-105" 
          alt="SK Burgers Premium" 
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        
        <div className="absolute bottom-12 left-6 right-6 md:left-20">
           <div className="flex items-center gap-3 mb-6 animate-in slide-in-from-left duration-700">
              <div className="bg-yellow-500 px-4 py-1.5 rounded-xl text-[10px] font-black text-black uppercase tracking-widest shadow-2xl shadow-yellow-500/40 flex items-center gap-2">
                <Flame size={14} fill="black" /> Best in Manaus
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-xl text-[10px] font-black text-white uppercase flex items-center gap-2 border border-white/10">
                <Star size={12} className="fill-yellow-500 text-yellow-500" /> 4.9
              </div>
           </div>
           
            <div className="flex flex-wrap items-center gap-6 animate-in fade-in duration-1000 delay-500">
              <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 bg-zinc-900/50 p-2 rounded-lg">
                <MapPin size={14} className="text-yellow-500" /> Nucleo 16
              </p>
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${storeConfig.aberta ? 'bg-emerald-500 animate-pulse shadow-[0_0_15px_#10b981]' : 'bg-red-500'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                  {storeConfig.aberta ? 'Grelha Quente' : 'Fechado Agora'}
                </span>
              </div>
           </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-8 -mt-8 relative z-10 space-y-12">
        {/* Cards de Status Rápido */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
           <div className="bg-zinc-900/80 backdrop-blur-xl p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white/5 space-y-2 md:space-y-3 shadow-2xl group hover:border-yellow-500/20 transition-all">
              <Clock className="text-yellow-500 group-hover:scale-110 transition-transform w-5 h-5 md:w-6 md:h-6" />
              <p className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase tracking-widest">Tempo Médio</p>
              <p className="font-black text-white italic text-lg md:text-2xl tracking-tighter">25-40 MIN</p>
           </div>
           <div className="bg-zinc-900/80 backdrop-blur-xl p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white/5 space-y-2 md:space-y-3 shadow-2xl group hover:border-yellow-500/20 transition-all">
              <Bike className="text-yellow-500 group-hover:scale-110 transition-transform w-5 h-5 md:w-6 md:h-6" />
              <p className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase tracking-widest">Taxa de Entrega</p>
              <p className="font-black text-white italic text-lg md:text-2xl tracking-tighter leading-tight">SOB CONSULTA</p>
           </div>
        </div>

        {/* CTA Principal - O Botão da Fome */}
        <div className="space-y-4">
          {storeConfig.welcomeMessage && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/50 backdrop-blur-md border border-white/5 p-4 rounded-2xl text-center"
            >
              <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] italic">
                {storeConfig.welcomeMessage}
              </p>
            </motion.div>
          )}
          
          <button 
              onClick={() => setShowMenu(true)}
              disabled={!storeConfig.aberta}
              className={`w-full py-8 rounded-[2.5rem] font-black text-xl uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl cursor-pointer touch-manipulation
                ${storeConfig.aberta 
                  ? 'bg-yellow-500 text-black shadow-yellow-500/20 hover:bg-yellow-400 hover:-translate-y-1' 
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'}`}
          >
             {storeConfig.aberta ? (
               <>ABRIR CARDÁPIO <ChevronRight size={24} strokeWidth={4} /></>
             ) : (
               <>ESTAMOS DESCANSANDO</>
             )}
          </button>
          
          <p className="text-center text-zinc-600 text-[8px] font-black uppercase tracking-[0.4em]">
            Clique para explorar nossos sabores premium
          </p>
        </div>

        {/* Social / Trust Badges */}
        <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-8">
           <p className="text-zinc-700 text-[9px] font-black uppercase tracking-[0.5em]">Também disponíveis em</p>
           <div className="flex justify-center gap-12 opacity-20 hover:opacity-100 transition-opacity duration-700">
              <img src="https://logopng.com.br/logos/ifood-43.png" className="h-5 grayscale hover:grayscale-0 transition-all" alt="iFood" referrerPolicy="no-referrer" />
              <img src="https://logodownload.org/wp-content/uploads/2019/08/uber-eats-logo-1.png" className="h-5 grayscale hover:grayscale-0 transition-all" alt="Uber Eats" referrerPolicy="no-referrer" />
           </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerApp;
