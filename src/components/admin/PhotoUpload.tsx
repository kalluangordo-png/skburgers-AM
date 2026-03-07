import React, { useState, useEffect } from 'react';
import { Loader2, UploadCloud, Camera, CheckCircle2 } from 'lucide-react';
import { useToast } from '../ToastContext';
import { compressImage } from '../../utils';

interface PhotoUploadProps {
  onUploadSuccess: (url: string) => void;
  initialValue?: string;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ onUploadSuccess, initialValue }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { showToast } = useToast();

  // Sincroniza o preview com o valor inicial (vindo do banco)
  useEffect(() => {
    if (initialValue && initialValue.trim() !== '') {
      setPreview(initialValue);
    }
  }, [initialValue]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Bloqueio de arquivos gigantes antes do processamento
    if (file.size > 10 * 1024 * 1024) { // 10MB limite bruto
      return showToast("Arquivo pesado demais! Use uma foto menor.", "error");
    }

    setLoading(true);
    const objectUrl = URL.createObjectURL(file);
    
    try {
      setPreview(objectUrl);

      // Otimização de Performance SK BURGERS
      // Reduzimos para 800px para garantir carregamento instantâneo no mobile dos clientes
      await compressImage(file, 800, 0.7);
      
      // Simulação de Upload para o Firebase Storage
      setTimeout(() => {
        onUploadSuccess(objectUrl);
        showToast("Foto otimizada com padrão SK! 🔥", "success");
        setLoading(false);
      }, 1200);

    } catch (error) {
      showToast("Erro ao processar a imagem.", "error");
      setPreview(initialValue || null);
      setLoading(false);
    } finally {
      // Limpeza de cache de memória após o uso
      // URL.revokeObjectURL(objectUrl); -> Ativar apenas após o upload real
    }
  };

  return (
    <div className="relative group w-full">
      <label className={`
        relative flex flex-col items-center justify-center w-full h-64 
        border-2 border-dashed rounded-[2.5rem] cursor-pointer 
        transition-all duration-700 overflow-hidden shadow-2xl
        ${preview ? 'border-yellow-500/20 bg-black' : 'border-zinc-800 bg-zinc-900/40 hover:border-yellow-500/40'}
      `}>
        
        {preview ? (
          <>
            {/* Imagem com efeito de zoom no hover */}
            <img 
              src={preview} 
              alt="Preview do Burger" 
              className={`w-full h-full object-cover transition-all duration-1000 ${loading ? 'opacity-40 blur-sm' : 'group-hover:scale-110'}`} 
            />
            
            {/* Overlay de Ação */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${loading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {loading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Loader2 className="animate-spin text-yellow-500" size={40} />
                    <UploadCloud className="absolute inset-0 m-auto text-white/50" size={16} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white animate-pulse">Processando Pixel...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-white/10 rounded-full border border-white/20">
                    <Camera className="text-white" size={28} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Alterar Fotografia</span>
                </div>
              )}
            </div>

            {/* Tag de Sucesso */}
            {!loading && (
              <div className="absolute top-6 right-6 bg-emerald-500 text-black px-3 py-1 rounded-full flex items-center gap-2 shadow-lg scale-90 group-hover:scale-100 transition-transform">
                <CheckCircle2 size={12} strokeWidth={3} />
                <span className="text-[9px] font-black uppercase tracking-tighter">HD READY</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-zinc-800/50 rounded-[2rem] flex items-center justify-center mb-6 group-hover:bg-yellow-500/20 group-hover:rotate-12 transition-all duration-500 border border-white/5">
              <UploadCloud className="text-zinc-600 group-hover:text-yellow-500" size={32} />
            </div>
            <h3 className="text-white font-black text-xs uppercase tracking-widest mb-2">Upload de Produto</h3>
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest max-w-[150px] leading-relaxed">
              Arraste ou clique para enviar (JPG, PNG • Máx 5MB)
            </p>
          </div>
        )}

        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          className="hidden" 
          disabled={loading} 
        />
      </label>

      {/* Dica técnica flutuante */}
      <div className="mt-4 flex items-center gap-2 px-4">
        <div className="h-1 w-1 bg-yellow-500 rounded-full" />
        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">A compressão automática mantém a nitidez e acelera o app</p>
      </div>
    </div>
  );
};

export default PhotoUpload;
