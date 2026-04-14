import React, { useState, useEffect } from 'react';
import { 
  Save, Loader2, DatabaseBackup, Rocket, CloudRain, AlertOctagon, Power, 
  Target, Hash, IceCream, Lock, Eye, EyeOff, X, MessageSquare, Flame,
  MapPin, Plus, Trash2 as TrashIcon
} from 'lucide-react';
import { StoreConfig } from '../../types';
import { useToast } from '../ToastContext';
import { formatCurrency } from '../../utils';
import { cn } from '../../services/utils';
import { MAX_DELIVERY_RADIUS_KM, LOJA_COORDS } from '../../constants';

interface AdminConfigProps {
  config: StoreConfig;
  onSave: (config: StoreConfig) => Promise<void>;
  onFixAddress: () => Promise<void>;
  onUseCurrentLocation: () => void;
  isSaving: boolean;
}

const AdminConfig: React.FC<AdminConfigProps> = ({ config, onSave, onFixAddress, onUseCurrentLocation, isSaving }) => {
  const [localConfig, setLocalConfig] = useState<StoreConfig>(config);
  const [latStr, setLatStr] = useState(config.storeCoords?.lat?.toString() || '');
  const [lngStr, setLngStr] = useState(config.storeCoords?.lng?.toString() || '');
  const [showPins, setShowPins] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setLocalConfig({
      ...config,
      deliveryRules: config.deliveryRules || [],
      comboCategories: config.comboCategories || [],
      comboSurcharge: config.comboSurcharge || 12
    });
    setLatStr(config.storeCoords?.lat?.toString() || '');
    setLngStr(config.storeCoords?.lng?.toString() || '');
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(localConfig);
  };

  const handleSeed = async () => {
    if (!window.confirm("Kalluan, isso irá resetar Insumos e Produtos. Tem certeza?")) return;
    setIsSeeding(true);
    try {
      const { seedInitialData } = await import('../../services/seedService');
      await seedInitialData();
      showToast("Sistema Restaurado com Sucesso!", "success");
    } catch (e) {
      console.error("Erro ao resetar base:", e);
      showToast("Erro na restauração. Verifique as regras do Firebase.", "error");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* Header com Ações Rápidas */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Configurações PRO</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-1">Gestão de Ambiente e Segurança</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <button 
              type="button"
              onClick={handleSeed}
              disabled={isSeeding}
              className="flex-1 md:flex-none bg-yellow-500/10 hover:bg-yellow-500 text-yellow-500 hover:text-black px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-yellow-500/20 disabled:opacity-30"
            >
              {isSeeding ? <Loader2 size={14} className="animate-spin" /> : <DatabaseBackup size={14}/>} Resetar Base
            </button>
            <button 
              type="button"
              onClick={onFixAddress}
              disabled={isSaving}
              className="flex-1 md:flex-none bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-black px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-emerald-500/20 disabled:opacity-30"
            >
              <Rocket size={14}/> Sync Frete
            </button>
        </div>
      </div>

      {/* Toggles de Modo de Operação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button 
            type="button"
            onClick={() => setLocalConfig({...localConfig, rainMode: !localConfig.rainMode})}
            className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-3 ${localConfig.rainMode ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/20'}`}
          >
            <CloudRain size={32} className={localConfig.rainMode ? 'animate-bounce' : ''} />
            <div className="text-center">
              <p className="text-[10px] font-black uppercase">Modo Chuva</p>
              <p className="text-[8px] font-bold opacity-60 uppercase">{localConfig.rainMode ? 'Atraso Ativo' : 'Tempo Normal'}</p>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => setLocalConfig({...localConfig, overloadMode: !localConfig.overloadMode})}
            className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-3 ${localConfig.overloadMode ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-500/20' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/20'}`}
          >
            <AlertOctagon size={32} className={localConfig.overloadMode ? 'animate-pulse' : ''} />
            <div className="text-center">
              <p className="text-[10px] font-black uppercase">Sobrecarga</p>
              <p className="text-[8px] font-bold opacity-60 uppercase">{localConfig.overloadMode ? 'Pausar Vendas' : 'Fluxo Normal'}</p>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => setLocalConfig({...localConfig, aberta: !localConfig.aberta})}
            className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-3 ${localConfig.aberta ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/20'}`}
          >
            <Power size={32} />
            <div className="text-center">
              <p className="text-[10px] font-black uppercase">Status Loja</p>
              <p className="text-[8px] font-bold opacity-60 uppercase">{localConfig.aberta ? 'Online' : 'Offline'}</p>
            </div>
          </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8 bg-zinc-950 p-8 md:p-12 rounded-[3rem] border border-white/5 shadow-2xl">
        {/* Gestão Financeira e PIX */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Meta Diária (R$)</label>
            <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 p-4 rounded-2xl focus-within:border-yellow-500/50 transition-all">
              <Target size={20} className="text-yellow-500" />
              <input 
                type="number" 
                value={localConfig.dailyGoal ?? 0} 
                onChange={e => setLocalConfig({...localConfig, dailyGoal: parseFloat(e.target.value)})}
                className="bg-transparent border-none outline-none text-white font-bold w-full text-sm" 
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Chave PIX</label>
            <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 p-4 rounded-2xl focus-within:border-yellow-500/50 transition-all">
              <Hash size={20} className="text-yellow-500" />
              <input 
                type="text" 
                value={localConfig.pixKey ?? ''} 
                onChange={e => setLocalConfig({...localConfig, pixKey: e.target.value})}
                className="bg-transparent border-none outline-none text-white font-bold w-full text-sm" 
                placeholder="pix@skburgers.com"
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">WhatsApp da Loja</label>
            <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 p-4 rounded-2xl focus-within:border-yellow-500/50 transition-all">
              <MessageSquare size={20} className="text-yellow-500" />
              <input 
                type="text" 
                value={localConfig.whatsappNumber ?? ''} 
                onChange={e => setLocalConfig({...localConfig, whatsappNumber: e.target.value.replace(/\D/g, '')})}
                className="bg-transparent border-none outline-none text-white font-bold w-full text-sm" 
                placeholder="5592999999999"
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">ID do Pixel (Facebook)</label>
            <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 p-4 rounded-2xl focus-within:border-yellow-500/50 transition-all">
              <Hash size={20} className="text-yellow-500" />
              <input 
                type="text" 
                value={localConfig.facebookPixelId ?? ''} 
                onChange={e => setLocalConfig({...localConfig, facebookPixelId: e.target.value})}
                className="bg-transparent border-none outline-none text-white font-bold w-full text-sm" 
                placeholder="Ex: 901951425686685"
              />
            </div>
          </div>
          <div className="space-y-3 md:col-span-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Mensagem de Boas-Vindas (Tela Inicial)</label>
            <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 p-4 rounded-2xl focus-within:border-yellow-500/50 transition-all">
              <MessageSquare size={20} className="text-yellow-500" />
              <input 
                type="text" 
                value={localConfig.welcomeMessage ?? ''} 
                onChange={e => setLocalConfig({...localConfig, welcomeMessage: e.target.value})}
                className="bg-transparent border-none outline-none text-white font-bold w-full text-sm" 
                placeholder="EX: BEM-VINDO À MELHOR HAMBURGUERIA DE MANAUS!"
              />
            </div>
          </div>
          <div className="space-y-3 md:col-span-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Promoção do Dia (Banner no Cardápio)</label>
            <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 p-4 rounded-2xl focus-within:border-yellow-500/50 transition-all">
              <Flame size={20} className="text-yellow-500" />
              <input 
                type="text" 
                value={localConfig.promoText ?? ''} 
                onChange={e => setLocalConfig({...localConfig, promoText: e.target.value})}
                className="bg-transparent border-none outline-none text-white font-bold w-full text-sm" 
                placeholder="EX: COMBO SK + COCA POR R$ 35,00"
              />
            </div>
          </div>
        </div>

        {/* Oferta de Sobremesa (Upsell) */}
        <div className="pt-6 border-t border-white/5 space-y-4">
          <div className="ml-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Oferta de Sobremesa (Upsell no Carrinho)</label>
            <p className="text-[8px] text-zinc-600 font-bold uppercase italic mt-1">Configure qual produto aparecerá como sugestão de sobremesa.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Nome do Produto</label>
              <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 p-4 rounded-2xl focus-within:border-pink-500/50 transition-all">
                <IceCream size={20} className="text-pink-500" />
                <input 
                  type="text" 
                  value={localConfig.dessertName ?? ''} 
                  onChange={e => setLocalConfig({...localConfig, dessertName: e.target.value.toUpperCase()})}
                  className="bg-transparent border-none outline-none text-white font-bold w-full text-sm" 
                  placeholder="COPO DA FELICIDADE"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Preço na Oferta (R$)</label>
              <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 p-4 rounded-2xl focus-within:border-pink-500/50 transition-all">
                <Target size={20} className="text-pink-500" />
                <input 
                  type="number" 
                  value={localConfig.dessertOfferPrice ?? 0} 
                  onChange={e => setLocalConfig({...localConfig, dessertOfferPrice: parseFloat(e.target.value)})}
                  className="bg-transparent border-none outline-none text-white font-bold w-full text-sm" 
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Preço Avulso (R$)</label>
              <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 p-4 rounded-2xl focus-within:border-pink-500/50 transition-all">
                <Hash size={20} className="text-pink-500" />
                <input 
                  type="number" 
                  value={localConfig.dessertSoloPrice ?? 0} 
                  onChange={e => setLocalConfig({...localConfig, dessertSoloPrice: parseFloat(e.target.value)})}
                  className="bg-transparent border-none outline-none text-white font-bold w-full text-sm" 
                />
              </div>
            </div>
          </div>
          <p className="text-[8px] text-zinc-600 font-bold uppercase italic ml-2">
            * O sistema buscará um produto no cardápio que contenha este nome para aplicar o desconto.
          </p>
        </div>

        {/* Segurança */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
          <div className="space-y-3">
            <div className="flex justify-between ml-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">PIN Administrativo</label>
              <button type="button" onClick={() => setShowPins(!showPins)} className="text-zinc-600 hover:text-white transition-all">
                {showPins ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
            <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 p-4 rounded-2xl focus-within:border-white/20 transition-all">
              <Lock size={20} className="text-zinc-700" />
              <input 
                type={showPins ? "text" : "password"} 
                value={localConfig.adminPassword ?? ''} 
                onChange={e => setLocalConfig({...localConfig, adminPassword: e.target.value.replace(/\D/g, '')})}
                className="bg-transparent border-none outline-none text-white font-black tracking-[0.5em] w-full text-sm" 
                maxLength={4}
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">PIN Cozinha</label>
            <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 p-4 rounded-2xl focus-within:border-white/20 transition-all">
              <Lock size={20} className="text-zinc-700" />
              <input 
                type={showPins ? "text" : "password"} 
                value={localConfig.kitchenPassword ?? ''} 
                onChange={e => setLocalConfig({...localConfig, kitchenPassword: e.target.value.replace(/\D/g, '')})}
                className="bg-transparent border-none outline-none text-white font-black tracking-[0.5em] w-full text-sm" 
                maxLength={4}
              />
            </div>
          </div>
        </div>

        {/* Gestão de Categorias */}
        <div className="pt-6 border-t border-white/5 space-y-4">
          <div className="flex justify-between items-end ml-2">
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Categorias Ativas & Ordem</label>
              <p className="text-[8px] text-zinc-600 font-bold uppercase italic mt-1">A ordem abaixo é a mesma que o cliente verá no cardápio.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {localConfig.categories?.map((cat, idx) => (
              <div key={idx} className="bg-zinc-900 border border-white/5 px-4 py-3 rounded-2xl flex items-center gap-4 group hover:border-yellow-500/30 transition-all">
                <div className="flex flex-col gap-1">
                  <button 
                    type="button"
                    disabled={idx === 0}
                    onClick={() => {
                      const newCats = [...(localConfig.categories || [])];
                      [newCats[idx], newCats[idx - 1]] = [newCats[idx - 1], newCats[idx]];
                      setLocalConfig({...localConfig, categories: newCats});
                    }}
                    className="text-zinc-700 hover:text-yellow-500 disabled:opacity-0 transition-colors"
                  >
                    <Rocket size={10} className="-rotate-90" />
                  </button>
                  <button 
                    type="button"
                    disabled={idx === (localConfig.categories?.length || 0) - 1}
                    onClick={() => {
                      const newCats = [...(localConfig.categories || [])];
                      [newCats[idx], newCats[idx + 1]] = [newCats[idx + 1], newCats[idx]];
                      setLocalConfig({...localConfig, categories: newCats});
                    }}
                    className="text-zinc-700 hover:text-yellow-500 disabled:opacity-0 transition-colors"
                  >
                    <Rocket size={10} className="rotate-90" />
                  </button>
                </div>
                <span className="text-[10px] font-black text-white uppercase italic">{cat}</span>
                <button 
                  type="button"
                  onClick={() => {
                    const newCats = localConfig.categories?.filter((_, i) => i !== idx);
                    setLocalConfig({...localConfig, categories: newCats});
                  }}
                  className="text-zinc-700 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {(!localConfig.categories || localConfig.categories.length === 0) && (
              <p className="text-[10px] text-zinc-600 italic">Nenhuma categoria cadastrada.</p>
            )}
          </div>
          <div className="flex gap-3 bg-zinc-900/30 p-4 rounded-3xl border border-dashed border-white/10">
            <input 
              type="text" 
              id="newCategoryName"
              placeholder="EX: PREMIUM" 
              className="flex-1 bg-zinc-900 border border-white/5 p-3 rounded-xl text-white text-xs outline-none focus:border-yellow-500/50 uppercase italic font-bold"
            />
            <button 
              type="button"
              onClick={() => {
                const input = document.getElementById('newCategoryName') as HTMLInputElement;
                if (input.value) {
                  const newCat = input.value.toUpperCase().trim();
                  if (localConfig.categories?.includes(newCat)) {
                    showToast("Categoria já existe", "info");
                    return;
                  }
                  setLocalConfig({...localConfig, categories: [...(localConfig.categories || []), newCat]});
                  input.value = '';
                }
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl font-black uppercase text-[10px] transition-all active:scale-95"
            >
              Adicionar
            </button>
          </div>
        </div>

        {/* Configurações de Combo */}
        <div className="pt-6 border-t border-white/5 space-y-6">
          <div className="ml-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Configurações de Combo</label>
            <p className="text-[8px] text-zinc-600 font-bold uppercase italic mt-1">Defina quais categorias ativam a oferta de combo e o valor da taxa.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Taxa Padrão de Combo (R$)</label>
              <div className="flex items-center gap-4 bg-zinc-900 border border-white/5 p-4 rounded-2xl focus-within:border-yellow-500/50 transition-all">
                <Plus size={20} className="text-yellow-500" />
                <input 
                  type="number" 
                  value={localConfig.comboSurcharge ?? 12} 
                  onChange={e => setLocalConfig({...localConfig, comboSurcharge: parseFloat(e.target.value)})}
                  className="bg-transparent border-none outline-none text-white font-bold w-full text-sm" 
                />
              </div>
              <p className="text-[8px] text-zinc-600 font-bold uppercase italic ml-2">Valor adicionado ao preço individual quando transformado em combo.</p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Categorias que são Combos</label>
              <div className="flex flex-wrap gap-2 p-2 bg-zinc-900/50 rounded-2xl border border-white/5 min-h-[52px]">
                {localConfig.categories?.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      const current = localConfig.comboCategories || [];
                      const next = current.includes(cat) 
                        ? current.filter(c => c !== cat)
                        : [...current, cat];
                      setLocalConfig({...localConfig, comboCategories: next});
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border",
                      localConfig.comboCategories?.includes(cat)
                        ? "bg-yellow-500 border-yellow-400 text-black"
                        : "bg-zinc-800 border-white/5 text-zinc-500 hover:border-white/20"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <p className="text-[8px] text-zinc-600 font-bold uppercase italic ml-2">Selecione as categorias que devem oferecer a opção de Combo no cardápio.</p>
            </div>
          </div>
        </div>

        {/* Configuração da Sede */}
        <div className="pt-6 border-t border-white/5 space-y-4">
          <div className="ml-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Localização da Sede (SK BURGERS)</label>
            <p className="text-[8px] text-zinc-600 font-bold uppercase italic mt-1">O endereço de onde partem as entregas.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-zinc-600 uppercase ml-2">Endereço da Loja (Rua/Av)</label>
              <input 
                type="text" 
                value={localConfig.storeAddress || ''} 
                onChange={(e) => setLocalConfig({...localConfig, storeAddress: e.target.value})}
                placeholder="Ex: Tv. Caxias"
                className="w-full bg-zinc-900 border border-white/5 p-3 rounded-xl text-white text-xs outline-none focus:border-yellow-500/50 font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-zinc-600 uppercase ml-2">Número</label>
                <input 
                  type="text" 
                  value={localConfig.storeNumber || ''} 
                  onChange={(e) => setLocalConfig({...localConfig, storeNumber: e.target.value})}
                  placeholder="21"
                  className="w-full bg-zinc-900 border border-white/5 p-3 rounded-xl text-white text-xs outline-none focus:border-yellow-500/50 font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-zinc-600 uppercase ml-2">Bairro</label>
                <input 
                  type="text" 
                  value={localConfig.storeNeighborhood || ''} 
                  onChange={(e) => setLocalConfig({...localConfig, storeNeighborhood: e.target.value})}
                  placeholder="Cidade Nova"
                  className="w-full bg-zinc-900 border border-white/5 p-3 rounded-xl text-white text-xs outline-none focus:border-yellow-500/50 font-bold"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-zinc-600 uppercase ml-2">CEP da Loja</label>
              <input 
                type="text" 
                value={localConfig.cep || ''} 
                onChange={(e) => setLocalConfig({...localConfig, cep: e.target.value})}
                placeholder="00000-000"
                className="w-full bg-zinc-900 border border-white/5 p-3 rounded-xl text-white text-xs outline-none focus:border-yellow-500/50 font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-zinc-600 uppercase ml-2">Latitude</label>
              <input 
                type="text" 
                value={latStr} 
                onChange={(e) => {
                  setLatStr(e.target.value);
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    setLocalConfig({
                      ...localConfig, 
                      storeCoords: { ...(localConfig.storeCoords || {lng: 0}), lat: val }
                    });
                  }
                }}
                placeholder="-3.000000"
                className="w-full bg-zinc-900 border border-white/5 p-3 rounded-xl text-white text-xs outline-none focus:border-yellow-500/50 font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-zinc-600 uppercase ml-2">Longitude</label>
              <input 
                type="text" 
                value={lngStr} 
                onChange={(e) => {
                  setLngStr(e.target.value);
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    setLocalConfig({
                      ...localConfig, 
                      storeCoords: { ...(localConfig.storeCoords || {lat: 0}), lng: val }
                    });
                  }
                }}
                placeholder="-59.000000"
                className="w-full bg-zinc-900 border border-white/5 p-3 rounded-xl text-white text-xs outline-none focus:border-yellow-500/50 font-bold"
              />
            </div>
          </div>

          {/* Mapa de Visualização da Sede */}
          {localConfig.storeCoords && (
            <div className="w-full h-48 rounded-2xl overflow-hidden border border-white/5 shadow-2xl relative group">
              <iframe 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                scrolling="no" 
                marginHeight={0} 
                marginWidth={0} 
                src={`https://maps.google.com/maps?q=${localConfig.storeCoords.lat},${localConfig.storeCoords.lng}&z=16&output=embed&t=m&hl=pt-BR`}
                className="grayscale invert contrast-125 opacity-50 group-hover:opacity-80 transition-opacity"
              />
              <div className="absolute inset-0 pointer-events-none border-2 border-yellow-500/20 rounded-2xl" />
              <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-black text-white uppercase tracking-widest">Ponto Zero SK BURGERS</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <button 
              type="button"
              onClick={() => {
                const url = `https://www.google.com/maps/search/?api=1&query=${localConfig.storeCoords?.lat},${localConfig.storeCoords?.lng}`;
                window.open(url, '_blank');
              }}
              className="w-fit bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <MapPin size={14} /> Ver no Google Maps
            </button>
            <button 
              type="button"
              onClick={() => {
                if (window.confirm("Isso voltará para as coordenadas padrão do Núcleo 16. Confirmar?")) {
                  setLocalConfig({
                    ...localConfig,
                    storeCoords: { lat: LOJA_COORDS.lat, lng: LOJA_COORDS.lng }
                  });
                  setLatStr(LOJA_COORDS.lat.toString());
                  setLngStr(LOJA_COORDS.lng.toString());
                }
              }}
              className="w-fit bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Resetar Coordenadas
            </button>
            <button 
              type="button"
              onClick={onUseCurrentLocation}
              className="w-fit bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <Target size={14} /> Usar Minha Localização (GPS)
            </button>
            <button 
              type="button"
              onClick={onFixAddress}
              className="w-fit bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <MapPin size={14} className="text-yellow-500" /> Localizar pelo Endereço
            </button>
          </div>
          <p className="text-[8px] text-red-500 font-bold uppercase italic text-right mt-2">
            ⚠️ ATENÇÃO: Use o botão GPS apenas se você estiver FISICAMENTE na hamburgueria agora.
          </p>
        </div>

        {/* Regras de Entrega */}
        <div className="pt-6 border-t border-white/5 space-y-4">
          <div className="flex justify-between items-end ml-2">
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Regras de Entrega (KM)</label>
              <p className="text-[8px] text-zinc-600 font-bold uppercase italic mt-1">Defina o valor da taxa baseado na distância em KM.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {localConfig.deliveryRules?.map((rule, idx) => (
              <div key={idx} className="bg-zinc-900 border border-white/5 p-4 rounded-3xl flex items-center justify-between group hover:border-yellow-500/30 transition-all">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white uppercase italic">Até {rule.maxKm} KM</span>
                  <span className="text-[9px] font-bold text-yellow-500 uppercase">{formatCurrency(rule.price)}</span>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    const newRules = localConfig.deliveryRules?.filter((_, i) => i !== idx);
                    setLocalConfig({...localConfig, deliveryRules: newRules});
                  }}
                  className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-3 bg-zinc-900/30 p-4 rounded-3xl border border-dashed border-white/10">
            <div className="flex-1 space-y-1">
              <label className="text-[8px] font-black text-zinc-600 uppercase ml-2">Distância Máxima (KM)</label>
              <input 
                type="number" 
                id="newRuleKm"
                placeholder="EX: 2" 
                step="0.1"
                className="w-full bg-zinc-900 border border-white/5 p-3 rounded-xl text-white text-xs outline-none focus:border-yellow-500/50 font-bold"
              />
            </div>
            <div className="w-full md:w-32 space-y-1">
              <label className="text-[8px] font-black text-zinc-600 uppercase ml-2">Valor da Taxa (R$)</label>
              <input 
                type="number" 
                id="newRulePrice"
                placeholder="0.00" 
                step="0.50"
                className="w-full bg-zinc-900 border border-white/5 p-3 rounded-xl text-white text-xs outline-none focus:border-yellow-500/50 font-bold"
              />
            </div>
            <button 
              type="button"
              onClick={() => {
                const kmInput = document.getElementById('newRuleKm') as HTMLInputElement;
                const priceInput = document.getElementById('newRulePrice') as HTMLInputElement;
                if (kmInput.value && priceInput.value) {
                  const km = parseFloat(kmInput.value);
                  if (km > MAX_DELIVERY_RADIUS_KM) {
                    showToast(`O raio máximo de entrega é de ${MAX_DELIVERY_RADIUS_KM} KM!`, "error");
                    return;
                  }
                  const newRule = { maxKm: km, price: parseFloat(priceInput.value) };
                  const newRules = [...(localConfig.deliveryRules || []), newRule].sort((a, b) => a.maxKm - b.maxKm);
                  setLocalConfig({...localConfig, deliveryRules: newRules});
                  kmInput.value = '';
                  priceInput.value = '';
                } else {
                  showToast("Preencha KM e Preço", "info");
                }
              }}
              className="md:mt-5 bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl font-black uppercase text-[10px] transition-all active:scale-95"
            >
              Adicionar Regra
            </button>
          </div>
        </div>

        {/* Botão de Salvar Final */}
        <button 
          type="submit" 
          disabled={isSaving}
          className="w-full bg-yellow-500 text-black py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 uppercase tracking-widest hover:bg-yellow-400 active:scale-95 transition-all shadow-xl shadow-yellow-500/10 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20}/>}
          <span>Salvar Configurações</span>
        </button>
      </form>
    </div>
  );
};

export default AdminConfig;
