
export interface Client {
  id: number;
  name: string;
  cpf_cnpj: string;
  credit_limit: number;
  // closing_day removed
  current_debt: number;
  active: boolean;
}

export interface Supplier {
  id: number;
  name: string;
  contact: string;
}

export interface Product {
  id: number;
  description: string;
  current_stock: number;
  average_cost: number;
  sell_price: number;
  unit: string;
}

export interface StockEntry {
  id: number;
  product_id: number;
  supplier_id: number;
  date: string;
  quantity: number;
  cost_product: number;
  cost_freight: number;
  cost_tolls: number;
  cost_food: number;
  final_unit_cost: number;
  due_date?: string; // Data de Vencimento do Boleto/Pagamento
}

export type PaymentMethod = 'DINHEIRO' | 'PIX' | 'CHEQUE' | 'ROTATIVO';
export type CheckStatus = 'CUSTODIA' | 'COMPENSADO' | 'DEVOLVIDO' | 'CANCELADO';
export type SaleStatus = 'CONCLUIDA' | 'CANCELADA' | 'CHEQUE_DEVOLVIDO';

export interface SaleItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  applied_cost: number; // For DRE
  total: number;
}

export interface Sale {
  id: number;
  client_id: number;
  client_name: string;
  date: string; // ISO string
  due_date?: string; // Data de Vencimento
  total: number;
  payment_method: PaymentMethod;
  items: SaleItem[];
  status?: SaleStatus; // Campo novo
}

export interface Check {
  id: number;
  client_id: number;
  client_name: string;
  origin_sale_id?: number;
  bank: string;
  number: string;
  amount: number;
  due_date: string;
  status: CheckStatus;
  updated_at: string;
}

export interface FinancialMovement {
  id: number;
  date: string;
  type: 'ENTRADA' | 'SAIDA';
  amount: number;
  category: string;
  description: string;
  payment_method: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
}

export interface Expense {
  id: number;
  supplier_id?: number;
  description: string;
  amount: number;
  competence_date: string;
  payment_date?: string;
  status: 'ABERTO' | 'PAGO';
  category: string;
}
