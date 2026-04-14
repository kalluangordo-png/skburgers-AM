import React, { useState, useEffect, useRef } from 'react';
import { Loader2, UploadCloud, Camera, CheckCircle2, RotateCw, Move, RefreshCw } from 'lucide-react';
import Cropper, { Area, Point } from 'react-easy-crop';
import { useToast } from '../ToastContext';
import { compressImage } from '../../utils';

interface PhotoUploadProps {
  onUploadSuccess: (url: string) => void;
  initialValue?: string;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ onUploadSuccess, initialValue }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Sincroniza o preview com o valor inicial (vindo do banco)
  useEffect(() => {
    if (initialValue && initialValue.trim() !== '') {
      setPreview(initialValue);
    }
  }, [initialValue]);

  const onCropComplete = (_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  };

  const handleCropSave = async () => {
    if (!tempImage || !croppedAreaPixels) return;
    setLoading(true);

    try {
      const img = new Image();
      img.src = tempImage;
      await new Promise((resolve) => (img.onload = resolve));

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Otimização SK BURGERS: Mantemos um tamanho fixo de 800x800 para o produto final
      canvas.width = 800;
      canvas.height = 800;

      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        800,
        800
      );

      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.8);
      setPreview(croppedBase64);
      onUploadSuccess(croppedBase64);
      setShowCropper(false);
      setTempImage(null);
      showToast("Posição ajustada! 🎯", "success");
    } catch (error) {
      console.error("Erro ao recortar:", error);
      showToast("Erro ao ajustar posição.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Bloqueio de arquivos gigantes antes do processamento
    if (file.size > 10 * 1024 * 1024) { // 10MB limite bruto
      return showToast("Arquivo pesado demais! Use uma foto menor.", "error");
    }

    setLoading(true);
    const objectUrl = URL.createObjectURL(file);
    setTempImage(objectUrl);
    setShowCropper(true);
    setLoading(false);
  };

  const handleRotate = () => {
    if (!preview) return;
    setLoading(true);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = preview;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Rotaciona 90 graus
      canvas.width = img.height;
      canvas.height = img.width;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(90 * Math.PI / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      const rotatedBase64 = canvas.toDataURL('image/jpeg', 0.8);
      setPreview(rotatedBase64);
      onUploadSuccess(rotatedBase64);
      setLoading(false);
      showToast("Ângulo ajustado! 🔄", "success");
    };
    img.onerror = () => {
      setLoading(false);
      showToast("Erro ao rotacionar imagem.", "error");
    };
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
              <div className="absolute top-6 right-6 flex flex-col gap-2 items-end">
                <div className="bg-emerald-500 text-black px-3 py-1 rounded-full flex items-center gap-2 shadow-lg scale-90 group-hover:scale-100 transition-transform">
                  <CheckCircle2 size={12} strokeWidth={3} />
                  <span className="text-[9px] font-black uppercase tracking-tighter">HD READY</span>
                </div>
                
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="bg-zinc-900/80 hover:bg-blue-500 text-white p-2 rounded-xl border border-white/10 shadow-xl transition-all active:scale-90"
                  title="Trocar Foto"
                >
                  <RefreshCw size={16} />
                </button>

                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTempImage(preview);
                    setShowCropper(true);
                  }}
                  className="bg-zinc-900/80 hover:bg-yellow-500 text-white hover:text-black p-2 rounded-xl border border-white/10 shadow-xl transition-all active:scale-90"
                  title="Ajustar Posição"
                >
                  <Move size={16} />
                </button>

                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRotate();
                  }}
                  className="bg-zinc-900/80 hover:bg-yellow-500 text-white hover:text-black p-2 rounded-xl border border-white/10 shadow-xl transition-all active:scale-90"
                  title="Rotacionar 90°"
                >
                  <RotateCw size={16} />
                </button>
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
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          className="hidden" 
          disabled={loading} 
        />
      </label>

      {/* Modal de Ajuste de Posição (Cropper) */}
      {showCropper && tempImage && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 sm:p-8">
          <div className="relative w-full max-w-2xl bg-zinc-900 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col h-[80vh]">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-white font-black text-lg uppercase tracking-tighter">Ajustar Posição</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Centralize o burger no quadro</p>
              </div>
              <button 
                onClick={() => {
                  setShowCropper(false);
                  setTempImage(null);
                }}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>

            <div className="relative flex-1 bg-black">
              <Cropper
                image={tempImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="p-8 bg-zinc-900/50 border-t border-white/5 space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  <span>Zoom</span>
                  <span className="text-yellow-500">{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
              </div>

              <button
                onClick={handleCropSave}
                disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 rounded-2xl uppercase tracking-widest text-xs transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Confirmar Posição 🔥"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dica técnica flutuante */}
      <div className="mt-4 flex items-center gap-2 px-4">
        <div className="h-1 w-1 bg-yellow-500 rounded-full" />
        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">A compressão automática mantém a nitidez e acelera o app</p>
      </div>
    </div>
  );
};

export default PhotoUpload;
