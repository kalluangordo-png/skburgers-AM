import React, { useMemo } from 'react';
import { TrendingUp, PieChart, Award, Calculator } from 'lucide-react';
import { Order, PaymentMethod, Product } from '../../types';
// Importação centralizada das suas regras de ouro
import { DIARIA_MOTOBOY, DIARIA_CHAPEIRO, GATEWAY_FEES } from '../../constants';
import { formatCurrency } from '../../utils';

interface Props {
  orders: Order[];
  products?: Product[];
}

const AdminFinance: React.FC<Props> = ({ orders, products = [] }) => {
  const stats = useMemo(() => {
    // Definir o início do dia operacional (ex: 06:00 AM)
    const now = new Date();
    const startOfOperationalDay = new Date(now);
    if (now.getHours() < 6) {
      startOfOperationalDay.setDate(now.getDate() - 1);
    }
    startOfOperationalDay.setHours(6, 0, 0, 0);

    // Filtrar apenas pedidos do dia operacional atual
    const dailyOrders = orders.filter(o => {
      const orderDate = o.createdAt ? new Date(o.createdAt) : new Date();
      return orderDate >= startOfOperationalDay;
    });

    // 1. Faturamento Bruto
    const gross = dailyOrders.reduce((acc, o) => acc + o.total, 0);
    
    // 2. Cálculo de Taxas (Usando GATEWAY_FEES das constantes)
    const totalFees = dailyOrders.reduce((acc, o) => {
      const feeRate = GATEWAY_FEES[o.pagamento] || 0;
      return acc + (o.total * feeRate);
    }, 0);

    // 3. Cálculo de CMV Estimado (35% fixo conforme remoção de Ficha Técnica)
    const productMap: Record<string, { name: string, sales: number, revenue: number, realCmv: number }> = {};
    
    dailyOrders.forEach(order => {
      order.itens.forEach(item => {
        if (!productMap[item.name]) {
          productMap[item.name] = { name: item.name, sales: 0, revenue: 0, realCmv: 0 };
        }
        
        const itemCmv = item.price * 0.35; // Fallback 35% fixo

        productMap[item.name].sales += item.qtd;
        productMap[item.name].revenue += item.price * item.qtd;
        productMap[item.name].realCmv += itemCmv * item.qtd;
      });
    });

    const totalCMV = Object.values(productMap).reduce((acc, p) => acc + p.realCmv, 0);
    
    // 4. Custos Operacionais de Manaus (Suas regras: 30 + 56,66)
    const custosFixos = DIARIA_MOTOBOY + DIARIA_CHAPEIRO;

    // 5. Lucro Líquido Real (SK BURGERS PRO)
    const netProfit = (gross - totalFees) - totalCMV - custosFixos;

    const topProducts = Object.values(productMap)
      .map(p => ({
        ...p,
        margin: p.revenue > 0 ? ((p.revenue - p.realCmv) / p.revenue) * 100 : 0
      }))
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 3);

    return { gross, netProfit, totalFees, totalCMV, topProducts, custosFixos };
  }, [orders, products]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Cards de Topo - Visual Glassmorphism */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass p-8 rounded-[2.5rem]">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Bruto Total</p>
            <h4 className="text-2xl font-black italic text-white">{formatCurrency(stats.gross)}</h4>
          </div>
          <div className="bg-yellow-500 p-8 rounded-[2.5rem] text-black shadow-lg shadow-yellow-500/20">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Lucro Líquido (Real)</p>
            <h4 className="text-2xl font-black italic">{formatCurrency(stats.netProfit)}</h4>
          </div>
          <div className="glass p-8 rounded-[2.5rem]">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">CMV (Insumos)</p>
            <h4 className="text-2xl font-black italic text-zinc-300">{formatCurrency(stats.totalCMV)}</h4>
          </div>
          <div className="glass p-8 rounded-[2.5rem]">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Diárias (Equipe)</p>
            <h4 className="text-2xl font-black italic text-red-400">{formatCurrency(stats.custosFixos)}</h4>
          </div>
      </div>

      {/* Ranking de Lucratividade - Regra de Ouro CEO Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass p-10 rounded-[3rem]">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <Award className="text-yellow-500" size={24} />
              <h3 className="text-white font-black text-xl uppercase italic tracking-tighter">Ranking de Lucratividade</h3>
            </div>
            <Calculator size={20} className="text-zinc-700" />
          </div>
          
          <div className="space-y-6">
            {stats.topProducts.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between p-6 bg-black/40 rounded-[2rem] border border-white/5 group hover:border-yellow-500/30 transition-all">
                <div className="flex items-center gap-5">
                  <span className="text-4xl font-black italic text-zinc-800 group-hover:text-yellow-500/20 transition-colors">0{idx + 1}</span>
                  <div>
                    <h4 className="text-white font-black uppercase text-sm italic">{p.name}</h4>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">{p.sales} vendas • Margem: {p.margin.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-500 font-black text-xl italic">{formatCurrency(p.revenue - p.realCmv)}</div>
                  <p className="text-zinc-600 text-[8px] font-bold uppercase tracking-widest">Margem Bruta</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerta de Estratégia */}
        <div className="glass p-10 rounded-[3rem] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <PieChart className="text-yellow-500" size={24} />
              <h3 className="text-white font-black text-xl uppercase italic tracking-tighter">Saúde do Caixa</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
                <span className="text-xs uppercase font-bold text-zinc-400 tracking-widest">Taxas de Cartão/Sodexo</span>
                <span className="text-red-500 font-black italic">{formatCurrency(stats.totalFees)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
                <span className="text-xs uppercase font-bold text-zinc-400 tracking-widest">Custo de Insumos</span>
                <span className="text-zinc-200 font-black italic">{formatCurrency(stats.totalCMV)}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-3xl">
            <div className="flex items-center gap-2 text-yellow-500 mb-2">
              <TrendingUp size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Insight de Gestão</span>
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed">
              Kalluan, seu lucro real após pagar o motoboy (R$ 30) e o chapeiro (R$ 56,66) é de <strong className="text-white">{formatCurrency(stats.netProfit)}</strong>. 
              {stats.netProfit < 100 && " O faturamento está baixo para cobrir as diárias fixas hoje. Ative o modo impulsionar!"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminFinance;
