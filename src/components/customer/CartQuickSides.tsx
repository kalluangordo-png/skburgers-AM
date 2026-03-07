import React from 'react';
import { Plus } from 'lucide-react';
import { formatCurrency } from '../../utils';
import { motion } from 'framer-motion';
import { Product } from '../../types';

interface CartQuickSidesProps {
  products: Product[];
  onAdd: (product: Product) => void;
}

const CartQuickSides: React.FC<CartQuickSidesProps> = ({ products, onAdd }) => {
  if (!products || products.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <h4 className="text-[8px] font-black text-zinc-500 uppercase tracking-widest px-1">Acompanhamentos Rápidos 🍟</h4>
      
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {products.map((product) => (
          <motion.button
            key={product.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onAdd(product)}
            className="flex-shrink-0 bg-zinc-900 border border-white/5 p-2.5 rounded-2xl flex flex-col gap-0.5 min-w-[90px] hover:border-yellow-500/50 transition-all"
          >
            <span className="text-[7px] font-black text-white uppercase truncate w-full">{product.name}</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[8px] font-black text-yellow-500">{formatCurrency(product.price)}</span>
              <div className="w-3.5 h-3.5 bg-yellow-500 rounded-md flex items-center justify-center text-black">
                <Plus size={8} strokeWidth={4} />
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default CartQuickSides;
