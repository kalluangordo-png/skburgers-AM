import React from 'react';
import { Product, StoreConfig } from '../../types';
import { Flame, IceCream, Plus, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../utils';
import { motion } from 'motion/react';

interface CartUpsellProps {
  cart: { id: string; name: string; price: number; quantity: number; isCombo?: boolean; category: string; addons?: { name: string; price: number }[] }[];
  allProducts: Product[];
  config: StoreConfig;
  onAdd: (product: any) => void;
  onUpgrade: (itemId: string) => void;
  onAddAddon: (itemId: string, addon: { name: string; price: number }) => void;
}

const CartUpsell: React.FC<CartUpsellProps> = ({ cart, allProducts, config, onAdd, onUpgrade, onAddAddon }) => {
  // 1. Regra da Sobremesa
  const targetDessertName = (config.dessertName || 'COPO DA FELICIDADE').toUpperCase();
  const hasDessert = cart.some(item => item.name.toUpperCase().includes(targetDessertName));
  const dessertProduct = allProducts.find(p => p.name.toUpperCase().includes(targetDessertName) && !p.isPaused);

  // 2. Regra do Combo
  const burgerToUpgrade = cart.find(item => {
    const category = item.category.toUpperCase();
    const isExcluded = category.includes('BEBIDA') || category.includes('SOBREMESA') || category.includes('DOCE');
    return !isExcluded && !item.isCombo && !item.name.toUpperCase().includes('COMBO');
  });

  // 3. Regra da Carne Extra (Duplo)
  const burgerForDouble = cart.find(item => {
    const category = item.category.toUpperCase();
    const isBurger = category.includes('BURGER') || category.includes('HAMBÚRGUER') || category.includes('CLÁSSICA');
    const hasExtraMeat = item.addons?.some(a => a.name.toUpperCase().includes('CARNE'));
    return isBurger && !hasExtraMeat;
  });

  const carneExtraAddon = config.addons?.find(a => a.name.toUpperCase().includes('CARNE'));

  return (
    <>
      {/* Card de Carne Extra (Duplo) */}
      {burgerForDouble && carneExtraAddon && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-orange-600/10 border border-orange-500/20 p-3 rounded-3xl flex items-center gap-3 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 px-2 py-1 bg-orange-600 text-white text-[7px] font-black uppercase tracking-widest rounded-bl-lg">
            Mais Vendido
          </div>
          <div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center text-orange-500 shrink-0">
            <span className="text-xl">🥩</span>
          </div>
          <div className="flex-1">
            <h4 className="text-white font-black uppercase text-[9px] italic leading-tight">Fome de Leão? Faça Duplo! 🦁</h4>
            <p className="text-zinc-400 text-[7px] font-bold uppercase mb-1">Blend 120g + 2 Fatias de Queijo</p>
            <p className="text-orange-500 font-black text-xs mt-0.5">+ {formatCurrency(carneExtraAddon.price)}</p>
          </div>
          <button 
            onClick={() => onAddAddon(burgerForDouble.id, carneExtraAddon)}
            className="bg-orange-600 text-white p-2 rounded-lg hover:bg-orange-500 transition-all active:scale-90 shadow-lg shadow-orange-600/20"
          >
            <Plus size={16} strokeWidth={3} />
          </button>
        </motion.div>
      )}

      {/* Card de Sobremesa */}
      {!hasDessert && dessertProduct && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-pink-500/10 border border-pink-500/20 p-3 rounded-3xl flex items-center gap-3 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 px-2 py-1 bg-pink-500 text-white text-[7px] font-black uppercase tracking-widest rounded-bl-lg">
            Oferta
          </div>
          <div className="w-10 h-10 bg-pink-500/20 rounded-xl flex items-center justify-center text-pink-500 shrink-0">
            <IceCream size={20} />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-black uppercase text-[9px] italic leading-tight">Que tal um {dessertProduct.name}?</h4>
            <p className="text-pink-500 font-black text-xs mt-0.5">
              {formatCurrency(config.dessertOfferPrice || 12)}
              <span className="text-[9px] text-zinc-600 line-through ml-2 font-bold">{formatCurrency(dessertProduct.price)}</span>
            </p>
          </div>
          <button 
            onClick={() => onAdd({ 
              ...dessertProduct, 
              name: `${dessertProduct.name} (OFERTA)`, 
              price: config.dessertOfferPrice || 12 
            })}
            className="bg-pink-500 text-white p-2 rounded-lg hover:bg-pink-400 transition-all active:scale-90 shadow-lg shadow-pink-500/20"
          >
            <Plus size={16} strokeWidth={3} />
          </button>
        </motion.div>
      )}
    </>
  );
};

export default CartUpsell;
