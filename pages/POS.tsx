import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Client, Product, SaleItem, Sale, PaymentMethod, Check } from '../types';
import { Search, ShoppingCart, Plus, Trash2, AlertOctagon, CheckCircle, Calendar, AlertTriangle, History, Ban } from 'lucide-react';

// Helper component to handle decimal inputs correctly
const QuantityInput: React.FC<{
  value: number;
  onChange: (val: number) => void;
}> = ({ value, onChange }) => {
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    // Update local state if parent value changes externally (e.g. add to cart button)
    // We compare parsed local value with incoming value to avoid overwriting ongoing typing like "1.0"
    if (parseFloat(localValue) !== value) {
      setLocalValue(value.toString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    
    const parsed = parseFloat(newVal);
    if (!isNaN(parsed)) {
      onChange(parsed);
    } else if (newVal === '') {
      onChange(0);
    }
  };

  const handleBlur = () => {
    const parsed = parseFloat(localValue);
    if (!isNaN(parsed)) {
       // Format to 2 decimals on blur for better visibility
       setLocalValue(parsed.toFixed(2));
    }
  };

  return (
    <input 
      type="number"
      step="0.01"
      className="w-20 text-center border rounded p-1 text-sm bg-slate-700 text-white border-slate-600 focus:ring-blue-500 focus:border-blue-500"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={(e) => e.target.select()}
    />
  );
};

const POS: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SALES' | 'HISTORY'>('SALES');

  // Data
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  
  // Selection State
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('DINHEIRO');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Define default due date (Today + 30 days)
  const getDefaultDueDate = () => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().split('T')[0];
  };

  const [dueDate, setDueDate] = useState<string>(getDefaultDueDate());
  
  // Check State
  const [checkData, setCheckData] = useState<Partial<Check>>({ bank: '', number: '', due_date: '' });

  // UI State
  const [clientSearch, setClientSearch] = useState('');
  const [showClientList, setShowClientList] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success'|'error', msg: string} | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setClients(db.getClients());
    setProducts(db.getProducts());
    setRecentSales(db.getSales().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(i => i.product_id === product.id);
    if (existing) {
      setCart(cart.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unit_price } : i));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.description,
        quantity: 1,
        unit_price: product.sell_price,
        applied_cost: product.average_cost,
        total: product.sell_price
      }]);
    }
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(i => i.product_id !== id));
  };

  const updateQty = (id: number, qty: number) => {
    // Prevent negative, allow 0 (for typing)
    if (qty < 0) return;
    setCart(cart.map(i => i.product_id === id ? { ...i, quantity: qty, total: qty * i.unit_price } : i));
  };

  const cartTotal = cart.reduce((acc, i) => acc + i.total, 0);

  const handleFinishSale = () => {
    if (!selectedClient) {
      setFeedback({type: 'error', msg: 'Selecione um cliente.'});
      return;
    }
    if (cart.length === 0) {
        setFeedback({type: 'error', msg: 'Carrinho vazio.'});
        return;
    }

    // 1. Verificar Estoque Negativo
    const negativeStockItems: string[] = [];
    cart.forEach(item => {
        // Compare IDs as string to allow safe matching
        const product = products.find(p => String(p.id) === String(item.product_id));
        const currentStock = Number(product?.current_stock) || 0;
        if (currentStock - item.quantity < 0) {
            negativeStockItems.push(`${item.product_name} (Atual: ${currentStock.toFixed(2)})`);
        }
    });

    if (negativeStockItems.length > 0) {
        const message = `ATENÇÃO: Os seguintes itens ficarão com ESTOQUE NEGATIVO:\n\n${negativeStockItems.join('\n')}\n\nDeseja confirmar a venda mesmo assim?`;
        if (!window.confirm(message)) {
            return; // Usuário cancelou
        }
    }

    // 2. Validation for Rotativo (Limite de Crédito)
    if (paymentMethod === 'ROTATIVO') {
      const currentDebt = Number(selectedClient.current_debt) || 0;
      const limit = Number(selectedClient.credit_limit) || 0;
      const newDebt = currentDebt + cartTotal;
      
      if (newDebt > limit) {
         if (!confirm(`Limite excedido! \nLimite: R$${limit.toFixed(2)}\nDívida Atual: R$${currentDebt.toFixed(2)}\nNova Dívida: R$${newDebt.toFixed(2)}\n\nAutorizar venda EXCEPCIONALMENTE?`)) {
            return;
         }
      }
    }

    // 3. Validation for Check
    if (paymentMethod === 'CHEQUE') {
       if (!checkData.bank || !checkData.number || !checkData.due_date) {
           setFeedback({type: 'error', msg: 'Preencha os dados do cheque.'});
           return;
       }
    }

    try {
        const sale: Sale = {
          id: 0, // set in db
          client_id: selectedClient.id,
          client_name: selectedClient.name,
          date: new Date().toISOString(),
          due_date: dueDate || new Date().toISOString(), 
          total: cartTotal,
          payment_method: paymentMethod,
          items: cart
        };

        const newSaleId = db.createSale(sale);

        if (paymentMethod === 'CHEQUE') {
            const check: Check = {
                id: 0,
                client_id: selectedClient.id,
                client_name: selectedClient.name,
                origin_sale_id: newSaleId, // Link check to sale
                bank: checkData.bank!,
                number: checkData.number!,
                amount: cartTotal,
                due_date: checkData.due_date!,
                status: 'CUSTODIA',
                updated_at: new Date().toISOString()
            };
            db.saveCheck(check);
        }

        // Reset
        setCart([]);
        setSelectedClient(null);
        setClientSearch('');
        setCheckData({ bank: '', number: '', due_date: '' });
        setPaymentMethod('DINHEIRO');
        setDueDate(getDefaultDueDate()); // Reset date
        setFeedback({type: 'success', msg: 'Venda realizada com sucesso!'});
        setTimeout(() => setFeedback(null), 3000);
        
        // Refresh stock
        loadData();
    } catch (error) {
        console.error("Erro ao finalizar venda", error);
        alert('Ocorreu um erro ao salvar a venda. Verifique o console.');
        setFeedback({type: 'error', msg: 'Erro técnico ao salvar venda.'});
    }
  };

  const handleCancelSale = (saleId: number) => {
      if(confirm(`Tem certeza que deseja CANCELAR a venda #${saleId}? \nIsso irá estornar o financeiro e devolver os itens ao estoque.`)) {
          const success = db.cancelSale(saleId);
          if (success) {
            setFeedback({type: 'success', msg: 'Venda cancelada com sucesso.'});
            loadData();
          } else {
            setFeedback({type: 'error', msg: 'Erro ao cancelar venda. Verifique se já não foi cancelada.'});
          }
          setTimeout(() => setFeedback(null), 3000);
      }
  };

  const filteredProducts = products.filter(p => p.description.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()));

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-4">
      {/* Tab Switcher */}
      <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg w-fit">
        <button 
          onClick={() => setActiveTab('SALES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'SALES' ? 'bg-white text-blue-600 shadow' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingCart size={18} /> Nova Venda
        </button>
        <button 
          onClick={() => setActiveTab('HISTORY')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'HISTORY' ? 'bg-white text-blue-600 shadow' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History size={18} /> Histórico / Cancelar
        </button>
      </div>

      {activeTab === 'SALES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full pb-4">
          {/* Left: Product Selection */}
          <div className="lg:col-span-2 flex flex-col bg-white rounded-lg shadow h-full overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex gap-4">
               <div className="relative flex-1">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                 <input 
                   autoFocus
                   className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                   placeholder="Buscar produto (Nome ou Código)..."
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                 />
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
               <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map(product => (
                     <button 
                       key={product.id}
                       onClick={() => addToCart(product)}
                       className={`flex flex-col items-start p-4 border rounded-lg transition-all hover:shadow-md ${
                         product.current_stock <= 0 ? 'bg-red-50 border-red-200' : 'bg-white hover:border-blue-300'
                       }`}
                     >
                        <span className="font-bold text-slate-700 text-left line-clamp-2 h-12">{product.description}</span>
                        <div className="mt-2 w-full flex justify-between items-end">
                           <div>
                             <span className={`text-xs block ${product.current_stock <= 0 ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                                Estoque: {product.current_stock}
                             </span>
                             <span className="text-lg font-bold text-blue-600">R$ {product.sell_price.toFixed(2)}</span>
                           </div>
                           <div className="bg-blue-100 text-blue-700 p-1.5 rounded-full">
                             <Plus size={16} />
                           </div>
                        </div>
                     </button>
                  ))}
               </div>
            </div>
          </div>

          {/* Right: Cart & Checkout */}
          <div className="flex flex-col bg-white rounded-lg shadow h-full border-l border-slate-200">
            <div className="p-4 border-b bg-slate-50">
               <h2 className="font-bold text-lg flex items-center gap-2">
                 <ShoppingCart size={20} /> Carrinho de Venda
               </h2>
            </div>

            {/* Client Selector */}
            <div className="p-4 border-b relative">
               {selectedClient ? (
                 <div className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-200">
                    <div>
                       <p className="font-bold text-blue-900">{selectedClient.name}</p>
                       <p className="text-xs text-blue-700">Limite: R$ {selectedClient.credit_limit} | Dívida: R$ {selectedClient.current_debt.toFixed(2)}</p>
                    </div>
                    <button onClick={() => setSelectedClient(null)} className="text-blue-500 hover:text-blue-700">
                       <Trash2 size={16} />
                    </button>
                 </div>
               ) : (
                 <div className="relative">
                   <input 
                     className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                     placeholder="Selecionar Cliente..."
                     value={clientSearch}
                     onChange={e => { setClientSearch(e.target.value); setShowClientList(true); }}
                     onFocus={() => setShowClientList(true)}
                   />
                   {showClientList && clientSearch && (
                      <div className="absolute top-full left-0 w-full bg-white border shadow-lg z-10 max-h-48 overflow-auto rounded-b">
                         {filteredClients.map(c => (
                            <div 
                              key={c.id} 
                              className="p-2 hover:bg-slate-100 cursor-pointer border-b"
                              onClick={() => { setSelectedClient(c); setShowClientList(false); setClientSearch(''); }}
                            >
                               <p className="font-medium">{c.name}</p>
                               <p className="text-xs text-slate-500">CPF: {c.cpf_cnpj}</p>
                            </div>
                         ))}
                      </div>
                   )}
                 </div>
               )}
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll">
               {cart.length === 0 ? (
                 <div className="text-center text-slate-400 mt-10">Carrinho vazio</div>
               ) : (
                 cart.map(item => {
                    const product = products.find(p => p.id === item.product_id);
                    const willBeNegative = (product?.current_stock || 0) - item.quantity < 0;

                    return (
                        <div key={item.product_id} className={`flex justify-between items-center p-2 rounded ${willBeNegative ? 'bg-red-50 border border-red-100' : 'bg-slate-50'}`}>
                           <div className="flex-1">
                              <p className="text-sm font-medium line-clamp-1 flex items-center gap-1">
                                 {item.product_name}
                                 {willBeNegative && <AlertTriangle size={12} className="text-red-500" />}
                              </p>
                              <p className="text-xs text-slate-500">Unit: R$ {item.unit_price.toFixed(2)}</p>
                           </div>
                           <div className="flex items-center gap-3">
                              <QuantityInput 
                                value={item.quantity}
                                onChange={(qty) => updateQty(item.product_id, qty)}
                              />
                              <span className="font-bold text-sm w-16 text-right">R$ {item.total.toFixed(2)}</span>
                              <button onClick={() => removeFromCart(item.product_id)} className="text-red-400 hover:text-red-600">
                                 <Trash2 size={16} />
                              </button>
                           </div>
                        </div>
                    );
                 })
               )}
            </div>

            {/* Footer: Totals & Payment */}
            <div className="p-4 bg-slate-50 border-t space-y-3">
               <div className="flex justify-between items-end">
                  <span className="text-slate-600 font-medium">Total</span>
                  <span className="text-2xl font-bold text-slate-800">R$ {cartTotal.toFixed(2)}</span>
               </div>
               
               <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pagamento</label>
                    <select 
                        className="w-full border p-2 rounded font-medium bg-slate-700 text-white border-slate-600 focus:ring-blue-500 focus:border-blue-500"
                        value={paymentMethod}
                        onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                    >
                        <option value="DINHEIRO">Dinheiro</option>
                        <option value="PIX">Pix</option>
                        <option value="ROTATIVO">Rotativo (Crédito Loja)</option>
                        <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Vencimento</label>
                      <input 
                        type="date"
                        className="w-full border p-2 rounded font-medium bg-white text-black border-slate-300 focus:ring-blue-500"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                      />
                  </div>
               </div>

               {/* Check Details */}
               {paymentMethod === 'CHEQUE' && (
                 <div className="grid grid-cols-2 gap-2 bg-yellow-50 p-2 rounded border border-yellow-200">
                    <input 
                      className="border p-2 rounded text-sm w-full col-span-2 bg-slate-700 text-white border-slate-600 placeholder-slate-400 focus:ring-blue-500 outline-none" 
                      placeholder="Banco" 
                      value={checkData.bank} 
                      onChange={e => setCheckData({...checkData, bank: e.target.value})} 
                    />
                    <input 
                      className="border p-2 rounded text-sm w-full bg-slate-700 text-white border-slate-600 placeholder-slate-400 focus:ring-blue-500 outline-none" 
                      placeholder="Número" 
                      value={checkData.number} 
                      onChange={e => setCheckData({...checkData, number: e.target.value})} 
                    />
                    <input 
                      className="border p-2 rounded text-sm w-full bg-slate-700 text-white border-slate-600 focus:ring-blue-500 outline-none" 
                      type="date" 
                      value={checkData.due_date} 
                      onChange={e => setCheckData({...checkData, due_date: e.target.value})} 
                    />
                 </div>
               )}

               <button 
                 onClick={handleFinishSale}
                 className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-lg transform transition active:scale-95 flex justify-center items-center gap-2"
               >
                  <CheckCircle size={20} /> Finalizar Venda
               </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'HISTORY' && (
         <div className="bg-white rounded-lg shadow h-full overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-slate-50">
               <h3 className="font-bold text-lg text-slate-800">Histórico de Vendas Recentes</h3>
            </div>
            <div className="flex-1 overflow-auto p-4 custom-scroll">
               <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                     <tr>
                        <th className="p-3">ID</th>
                        <th className="p-3">Data/Hora</th>
                        <th className="p-3">Cliente</th>
                        <th className="p-3">Forma Pagto</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Ação</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y">
                     {recentSales.map(sale => (
                        <tr key={sale.id} className={`hover:bg-slate-50 ${sale.status === 'CANCELADA' ? 'bg-red-50 hover:bg-red-100' : ''}`}>
                           <td className="p-3 text-slate-500">#{sale.id}</td>
                           <td className="p-3 text-black">
                              {new Date(sale.date).toLocaleDateString()} <span className="text-xs text-slate-400">{new Date(sale.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                           </td>
                           <td className="p-3 font-medium text-black">{sale.client_name}</td>
                           <td className="p-3 text-black">{sale.payment_method}</td>
                           <td className={`p-3 text-right font-bold ${sale.status === 'CANCELADA' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                              R$ {sale.total.toFixed(2)}
                           </td>
                           <td className="p-3 text-center">
                              {sale.status === 'CANCELADA' ? (
                                 <span className="bg-red-200 text-red-800 px-2 py-1 rounded text-xs font-bold">CANCELADA</span>
                              ) : (
                                 <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs font-bold">CONCLUÍDA</span>
                              )}
                           </td>
                           <td className="p-3 text-right">
                              {sale.status !== 'CANCELADA' && (
                                 <button 
                                    onClick={() => handleCancelSale(sale.id)}
                                    className="flex items-center gap-1 text-red-600 hover:text-red-800 bg-white border border-red-200 hover:bg-red-50 px-3 py-1 rounded transition-colors text-xs font-bold ml-auto"
                                 >
                                    <Ban size={14} /> Cancelar
                                 </button>
                              )}
                           </td>
                        </tr>
                     ))}
                     {recentSales.length === 0 && (
                        <tr><td colSpan={7} className="p-8 text-center text-slate-400">Nenhuma venda registrada.</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      )}

      {feedback && (
         <div className={`fixed bottom-4 right-4 px-6 py-3 rounded shadow-lg text-white font-bold animate-bounce ${feedback.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
            {feedback.msg}
         </div>
      )}
    </div>
  );
};

export default POS;