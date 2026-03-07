# SK Burgers - Sistema de Gestão Premium (Manaus) 🍔

Sistema completo de gestão para hamburguerias, desenvolvido com foco em alta performance, design premium (Glassmorphism) e resiliência para operações em Manaus/AM.

## 🚀 Tecnologias
- **Frontend:** React 19 + Vite
- **Styling:** Tailwind CSS 4 (Design Industrial/Dark Mode)
- **Backend/Database:** Firebase (Firestore)
- **IA:** Google Gemini API (CEO Insights)
- **Animações:** Motion (Framer Motion)
- **Ícones:** Lucide React

## 🛠️ Funcionalidades
- **App do Cliente:** Cardápio digital com geolocalização (raio de 5.5km), upsell inteligente e checkout via WhatsApp.
- **Painel Administrativo:** Dashboard com cálculo de lucro real (descontando taxas de gateway, CMV e diárias), metas diárias e insights gerados por IA.
- **KDS (Cozinha):** Sistema de tickets em tempo real com alertas visuais para pedidos atrasados.
- **App do Entregador:** Gestão de rotas otimizadas via Google Maps e confirmação de entrega por GPS.

## 📦 Como rodar o projeto localmente

1. **Clone o repositório:**
   ```bash
   git clone <url-do-seu-repositorio>
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env` na raiz e adicione suas chaves do Firebase e Gemini:
   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   GEMINI_API_KEY=...
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

## 📐 Estrutura de Custos (Manaus)
O sistema já vem pré-configurado com a realidade logística de Manaus:
- **Taxas:** Pix (-5%), Sodexo (+10%).
- **Diárias:** Motoboy (R$ 30,00), Chapeiro (R$ 56,66).
- **Logística:** Bloqueio automático fora do raio de 5.5km do bairro Nova Cidade.

---
Desenvolvido com foco em lucratividade e experiência do usuário.
