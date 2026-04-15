export enum UserRole {
  ADMIN = 'ADMIN',
  OPERATIONAL = 'OPERATIONAL',
  CUSTOMER = 'CUSTOMER'
}

export enum PaymentMethod {
  PIX = 'PIX',
  SODEXO = 'SODEXO',
  CASH = 'CASH',
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
  ALELO = 'ALELO'
}

export interface DeliveryRule {
  maxKm: number;
  price: number;
}

export interface StoreConfig {
  dailyGoal: number;
  whatsappNumber: string;
  rainMode: boolean;
  overloadMode: boolean;
  aberta: boolean;
  pixKey: string;
  dessertName?: string;
  dessertImage?: string;
  dessertOfferPrice: number;
  dessertSoloPrice: number;
  adminPassword?: string;
  kitchenPassword?: string;
  addons: { name: string; price: number }[];
  categories?: string[];
  promoText?: string;
  welcomeMessage?: string;
  deliveryRules?: DeliveryRule[];
  facebookPixelId?: string;
  storeCoords?: { lat: number; lng: number };
  storeAddress?: string;
  storeNumber?: string;
  storeNeighborhood?: string;
  cep?: string;
  deliveryFeeBase?: number;
  comboCategories?: string[];
  comboSurcharge?: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  priceCombo?: number | null;
  description: string;
  category: string;
  image: string;
  isPaused: boolean;
  fixedDrink?: string;
  drinkCategory?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  qtd: number;
  price: number;
  category?: string;
  addons?: { name: string; price: number }[];
  obsExtras?: string[];
  isCombo?: boolean;
  bebida?: string;
}

export enum OrderStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  READY = 'ready_for_delivery',
  DELIVERING = 'delivering',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface Order {
  id: string;
  numeroComanda: string;
  itens: OrderItem[];
  total: number;
  subtotal: number;
  taxaEntrega: number;
  taxas: number;
  status: OrderStatus;
  pagamento: PaymentMethod;
  customerName: string;
  customerPhone: string;
  address: string;
  cliente: {
    nome: string;
    bairro: string;
    whatsapp?: string;
    endereco?: string;
    totalPurchases?: number;
    coords?: { lat: number; lng: number };
  };
  createdAt: number;
  dataCriacao: any;
  preparacaoIniciadaEm?: any;
  finalizadoEm?: any;
}

