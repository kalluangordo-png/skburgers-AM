import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      if (!isInstalled) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-6 right-6 z-[100] md:left-auto md:right-6 md:w-96"
        >
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-[2rem] shadow-2xl backdrop-blur-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center text-black shrink-0">
              <Download size={24} strokeWidth={3} />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-black uppercase text-xs italic">Instalar App SK Burgers</h4>
              <p className="text-zinc-400 text-[10px] font-bold uppercase mt-1">Acesso rápido e offline</p>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={handleInstall}
                className="bg-yellow-500 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-white transition-colors"
              >
                Instalar
              </button>
              <button 
                onClick={() => setShowPrompt(false)}
                className="text-zinc-500 text-[8px] font-black uppercase hover:text-white transition-colors"
              >
                Agora não
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;