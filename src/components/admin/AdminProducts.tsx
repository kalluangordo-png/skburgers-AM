import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit3, Power, Trash2, Save, X, ChefHat, Image as ImageIcon, 
  DollarSign, Info, AlertCircle, Loader2, Rocket
} from 'lucide-react';
import { 
  collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Product, StoreConfig } from '../../types';
import { useToast } from '../ToastContext';
import { formatCurrency } from '../../utils';
import PhotoUpload from './PhotoUpload';

interface AdminProductsProps {
  products: Product[];
  config: StoreConfig;
  onUpdateConfig: (config: StoreConfig) => Promise<void>;
  onToggleStatus: (product: Product) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const optimizeImage = (url: string, width: number) => {
  if (!url) return 'https://picsum.photos/400/300';
  return url; // Simplified for this implementation
};

const AdminProducts: React.FC<AdminProductsProps> = ({ 
  products, config, onUpdateConfig, onToggleStatus, onDelete 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [localConfig, setLocalConfig] = useState<StoreConfig>(config);
  const { showToast } = useToast();

  const [formData, setFormData] = useState<Omit<Product, 'id' | 'isPaused'>>({
    name: '',
    price: 0,
    priceCombo: null,
    description: '',
    category: 'Burgers',
    image: '',
    fixedDrink: '',
    drinkCategory: '',
  });

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      price: 0,
      priceCombo: null,
      description: '',
      category: 'Burgers',
      image: '',
      fixedDrink: '',
      drinkCategory: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name || '',
      price: product.price || 0,
      priceCombo: product.priceCombo || null,
      description: product.description || '',
      category: product.category || 'Burgers',
      image: product.image || '',
      fixedDrink: product.fixedDrink || '',
      drinkCategory: product.drinkCategory || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || (formData.price === 0 && !formData.priceCombo)) return showToast("Nome e pelo menos um preço são obrigatórios", "error");
    
    setIsSubmitting(true);
    try {
      const category = formData.category.trim().toUpperCase();
      const currentCategories = (config.categories || []).map(c => c.toUpperCase().trim());
      
      // Se a categoria for nova, atualiza o config
      if (category && !currentCategories.includes(category)) {
        const newCategories = Array.from(new Set([...currentCategories, category]));
        await onUpdateConfig({ ...config, categories: newCategories });
      }

      const payload = { 
        name: formData.name.toUpperCase().trim(), 
        price: Number(formData.price), 
        priceCombo: formData.priceCombo ? Number(formData.priceCombo) : null, 
        description: formData.description || '',
        category: category,
        image: formData.image || '',
        fixedDrink: formData.fixedDrink || '',
        drinkCategory: formData.drinkCategory || '',
        updatedAt: serverTimestamp() 
      };

      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), payload);
        showToast(`${formData.name} atualizado com sucesso!`, "success");
      } else {
        await addDoc(collection(db, 'products'), { 
          ...payload, 
          isPaused: false, 
          createdAt: serverTimestamp() 
        });
        showToast("Novo burger adicionado ao cardápio!", "success");
      }
      setIsModalOpen(false);
    } catch (err) { 
      console.error("Erro ao salvar produto:", err);
      showToast("Erro ao salvar. Verifique a conexão.", "error"); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await onUpdateConfig(localConfig);
      showToast("Configurações salvas!", "success");
    } catch (err) {
      showToast("Erro ao salvar configuração.", "error");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleAddTopic = async () => {
    if (!newTopicName) return;
    const topic = newTopicName.trim().toUpperCase();
    const currentCategories = (config.categories || []).map(c => c.toUpperCase().trim());
    
    if (currentCategories.includes(topic)) {
      showToast("Este tópico já existe!", "error");
      return;
    }
    
    const newCategories = Array.from(new Set([...currentCategories, topic]));
    try {
      await onUpdateConfig({ ...config, categories: newCategories });
      setNewTopicName('');
      showToast("Tópico criado com sucesso!", "success");
    } catch (e) {
      showToast("Erro ao criar tópico", "error");
    }
  };

  const handleRemoveTopic = async (topic: string) => {
    if (!window.confirm(`Deseja remover o tópico "${topic}"? Todos os produtos vinculados a ele serão movidos para "GERAL".`)) return;
    
    const newCategories = (config.categories || []).filter(c => c !== topic);
    try {
      // 1. Atualizar Config
      await onUpdateConfig({ ...config, categories: newCategories });
      
      // 2. Atualizar Produtos vinculados
      const productsToUpdate = products.filter(p => p.category?.toUpperCase().trim() === topic.toUpperCase().trim());
      for (const p of productsToUpdate) {
        await updateDoc(doc(db, 'products', p.id), { category: 'GERAL' });
      }

      showToast("Tópico removido e produtos atualizados!", "info");
    } catch (e) {
      showToast("Erro ao remover tópico", "error");
    }
  };

  const handleSyncCategories = async () => {
    setIsSyncing(true);
    try {
      // 1. Coletar todas as categorias dos produtos
      const productCategories = products.map(p => p.category?.toUpperCase().trim()).filter(Boolean);
      
      // 2. Coletar categorias da config
      const configCategories = (config.categories || []).map(c => c.toUpperCase().trim());

      // 3. Unificar tudo
      const unifiedCategories = Array.from(new Set([...configCategories, ...productCategories]));

      // 4. Atualizar Config
      await onUpdateConfig({ ...config, categories: unifiedCategories });

      showToast("Tópicos sincronizados!", "success");
    } catch (e) {
      console.error(e);
      showToast("Erro ao sincronizar tópicos", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const allAvailableCategories = Array.from(new Set([
    ...(config.categories || []).map(c => c.toUpperCase().trim()),
    ...products.map(p => p.category?.toUpperCase().trim()).filter(Boolean)
  ])).sort();

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">Menu Master</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-1">Gestão de Cardápio</p>
        </div>
        <div className="flex gap-4">
          <button 
             onClick={() => setIsTopicModalOpen(true)}
             className="bg-zinc-800 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-zinc-700 transition-all"
          >
            Gerenciar Tópicos
          </button>
          <button onClick={openAddModal} className="w-full md:w-auto bg-white text-black hover:bg-yellow-500 hover:text-white px-8 py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95">
            <Plus size={20} /> Criar Novo Burger
          </button>
        </div>
      </header>

      {/* Grid de Produtos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map(prod => (
          <div key={prod.id} className={`group bg-zinc-900/30 border-2 rounded-[2.8rem] overflow-hidden transition-all duration-500 flex flex-col backdrop-blur-sm ${prod.isPaused ? 'border-red-500/10 opacity-50' : 'border-white/5 hover:border-yellow-500/40'}`}>
            <div className="h-48 relative overflow-hidden">
              <img src={optimizeImage(prod.image, 600)} alt={prod.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent"></div>
              
              <div className="absolute top-4 right-4 flex flex-col gap-2 translate-x-12 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <button onClick={() => openEditModal(prod)} className="p-3 bg-white text-black rounded-xl hover:bg-yellow-500 hover:text-white transition-all shadow-xl"><Edit3 size={18} /></button>
                <button onClick={() => onToggleStatus(prod)} className={`p-3 rounded-xl transition-all shadow-xl ${prod.isPaused ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-white'}`}>
                  <Power size={18} />
                </button>
              </div>

              <div className="absolute bottom-3 left-6">
                <span className="text-[9px] font-black uppercase px-2 py-1 bg-black/60 text-yellow-500 border border-yellow-500/30 rounded-lg backdrop-blur-md">
                  {prod.category}
                </span>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col">
              <div className="mb-4">
                <h4 className="font-black uppercase text-base text-white leading-tight tracking-tight">{prod.name}</h4>
                <p className="text-[10px] text-zinc-500 font-bold mt-1 line-clamp-2 italic">{prod.description}</p>
              </div>

              <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[14px] text-yellow-500 font-black italic">{formatCurrency(prod.price)}</span>
                  {prod.priceCombo && <span className="text-[10px] text-emerald-500 font-bold uppercase">Combo: {formatCurrency(prod.priceCombo)}</span>}
                  {prod.fixedDrink && <span className="text-[8px] text-zinc-400 font-bold uppercase block mt-1">🥤 Fixa: {prod.fixedDrink}</span>}
                  {prod.drinkCategory && <span className="text-[8px] text-zinc-400 font-bold uppercase block mt-1">🥤 Filtro: {prod.drinkCategory}</span>}
                </div>
                <button onClick={() => onDelete(prod.id)} className="p-2 text-zinc-700 hover:text-red-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Seção de Upsells */}
      <div className="mt-20 p-10 bg-zinc-900/20 border border-white/5 rounded-[3rem] space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Engenharia de Upsell</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-1">Configuração de Adicionais e Ofertas de Checkout</p>
          </div>
          <div className="flex gap-4">
            <button 
               onClick={handleSaveConfig}
               disabled={isSavingConfig}
               className="bg-yellow-500 text-black px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-yellow-400 transition-all shadow-xl shadow-yellow-500/10"
            >
              {isSavingConfig ? 'Sincronizando...' : 'Salvar Estratégia'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Coluna de Adicionais */}
          <div className="space-y-6">
             <div className="flex justify-between items-center px-2">
               <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                 <Plus size={16} className="text-yellow-500" /> Adicionais (Extras)
               </h4>
               <button 
                 onClick={() => setLocalConfig({...localConfig, addons: [...(localConfig.addons || []), { name: '', price: 0 }]})}
                 className="text-[9px] font-black text-yellow-500 uppercase border-b border-yellow-500/30"
               >
                 + Adicionar Campo
               </button>
             </div>
             
             <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
               {(localConfig.addons || []).map((addon, index) => (
                 <div key={index} className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:border-white/10 transition-all">
                    <input 
                      type="text" 
                      value={addon.name ?? ''} 
                      onChange={e => {
                        const newAddons = [...localConfig.addons];
                        newAddons[index].name = e.target.value.toUpperCase();
                        setLocalConfig({...localConfig, addons: newAddons});
                      }}
                      placeholder="EX: BACON EXTRA"
                      className="bg-transparent border-none outline-none text-white font-bold text-xs flex-1"
                    />
                    <div className="flex items-center gap-2 bg-zinc-900 px-3 py-2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-zinc-600 font-black">R$</span>
                        <input 
                          type="number" 
                          value={addon.price ?? 0} 
                          onChange={e => {
                            const newAddons = [...localConfig.addons];
                            newAddons[index].price = parseFloat(e.target.value) || 0;
                            setLocalConfig({...localConfig, addons: newAddons});
                          }}
                          className="bg-transparent border-none outline-none text-yellow-500 font-black text-xs w-14"
                        />
                    </div>
                    <button onClick={() => {
                      const newAddons = localConfig.addons.filter((_, i) => i !== index);
                      setLocalConfig({...localConfig, addons: newAddons});
                    }} className="text-zinc-700 hover:text-red-500"><Trash2 size={16}/></button>
                 </div>
               ))}
             </div>
          </div>

          {/* Coluna de Sobremesas */}
          <div className="space-y-6">
            <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <ChefHat size={16} className="text-yellow-500" /> Gatilho de Sobremesa
            </h4>
            <div className="bg-black/40 border border-white/5 p-8 rounded-[2.5rem] space-y-8">
               <div className="space-y-3">
                 <label className="text-[9px] font-black text-zinc-500 uppercase px-1">Preço no Cardápio (Copo da Felicidade)</label>
                 <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                   <span className="text-white font-black italic">{formatCurrency(localConfig.dessertSoloPrice || 0)}</span>
                   <input 
                     type="number" 
                     value={localConfig.dessertSoloPrice ?? 0} 
                     onChange={e => setLocalConfig({...localConfig, dessertSoloPrice: parseFloat(e.target.value)})}
                     className="w-20 bg-transparent text-right outline-none text-zinc-500 font-bold"
                   />
                 </div>
               </div>
               
               <div className="space-y-3">
                 <label className="text-[9px] font-black text-yellow-500 uppercase px-1">Preço "Oferta de Última Hora" (No Carrinho)</label>
                 <div className="bg-yellow-500/10 border border-yellow-500/20 p-5 rounded-2xl flex items-center justify-between">
                   <span className="text-yellow-500 font-black italic text-xl">{formatCurrency(localConfig.dessertOfferPrice || 0)}</span>
                   <input 
                     type="number" 
                     value={localConfig.dessertOfferPrice ?? 0} 
                     onChange={e => setLocalConfig({...localConfig, dessertOfferPrice: parseFloat(e.target.value)})}
                     className="w-20 bg-transparent text-right outline-none text-yellow-900 font-black"
                   />
                 </div>
                 <p className="text-[8px] text-zinc-600 font-bold uppercase italic mt-2 text-center">Este preço cria o senso de urgência e benefício no checkout.</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Tópicos */}
      {isTopicModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-zinc-950 border border-white/10 rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl">
            <header className="p-8 border-b border-white/5 flex justify-between items-center">
              <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">Gerenciar Tópicos</h4>
              <button onClick={() => setIsTopicModalOpen(false)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X size={20}/></button>
            </header>
            <div className="p-8 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Novo Tópico</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newTopicName}
                    onChange={e => setNewTopicName(e.target.value)}
                    placeholder="EX: BEBIDAS"
                    className="flex-1 bg-zinc-900 border border-white/5 rounded-xl p-4 text-white font-bold focus:border-orange-500 outline-none uppercase text-xs"
                  />
                  <button 
                    onClick={handleAddTopic}
                    className="bg-orange-500 text-black p-4 rounded-xl font-black hover:bg-orange-400 transition-all"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tópicos Ativos</label>
                  <button 
                    onClick={handleSyncCategories}
                    disabled={isSyncing}
                    className="text-[9px] font-black text-yellow-500 uppercase flex items-center gap-1 hover:text-yellow-400 disabled:opacity-50"
                  >
                    {isSyncing ? <Loader2 size={10} className="animate-spin" /> : <Rocket size={10} />}
                    Sincronizar e Corrigir
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                  {config.categories?.map((cat: string, idx: number) => (
                    <div key={cat} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex justify-between items-center group hover:border-yellow-500/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                          <button 
                            type="button"
                            disabled={idx === 0}
                            onClick={async () => {
                              const newCats = [...(config.categories || [])];
                              [newCats[idx], newCats[idx - 1]] = [newCats[idx - 1], newCats[idx]];
                              await onUpdateConfig({ ...config, categories: newCats });
                            }}
                            className="text-zinc-700 hover:text-yellow-500 disabled:opacity-0 transition-colors"
                          >
                            <Rocket size={10} className="-rotate-90" />
                          </button>
                          <button 
                            type="button"
                            disabled={idx === (config.categories?.length || 0) - 1}
                            onClick={async () => {
                              const newCats = [...(config.categories || [])];
                              [newCats[idx], newCats[idx + 1]] = [newCats[idx + 1], newCats[idx]];
                              await onUpdateConfig({ ...config, categories: newCats });
                            }}
                            className="text-zinc-700 hover:text-yellow-500 disabled:opacity-0 transition-colors"
                          >
                            <Rocket size={10} className="rotate-90" />
                          </button>
                        </div>
                        <span className="text-xs font-black text-white uppercase italic">{cat}</span>
                      </div>
                      <button 
                        onClick={() => handleRemoveTopic(cat)}
                        className="text-zinc-700 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Produto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-zinc-950 border border-white/10 rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <header className="p-8 border-b border-white/5 flex justify-between items-center">
              <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                {editingId ? 'Editar Produto' : 'Novo Produto'}
              </h4>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X size={20}/></button>
            </header>
            
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Nome do Produto</label>
                    <input 
                      type="text" 
                      value={formData.name ?? ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white font-bold focus:border-yellow-500 outline-none uppercase"
                      placeholder="EX: SK CLASSIC BURGER"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Preço Individual</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={formData.price ?? 0}
                        onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white font-bold focus:border-yellow-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Preço Combo</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={formData.priceCombo ?? ''}
                        onChange={e => setFormData({...formData, priceCombo: e.target.value ? Number(e.target.value) : null})}
                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white font-bold focus:border-yellow-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Tópico (Categoria)</label>
                    <select 
                      value={formData.category ?? ''}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white font-bold focus:border-yellow-500 outline-none uppercase text-xs"
                      required
                    >
                      <option value="">Selecione um tópico</option>
                      {allAvailableCategories.map((cat: string) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <p className="text-[8px] text-zinc-600 font-bold uppercase italic mt-1 ml-1">Dica: Use o botão "Gerenciar Tópicos" para criar novas categorias.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Fotografia do Produto</label>
                    <PhotoUpload 
                      initialValue={formData.image}
                      onUploadSuccess={(url) => setFormData({...formData, image: url})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Descrição</label>
                    <textarea 
                      value={formData.description ?? ''}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white font-bold focus:border-yellow-500 outline-none h-32 resize-none"
                      placeholder="Descreva os ingredientes..."
                    />
                  </div>

                  {/* Configurações de Bebida do Combo */}
                  <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-[2rem] space-y-4">
                    <h5 className="text-[10px] font-black uppercase text-yellow-500 tracking-widest flex items-center gap-2">
                      <Rocket size={14} /> Configurações de Bebida (Combo)
                    </h5>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Bebida Fixa (Opcional)</label>
                        <input 
                          type="text" 
                          value={formData.fixedDrink ?? ''}
                          onChange={e => setFormData({...formData, fixedDrink: e.target.value.toUpperCase()})}
                          className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white font-bold focus:border-yellow-500 outline-none uppercase text-xs"
                          placeholder="EX: COCA-COLA 1L (PULA A ESCOLHA)"
                        />
                        <p className="text-[8px] text-zinc-600 font-bold uppercase italic ml-1">Se preenchido, o cliente não escolhe a bebida.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Filtro de Categoria de Bebida (Opcional)</label>
                        <input 
                          type="text" 
                          value={formData.drinkCategory ?? ''}
                          onChange={e => setFormData({...formData, drinkCategory: e.target.value.toUpperCase()})}
                          className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white font-bold focus:border-yellow-500 outline-none uppercase text-xs"
                          placeholder="EX: LATA (MOSTRA APENAS BEBIDAS COM 'LATA' NO NOME)"
                        />
                        <p className="text-[8px] text-zinc-600 font-bold uppercase italic ml-1">Filtra as opções de bebida que aparecem para este combo.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-yellow-500 text-black py-6 rounded-2xl font-black uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-xl shadow-yellow-500/20 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : 'Salvar Produto'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
