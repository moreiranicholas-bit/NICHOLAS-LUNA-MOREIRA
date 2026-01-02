import { 
  Client, Product, Supplier, Sale, Check, 
  Expense, FinancialMovement, StockEntry, SaleItem, ExpenseCategory
} from '../types';

// Initial seed data keys
const KEYS = {
  CLIENTS: 'erp_clients',
  PRODUCTS: 'erp_products',
  SUPPLIERS: 'erp_suppliers',
  SALES: 'erp_sales',
  CHECKS: 'erp_checks',
  EXPENSES: 'erp_expenses',
  MOVEMENTS: 'erp_movements',
  ENTRIES: 'erp_entries',
  EXPENSE_CATEGORIES: 'erp_expense_categories'
};

class DBService {
  constructor() {
    this.init();
  }

  private init() {
    if (!localStorage.getItem(KEYS.CLIENTS)) {
      const initialClients: Client[] = [
        { id: 1, name: 'João Silva', cpf_cnpj: '123.456.789-00', credit_limit: 1000, current_debt: 0, active: true },
        { id: 2, name: 'Maria Souza', cpf_cnpj: '987.654.321-00', credit_limit: 2000, current_debt: 150, active: true },
      ];
      localStorage.setItem(KEYS.CLIENTS, JSON.stringify(initialClients));
    }
    if (!localStorage.getItem(KEYS.PRODUCTS)) {
      const initialProducts: Product[] = [
        { id: 1, description: 'Cimento CP II', current_stock: 50, average_cost: 28.50, sell_price: 35.00, unit: 'SC' },
        { id: 2, description: 'Tijolo 8 furos', current_stock: 1000, average_cost: 0.80, sell_price: 1.20, unit: 'UN' },
      ];
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(initialProducts));
    }
    if (!localStorage.getItem(KEYS.SUPPLIERS)) {
       localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify([{ id: 1, name: 'Votorantim', contact: '11 9999-9999' }]));
    }
    if (!localStorage.getItem(KEYS.EXPENSE_CATEGORIES)) {
       const initialCategories: ExpenseCategory[] = [
         { id: 1, name: 'Água/Luz' },
         { id: 2, name: 'Aluguel' },
         { id: 3, name: 'Salários' },
         { id: 4, name: 'Manutenção' },
         { id: 5, name: 'Impostos' },
         { id: 6, name: 'Outros' }
       ];
       localStorage.setItem(KEYS.EXPENSE_CATEGORIES, JSON.stringify(initialCategories));
    }
    // Initialize empty arrays for others if not exist
    [KEYS.SALES, KEYS.CHECKS, KEYS.EXPENSES, KEYS.MOVEMENTS, KEYS.ENTRIES].forEach(key => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify([]));
    });
  }

  // --- BACKUP SYSTEM ---
  exportDatabase(): string {
    const backupData: Record<string, any> = {};
    Object.values(KEYS).forEach(key => {
      backupData[key] = this.get(key);
    });
    return JSON.stringify(backupData, null, 2);
  }

  importDatabase(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      // Basic validation: check if it has at least one known key
      const knownKeys = Object.values(KEYS);
      const hasValidKey = Object.keys(data).some(k => knownKeys.includes(k));
      
      if (!hasValidKey) return false;

      Object.keys(data).forEach(key => {
        if (knownKeys.includes(key)) {
          this.set(key, data[key]);
        }
      });
      return true;
    } catch (e) {
      console.error("Backup Restore Failed", e);
      return false;
    }
  }

  // Generic Helpers
  private get<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private set<T>(key: string, data: T[]) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // --- Clients ---
  getClients(): Client[] { 
    const list = this.get<Client>(KEYS.CLIENTS);
    // Sanitize numbers to prevent "NaN" issues in logic
    return list.map(c => ({
      ...c,
      current_debt: Number(c.current_debt) || 0,
      credit_limit: Number(c.credit_limit) || 0
    }));
  }
  
  saveClient(client: Client) {
    const list = this.getClients();
    // Ensure numbers
    client.current_debt = Number(client.current_debt) || 0;
    client.credit_limit = Number(client.credit_limit) || 0;

    if (client.id) {
      const idx = list.findIndex(c => c.id === client.id);
      if (idx >= 0) list[idx] = client;
    } else {
      client.id = Date.now();
      // Ensure new client starts with 0 if undefined
      if (client.current_debt === undefined) client.current_debt = 0;
      list.push(client);
    }
    this.set(KEYS.CLIENTS, list);
  }

  updateClientDebt(clientId: number, amountChange: number) {
    const list = this.getClients();
    const idx = list.findIndex(c => c.id === clientId);
    if (idx >= 0) {
      // Force conversion to ensure addition works (not string concat)
      const current = Number(list[idx].current_debt) || 0;
      const change = Number(amountChange) || 0;
      list[idx].current_debt = current + change;
      this.set(KEYS.CLIENTS, list);
    }
  }

  // --- Products & Inventory ---
  getProducts(): Product[] { 
    // Ensure all products have numeric values to avoid NaN
    const prods = this.get<Product>(KEYS.PRODUCTS);
    return prods.map(p => ({
      ...p,
      current_stock: Number(p.current_stock) || 0,
      average_cost: Number(p.average_cost) || 0,
      sell_price: Number(p.sell_price) || 0
    }));
  }
  
  saveProduct(product: Product) {
    const list = this.getProducts();
    // Sanitize numbers
    product.current_stock = Number(product.current_stock) || 0;
    product.average_cost = Number(product.average_cost) || 0;
    product.sell_price = Number(product.sell_price) || 0;

    if (product.id) {
      const idx = list.findIndex(p => p.id === product.id);
      if (idx >= 0) list[idx] = product;
    } else {
      product.id = Date.now();
      list.push(product);
    }
    this.set(KEYS.PRODUCTS, list);
  }

  getStockEntries(): StockEntry[] { return this.get(KEYS.ENTRIES); }

  addStockEntry(entry: StockEntry) {
    const entries = this.get<StockEntry>(KEYS.ENTRIES);
    entry.id = Date.now();
    entries.push(entry);
    this.set(KEYS.ENTRIES, entries);

    // Update Product Average Cost & Stock
    const products = this.getProducts();
    const prodIdx = products.findIndex(p => p.id === entry.product_id);
    
    if (prodIdx >= 0) {
      const p = products[prodIdx];
      
      // Safety Checks for NaN
      const currentStock = Number(p.current_stock) || 0;
      const currentAvgCost = Number(p.average_cost) || 0;
      const entryQty = Number(entry.quantity) || 0;
      const entryCost = Number(entry.final_unit_cost) || 0;

      const oldStockValue = currentStock * currentAvgCost;
      const newStockValue = entryQty * entryCost;
      const newTotalQty = currentStock + entryQty;
      
      let newAvg = currentAvgCost;

      if (newTotalQty > 0) {
         // Weighted Average
         newAvg = (oldStockValue + newStockValue) / newTotalQty;
      } else {
         // Fallback if stock is zero or negative logic
         newAvg = entryCost;
      }

      // Safety: If calculation resulted in NaN (e.g. 0/0), use entry cost
      if (isNaN(newAvg)) newAvg = entryCost;

      p.current_stock = newTotalQty;
      p.average_cost = newAvg;
      
      this.set(KEYS.PRODUCTS, products);
    }
  }

  // --- Suppliers ---
  getSuppliers(): Supplier[] { return this.get(KEYS.SUPPLIERS); }
  saveSupplier(s: Supplier) {
     const list = this.getSuppliers();
     if(s.id) {
        const idx = list.findIndex(x => x.id === s.id);
        if(idx >= 0) list[idx] = s;
     } else {
        s.id = Date.now();
        list.push(s);
     }
     this.set(KEYS.SUPPLIERS, list);
  }

  // --- Sales & POS ---
  createSale(sale: Sale): number {
    const sales = this.get<Sale>(KEYS.SALES);
    sale.id = Date.now();
    if (!sale.status) sale.status = 'CONCLUIDA'; // Default Status
    
    // Ensure Total is a number
    sale.total = Number(sale.total) || 0;

    sales.push(sale);
    this.set(KEYS.SALES, sales);

    // 1. Reduce Stock (Only if items exist and match products)
    const products = this.getProducts();
    sale.items.forEach(item => {
      // Force comparison as String to be absolutely safe against Number vs String ID mismatches
      const p = products.find(prod => String(prod.id) === String(item.product_id));
      if (p) {
        // Ensure numeric calculation for stability
        const current = Number(p.current_stock) || 0;
        const qty = Number(item.quantity) || 0;
        p.current_stock = current - qty;
      }
    });
    this.set(KEYS.PRODUCTS, products);

    // 2. Financial Impacts
    if (sale.payment_method === 'ROTATIVO') {
      this.updateClientDebt(sale.client_id, sale.total);
    } else if (sale.payment_method === 'DINHEIRO' || sale.payment_method === 'PIX') {
      this.addMovement({
        id: Date.now(),
        date: new Date().toISOString(),
        type: 'ENTRADA',
        amount: sale.total,
        category: 'Venda à Vista',
        description: `Venda #${sale.id} - ${sale.client_name}`,
        payment_method: sale.payment_method
      });
    } 
    // Checks are handled in the POS UI calling saveCheck
    
    return sale.id;
  }

  cancelSale(saleId: number): boolean {
     try {
         const sales = this.getSales();
         // ROBUST ID CHECK: Convert both to string to avoid mismatch
         const idx = sales.findIndex(s => String(s.id) === String(saleId));
         
         if (idx < 0) {
             console.error(`Sale ID ${saleId} not found in DB`);
             return false;
         }
         
         const sale = sales[idx];
         
         if (sale.status === 'CANCELADA') return false; // Already cancelled

         // 1. Reverter Estoque
         const products = this.getProducts();
         if (sale.items && Array.isArray(sale.items)) {
             sale.items.forEach(item => {
                 // Match by String ID for safety
                 const p = products.find(prod => String(prod.id) === String(item.product_id));
                 if (p) {
                    // Ensure we are doing addition of numbers
                    p.current_stock = (Number(p.current_stock) || 0) + (Number(item.quantity) || 0);
                 }
             });
             this.set(KEYS.PRODUCTS, products);
         }

         // 2. Reverter Financeiro
         if (sale.payment_method === 'ROTATIVO') {
             this.updateClientDebt(sale.client_id, -sale.total);
         } else if (sale.payment_method === 'DINHEIRO' || sale.payment_method === 'PIX') {
             this.addMovement({
                id: Date.now(),
                date: new Date().toISOString(),
                type: 'SAIDA',
                amount: sale.total,
                category: 'Estorno/Cancelamento',
                description: `Estorno Venda #${sale.id}`,
                payment_method: sale.payment_method
             });
         } else if (sale.payment_method === 'CHEQUE') {
             // Cancelar Cheque
             const checks = this.getChecks();
             const checkIdx = checks.findIndex(c => String(c.origin_sale_id) === String(sale.id));
             if (checkIdx >= 0) {
                 checks[checkIdx].status = 'CANCELADO';
                 this.set(KEYS.CHECKS, checks);
             }
         }

         // 3. Atualizar Status Venda (Create new object to ensure state change)
         const updatedSale = { ...sale, status: 'CANCELADA' as const };
         sales[idx] = updatedSale;
         
         this.set(KEYS.SALES, sales);
         return true;
     } catch (e) {
         console.error("Error cancelling sale:", e);
         return false;
     }
  }

  getSales(): Sale[] { return this.get(KEYS.SALES); }

  // --- Checks ---
  getChecks(): Check[] { return this.get(KEYS.CHECKS); }

  saveCheck(check: Check) {
    const list = this.getChecks();

    // Ensure ID exists (for new checks)
    if (!check.id) {
        check.id = Date.now();
    }
    
    // Ensure amount is a number
    check.amount = Number(check.amount);

    // Find by ID ensuring types match
    const idx = list.findIndex(c => String(c.id) === String(check.id));
    
    if (idx >= 0) {
      const oldStatus = list[idx].status;
      
      // Handle Logic Changes
      
      // 1. CUSTODIA -> COMPENSADO (Money Entry)
      if (oldStatus !== 'COMPENSADO' && check.status === 'COMPENSADO') {
         this.addMovement({
           id: Date.now(),
           // Use updated_at from check (set by UI) or current date if missing
           date: check.updated_at || new Date().toISOString(),
           type: 'ENTRADA',
           amount: check.amount,
           category: 'Compensação Cheque',
           description: `Cheque #${check.number} - ${check.client_name}`,
           payment_method: 'CHEQUE'
         });
      }

      // 2. Any -> DEVOLVIDO (Bounce logic)
      if (check.status === 'DEVOLVIDO' && oldStatus !== 'DEVOLVIDO') {
         // If it was compensated before, we must reverse the entry (SAIDA)
         if (oldStatus === 'COMPENSADO') {
            this.addMovement({
              id: Date.now(),
              date: new Date().toISOString(),
              type: 'SAIDA',
              amount: check.amount,
              category: 'Estorno Cheque',
              description: `Devolução Cheque #${check.number}`,
              payment_method: 'CHEQUE'
            });
         }
         
         // CREATE DEBT RECORD (Negative entry for client in Rotativo)
         // Create a unique ID for this debt event to avoid duplicates if something goes wrong
         const debtEventId = Date.now() + 1; 

         const fakeSale: Sale = {
            id: debtEventId,
            client_id: check.client_id,
            client_name: check.client_name,
            date: new Date().toISOString(),
            due_date: new Date().toISOString(),
            payment_method: 'ROTATIVO',
            status: 'CHEQUE_DEVOLVIDO',
            total: check.amount,
            items: [{
                product_id: 0, 
                product_name: `CHEQUE DEVOLVIDO #${check.number} (Banco: ${check.bank})`,
                quantity: 1,
                unit_price: check.amount,
                applied_cost: 0,
                total: check.amount
            }]
         };
         
         this.createSale(fakeSale);
      }

      // Update in List
      list[idx] = check;
    } else {
      // New Check (e.g. from POS or Debt Payment)
      list.push(check);
    }

    this.set(KEYS.CHECKS, list);
  }

  // --- Financial ---
  getMovements(): FinancialMovement[] { return this.get(KEYS.MOVEMENTS); }
  
  addMovement(mov: FinancialMovement) {
    const list = this.getMovements();
    list.push(mov);
    this.set(KEYS.MOVEMENTS, list);
  }

  // Expense Categories
  getExpenseCategories(): ExpenseCategory[] { return this.get(KEYS.EXPENSE_CATEGORIES); }
  
  saveExpenseCategory(cat: ExpenseCategory) {
    const list = this.getExpenseCategories();
    if (cat.id) {
      const idx = list.findIndex(c => c.id === cat.id);
      if (idx >= 0) list[idx] = cat;
    } else {
      cat.id = Date.now();
      list.push(cat);
    }
    this.set(KEYS.EXPENSE_CATEGORIES, list);
  }

  getExpenses(): Expense[] { return this.get(KEYS.EXPENSES); }
  
  saveExpense(exp: Expense) {
    const list = this.getExpenses();
    if(exp.id) {
        const idx = list.findIndex(e => e.id === exp.id);
        if(idx >= 0) list[idx] = exp;
    } else {
        exp.id = Date.now();
        list.push(exp);
    }
    this.set(KEYS.EXPENSES, list);

    if (exp.status === 'PAGO' && exp.payment_date) {
        this.addMovement({
            id: Date.now(),
            date: exp.payment_date,
            type: 'SAIDA',
            amount: exp.amount,
            category: exp.category,
            description: `Pgto: ${exp.description}`,
            payment_method: 'DINHEIRO/PIX'
        });
    }
  }

  payRotativo(clientId: number, amount: number, method: 'DINHEIRO' | 'PIX' | 'CHEQUE', checkDetails?: Partial<Check>) {
      // 1. Reduce Debt in all cases
      this.updateClientDebt(clientId, -amount);

      if (method === 'CHEQUE') {
          // 2a. If Check: Create Check Record in CUSTODIA (No Cash Movement yet)
          const client = this.getClients().find(c => c.id === clientId);
          if (!client) return;

          const check: Check = {
             id: Date.now(),
             client_id: client.id,
             client_name: client.name,
             amount: amount,
             status: 'CUSTODIA',
             updated_at: new Date().toISOString(),
             bank: checkDetails?.bank || 'N/A',
             number: checkDetails?.number || 'N/A',
             due_date: checkDetails?.due_date || new Date().toISOString()
             // origin_sale_id is null/undefined because it's a debt payment, not a direct sale check
          };
          
          this.saveCheck(check);

      } else {
          // 2b. If Cash/Pix: Add to Cash Flow
          this.addMovement({
              id: Date.now(),
              date: new Date().toISOString(),
              type: 'ENTRADA',
              amount: amount,
              category: 'Recebimento Rotativo',
              description: `Pagamento Fatura Cliente #${clientId}`,
              payment_method: method
          });
      }
  }
}

export const db = new DBService();