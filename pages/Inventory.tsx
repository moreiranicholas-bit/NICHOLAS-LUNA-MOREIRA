import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Product, Supplier, StockEntry } from '../types';
import { Plus, Search, PackagePlus, AlertTriangle, Edit, Truck, Package, X, History, FileText, Calendar } from 'lucide-react';

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'SUPPLIERS' | 'ENTRIES'>('PRODUCTS');
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [entries, setEntries] = useState<StockEntry[]>([]);
  
  // Product & Entry Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Supplier Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierFormData, setSupplierFormData] = useState<Partial<Supplier>>({});

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Entry Form State
  const [entryForm, setEntryForm] = useState<Partial<StockEntry>>({
    cost_freight: 0, cost_tolls: 0, cost_food: 0, quantity: 0, cost_product: 0, product_id: 0, supplier_id: 0, due_date: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setProducts(db.getProducts());
    setSuppliers(db.getSuppliers());
    setEntries(db.getStockEntries().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  // --- Handlers: Products ---
  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProduct) {
       // Ensure defaults for new products
       const prodToSave = {
          ...selectedProduct,
          current_stock: selectedProduct.current_stock || 0,
          average_cost: selectedProduct.average_cost || 0,
          sell_price: selectedProduct.sell_price || 0
       };
      db.saveProduct(prodToSave);
    }
    setIsProductModalOpen(false);
    loadData();
  };

  // --- Handlers: Entries ---
  const handleEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict Check
    if (!entryForm.product_id || isNaN(Number(entryForm.product_id))) {
       alert("Selecione um Produto válido.");
       return;
    }
    if (!entryForm.quantity || Number(entryForm.quantity) <= 0) {
       alert("Informe uma quantidade válida.");
       return;
    }

    // Calc aggregated cost
    const totalExtras = (entryForm.cost_freight || 0) + (entryForm.cost_tolls || 0) + (entryForm.cost_food || 0);
    const productTotal = (entryForm.cost_product || 0) * entryForm.quantity;
    const finalTotal = productTotal + totalExtras;
    const finalUnitCost = finalTotal / entryForm.quantity;

    const entry: StockEntry = {
      ...entryForm as StockEntry,
      date: new Date().toISOString(),
      final_unit_cost: finalUnitCost,
      due_date: entryForm.due_date // Pass due_date
    };

    try {
        db.addStockEntry(entry);
        setIsEntryModalOpen(false);
        loadData();
    } catch (err) {
        console.error(err);
        alert("Erro ao salvar entrada. Verifique se o produto selecionado existe.");
    }
  };

  // --- Handlers: Suppliers ---
  const handleOpenSupplierModal = (supplier?: Supplier) => {
    if (supplier) {
      setSupplierFormData(supplier);
    } else {
      setSupplierFormData({});
    }
    setIsSupplierModalOpen(true);
  };

  const handleSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierFormData.name) return;

    db.saveSupplier(supplierFormData as Supplier);
    setIsSupplierModalOpen(false);
    loadData();
  };

  const filteredProducts = products.filter(p => p.description.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredSuppliers = suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Helper to find names for history
  const getProductName = (id: number) => products.find(p => p.id === id)?.description || `#${id}`;
  const getSupplierName = (id: number) => suppliers.find(s => s.id === id)?.name || '-';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
        <h1 className="text-2xl font-bold text-slate-800">Gestão de Estoque</h1>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg w-fit">
        <button 
          onClick={() => { setActiveTab('PRODUCTS'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'PRODUCTS' ? 'bg-white text-blue-600 shadow' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package size={18} /> Produtos
        </button>
        <button 
          onClick={() => { setActiveTab('ENTRIES'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'ENTRIES' ? 'bg-white text-blue-600 shadow' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History size={18} /> Histórico Entradas
        </button>
        <button 
          onClick={() => { setActiveTab('SUPPLIERS'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'SUPPLIERS' ? 'bg-white text-blue-600 shadow' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Truck size={18} /> Fornecedores
        </button>
      </div>

      {/* --- CONTENT: PRODUCTS TAB --- */}
      {activeTab === 'PRODUCTS' && (
        <>
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => { setSelectedProduct({ current_stock: 0, average_cost: 0, sell_price: 0 } as Product); setIsProductModalOpen(true); }}
              className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-md font-medium"
            >
              <Plus size={20} /> Cadastrar Produto
            </button>
            <button 
              onClick={() => { 
                  // Reset form properly
                  setEntryForm({cost_freight:0, cost_tolls:0, cost_food:0, quantity: 0, cost_product: 0, supplier_id: 0, product_id: 0, due_date: ''}); 
                  setIsEntryModalOpen(true); 
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
            >
              <PackagePlus size={20} /> Nova Entrada (Compra)
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar produtos..." 
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Descrição</th>
                    <th className="px-4 py-3 font-semibold text-center">Unid.</th>
                    <th className="px-4 py-3 font-semibold text-right">Estoque</th>
                    <th className="px-4 py-3 font-semibold text-right">Custo Médio</th>
                    <th className="px-4 py-3 font-semibold text-right">Preço Venda</th>
                    <th className="px-4 py-3 font-semibold text-right">Margem Est.</th>
                    <th className="px-4 py-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredProducts.map(p => {
                    const avgCost = Number(p.average_cost) || 0;
                    const sellPrice = Number(p.sell_price) || 0;
                    const stock = Number(p.current_stock) || 0;
                    const margin = sellPrice - avgCost;
                    const marginPct = sellPrice > 0 ? (margin / sellPrice) * 100 : 0;
                    
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-black">{p.description}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{p.unit}</td>
                        <td className={`px-4 py-3 text-right font-bold ${stock <= 0 ? 'text-red-600' : 'text-slate-700'}`}>
                          {stock.toFixed(2)}
                          {stock <= 0 && <AlertTriangle size={14} className="inline ml-1 mb-1"/>}
                        </td>
                        <td className="px-4 py-3 text-right text-black">R$ {avgCost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-black">R$ {sellPrice.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-green-600">{marginPct.toFixed(1)}%</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { setSelectedProduct(p); setIsProductModalOpen(true); }} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* --- CONTENT: ENTRIES HISTORY TAB --- */}
      {activeTab === 'ENTRIES' && (
         <div className="bg-white rounded-lg shadow p-4">
             <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><History/> Histórico de Compras (Entradas)</h3>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 text-slate-600 border-b">
                      <tr>
                         <th className="px-4 py-3">Data</th>
                         <th className="px-4 py-3">Produto</th>
                         <th className="px-4 py-3">Fornecedor</th>
                         <th className="px-4 py-3">Vencimento</th>
                         <th className="px-4 py-3 text-right">Qtd</th>
                         <th className="px-4 py-3 text-right">Custo Final Un.</th>
                         <th className="px-4 py-3 text-right">Custo Total</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y">
                      {entries.map(e => (
                         <tr key={e.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-black">{new Date(e.date).toLocaleDateString()} {new Date(e.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                            <td className="px-4 py-3 font-medium text-black">{getProductName(e.product_id)}</td>
                            <td className="px-4 py-3 text-slate-600">{getSupplierName(e.supplier_id)}</td>
                            <td className="px-4 py-3 text-slate-600">
                                {e.due_date ? new Date(e.due_date).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-black">{e.quantity.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right text-black">R$ {e.final_unit_cost.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-bold text-black">R$ {(e.quantity * e.final_unit_cost).toFixed(2)}</td>
                         </tr>
                      ))}
                      {entries.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-slate-500">Nenhuma entrada registrada.</td></tr>}
                   </tbody>
                </table>
             </div>
         </div>
      )}

      {/* --- CONTENT: SUPPLIERS TAB --- */}
      {activeTab === 'SUPPLIERS' && (
        <>
           <div className="flex justify-end gap-2">
            <button 
              onClick={() => handleOpenSupplierModal()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
            >
              <Plus size={20} /> Novo Fornecedor
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
             <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar fornecedores..." 
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nome / Razão Social</th>
                    <th className="px-4 py-3 font-semibold">Contato / Telefone</th>
                    <th className="px-4 py-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSuppliers.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                      <td className="px-4 py-3 text-slate-600">{s.contact || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleOpenSupplierModal(s)} className="text-blue-600 hover:text-blue-800">
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSuppliers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">Nenhum fornecedor encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* --- MODALS --- */}

      {/* Modal Product */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
           <div className="bg-slate-800 text-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
              <button onClick={() => setIsProductModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={24}/></button>
              <h3 className="text-lg font-bold mb-4">{selectedProduct?.id ? 'Editar' : 'Novo'} Produto</h3>
              <form onSubmit={handleProductSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-300">Descrição</label>
                    <input className="w-full bg-slate-700 border border-slate-600 text-white p-2 rounded focus:ring-blue-500 focus:border-blue-500" required 
                      value={selectedProduct?.description || ''}
                      onChange={e => setSelectedProduct({...selectedProduct!, description: e.target.value})}
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Preço Venda</label>
                        <input className="w-full bg-slate-700 border border-slate-600 text-white p-2 rounded focus:ring-blue-500 focus:border-blue-500" type="number" step="0.01" required
                          value={selectedProduct?.sell_price || ''}
                          onChange={e => setSelectedProduct({...selectedProduct!, sell_price: parseFloat(e.target.value)})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Unidade</label>
                        <input className="w-full bg-slate-700 border border-slate-600 text-white p-2 rounded focus:ring-blue-500 focus:border-blue-500" placeholder="UN, CX, KG" required
                          value={selectedProduct?.unit || ''}
                          onChange={e => setSelectedProduct({...selectedProduct!, unit: e.target.value})}
                        />
                    </div>
                 </div>
                 {!selectedProduct?.id && (
                    <div className="bg-slate-700 p-3 rounded text-sm text-blue-300 border border-slate-600">
                      O custo médio inicial será definido na primeira entrada de estoque.
                    </div>
                 )}
                 <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded transition-colors">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Salvar</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Modal Entry */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
           <div className="bg-slate-800 text-white rounded-lg shadow-xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh] relative">
              <button onClick={() => setIsEntryModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={24}/></button>
              <h3 className="text-lg font-bold mb-4">Nova Entrada de Mercadoria</h3>
              <form onSubmit={handleEntrySubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-300">Fornecedor</label>
                    <div className="flex gap-2">
                      <select 
                        className="w-full bg-slate-700 border border-slate-600 text-white p-2 rounded focus:ring-blue-500 focus:border-blue-500" 
                        required
                        value={entryForm.supplier_id || ''}
                        onChange={e => setEntryForm({...entryForm, supplier_id: parseInt(e.target.value)})}
                      >
                        <option value="">Selecione...</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    {suppliers.length === 0 && <p className="text-xs text-yellow-400 mt-1">Cadastre um fornecedor na aba "Fornecedores" primeiro.</p>}
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-300">Produto</label>
                        <select 
                          className="w-full bg-slate-700 border border-slate-600 text-white p-2 rounded focus:ring-blue-500 focus:border-blue-500" 
                          required
                          value={entryForm.product_id || ''}
                          onChange={e => setEntryForm({...entryForm, product_id: parseInt(e.target.value)})}
                        >
                          <option value="">Selecione...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.description} (Atual: {Number(p.current_stock||0)})</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-300">Vencimento (Boleto/Pagto)</label>
                        <div className="relative">
                            <input 
                              type="date"
                              className="w-full bg-slate-700 border border-slate-600 text-white p-2 rounded focus:ring-blue-500 focus:border-blue-500"
                              value={entryForm.due_date || ''}
                              onChange={e => setEntryForm({...entryForm, due_date: e.target.value})}
                            />
                        </div>
                     </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 border-t border-slate-700 pt-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Qtd Comprada</label>
                        <input 
                           className="w-full bg-slate-700 border border-slate-600 text-white p-2 rounded focus:ring-blue-500 focus:border-blue-500" 
                           type="number" step="0.01" required
                           value={entryForm.quantity || ''}
                           onChange={e => setEntryForm({...entryForm, quantity: parseFloat(e.target.value)})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Custo Unit. Produto</label>
                        <input 
                           className="w-full bg-slate-700 border border-slate-600 text-white p-2 rounded focus:ring-blue-500 focus:border-blue-500" 
                           type="number" step="0.01" required
                           value={entryForm.cost_product || ''}
                           onChange={e => setEntryForm({...entryForm, cost_product: parseFloat(e.target.value)})}
                        />
                    </div>
                 </div>

                 <div className="bg-slate-700 p-3 rounded space-y-3 border border-slate-600">
                    <p className="text-sm font-semibold text-slate-200">Custos Agregados (Rateio)</p>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-xs text-slate-400">Frete Total</label>
                            <input className="w-full bg-slate-800 border border-slate-600 text-white p-1 rounded text-sm focus:ring-blue-500 focus:border-blue-500" type="number" step="0.01"
                               value={entryForm.cost_freight || ''}
                               onChange={e => setEntryForm({...entryForm, cost_freight: parseFloat(e.target.value || '0')})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400">Pedágio</label>
                            <input className="w-full bg-slate-800 border border-slate-600 text-white p-1 rounded text-sm focus:ring-blue-500 focus:border-blue-500" type="number" step="0.01"
                               value={entryForm.cost_tolls || ''}
                               onChange={e => setEntryForm({...entryForm, cost_tolls: parseFloat(e.target.value || '0')})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400">Alimentação</label>
                            <input className="w-full bg-slate-800 border border-slate-600 text-white p-1 rounded text-sm focus:ring-blue-500 focus:border-blue-500" type="number" step="0.01"
                               value={entryForm.cost_food || ''}
                               onChange={e => setEntryForm({...entryForm, cost_food: parseFloat(e.target.value || '0')})}
                            />
                        </div>
                    </div>
                 </div>
                 
                 {/* Preview Calculation */}
                 {(entryForm.quantity || 0) > 0 && (
                    <div className="text-right text-sm">
                        <p className="text-slate-400">Custo Unitário Final (Calculado):</p>
                        <p className="text-lg font-bold text-blue-400">
                           R$ {
                              (((entryForm.cost_product||0) * (entryForm.quantity || 1) + 
                               (entryForm.cost_freight||0) + (entryForm.cost_tolls||0) + (entryForm.cost_food||0)) 
                               / (entryForm.quantity || 1)).toFixed(2)
                           }
                        </p>
                    </div>
                 )}

                 <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setIsEntryModalOpen(false)} className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded transition-colors">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Confirmar Entrada</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Modal Supplier */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
           <div className="bg-slate-800 text-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
              <button onClick={() => setIsSupplierModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={24}/></button>
              <h3 className="text-lg font-bold mb-4">{supplierFormData.id ? 'Editar' : 'Novo'} Fornecedor</h3>
              <form onSubmit={handleSupplierSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-300">Nome / Razão Social</label>
                    <input 
                      className="w-full bg-slate-700 border border-slate-600 text-white p-2 rounded focus:ring-blue-500 focus:border-blue-500" 
                      required 
                      autoFocus
                      value={supplierFormData.name || ''}
                      onChange={e => setSupplierFormData({...supplierFormData, name: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-300">Contato / Telefone (Opcional)</label>
                    <input 
                      className="w-full bg-slate-700 border border-slate-600 text-white p-2 rounded focus:ring-blue-500 focus:border-blue-500"
                      value={supplierFormData.contact || ''}
                      onChange={e => setSupplierFormData({...supplierFormData, contact: e.target.value})}
                    />
                 </div>
                 <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded transition-colors">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Salvar Fornecedor</button>
                 </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;