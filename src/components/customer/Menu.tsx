import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, Plus, ChevronRight, ArrowLeft, 
  MapPinned, MapPin, Loader2, Smartphone, CreditCard, Banknote, 
  CheckCircle2, X, Minus, Trash2, Flame, Utensils, Rocket, Zap, Bike,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '../ToastContext';
import { formatCurrency, calculateDistance, getAddonEmoji } from '../../utils';
import { PaymentMethod, OrderStatus, Product, StoreConfig } from '../../types';
import { LOJA_COORDS, LOJA_CEP, MAX_DELIVERY_RADIUS_KM, PAYMENT_ADJUSTMENTS } from '../../constants';
import { collection, addDoc, serverTimestamp, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import CartUpsell from './CartUpsell';
import CartQuickSides from './CartQuickSides';

interface MenuProps {
  onBack: () => void;
  config: StoreConfig;
}

const Menu: React.FC<MenuProps> = ({ onBack, config }) => {
  const navigate = useNavigate();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Bebidas disponíveis para o combo (dinâmico baseado no estoque/pausa)
  const availableDrinks = useMemo(() => {
    return allProducts
      .filter(p => (p.category || '').toUpperCase().includes('BEBIDA'))
      .map(p => p.name)
      .sort();
  }, [allProducts]);

  // Sincronização em tempo real dos produtos
  useEffect(() => {
    const q = query(
      collection(db, 'products'), 
      where('isPaused', '==', false)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setAllProducts(productsData);
      setLoadingProducts(false);
    }, (error) => {
      console.error("Erro ao buscar produtos:", error);
      setLoadingProducts(false);
    });

    return () => unsubscribe();
  }, []);

  // Categorias dinâmicas: União das configuradas + as que existem nos produtos
  const categories = useMemo(() => {
    const CATEGORY_PRIORITY: Record<string, number> = {
      'COMBOS': 1,
      'COMBO': 1,
      'PREMIUM': 2,
      'CLASSICOS': 3,
      'CLÁSSICOS': 3,
      'BURGERS': 4,
      'ACOMPANHAMENTOS': 5,
      'SOBREMESAS': 6,
      'SOBREMESA': 6,
      'BEBIDAS': 7,
      'GERAL': 99
    };

    const fixName = (name: string) => {
      return name.toUpperCase().trim();
    };

    const configCats = (config.categories || []).map(fixName);
    const productCats = allProducts.map(p => fixName(p.category || 'GERAL')).filter(Boolean);
    const combined = Array.from(new Set([...configCats, ...productCats])).filter(Boolean);
    
    // Ordenação Estratégica: Prioriza a ordem definida no config.categories
    const sortedCats = combined.sort((a, b) => {
      const indexA = configCats.indexOf(a);
      const indexB = configCats.indexOf(b);

      // Se ambas estão no config, respeita a ordem do config
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      
      // Se apenas uma está no config, ela vem primeiro
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      // Se nenhuma está no config, usa a prioridade hardcoded como fallback
      const priorityA = CATEGORY_PRIORITY[a] || 50;
      const priorityB = CATEGORY_PRIORITY[b] || 50;
      if (priorityA !== priorityB) return priorityA - priorityB;
      
      return a.localeCompare(b);
    });

    const finalCats = sortedCats.length > 0 ? sortedCats : ['COMBOS', 'PREMIUM', 'CLASSICOS', 'ACOMPANHAMENTOS', 'SOBREMESAS', 'BEBIDAS', 'GERAL'];
    return ['TODOS', ...finalCats];
  }, [config.categories, allProducts]);

  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [cart, setCart] = useState<{ 
    id: string; 
    name: string; 
    price: number; 
    quantity: number; 
    category: string;
    isCombo?: boolean;
    addons?: { name: string; price: number }[];
  }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'form' | 'success'>('cart');
  const addressInputRef = useRef<HTMLInputElement>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [userDistance, setUserDistance] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.PIX);
  const [trocoPara, setTrocoPara] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrderComanda, setLastOrderComanda] = useState('');
  const [lastOrderId, setLastOrderId] = useState('');
  const [comboItem, setComboItem] = useState<Product | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<{ name: string; price: number }[]>([]);
  const [selectedProductForDrink, setSelectedProductForDrink] = useState<{
    product: any;
    price: number;
    isCombo: boolean;
    addons: { name: string; price: number }[];
    cartItemId?: string;
  } | null>(null);
  const [selectedDrink, setSelectedDrink] = useState<string>('');
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    nome: '',
    whatsapp: '',
    cep: '',
    endereco: '',
    numeroCasa: '',
    bairro: '',
    referencia: '',
    observacao: ''
  });

  const mapUrl = useMemo(() => {
    if (!formData.endereco || formData.endereco.length < 3) return null;
    const query = encodeURIComponent(`${formData.endereco}, ${formData.numeroCasa}, ${formData.bairro}, Manaus, AM`);
    return `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  }, [formData.endereco, formData.numeroCasa, formData.bairro]);

  const handleCepChange = useCallback(async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '').slice(0, 8);
    setFormData(prev => ({ ...prev, cep: cleanCep }));

    if (cleanCep.length === 8 && !isSearchingCep) {
      setIsSearchingCep(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s total timeout

      try {
        // 1. Tenta ViaCEP
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
          signal: controller.signal
        });
        
        if (response.ok) {
          const data = await response.json();
          if (!data.erro) {
            // Restrição Geográfica: Foco em Manaus
            if (data.localidade && data.localidade.toUpperCase() !== 'MANAUS') {
              showToast("Atendemos apenas em Manaus!", "error");
              return;
            }

            setFormData(prev => ({
              ...prev,
              endereco: (data.logradouro || '').toUpperCase(),
              bairro: (data.bairro || '').toUpperCase()
            }));
            showToast("Endereço localizado!", "success");
            return;
          }
        }

        // 2. Fallback Google Geocoding
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (apiKey) {
          const query = encodeURIComponent(`CEP ${cleanCep}, Manaus, AM, Brasil`);
          const gResponse = await fetch(`/api/geocode?address=${query}`, {
            signal: controller.signal
          });
          const gData = await gResponse.json();
          
          if (gData.status === 'OK' && gData.results.length > 0) {
            const components = gData.results[0].address_components;
            let street = '';
            let neighborhood = '';
            let isManaus = false;
            
            components.forEach((c: any) => {
              if (c.types.includes('route')) street = c.long_name;
              if (c.types.includes('sublocality_level_1')) neighborhood = c.long_name;
              if (c.types.includes('administrative_area_level_2') && c.long_name.toUpperCase() === 'MANAUS') isManaus = true;
            });

            if (!isManaus) {
              showToast("Atendemos apenas em Manaus!", "error");
              return;
            }

            setFormData(prev => ({
              ...prev,
              endereco: street.toUpperCase(),
              bairro: neighborhood.toUpperCase()
            }));
            showToast("Endereço localizado!", "success");
            return;
          }
        }
        
        showToast("CEP não encontrado. Digite a rua conforme o Google Maps.", "info");
      } catch (error: any) {
        if (error.name === 'AbortError') {
          showToast("Busca lenta. Tente preencher manualmente.", "info");
        } else {
          console.error("Erro busca CEP:", error);
          showToast("Erro ao buscar CEP. Tente manualmente.", "error");
        }
      } finally {
        clearTimeout(timeoutId);
        setIsSearchingCep(false);
      }
    }
  }, [isSearchingCep, showToast]);

  // Garantir que temos uma categoria ativa válida
  useEffect(() => {
    if (!activeCategory && categories.length > 0) {
      setActiveCategory('TODOS');
    }
  }, [categories, activeCategory]);

  const filteredProducts = useMemo(() => {
    return allProducts
      .filter(p => {
        const pCat = (p.category || '').toUpperCase();
        const aCat = (activeCategory || 'TODOS').toUpperCase();
        
        const matchesCategory = (aCat === 'TODOS' || searchQuery) ? true : pCat === aCat;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             p.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        // Se estiver em "TODOS" ou pesquisando, ordena primeiro por categoria (conforme a lista de categorias)
        if ((activeCategory || 'TODOS').toUpperCase() === 'TODOS' || searchQuery) {
          const catA = (a.category || 'GERAL').toUpperCase();
          const catB = (b.category || 'GERAL').toUpperCase();
          const indexA = categories.indexOf(catA);
          const indexB = categories.indexOf(catB);
          
          if (indexA !== indexB) {
            const pA = indexA === -1 ? 999 : indexA;
            const pB = indexB === -1 ? 999 : indexB;
            return pA - pB;
          }
        }
        
        return a.price - b.price;
      });
  }, [allProducts, activeCategory, searchQuery, categories]);

  const featuredCombos = useMemo(() => {
    return allProducts.filter(p => 
      (p.category.toUpperCase() === 'COMBOS' || p.category.toUpperCase() === 'COMBO') && 
      !p.isPaused
    ).slice(0, 4);
  }, [allProducts]);

  const quickSides = useMemo(() => {
    return allProducts.filter(p => {
      const cat = (p.category || '').toUpperCase();
      return cat.includes('ACOMPANHAMENTO') || cat.includes('PORÇÃO') || cat.includes('PORCAO');
    }).slice(0, 6);
  }, [allProducts]);

  const addToCart = (product: { 
    id: string; 
    name: string; 
    price: number; 
    category?: string; 
    isCombo?: boolean;
    addons?: { name: string; price: number }[];
    bebida?: string;
  }) => {
    setCart(prev => {
      const addonsJson = JSON.stringify(product.addons || []);
      const existing = prev.find(item => 
        item.id === product.id && 
        item.isCombo === product.isCombo && 
        item.bebida === product.bebida &&
        JSON.stringify(item.addons || []) === addonsJson
      );
      
      if (existing) {
        return prev.map(item => (
          item.id === product.id && 
          item.isCombo === product.isCombo && 
          item.bebida === product.bebida &&
          JSON.stringify(item.addons || []) === addonsJson
        ) ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, category: product.category || '', isCombo: !!product.isCombo, bebida: product.bebida }];
    });
    
    // Meta Pixel: Track AddToCart
    if ((window as any).fbq) {
      (window as any).fbq('track', 'AddToCart', {
        content_name: product.name,
        content_category: product.category,
        content_ids: [product.id],
        value: product.price,
        currency: 'BRL'
      });
    }

    showToast(`${product.name} ${product.isCombo ? '(Combo)' : ''} adicionado!`, 'success');
  };

  const handleAddToCartClick = (product: Product) => {
    const category = (product.category || '').toLowerCase();
    const isExcluded = category.includes('bebida') || category.includes('sobremesa') || category.includes('doce') || category.includes('acompanhamento') || category.includes('porção') || category.includes('porcao');
    const isAlreadyCombo = product.name.toLowerCase().includes('combo') || category.includes('combo');

    // Se for bebida ou sobremesa, adiciona direto (ou abre seleção de bebida se for combo de bebida?)
    if (isExcluded) {
      addToCart(product);
      return;
    }

    // TUDO AGORA É COMBO (Exceto excluídos acima)
    // Se o produto já tem um preço de combo definido no banco, usa ele.
    // Caso contrário, adiciona a taxa padrão de combo (R$ 12,00).
    const comboPrice = product.priceCombo || (product.price + 12);

    // Abre o modal de personalização (adicionais), mas o destino final será a seleção de bebida
    setComboItem({
      ...product,
      price: comboPrice // Define o preço base como o preço do combo
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cart]);
  
  const deliveryFee = useMemo(() => {
    const rules = config.deliveryRules || [
      { maxKm: 2, price: 5.00 },
      { maxKm: 4, price: 7.00 },
      { maxKm: MAX_DELIVERY_RADIUS_KM, price: 9.00 }
    ];

    if (userDistance !== null) {
      const applicableRule = rules.find(r => userDistance <= r.maxKm);
      return applicableRule ? applicableRule.price : 0;
    }
    
    return 0;
  }, [userDistance, config.deliveryRules]);

  const paymentAdjustment = useMemo(() => {
    const adjustmentRate = PAYMENT_ADJUSTMENTS[paymentMethod] || 0;
    return subtotal * adjustmentRate;
  }, [paymentMethod, subtotal]);

  const finalTotal = subtotal + deliveryFee + paymentAdjustment;
  
  const isOutOfRange = useMemo(() => {
    if (userDistance === null) return false;
    // Enforce absolute limit of MAX_DELIVERY_RADIUS_KM
    if (userDistance > MAX_DELIVERY_RADIUS_KM) return true;
    
    const rules = config.deliveryRules || [{ maxKm: MAX_DELIVERY_RADIUS_KM, price: 9.00 }];
    const maxAllowedKm = Math.max(...rules.map(r => r.maxKm));
    return userDistance > maxAllowedKm;
  }, [userDistance, config.deliveryRules]);

  const [geocodingCache] = useState<Record<string, { lat: number; lon: number }>>({});
  const [lastLocatedAddress, setLastLocatedAddress] = useState<string>('');

  const handleGetLocation = useCallback(async (addressFallback?: string | boolean, manualCoords?: { lat: number; lon: number }) => {
    // Se já estiver localizando e NÃO for uma chamada manual com coordenadas, ignora.
    if (isLocating && !manualCoords) return;
    
    if (typeof addressFallback === 'string') {
      setLastLocatedAddress(addressFallback);
    }

    setIsLocating(true);

    const storeLat = config.storeCoords?.lat || LOJA_COORDS.lat;
    const storeLng = config.storeCoords?.lng || LOJA_COORDS.lng;
    const storeCep = (config.cep || LOJA_CEP).replace(/\D/g, '');
    const userCep = formData.cep.replace(/\D/g, '');

    // Se o CEP for idêntico ao da loja, a distância é mínima (mesmo quarteirão)
    if (userCep === storeCep && userCep.length > 0 && !manualCoords) {
      setUserDistance(0.1);
      setIsLocating(false);
      return;
    }

    // Função interna para tentar geocodificar com timeout reduzido para velocidade
    const tryGeocode = async (queryStr: string) => {
      if (!queryStr) return null;
      
      // Verificar Cache
      if (geocodingCache[queryStr]) {
        return geocodingCache[queryStr];
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

        try {
          const query = encodeURIComponent(`${queryStr}, Manaus, AM, Brasil`);
          // Chamada via Proxy Local para evitar CORS
          const response = await fetch(`/api/geocode?address=${query}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          const data = await response.json();
          if (data.status === 'OK' && data.results.length > 0) {
            const lat = data.results[0].geometry.location.lat;
            const lon = data.results[0].geometry.location.lng;
            const coords = { lat, lon };
            geocodingCache[queryStr] = coords;
            return coords;
          }
        } catch (e) {
          console.error("Google Geocoding error:", e);
        } finally {
          clearTimeout(timeoutId);
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        // Query mais robusta forçando Manaus e Amazonas
        const query = encodeURIComponent(`${queryStr}, Manaus, AM, Brasil`);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&addressdetails=1`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const data = await response.json();
        
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);

          // Filtro de Segurança: Se as coordenadas estiverem fora da região metropolitana de Manaus, ignoramos.
          const isInManaus = lat < -2.8 && lat > -3.3 && lon < -59.7 && lon > -60.2;
          
          if (!isInManaus) {
            console.warn("Localização geocodificada fora de Manaus:", lat, lon);
            return null;
          }

          const coords = { lat, lon };
          geocodingCache[queryStr] = coords;
          return coords;
        }
      } catch (e: any) {
        // Silencioso
      } finally {
        clearTimeout(timeoutId);
      }
      return null;
    };

    try {
      let coords = manualCoords ? { lat: manualCoords.lat, lon: manualCoords.lon } : null;

      if (!coords && addressFallback) {
        // Tentativa 1: CEP
        if (formData.cep && formData.cep.length >= 8) {
          coords = await tryGeocode(formData.cep);
        }

        // Tentativa 2: Endereço Completo
        if (!coords && formData.endereco) {
          coords = await tryGeocode(`${formData.endereco}, ${formData.numeroCasa}, ${formData.bairro}`);
        }
      }

      if (coords) {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      // 1. Cálculo de Linha Reta (Haversine) - Nossa Base de Comparação
      const directDistance = calculateDistance(storeLat, storeLng, coords.lat, coords.lon);
      console.log(`SK BURGERS: Distância Direta (Haversine): ${directDistance.toFixed(2)} km`);

      // ESTRATÉGIA DE VIZINHANÇA: Se estiver a menos de 1.5km em linha reta,
      // usamos a distância direta + 20% de margem. Isso evita que o GPS mande
      // dar voltas enormes em ruas de bairro que o motoboy corta caminho.
      if (directDistance < 1.5) {
        const neighborhoodDistance = directDistance * 1.2; 
        console.log(`SK BURGERS: Modo Vizinhança Ativo: ${neighborhoodDistance.toFixed(2)} km`);
        setUserDistance(neighborhoodDistance);
        setIsLocating(false);
        return;
      }

      // 2. Para distâncias maiores, tenta Google Distance Matrix (Rota Real)
      if (apiKey) {
        try {
          const gResponse = await fetch(`/api/distance?origins=${storeLat},${storeLng}&destinations=${coords.lat},${coords.lon}`);
          const gData = await gResponse.json();
          if (gData.status === 'OK' && gData.rows[0].elements[0].status === 'OK') {
            const distanceKm = gData.rows[0].elements[0].distance.value / 1000;
            
            // Sanity Check: Se a rota for 3x maior que a linha reta, algo está errado no mapa
            const finalGDistance = distanceKm > directDistance * 2.5 ? directDistance * 1.5 : distanceKm;
            
            console.log(`SK BURGERS: Rota Real via Google: ${finalGDistance.toFixed(2)} km`);
            setUserDistance(finalGDistance);
            setIsLocating(false);
            return;
          }
        } catch (e) {
          console.error("Google Distance Matrix Proxy error:", e);
        }
      }

      // 3. Tenta OSRM (Rota Alternativa Gratuita)
      const controller = new AbortController();
      const routeTimeout = setTimeout(() => controller.abort(), 5000);

      try {
        const osrmResponse = await fetch(`https://router.project-osrm.org/route/v1/driving/${storeLng},${storeLat};${coords.lon},${coords.lat}?overview=false`, {
          signal: controller.signal
        });
        clearTimeout(routeTimeout);
        const osrmData = await osrmResponse.json();
        
        if (osrmData.routes && osrmData.routes.length > 0) {
          const roadDistance = osrmData.routes[0].distance / 1000;
          
          // Sanity Check para OSRM também
          const finalOsrmDistance = roadDistance > directDistance * 2.5 ? directDistance * 1.5 : roadDistance;
          
          console.log(`SK BURGERS: Rota Real via Rua (OSRM): ${finalOsrmDistance.toFixed(2)} km`);
          setUserDistance(finalOsrmDistance);
          setIsLocating(false);
          return;
        }
      } catch (e) {
        console.error("OSRM error:", e);
      } finally {
        clearTimeout(routeTimeout);
      }

      // 4. Fallback Final (Se tudo falhar, usa a linha reta com margem de segurança)
      const fallbackDistance = directDistance * 1.3;
      console.log(`SK BURGERS: Fallback Final: ${fallbackDistance.toFixed(2)} km`);
      setUserDistance(fallbackDistance);
      setIsLocating(false);
      return;
    }

      // Fallback Geolocation removido a pedido do usuário
      setIsLocating(false);
    } catch (err) {
      console.error("Erro geral localização:", err);
      setIsLocating(false);
    }
  }, [isLocating, formData.endereco, formData.numeroCasa, formData.bairro, formData.cep, config.storeCoords, geocodingCache, config.cep]);

  // Efeito para disparar busca quando o endereço mudar
    useEffect(() => {
      const fullAddress = `${formData.endereco}, ${formData.numeroCasa}, ${formData.bairro}, CEP ${formData.cep}`;
      const hasEnoughInfo = formData.endereco.length > 5 && formData.numeroCasa;
      const isNewAddress = fullAddress !== lastLocatedAddress;
  
      if (checkoutStep === 'form' && hasEnoughInfo && isNewAddress && !isLocating) {
        const timer = setTimeout(() => {
          handleGetLocation(fullAddress);
        }, 700);
        return () => clearTimeout(timer);
      }
    }, [formData.endereco, formData.numeroCasa, formData.bairro, formData.cep, checkoutStep, handleGetLocation, isLocating, lastLocatedAddress]);

  // Google Maps Autocomplete
  useEffect(() => {
    if (checkoutStep === 'form' && addressInputRef.current && (window as any).google) {
      const autocomplete = new (window as any).google.maps.places.Autocomplete(addressInputRef.current, {
        componentRestrictions: { country: 'br' },
        fields: ['address_components', 'geometry', 'name'],
        types: ['address']
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) return;

        const addressComponents = place.address_components;
        let street = '';
        let number = '';
        let neighborhood = '';
        let cep = '';

        addressComponents.forEach((component: any) => {
          const types = component.types;
          if (types.includes('route')) street = component.long_name;
          if (types.includes('street_number')) number = component.long_name;
          if (types.includes('sublocality_level_1')) neighborhood = component.long_name;
          if (types.includes('postal_code')) cep = component.long_name.replace(/\D/g, '');
        });

        setFormData(prev => ({
          ...prev,
          endereco: street.toUpperCase() || prev.endereco,
          numeroCasa: number.toUpperCase() || prev.numeroCasa,
          bairro: neighborhood.toUpperCase() || prev.bairro,
          cep: cep || prev.cep
        }));

        const lat = place.geometry.location.lat();
        const lon = place.geometry.location.lng();
        handleGetLocation(undefined, { lat, lon });
      });
    }
  }, [checkoutStep, config.storeCoords]);

  const handleUpgradeToCombo = (itemId: string) => {
    const item = cart.find(i => i.id === itemId);
    if (item) {
      setSelectedProductForDrink({
        product: item,
        price: item.price + 12,
        isCombo: true,
        addons: item.addons || [],
        cartItemId: itemId
      });
      setSelectedDrink('');
    }
  };

  const handleAddAddonToCartItem = (itemId: string, addon: { name: string; price: number }) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const alreadyHas = item.addons?.some(a => a.name === addon.name);
        if (alreadyHas) return item;
        return {
          ...item,
          price: item.price + addon.price,
          addons: [...(item.addons || []), addon]
        };
      }
      return item;
    }));
    showToast(`${addon.name} Adicionado!`, "success");
  };

  const handleFinalizeOrder = async () => {
    if (!formData.nome || !formData.whatsapp || !formData.cep || !formData.endereco) {
      showToast("Preencha todos os campos obrigatórios (Nome, WhatsApp, CEP e Endereço).", "error");
      return;
    }

    if (userDistance === null && (!formData.endereco || formData.endereco.length < 5)) {
      showToast("Use o nome da rua igual ao Google Maps para calcular o frete correto.", "error");
      return;
    }

    setIsSubmitting(true);
    
    // Timeout de segurança para não travar o botão
    const timeout = setTimeout(() => {
      if (isSubmitting) {
        setIsSubmitting(false);
        showToast("Tempo de resposta excedido. Tente novamente.", "error");
      }
    }, 15000);

    try {
      const comanda = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Inteligência Fiscal: Separação de itens para ST (Substituição Tributária) no Admin
      const processedItens = cart.flatMap(i => {
        if (i.isCombo) {
          return [
            { 
              id: i.id, 
              name: i.name.toUpperCase(), 
              qtd: i.quantity, 
              price: i.price - 12,
              category: i.category,
              isComboPart: true,
              isCombo: true,
              addons: i.addons,
              bebida: i.bebida
            },
            {
              id: `upgrade_${i.id}`,
              name: `UPGRADE COMBO (BATATA + ${i.bebida || 'REFRI'})`,
              qtd: i.quantity,
              price: 12,
              category: 'Acompanhamento',
              isComboUpgrade: true,
              hasST: true,
              bebida: i.bebida
            }
          ];
        }
        return [{ 
          id: i.id, 
          name: i.name.toUpperCase(), 
          qtd: i.quantity, 
          price: i.price,
          category: i.category,
          isCombo: !!i.isCombo,
          addons: i.addons,
          bebida: i.bebida
        }];
      });

      // Função para limpar campos undefined e remover campos proibidos
      const cleanOrderData = (obj: any) => {
        const forbiddenFields = ['insumos', 'inventory', 'estoque', 'ficha técnica', 'fichaTecnica'];
        const cleaned = JSON.parse(JSON.stringify(obj, (key, value) => {
          if (value === undefined) return null; // Firestore prefere null ou remover
          if (forbiddenFields.includes(key)) return undefined; // Remove campos proibidos
          return value;
        }));
        
        // Remover propriedades que ficaram undefined após o stringify
        Object.keys(cleaned).forEach(key => {
          if (cleaned[key] === undefined) delete cleaned[key];
        });
        
        return cleaned;
      };

      const orderData = {
        ...cleanOrderData({
          numeroComanda: comanda || '0000',
          itens: (processedItens || []).map(item => ({
            id: item.id || 'unknown',
            name: item.name || 'ITEM SEM NOME',
            qtd: item.qtd || 1,
            price: item.price || 0,
            category: item.category || 'GERAL',
            isCombo: !!item.isCombo,
            addons: item.addons || [],
            bebida: item.bebida || null,
            obsExtras: item.obsExtras || []
          })),
          total: finalTotal || 0,
          subtotal: subtotal || 0,
          taxaEntrega: deliveryFee || 0,
          taxas: paymentAdjustment || 0,
          status: OrderStatus.PENDING,
          pagamento: paymentMethod || 'PIX',
          trocoPara: paymentMethod === PaymentMethod.CASH ? trocoPara : null,
          customerName: formData.nome || 'CLIENTE',
          customerPhone: formData.whatsapp || '',
          address: `${formData.endereco || ''}, ${formData.numeroCasa || ''} - ${formData.bairro || ''} (CEP: ${formData.cep || ''})`,
          cliente: {
            nome: formData.nome || 'CLIENTE',
            whatsapp: formData.whatsapp || '',
            endereco: formData.endereco || '',
            numeroCasa: formData.numeroCasa || '',
            cep: formData.cep || '',
            bairro: formData.bairro || '',
            referencia: formData.referencia || '',
            observacao: formData.observacao || ''
          },
          createdAt: Date.now()
        }) as any,
        dataCriacao: serverTimestamp()
      };

      console.log("DADOS DO PEDIDO PARA FIREBASE (LIMPOS):", orderData);

      const docRef = await addDoc(collection(db, 'pedidos'), orderData);
      
      // Meta Pixel: Track Purchase
      if ((window as any).fbq) {
        (window as any).fbq('track', 'Purchase', {
          value: finalTotal,
          currency: 'BRL',
          content_ids: cart.map(i => i.id),
          content_type: 'product'
        });
      }

      clearTimeout(timeout);
      setLastOrderComanda(comanda);
      setLastOrderId(docRef.id);
      setCheckoutStep('success');
      setCart([]);

      // Redirecionamento para WhatsApp
      const storePhone = config.whatsappNumber || '5592999999999'; // Fallback para Manaus se não configurado
      let msg = `🍔 *NOVO PEDIDO SK BURGERS - #${comanda}*\n\n`;
      msg += `👤 *CLIENTE:* ${formData.nome}\n`;
      msg += `📱 *WHATSAPP:* ${formData.whatsapp}\n`;
      msg += `📍 *ENDEREÇO:* ${formData.endereco}, ${formData.numeroCasa} - ${formData.bairro}\n`;
      msg += `📮 *CEP:* ${formData.cep}\n`;
      if (formData.referencia) msg += `📌 *REF:* ${formData.referencia}\n`;
      
      const trackUrl = `${window.location.origin}/#/track/${docRef.id}`;
      msg += `\n🛰️ *ACOMPANHE SEU PEDIDO:* ${trackUrl}\n`;

      msg += `\n🛒 *ITENS:*\n`;
      
      cart.forEach(item => {
        msg += `• ${item.quantity}x ${item.name.toUpperCase()}${item.isCombo ? ' [COMBO]' : ''}\n`;
        if (item.bebida) msg += `  🥤 BEBIDA: ${item.bebida}\n`;
        if (item.addons && item.addons.length > 0) {
          item.addons.forEach(a => msg += `  + ${a.name}\n`);
        }
      });

      msg += `\n💰 *TOTAL:* ${formatCurrency(finalTotal)}\n`;
      msg += `💳 *PAGAMENTO:* ${paymentMethod}\n`;
      if (paymentMethod === PaymentMethod.CASH && trocoPara) {
        msg += `💵 *TROCO PARA:* ${trocoPara}\n`;
      }
      if (formData.observacao) msg += `\n📝 *OBS:* ${formData.observacao}`;

      const whatsappUrl = `https://wa.me/${storePhone}?text=${encodeURIComponent(msg)}`;
      
      // Pequeno delay para o usuário ver a tela de sucesso antes do redirect
      setTimeout(() => {
        // Usar window.location.href para iOS/Android evita bloqueio de popups
        window.location.href = whatsappUrl;
      }, 1500);

    } catch (error: any) {
      clearTimeout(timeout);
      console.error("Erro ao salvar pedido:", error);
      showToast(`Erro: ${error.message || "Falha ao enviar"}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-32 relative">
      {/* Background Image Overlay */}
      <div 
        className="fixed inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'url("https://i.postimg.cc/6p19JCWR/Gemini-Generated-Image-u73pfku73pfku73p-(1)-(1).png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      />
      
      <div className="relative z-10">
        <header className="glass px-4 md:px-6 py-4 md:py-6">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={onBack} className="p-2 bg-zinc-900 rounded-xl text-zinc-400">
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                <img 
                  src="https://i.postimg.cc/6p19JCWR/Gemini-Generated-Image-u73pfku73pfku73p-(1)-(1).png" 
                  alt="SK LOGO" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <p className="text-[8px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-wider">CARDÁPIO PREMIUM</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Botão de Carrinho removido daqui para ser flutuante */}
          </div>
        </div>

        {/* Banner de Promoção do Dia */}
        {config.promoText && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-yellow-500 p-4 rounded-2xl flex items-center gap-4 shadow-xl shadow-yellow-500/10"
          >
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-yellow-500 shrink-0">
              <Flame size={20} fill="currentColor" />
            </div>
            <div>
              <p className="text-[8px] font-black text-black/60 uppercase tracking-widest">Promoção do Dia</p>
              <p className="text-sm font-black text-black uppercase italic leading-tight">{config.promoText}</p>
            </div>
          </motion.div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === cat 
                ? 'bg-yellow-500 text-black' 
                : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <main className="p-6 space-y-8">
        {/* Seção de Combos em Destaque */}
        {activeCategory === 'TODOS' && featuredCombos.length > 0 && !searchQuery && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Flame size={18} className="text-yellow-500" />
                <h2 className="text-xs font-black text-white uppercase tracking-[0.3em] italic">Combos em Destaque</h2>
              </div>
              <span className="text-[8px] font-black text-yellow-500 uppercase tracking-widest bg-yellow-500/10 px-2 py-1 rounded-full border border-yellow-500/20">Melhor Custo-Benefício</span>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
              {featuredCombos.map((p) => (
                <motion.div 
                  key={p.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAddToCartClick(p)}
                  className="min-w-[280px] bg-zinc-900/80 border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col group relative shadow-2xl shadow-black/50 cursor-pointer touch-manipulation"
                >
                  <div className="absolute top-4 left-4 z-10">
                    <span className="bg-yellow-500 text-black text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-xl">COMBO</span>
                  </div>
                  <div className="h-40 w-full relative">
                    {p.image ? (
                      <img src={p.image} className="w-full h-full object-cover brightness-75 group-hover:brightness-100 transition-all duration-500" alt={p.name} referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-700">
                        <Utensils size={40} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                  </div>
                  <div className="p-6 space-y-2 -mt-10 relative z-20">
                    <h3 className="text-lg font-black text-white uppercase italic tracking-tighter leading-tight">{p.name}</h3>
                    <p className="text-zinc-500 text-[10px] font-bold leading-relaxed">
                      {p.description}
                    </p>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex flex-col">
                        <span className="text-zinc-600 text-[8px] font-black uppercase tracking-widest line-through">{formatCurrency(p.price * 1.2)}</span>
                        <span className="text-yellow-500 font-black text-xl italic">{formatCurrency(p.price)}</span>
                      </div>
                      <div className="w-10 h-10 bg-yellow-500 rounded-2xl flex items-center justify-center text-black shadow-lg shadow-yellow-500/20 group-hover:scale-110 transition-transform">
                        <Plus size={24} strokeWidth={3} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {loadingProducts ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-yellow-500" size={32} />
              <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Aquecendo a chapa...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 opacity-30">
              <Utensils size={40} className="mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Nenhum item encontrado</p>
            </div>
          ) : (
            filteredProducts.map((p, index) => (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleAddToCartClick(p)}
                  className="glass-card flex gap-4 !p-3 group relative overflow-hidden cursor-pointer touch-manipulation active:scale-[0.98] transition-all"
                >
                    {p.category.toUpperCase().includes('COMBO') && (
                      <div className="absolute -right-8 top-4 rotate-45 bg-yellow-500 text-black text-[7px] font-black px-10 py-1 uppercase tracking-widest shadow-xl z-10">
                        COMBO
                      </div>
                    )}
                    <div className="w-24 h-24 bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0 relative">
                      {p.image ? (
                        <img 
                          src={p.image} 
                          alt={p.name} 
                          className="w-full h-full object-cover brightness-90 group-hover:brightness-110 group-hover:scale-105 transition-all duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                          <Utensils size={32} />
                        </div>
                      )}
                    </div>
                  <div className="flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white uppercase italic text-sm">{p.name}</h3>
                        {!(p.category.toLowerCase().includes('bebida') || p.category.toLowerCase().includes('sobremesa')) && (
                          <span className="bg-yellow-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded-full border border-yellow-500/20 uppercase tracking-widest">Combo Incluso</span>
                        )}
                      </div>
                      <p className="text-zinc-500 text-[10px] mt-1 leading-relaxed">
                        {p.description}
                        {!(p.category.toLowerCase().includes('bebida') || p.category.toLowerCase().includes('sobremesa')) && (
                          <span className="text-yellow-500 font-bold block mt-1">🍟 + 🥤 Inclusos</span>
                        )}
                      </p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex flex-col leading-none">
                        <span className="text-yellow-500 font-black text-base italic">
                          {formatCurrency(
                            (p.category.toLowerCase().includes('bebida') || p.category.toLowerCase().includes('sobremesa') || p.category.toLowerCase().includes('acompanhamento')) 
                            ? p.price 
                            : (p.priceCombo || p.price + 12)
                          )}
                        </span>
                        {!(p.category.toLowerCase().includes('bebida') || p.category.toLowerCase().includes('sobremesa') || p.category.toLowerCase().includes('acompanhamento')) && (
                          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mt-0.5">Preço do Combo Completo</span>
                        )}
                      </div>
                      <button 
                        className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center text-black active:scale-90 transition-all shadow-lg shadow-yellow-500/10 group-hover:bg-yellow-400 touch-manipulation"
                      >
                        <Plus className="w-6 h-6" strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
          )}
        </div>
      </main>

      {/* MODAL DO CARRINHO / CHECKOUT */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col"
          >
            <header className="p-6 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsCartOpen(false)} className="p-2 bg-zinc-900 rounded-xl text-zinc-400">
                  <X size={20} />
                </button>
                <h2 className="text-xl font-black text-white uppercase italic">Seu Pedido</h2>
              </div>
              {checkoutStep === 'cart' && cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-red-500 text-[10px] font-black uppercase tracking-widest">Limpar</button>
              )}
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              {checkoutStep === 'cart' && (
                <>
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-700">
                        <ShoppingCart size={40} />
                      </div>
                      <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em]">Seu carrinho está vazio</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cart.map(item => (
                        <div key={item.id} className="bg-zinc-900/50 border border-white/5 p-4 rounded-3xl flex items-center gap-4">
                          <div className="w-16 h-16 bg-zinc-800 rounded-2xl overflow-hidden">
                            {allProducts.find(p => p.id === item.id)?.image ? (
                              <img src={allProducts.find(p => p.id === item.id)?.image} className="w-full h-full object-cover" alt={item.name} referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                <Utensils size={20} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-black uppercase text-xs italic flex items-center gap-2">
                              {item.name}
                              {item.isCombo && (
                                <span className="bg-emerald-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-md not-italic">COMBO</span>
                              )}
                            </h4>
                            {item.addons && item.addons.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.addons.map((a, i) => (
                                  <span key={i} className="text-[8px] bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded border border-orange-500/20 uppercase font-black flex items-center gap-1">
                                    {getAddonEmoji(a.name)} {a.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            {item.bebida && (
                              <p className="text-[9px] font-black text-yellow-500 uppercase tracking-widest mt-1 italic">🥤 {item.bebida}</p>
                            )}
                            <p className="text-orange-500 font-black text-sm mt-1">{formatCurrency(item.price)}</p>
                          </div>
                          <div className="flex items-center gap-3 bg-black/40 p-1 rounded-xl border border-white/5">
                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 hover:text-white text-zinc-500 transition-colors">
                              <Minus size={14} />
                            </button>
                            <span className="text-xs font-black text-white w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 hover:text-white text-zinc-500 transition-colors">
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Removido CartUpsell daqui para evitar duplicidade e sobreposição */}
                    </div>
                  )}
                </>
              )}

              {checkoutStep === 'form' && (
                <div key="checkout-form" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Informações de Entrega</h3>
                    <div className="space-y-3">
                      {/* Alerta de Precisão de Endereço */}
                      <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
                        <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={18} />
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Atenção ao Endereço</p>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase leading-relaxed">
                            Para o cálculo correto do frete, escreva o nome da rua <span className="text-white">exatamente como aparece no Google Maps</span>. 
                            Se o CEP não localizar, digite o nome da rua e bairro manualmente.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="relative">
                          <input 
                            type="tel"
                            inputMode="numeric"
                            autoComplete="postal-code"
                            placeholder="CEP (OBRIGATÓRIO PARA CALCULAR FRETE)"
                            value={formData.cep}
                            onChange={e => handleCepChange(e.target.value)}
                            maxLength={8}
                            className="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl text-white font-black text-base outline-none focus:border-yellow-500 transition-all"
                          />
                          {isSearchingCep && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                              <Loader2 className="animate-spin text-yellow-500" size={16} />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <input 
                            ref={addressInputRef}
                            placeholder="RUA (IGUAL AO GOOGLE MAPS)"
                            value={formData.endereco}
                            onChange={e => setFormData({...formData, endereco: e.target.value.toUpperCase()})}
                            onBlur={() => {
                              if (formData.endereco.length > 5 && formData.numeroCasa && !isLocating) {
                                handleGetLocation(`${formData.endereco}, ${formData.numeroCasa}, ${formData.bairro}, CEP ${formData.cep}`);
                              }
                            }}
                            className="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl text-white font-black text-base outline-none focus:border-yellow-500 transition-all"
                          />
                          <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-1">
                            💡 Use o nome da rua igual ao Google Maps para calcular o frete correto.
                          </p>
                        </div>
                        <input 
                          placeholder="Nº DA CASA"
                          value={formData.numeroCasa}
                          onChange={e => setFormData({...formData, numeroCasa: e.target.value.toUpperCase()})}
                          onBlur={() => {
                            if (formData.endereco.length > 5 && formData.numeroCasa && !isLocating) {
                              handleGetLocation(`${formData.endereco}, ${formData.numeroCasa}, ${formData.bairro}, CEP ${formData.cep}`);
                            }
                          }}
                          className="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl text-white font-black text-base outline-none focus:border-yellow-500 transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input 
                          placeholder="BAIRRO"
                          value={formData.bairro}
                          onChange={e => setFormData({...formData, bairro: e.target.value.toUpperCase()})}
                          onBlur={() => {
                            if (formData.endereco.length > 5 && formData.numeroCasa && !isLocating) {
                              handleGetLocation(`${formData.endereco}, ${formData.numeroCasa}, ${formData.bairro}, CEP ${formData.cep}`);
                            }
                          }}
                          className="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl text-white font-black text-base outline-none focus:border-yellow-500 transition-all"
                        />
                        <input 
                          placeholder="REFERÊNCIA"
                          value={formData.referencia}
                          onChange={e => setFormData({...formData, referencia: e.target.value.toUpperCase()})}
                          className="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl text-white font-black text-base outline-none focus:border-yellow-500 transition-all"
                        />
                      </div>

                      <input 
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        placeholder="WHATSAPP (DDD + NÚMERO) (OBRIGATÓRIO)"
                        value={formData.whatsapp}
                        onChange={e => setFormData({...formData, whatsapp: e.target.value.replace(/\D/g, '')})}
                        className="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl text-white font-black text-base outline-none focus:border-yellow-500 transition-all"
                      />

                      <input 
                        placeholder="SEU NOME COMPLETO (OBRIGATÓRIO)"
                        value={formData.nome}
                        onChange={e => setFormData({...formData, nome: e.target.value.toUpperCase()})}
                        className="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl text-white font-black text-base outline-none focus:border-yellow-500 transition-all"
                      />

                      <textarea 
                        placeholder="OBSERVAÇÕES (EX: PONTO DE REFERÊNCIA, SE O CEP DEU ERRADO DESCREVA AQUI)"
                        value={formData.observacao}
                        onChange={e => setFormData({...formData, observacao: e.target.value.toUpperCase()})}
                        className="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl text-white font-black text-base outline-none focus:border-yellow-500 transition-all h-24 resize-none"
                      />

                      {mapUrl && (
                        <div className="w-full h-40 rounded-2xl overflow-hidden border border-white/5 bg-zinc-900 animate-in fade-in duration-500">
                          <iframe 
                            width="100%" 
                            height="100%" 
                            frameBorder="0" 
                            scrolling="no" 
                            marginHeight={0} 
                            marginWidth={0} 
                            src={mapUrl}
                            title="Mapa de Entrega"
                            className="grayscale opacity-70 contrast-125"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {isLocating && (
                        <div className="w-full py-4 bg-zinc-900/50 border border-yellow-500/20 rounded-xl flex items-center justify-center gap-3">
                          <Loader2 size={16} className="animate-spin text-yellow-500" />
                          <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Calculando Entrega...</span>
                        </div>
                      )}
                      
                      {!isLocating && userDistance !== null && (
                        <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center gap-3">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Distância: {userDistance.toFixed(1)}km</span>
                        </div>
                      )}
                    </div>
                    
                    {isOutOfRange && (
                      <p className="text-[10px] font-black text-red-500 uppercase text-center animate-bounce">
                        ⚠️ Desculpe, seu endereço está fora da nossa área de entrega.
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Como vai pagar?</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { id: PaymentMethod.PIX, icon: <Smartphone size={18} />, label: 'PIX', color: 'border-emerald-500/30' },
                        { id: PaymentMethod.CREDIT, icon: <CreditCard size={18} />, label: 'CRÉDITO', color: 'border-white/5' },
                        { id: PaymentMethod.DEBIT, icon: <CreditCard size={18} />, label: 'DÉBITO', color: 'border-white/5' },
                        { id: PaymentMethod.CASH, icon: <Banknote size={18} />, label: 'DINHEIRO', color: 'border-white/5' },
                        { id: PaymentMethod.SODEXO, icon: <CreditCard size={18} />, label: 'SODEXO (+10%)', color: 'border-white/5' },
                        { id: PaymentMethod.ALELO, icon: <CreditCard size={18} />, label: 'ALELO (+10%)', color: 'border-white/5' }
                      ].map((m) => (
                        <button 
                          key={m.id}
                          onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                          className={`p-5 rounded-2xl border flex flex-col items-center gap-3 transition-all ${paymentMethod === m.id ? 'bg-yellow-500 border-yellow-500 text-black' : `bg-zinc-900 text-zinc-400 ${m.color}`}`}
                        >
                          {m.icon}
                          <span className="text-[10px] font-black">{m.label}</span>
                        </button>
                      ))}
                    </div>

                    {paymentMethod === PaymentMethod.CASH && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2 animate-in fade-in slide-in-from-top-2"
                      >
                        <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Precisa de troco para quanto?</label>
                        <input 
                          type="text"
                          placeholder="Ex: R$ 50,00 (Deixe vazio se não precisar)"
                          value={trocoPara}
                          onChange={(e) => setTrocoPara(e.target.value)}
                          className="w-full bg-zinc-900 border border-white/5 p-5 rounded-2xl text-white font-black text-base outline-none focus:border-yellow-500 transition-all"
                        />
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              {checkoutStep === 'success' && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-8 animate-in zoom-in-95">
                  <div className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20">
                    <CheckCircle2 size={48} className="text-black" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black text-white uppercase italic">PEDIDO CONFIRMADO!</h2>
                    <p className="text-zinc-500 font-black uppercase text-xs tracking-widest mt-2">Sua comanda é a #{lastOrderComanda}</p>
                  </div>
                  <div className="bg-zinc-900 p-6 rounded-[2rem] border border-white/5 w-full">
                    <p className="text-zinc-400 text-[10px] font-bold uppercase leading-relaxed">
                      Agora é só aguardar! Em instantes nosso atendente enviará uma confirmação no seu WhatsApp.
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-3 w-full">
                    <button 
                      onClick={() => {
                        setIsCartOpen(false);
                        navigate(`/track/${lastOrderId}`);
                      }}
                      className="w-full py-6 bg-yellow-500 text-black rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3"
                    >
                      <Bike size={20} /> ACOMPANHAR PEDIDO
                    </button>

                    <button 
                      onClick={() => {
                        setIsCartOpen(false);
                        setCheckoutStep('cart');
                        onBack();
                      }}
                      className="w-full py-6 bg-zinc-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest"
                    >
                      VOLTAR PARA O INÍCIO
                    </button>
                  </div>
                </div>
              )}
            </div>

            {checkoutStep !== 'success' && cart.length > 0 && (
              <footer className="p-4 pb-safe bg-zinc-950 border-t border-white/10 flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <CartUpsell 
                    cart={cart} 
                    allProducts={allProducts} 
                    config={config}
                    onAdd={addToCart}
                    onUpgrade={handleUpgradeToCombo}
                    onAddAddon={handleAddAddonToCartItem}
                  />
                  
                  <CartQuickSides 
                    products={quickSides}
                    onAdd={addToCart}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-zinc-500 font-black text-[9px] uppercase px-1">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500 font-black text-[9px] uppercase px-1">
                    <span>Entrega ({userDistance !== null ? `${userDistance.toFixed(1)}km` : '---'})</span>
                    <span className={userDistance === null ? "text-zinc-600" : (isOutOfRange ? "text-red-500" : "text-orange-500")}>
                      {isLocating ? 'CALCULANDO...' : (userDistance === null ? 'AGUARDANDO ENDEREÇO' : (isOutOfRange ? 'NÃO ENTREGAMOS' : formatCurrency(deliveryFee)))}
                    </span>
                  </div>
                  {paymentAdjustment !== 0 && (
                    <div className="flex justify-between text-zinc-500 font-black text-[9px] uppercase italic px-1">
                      <span>{paymentAdjustment < 0 ? 'Desconto Pagamento' : 'Ajuste Pagamento'}</span>
                      <span className={paymentAdjustment < 0 ? 'text-emerald-500' : ''}>{formatCurrency(paymentAdjustment)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-white font-black text-xl italic pt-2 border-t border-white/5 px-1">
                    <span>TOTAL</span>
                    <span className="text-yellow-500">{formatCurrency(finalTotal)}</span>
                  </div>
                </div>

                {checkoutStep === 'cart' ? (
                  <button 
                    onClick={() => setCheckoutStep('form')}
                    disabled={cart.length === 0}
                    className="w-full py-5 bg-yellow-500 rounded-[2rem] font-black text-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30"
                  >
                    AVANÇAR PARA ENTREGA <ChevronRight size={20} />
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setCheckoutStep('cart')}
                      className="p-5 bg-zinc-900 text-white rounded-2xl"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <button 
                      onClick={handleFinalizeOrder}
                      disabled={isSubmitting || isOutOfRange || isLocating}
                      className="flex-1 py-5 bg-emerald-500 rounded-[2rem] font-black text-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30 cursor-pointer touch-manipulation"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> ENVIAR PEDIDO</>}
                    </button>
                  </div>
                )}
              </footer>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE COMBO E ADICIONAIS */}
      <AnimatePresence>
        {comboItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl my-auto"
            >
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                      <Flame size={20} className="text-black" fill="currentColor" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase italic tracking-tighter leading-none">Personalizar</h3>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Deixe do seu jeito</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setComboItem(null); setSelectedAddons([]); }} 
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-zinc-500 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Seção de Adicionais */}
                  <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Turbine seu Burger</p>
                      <span className="text-[9px] font-bold text-yellow-500 uppercase bg-yellow-500/10 px-2 py-0.5 rounded-full">Opcional</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Botão de Destaque: CARNE EXTRA (Duplo) */}
                      {config.addons?.find(a => a.name.toUpperCase().includes('CARNE')) && (
                        <button
                          onClick={() => {
                            const carneExtra = config.addons?.find(a => a.name.toUpperCase().includes('CARNE'));
                            if (carneExtra) {
                              const isSelected = selectedAddons.some(a => a.name === carneExtra.name);
                              if (isSelected) {
                                setSelectedAddons(prev => prev.filter(a => a.name !== carneExtra.name));
                              } else {
                                setSelectedAddons(prev => [...prev, carneExtra]);
                              }
                            }
                          }}
                          className={`col-span-2 p-5 rounded-[2rem] border-2 transition-all relative overflow-hidden group active:scale-95 flex items-center justify-between ${
                            selectedAddons.some(a => a.name.toUpperCase().includes('CARNE'))
                            ? 'bg-orange-600 border-orange-400 text-white shadow-lg shadow-orange-500/30' 
                            : 'bg-zinc-800/60 border-orange-500/30 text-zinc-300 hover:border-orange-500'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedAddons.some(a => a.name.toUpperCase().includes('CARNE')) ? 'bg-white/20' : 'bg-orange-500/20'}`}>
                              <span className="text-xl">🥩</span>
                            </div>
                            <div className="text-left">
                              <p className="text-[11px] font-black uppercase italic tracking-tighter">Transformar em Duplo</p>
                              <p className="text-[9px] font-bold opacity-70 uppercase">Blend 120g + 2 Fatias de Queijo</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black">+ {formatCurrency(config.addons?.find(a => a.name.toUpperCase().includes('CARNE'))?.price || 8)}</p>
                            {selectedAddons.some(a => a.name.toUpperCase().includes('CARNE')) && <CheckCircle2 size={16} className="ml-auto mt-1" />}
                          </div>
                          
                          {/* Efeito de brilho animado para atrair o olhar */}
                          {!selectedAddons.some(a => a.name.toUpperCase().includes('CARNE')) && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
                          )}
                        </button>
                      )}

                      {config.addons?.filter(a => !a.name.toUpperCase().includes('CARNE')).map((addon, idx) => {
                        const isSelected = selectedAddons.some(a => a.name === addon.name);

                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedAddons(prev => prev.filter(a => a.name !== addon.name));
                              } else {
                                setSelectedAddons(prev => [...prev, addon]);
                              }
                            }}
                            className={`p-4 rounded-[1.5rem] border text-left transition-all relative overflow-hidden group active:scale-95 ${
                              isSelected 
                              ? 'bg-yellow-500 border-yellow-500 text-black shadow-lg shadow-yellow-500/30' 
                              : 'bg-zinc-800/40 border-white/5 text-zinc-400 hover:border-white/20 hover:bg-zinc-800/60'
                            }`}
                          >
                            <div className="relative z-10 flex flex-col h-full justify-between">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-lg">{getAddonEmoji(addon.name)}</span>
                                {isSelected ? (
                                  <CheckCircle2 size={14} className="text-black" fill="currentColor" />
                                ) : (
                                  <Plus size={14} className="text-zinc-600 group-hover:text-yellow-500 transition-colors" />
                                )}
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase leading-tight tracking-tight">{addon.name}</p>
                                <p className={`text-[9px] font-bold mt-0.5 ${isSelected ? 'text-black/70' : 'text-yellow-500'}`}>
                                  + {formatCurrency(addon.price)}
                                </p>
                              </div>
                            </div>
                            
                            {/* Efeito de brilho no hover */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
                
                <div className="space-y-3 pt-4">
                  <button 
                    onClick={() => {
                      const addonTotal = selectedAddons.reduce((acc, a) => acc + a.price, 0);
                      setSelectedProductForDrink({
                        product: comboItem,
                        price: comboItem.price + addonTotal,
                        isCombo: true,
                        addons: selectedAddons
                      });
                      setSelectedDrink('');
                      setComboItem(null);
                      setSelectedAddons([]);
                    }}
                    className="w-full bg-yellow-500 text-black py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest hover:bg-yellow-400 transition-all shadow-xl shadow-yellow-500/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} fill="currentColor" /> CONFIRMAR COMBO
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE SELEÇÃO DE BEBIDA (COMBO) */}
      <AnimatePresence>
        {selectedProductForDrink && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl my-auto"
            >
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                      <Utensils size={20} className="text-yellow-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Combo Especial SK 🍔🍟🥤</h3>
                      <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Hambúrguer + Batata Média + Bebida</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedProductForDrink(null)} className="text-zinc-500">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="ml-2">
                    <p className="text-[10px] font-black uppercase text-yellow-500 tracking-widest">Escolha sua bebida (Obrigatório):</p>
                  </div>
                  
                  <div className="space-y-2">
                    {availableDrinks.length > 0 ? (
                      availableDrinks.map((drink) => (
                        <button
                          key={drink}
                          onClick={() => setSelectedDrink(drink)}
                          className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                            selectedDrink === drink 
                            ? 'bg-yellow-500/10 border-yellow-500 text-white' 
                            : 'bg-zinc-800/50 border-white/5 text-zinc-400 hover:border-white/10'
                          }`}
                        >
                          <span className={`text-xs font-bold uppercase ${selectedDrink === drink ? 'text-yellow-500' : ''}`}>{drink}</span>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedDrink === drink ? 'border-yellow-500 bg-yellow-500' : 'border-zinc-700'
                          }`}>
                            {selectedDrink === drink && <div className="w-2 h-2 bg-black rounded-full" />}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-8 text-center bg-zinc-800/50 rounded-2xl border border-dashed border-white/10">
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Nenhuma bebida disponível no momento</p>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  disabled={!selectedDrink}
                  onClick={() => {
                    if (selectedProductForDrink) {
                      if (selectedProductForDrink.cartItemId) {
                        setCart(prev => prev.map(item => {
                          if (item.id === selectedProductForDrink.cartItemId) {
                            return {
                              ...item,
                              price: selectedProductForDrink.price,
                              isCombo: true,
                              bebida: selectedDrink
                            };
                          }
                          return item;
                        }));
                        showToast("Upgrade para Combo realizado! 🍟🥤", "success");
                      } else {
                        addToCart({
                          ...selectedProductForDrink.product,
                          price: selectedProductForDrink.price,
                          isCombo: true,
                          addons: selectedProductForDrink.addons,
                          bebida: selectedDrink
                        });
                      }
                      setSelectedProductForDrink(null);
                      setSelectedDrink('');
                    }
                  }}
                  className="w-full bg-yellow-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-black py-6 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20 mt-4"
                >
                  {selectedProductForDrink.cartItemId ? 'CONFIRMAR UPGRADE' : `ADICIONAR AO CARRINHO (${formatCurrency(selectedProductForDrink.price)})`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Botão de Carrinho Flutuante Premium */}
      <AnimatePresence>
        {cart.length > 0 && !isCartOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-8 left-0 right-0 z-[150] px-6 flex justify-center pointer-events-none"
          >
            <button 
              onClick={() => setIsCartOpen(true)}
              className="pointer-events-auto w-full max-w-md bg-yellow-500 text-black py-6 rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-[0_20px_60px_-15px_rgba(234,179,8,0.6)] flex items-center justify-between px-10 group active:scale-95 transition-all border-4 border-black/10"
            >
              <div className="flex items-center gap-5">
                <div className="relative">
                  <ShoppingCart size={28} strokeWidth={4} />
                  <span className="absolute -top-3 -right-3 bg-black text-yellow-500 text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-yellow-500 shadow-xl">
                    {cart.reduce((acc, i) => acc + i.quantity, 0)}
                  </span>
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[10px] font-black text-black/40 tracking-widest">SEU PEDIDO</span>
                  <span className="text-sm italic">VER CARRINHO</span>
                </div>
              </div>
              <div className="flex flex-col items-end leading-none">
                <span className="text-[10px] font-black text-black/40 tracking-widest">TOTAL</span>
                <span className="text-xl font-black italic">
                  {formatCurrency(cart.reduce((acc, i) => acc + (i.price * i.quantity), 0))}
                </span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

export default Menu;
