import { db } from "./firebase";
import { collection, doc, setDoc, writeBatch } from "firebase/firestore";

export const seedInitialData = async () => {
  const batch = writeBatch(db);

  // Initial Products
  const products = [
    { 
      id: 'classic', 
      name: 'SK CLASSIC BURGER', 
      price: 32.90, 
      category: 'Burgers', 
      description: 'Pão brioche, blend 150g, queijo cheddar, bacon crocante e molho especial.'
    }
  ];

  products.forEach(product => {
    const ref = doc(db, 'products', product.id);
    batch.set(ref, { ...product, isPaused: false });
  });

  // Initial Config
  const configRef = doc(db, 'config', 'store');
  batch.set(configRef, {
    dailyGoal: 400,
    whatsappNumber: '5592988192163', // Corrigido para Manaus (92)
    rainMode: false,
    overloadMode: false,
    aberta: true,
    pixKey: 'kalluangordo@gmail.com',
    dessertName: 'COPO DA FELICIDADE',
    dessertOfferPrice: 5.00,
    dessertSoloPrice: 12.00,
    adminPassword: '1214',
    kitchenPassword: '1234',
    categories: ['CLÁSSICA', 'Burgers', 'Combos', 'Bebidas', 'Acompanhamentos', 'Sobremesas'],
    addons: [
      { name: 'BACON EXTRA', price: 5.00 },
      { name: 'CARNE EXTRA', price: 8.00 },
      { name: 'QUEIJO EXTRA', price: 4.00 }
    ],
    deliveryFeeBase: 7,
    cep: '69098-420',
<<<<<<< HEAD
    storeAddress: 'Travessa Caxias',
=======
    storeAddress: 'Rua 186',
>>>>>>> c8ec29939081c38a4f443abdbd54cfb057f314b6
    storeNumber: '21',
    storeNeighborhood: 'Núcleo 16',
    storeCoords: { lat: -3.023235, lng: -59.957521 },
    deliveryRules: [
      { maxKm: 2, price: 5.00 },
      { maxKm: 4, price: 7.00 },
      { maxKm: 5.5, price: 9.00 }
    ],
<<<<<<< HEAD
    facebookPixelId: '901951425686685',
    comboCategories: ['COMBOS', 'Burgers'],
    comboSurcharge: 12
=======
    facebookPixelId: '901951425686685'
>>>>>>> c8ec29939081c38a4f443abdbd54cfb057f314b6
  }, { merge: true });

  await batch.commit();
};
