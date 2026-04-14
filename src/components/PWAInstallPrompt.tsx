import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
<<<<<<< HEAD
import { motion, AnimatePresence } from 'motion/react';
=======
import { motion, AnimatePresence } from 'framer-motion';
>>>>>>> c8ec29939081c38a4f443abdbd54cfb057f314b6

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show the prompt
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 left-6 right-6 z-[100] md:left-auto md:right-6 md:w-96"
      >
        <div className="bg-zinc-900 border border-yellow-500/30 rounded-3xl p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center text-black shadow-lg shrink-0">
                <Download size={24} strokeWidth={2.5} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black uppercase italic tracking-tight text-white">Instalar SK Burgers</h4>
                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider leading-relaxed">
                  Adicione à sua tela inicial para pedidos mais rápidos e offline.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowPrompt(false)}
              className="p-1 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="mt-5 flex gap-3">
            <button 
              onClick={handleInstall}
              className="flex-1 bg-yellow-500 hover:bg-white text-black text-[10px] font-black uppercase py-3 rounded-xl transition-all active:scale-95 shadow-lg"
            >
              Instalar Agora
            </button>
            <button 
              onClick={() => setShowPrompt(false)}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-black uppercase py-3 rounded-xl transition-all"
            >
              Depois
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
