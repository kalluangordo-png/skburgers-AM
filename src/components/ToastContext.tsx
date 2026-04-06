import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Timer para remover o toast
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  // Alias para compatibilidade
  const showToast = addToast;

  return (
    <ToastContext.Provider value={{ addToast, showToast }}>
      {children}
      {/* Container posicionado estrategicamente */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto relative group flex items-center gap-4 p-5 rounded-[1.5rem] border backdrop-blur-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] transition-all duration-500
                ${t.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                  t.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
                  'bg-zinc-900/90 border-white/10 text-white'}`}
            >
              {/* Ícones com Glow sutil */}
              <div className={`p-2 rounded-xl ${t.type === 'success' ? 'bg-emerald-500/20' : t.type === 'error' ? 'bg-red-500/20' : 'bg-white/10'}`}>
                {t.type === 'success' && <CheckCircle size={20} strokeWidth={3} />}
                {t.type === 'error' && <AlertCircle size={20} strokeWidth={3} />}
                {t.type === 'info' && <Info size={20} strokeWidth={3} />}
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-[0.1em]">{t.message}</span>
              </div>

              <button 
                onClick={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))}
                className="ml-2 p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={16} className="opacity-40 group-hover:opacity-100" />
              </button>

              {/* Progress Bar Temporal - O detalhe que faz a diferença */}
              <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-white/5 overflow-hidden rounded-full">
                 <div 
                   className={`h-full animate-progress-toast ${t.type === 'success' ? 'bg-emerald-500' : t.type === 'error' ? 'bg-red-500' : 'bg-orange-500'}`}
                 />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
