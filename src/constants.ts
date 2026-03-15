export const LOJA_COORDS = { lat: -3.043288, lng: -59.963138 };
export const LOJA_CEP = "69098-420";
export const LOJA_BAIRRO = "Nucleo 16";

/** * Limite de Entrega: 5.5km
 * Abrange bem o Nucleo 16 e partes do Cidade Nova / Monte das Oliveiras.
 */
export const MAX_DELIVERY_RADIUS_KM = 5.5;

// Custos Operacionais Fixos (Diárias)
export const STAFF_COSTS = {
  MOTOBOY: 30.00,
  CHAPEIRO: 56.66,
  APOIO: 40.00 // Sugestão: Ter um custo para auxiliar de cozinha
};

// Aliases para compatibilidade
export const DIARIA_MOTOBOY = STAFF_COSTS.MOTOBOY;
export const DIARIA_CHAPEIRO = STAFF_COSTS.CHAPEIRO;
export const META_DIARIA = 400;

/**
 * PAYMENT_ADJUSTMENTS: O que o cliente vê/paga.
 * Ex: 0 significa sem ajuste.
 */
export const PAYMENT_ADJUSTMENTS: Record<string, number> = {
  PIX: 0,
  CASH: 0,
  DEBIT: 0,
  CREDIT: 0,
  SODEXO: 0.10,
  ALELO: 0.10,
};

/**
 * GATEWAY_FEES: O custo real que sai do seu bolso.
 * Útil para calcular o lucro líquido real no Dashboard Admin.
 */
export const GATEWAY_FEES: Record<string, number> = {
  PIX: 0,
  CASH: 0,
  DEBIT: 0.0199, // Ajustado para taxa média de mercado 2026
  CREDIT: 0.0349, // Ajustado para crédito à vista
  SODEXO: 0.10,
  ALELO: 0.10,
};
