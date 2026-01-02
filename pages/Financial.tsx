import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Check, Expense, Client, FinancialMovement, ExpenseCategory, PaymentMethod } from '../types';
import { CheckSquare, FileText, AlertCircle, DollarSign, Calendar, Settings, X, Edit, Plus, AlertTriangle, ArrowRight, CheckCircle, XCircle, List, TrendingUp, TrendingDown } from 'lucide-react';

const Financial: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ROTATIVO' | 'CHEQUES' | 'DESPESAS' | 'CAIXA'>('ROTATIVO');

  return (
    <div className="space-y-6">
       <div className="flex space-x-4 border-b overflow-x-auto">
         <button onClick={() => setActiveTab('ROTATIVO')} className={`pb-2 px-4 font-medium whitespace-nowrap ${activeTab === 'ROTATIVO' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>
            Rotativo Clientes
         </button>
         <button onClick={() => setActiveTab('CHEQUES')} className={`pb-2 px-4 font-medium whitespace-nowrap ${activeTab === 'CHEQUES' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>
            Controle de Cheques
         </button>
         <button onClick={() => setActiveTab('DESPESAS')} className={`pb-2 px-4 font-medium whitespace-nowrap ${activeTab === 'DESPESAS' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>
            Despesas Operacionais
         </button>
         <button onClick={() => setActiveTab('CAIXA')} className={`pb-2 px-4 font-medium whitespace-nowrap ${activeTab === 'CAIXA' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>
            Livro Caixa (Extrato)
         </button>
       </div>

       {activeTab === 'ROTATIVO' && <RotativoTab />}
       {activeTab === 'CHEQUES' && <ChequesTab />}
       {activeTab === 'DESPESAS' && <ExpensesTab />}
       {activeTab === 'CAIXA' && <CashFlowTab />}
    </div>
  );
};

// --- Sub Components ---

const CashFlowTab: React.FC = () => {
    // We extend FinancialMovement type locally to include Rotativo sales for display
    type DisplayMovement = FinancialMovement & { isReceivable?: boolean };

    const [movements, setMovements] = useState<DisplayMovement[]>([]);
    const [filterType, setFilterType] = useState<'ALL' | 'PIX' | 'DINHEIRO' | 'CHEQUE' | 'ROTATIVO'>('ALL');
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        // 1. Get Actual Money Movements
        const actualMovements: DisplayMovement[] = db.getMovements();
        
        // 2. Get Rotativo Sales (Receivables)
        const rotativoSales = db.getSales()
            .filter(s => s.payment_method === 'ROTATIVO' && s.status !== 'CANCELADA')
            .map(s => ({
                id: s.id,
                date: s.date,
                type: 'ENTRADA' as const,
                amount: s.total,
                category: 'Venda Rotativo',
                description: `Venda #${s.id} - ${s.client_name}`,
                payment_method: 'ROTATIVO',
                isReceivable: true // Flag to distinguish
            }));

        const all = [...actualMovements, ...rotativoSales].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setMovements(all);
    }, []);

    const filtered = movements.filter(m => {
        const matchesDate = new Date(m.date).toLocaleDateString() === new Date(dateFilter).toLocaleDateString();
        const matchesType = filterType === 'ALL' ? true : m.payment_method === filterType;
        return matchesDate && matchesType;
    });

    // Calculate Totals
    // Cash Balance ignores 'ROTATIVO' sales (isReceivable) because it's not cash yet
    const cashIn = filtered.filter(m => m.type === 'ENTRADA' && !m.isReceivable).reduce((acc, m) => acc + m.amount, 0);
    const cashOut = filtered.filter(m => m.type === 'SAIDA').reduce((acc, m) => acc + m.amount, 0);
    const cashBalance = cashIn - cashOut;

    // Production Total includes Rotativo
    const rotativoTotal = filtered.filter(m => m.isReceivable).reduce((acc, m) => acc + m.amount, 0);

    return (
        <div className="space-y-4">
             {/* Filters */}
             <div className="bg-white p-4 rounded shadow flex flex-col md:flex-row gap-4 justify-between items-end">
                 <div className="flex gap-4 items-end w-full">
                     <div className="w-full md:w-auto">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
                        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="border p-2 rounded bg-slate-50 text-black border-slate-300 w-full"/>
                     </div>
                     <div className="w-full md:w-auto">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Tipo Pagto</label>
                        <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="border p-2 rounded bg-slate-50 text-black border-slate-300 w-full">
                            <option value="ALL">Todos</option>
                            <option value="PIX">Pix</option>
                            <option value="DINHEIRO">Dinheiro</option>
                            <option value="CHEQUE">Cheque</option>
                            <option value="ROTATIVO">Rotativo (Vendas)</option>
                        </select>
                     </div>
                 </div>
                 <div className="text-right w-full md:w-auto min-w-[200px] flex flex-col items-end">
                     <div className="mb-1">
                        <p className="text-xs text-slate-400 font-bold uppercase">Saldo Caixa (Real)</p>
                        <p className={`text-xl font-bold ${cashBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>R$ {cashBalance.toFixed(2)}</p>
                     </div>
                     {rotativoTotal > 0 && (
                        <div className="text-xs">
                             <span className="text-purple-600 font-bold">+ R$ {rotativoTotal.toFixed(2)}</span> em Rotativo
                        </div>
                     )}
                 </div>
             </div>

             {/* List */}
             <div className="bg-white rounded shadow overflow-hidden">
                 <table className="w-full text-sm">
                     <thead className="bg-slate-100 text-slate-700 font-bold">
                         <tr>
                             <th className="p-3 text-left">Horário</th>
                             <th className="p-3 text-left">Descrição / Categoria</th>
                             <th className="p-3 text-left">Forma</th>
                             <th className="p-3 text-right">Entrada</th>
                             <th className="p-3 text-right">Saída</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y">
                         {filtered.map(m => (
                             <tr key={`${m.payment_method}-${m.id}`} className="hover:bg-slate-50">
                                 <td className="p-3 text-slate-600">
                                     {new Date(m.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                 </td>
                                 <td className="p-3">
                                     <p className="font-medium text-black">{m.description}</p>
                                     <p className="text-xs text-slate-500">{m.category}</p>
                                 </td>
                                 <td className="p-3">
                                     <span className={`text-[10px] font-bold px-2 py-1 rounded border
                                        ${m.payment_method === 'PIX' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                                        ${m.payment_method === 'DINHEIRO' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                                        ${m.payment_method === 'CHEQUE' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ''}
                                        ${m.payment_method === 'ROTATIVO' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                                     `}>
                                         {m.payment_method}
                                     </span>
                                 </td>
                                 <td className="p-3 text-right">
                                     {m.type === 'ENTRADA' ? (
                                         <span className={`font-bold ${m.isReceivable ? 'text-purple-600 opacity-75' : 'text-green-600'}`}>
                                             R$ {m.amount.toFixed(2)}
                                             {m.isReceivable && <span className="text-[10px] block font-normal text-slate-400">A Receber</span>}
                                         </span>
                                     ) : '-'}
                                 </td>
                                 <td className="p-3 text-right">
                                     {m.type === 'SAIDA' ? <span className="text-red-600 font-bold">R$ {m.amount.toFixed(2)}</span> : '-'}
                                 </td>
                             </tr>
                         ))}
                         {filtered.length === 0 && (
                             <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhuma movimentação encontrada para este dia/filtro.</td></tr>
                         )}
                     </tbody>
                 </table>
             </div>
        </div>
    );
};

const RotativoTab: React.FC = () => {
   const [clients, setClients] = useState<Client[]>([]);
   const [selectedClient, setSelectedClient] = useState<Client | null>(null);
   const [paymentAmount, setPaymentAmount] = useState<string>('');
   const [checks, setChecks] = useState<Check[]>([]);

   // Payment Method State
   const [payMethod, setPayMethod] = useState<'DINHEIRO' | 'PIX' | 'CHEQUE'>('PIX');
   const [checkData, setCheckData] = useState({ bank: '', number: '', due_date: '' });

   useEffect(() => { 
       loadClients();
   }, []);

   const loadClients = () => {
       setClients(db.getClients().filter(c => c.current_debt > 0)); 
       setChecks(db.getChecks());
   };

   const handlePay = () => {
      if (!selectedClient || !paymentAmount) return;
      
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) {
          alert("Valor inválido.");
          return;
      }

      if (payMethod === 'CHEQUE') {
          if (!checkData.bank || !checkData.number || !checkData.due_date) {
              alert("Preencha todos os dados do cheque.");
              return;
          }
      }

      try {
          db.payRotativo(selectedClient.id, amount, payMethod, payMethod === 'CHEQUE' ? checkData : undefined);
          
          alert("Baixa realizada com sucesso!");
          setPaymentAmount('');
          setCheckData({ bank: '', number: '', due_date: '' });
          setSelectedClient(null);
          loadClients(); // Refresh list
      } catch (e) {
          alert('Erro ao realizar pagamento.');
          console.error(e);
      }
   };

   // Helper to detect if client has bounced checks
   const hasBouncedCheck = (clientId: number) => {
       return checks.some(c => c.client_id === clientId && c.status === 'DEVOLVIDO');
   };

   return (
      <div className="grid md:grid-cols-2 gap-6">
         <div className="bg-white rounded shadow p-4">
            <h3 className="font-bold mb-4 text-black">Devedores (Rotativo)</h3>
            <div className="overflow-auto max-h-96">
               <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-black">
                     <tr>
                        <th className="p-2">Cliente</th>
                        <th className="p-2 text-right">Dívida Total</th>
                        <th className="p-2"></th>
                     </tr>
                  </thead>
                  <tbody className="text-black">
                     {clients.map(c => (
                        <tr key={c.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedClient(c)}>
                           <td className="p-2">
                               <div className="flex items-center gap-2">
                                   {c.name}
                                   {hasBouncedCheck(c.id) && (
                                       <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-1 py-0.5 rounded font-bold border border-red-200" title="Cliente possui cheques devolvidos">
                                           <AlertTriangle size={12} /> CHEQUE DEVOLVIDO
                                       </span>
                                   )}
                               </div>
                           </td>
                           <td className="p-2 text-right font-bold text-red-600">R$ {c.current_debt.toFixed(2)}</td>
                           <td className="p-2 text-right">
                              <ArrowRight size={16} className={`inline ${selectedClient?.id === c.id ? 'text-blue-600' : 'text-slate-300'}`}/>
                           </td>
                        </tr>
                     ))}
                     {clients.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-black">Nenhum cliente com dívida.</td></tr>}
                  </tbody>
               </table>
            </div>
         </div>

         <div className="bg-white rounded shadow p-4">
            <h3 className="font-bold mb-4 text-black">Recebimento de Fatura</h3>
            {selectedClient ? (
               <div className="space-y-4">
                  <div className={`p-4 rounded border ${hasBouncedCheck(selectedClient.id) ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'}`}>
                     <p className="text-sm text-black font-medium">Recebendo de:</p>
                     <p className="text-xl font-bold text-blue-900 flex items-center gap-2">
                         {selectedClient.name}
                     </p>
                     {hasBouncedCheck(selectedClient.id) && (
                         <div className="mt-2 text-xs text-red-700 font-bold flex items-center gap-1">
                             <AlertTriangle size={14}/> ATENÇÃO: Cliente possui cheque(s) devolvido(s).
                         </div>
                     )}
                     <p className="text-sm text-black mt-1">Dívida Total: <span className="text-red-600 font-bold">R$ {selectedClient.current_debt.toFixed(2)}</span></p>
                  </div>
                  
                  <div>
                     <label className="block text-sm font-medium text-black">Valor do Pagamento (R$)</label>
                     <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        className="w-full border p-2 rounded text-lg text-black bg-white focus:ring-2 focus:ring-green-500 border-slate-300" 
                        value={paymentAmount} 
                        onChange={e => setPaymentAmount(e.target.value)}
                     />
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-black mb-1">Forma de Pagamento</label>
                      <select 
                        className="w-full border p-2 rounded bg-white text-black border-slate-300 focus:ring-blue-500"
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value as any)}
                      >
                          <option value="PIX">PIX</option>
                          <option value="DINHEIRO">Dinheiro</option>
                          <option value="CHEQUE">Cheque</option>
                      </select>
                  </div>

                  {payMethod === 'CHEQUE' && (
                      <div className="bg-yellow-50 p-3 rounded border border-yellow-200 grid grid-cols-2 gap-2">
                          <input 
                              placeholder="Banco"
                              className="border p-2 rounded text-sm w-full col-span-2 bg-white text-black"
                              value={checkData.bank}
                              onChange={e => setCheckData({...checkData, bank: e.target.value})}
                          />
                          <input 
                              placeholder="Número"
                              className="border p-2 rounded text-sm w-full bg-white text-black"
                              value={checkData.number}
                              onChange={e => setCheckData({...checkData, number: e.target.value})}
                          />
                          <input 
                              type="date"
                              className="border p-2 rounded text-sm w-full bg-white text-black"
                              value={checkData.due_date}
                              onChange={e => setCheckData({...checkData, due_date: e.target.value})}
                          />
                      </div>
                  )}

                  <button onClick={handlePay} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 font-bold">
                     Confirmar Baixa
                  </button>
                  <p className="text-xs text-black mt-2">
                     * O sistema baixa automaticamente as dívidas mais antigas primeiro.
                     {payMethod === 'CHEQUE' && <br/>}
                     {payMethod === 'CHEQUE' && <span className="text-yellow-700 font-bold">Cheques entram como "Custódia" e não somam ao caixa imediatamente.</span>}
                  </p>
               </div>
            ) : (
               <div className="h-full flex items-center justify-center text-black">
                  Selecione um cliente ao lado.
               </div>
            )}
         </div>
      </div>
   );
};

const ChequesTab: React.FC = () => {
   const [checks, setChecks] = useState<Check[]>([]);
   const [selectedCheck, setSelectedCheck] = useState<Check | null>(null);
   const [compDate, setCompDate] = useState(new Date().toISOString().split('T')[0]);
   
   useEffect(() => {
       refreshChecks();
   }, []);

   const refreshChecks = () => {
       // Sort: Custodia first, then date
       const list = db.getChecks().sort((a,b) => {
           if (a.status === 'CUSTODIA' && b.status !== 'CUSTODIA') return -1;
           if (a.status !== 'CUSTODIA' && b.status === 'CUSTODIA') return 1;
           return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
       });
       setChecks([...list]);
   };

   const updateStatus = (check: Check, newStatus: Check['status']) => {
      let confirmMsg = '';
      if (newStatus === 'COMPENSADO') confirmMsg = `Confirmar COMPENSAÇÃO?\n\nIsso irá lançar uma ENTRADA de R$ ${check.amount.toFixed(2)} no Caixa na data ${new Date(compDate).toLocaleDateString()}.`;
      if (newStatus === 'DEVOLVIDO') confirmMsg = `Confirmar DEVOLUÇÃO?\n\nIsso irá reativar a dívida do cliente de R$ ${check.amount.toFixed(2)} e (se já compensado) estornar o valor do caixa.`;

      if(confirm(confirmMsg)) {
          try {
             // For compensation, use the selected date + noon time to avoid timezone shifts
             const dateISO = newStatus === 'COMPENSADO' 
                 ? `${compDate}T12:00:00.000Z` 
                 : new Date().toISOString();

             const updated = { 
                 ...check, 
                 status: newStatus, 
                 updated_at: dateISO
             };
             
             // Save to DB
             db.saveCheck(updated);
             
             // Update UI immediately
             refreshChecks();
             setSelectedCheck(null); // Clear selection
             setCompDate(new Date().toISOString().split('T')[0]); // Reset date to today
             
          } catch (error) {
             console.error(error);
             alert('Erro ao atualizar status do cheque.');
          }
      }
   };

   return (
      <div className="grid md:grid-cols-2 gap-6">
         {/* LEFT PANEL: LIST */}
         <div className="bg-white rounded shadow p-4">
            <h3 className="font-bold mb-4 text-black">Carteira de Cheques</h3>
            <div className="overflow-auto max-h-96">
               <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-black sticky top-0">
                     <tr>
                        <th className="p-2">Vencimento</th>
                        <th className="p-2">Info</th>
                        <th className="p-2 text-right">Valor</th>
                        <th className="p-2 text-center"></th>
                     </tr>
                  </thead>
                  <tbody className="text-black">
                     {checks.map(c => (
                        <tr 
                           key={c.id} 
                           className={`border-b hover:bg-slate-50 cursor-pointer ${selectedCheck?.id === c.id ? 'bg-blue-50' : ''}`}
                           onClick={() => setSelectedCheck(c)}
                        >
                           <td className="p-2">
                               <div className="flex flex-col">
                                   <span className="font-medium">{new Date(c.due_date).toLocaleDateString()}</span>
                                   <span className={`text-[10px] font-bold px-1 rounded w-fit 
                                       ${c.status === 'CUSTODIA' ? 'bg-yellow-100 text-yellow-800' : ''}
                                       ${c.status === 'COMPENSADO' ? 'bg-green-100 text-green-800' : ''}
                                       ${c.status === 'DEVOLVIDO' ? 'bg-red-100 text-red-800' : ''}
                                       ${c.status === 'CANCELADO' ? 'bg-slate-200 text-slate-500 line-through' : ''}
                                   `}>
                                       {c.status}
                                   </span>
                               </div>
                           </td>
                           <td className="p-2 text-xs">
                               <span className="block font-bold truncate">{c.client_name}</span>
                               <span className="text-slate-500">{c.bank} - {c.number}</span>
                           </td>
                           <td className="p-2 text-right font-bold text-slate-700">R$ {c.amount.toFixed(2)}</td>
                           <td className="p-2 text-center">
                              <ArrowRight size={16} className={`inline ${selectedCheck?.id === c.id ? 'text-blue-600' : 'text-slate-300'}`}/>
                           </td>
                        </tr>
                     ))}
                     {checks.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-black">Nenhum cheque registrado.</td></tr>}
                  </tbody>
               </table>
            </div>
         </div>

         {/* RIGHT PANEL: ACTIONS */}
         <div className="bg-white rounded shadow p-4">
            <h3 className="font-bold mb-4 text-black">Ações do Cheque</h3>
            {selectedCheck ? (
               <div className="space-y-6">
                  {/* CHECK HEADER CARD */}
                  <div className={`p-5 rounded border shadow-sm ${
                      selectedCheck.status === 'DEVOLVIDO' ? 'bg-red-50 border-red-200' : 
                      selectedCheck.status === 'COMPENSADO' ? 'bg-green-50 border-green-200' :
                      'bg-blue-50 border-blue-200'
                  }`}>
                     <div className="flex justify-between items-start">
                         <div>
                            <p className="text-sm text-slate-600 font-bold uppercase">Cliente Emissor</p>
                            <p className="text-xl font-bold text-slate-900">{selectedCheck.client_name}</p>
                         </div>
                         <div className="text-right">
                             <p className="text-sm text-slate-600 font-bold uppercase">Valor</p>
                             <p className="text-2xl font-bold text-slate-800">R$ {selectedCheck.amount.toFixed(2)}</p>
                         </div>
                     </div>
                     <div className="mt-4 grid grid-cols-2 gap-4 text-sm border-t border-black/10 pt-3">
                         <div>
                             <p className="text-xs text-slate-500">Banco / Número</p>
                             <p className="font-medium text-slate-800">{selectedCheck.bank} / {selectedCheck.number}</p>
                         </div>
                         <div className="text-right">
                             <p className="text-xs text-slate-500">Bom Para</p>
                             <p className="font-medium text-slate-800">{new Date(selectedCheck.due_date).toLocaleDateString()}</p>
                         </div>
                     </div>
                     <div className="mt-3 text-center">
                         <span className={`inline-block px-3 py-1 rounded text-xs font-bold uppercase tracking-wider
                             ${selectedCheck.status === 'CUSTODIA' ? 'bg-yellow-200 text-yellow-900' : ''}
                             ${selectedCheck.status === 'COMPENSADO' ? 'bg-green-200 text-green-900' : ''}
                             ${selectedCheck.status === 'DEVOLVIDO' ? 'bg-red-200 text-red-900' : ''}
                         `}>
                             Status: {selectedCheck.status}
                         </span>
                     </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="space-y-3">
                      <p className="text-sm font-bold text-slate-700 border-b pb-1">Ações Disponíveis</p>
                      
                      {selectedCheck.status === 'CUSTODIA' && (
                          <div className="grid grid-cols-1 gap-3">
                              {/* Date Selection for Compensation */}
                              <div className="bg-green-50 p-3 rounded border border-green-200">
                                  <label className="block text-xs font-bold text-green-800 mb-1">Data da Compensação (Entrada no Caixa)</label>
                                  <input 
                                      type="date"
                                      className="w-full border p-2 rounded text-sm text-black bg-white focus:ring-green-500"
                                      value={compDate}
                                      onChange={e => setCompDate(e.target.value)}
                                  />
                              </div>

                              <button 
                                onClick={() => updateStatus(selectedCheck, 'COMPENSADO')}
                                className="w-full bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg shadow flex items-center justify-between group"
                              >
                                  <div className="text-left">
                                      <p className="font-bold flex items-center gap-2"><CheckCircle size={20}/> COMPENSAR CHEQUE</p>
                                      <p className="text-xs text-green-100 mt-1">O dinheiro caiu na conta. Lançar entrada no Caixa.</p>
                                  </div>
                                  <ArrowRight className="opacity-50 group-hover:opacity-100 transition-opacity"/>
                              </button>

                              <button 
                                onClick={() => updateStatus(selectedCheck, 'DEVOLVIDO')}
                                className="w-full bg-red-600 hover:bg-red-700 text-white p-4 rounded-lg shadow flex items-center justify-between group"
                              >
                                  <div className="text-left">
                                      <p className="font-bold flex items-center gap-2"><XCircle size={20}/> CHEQUE DEVOLVIDO</p>
                                      <p className="text-xs text-red-100 mt-1">O cheque voltou sem fundo. Reativar dívida do cliente.</p>
                                  </div>
                                  <ArrowRight className="opacity-50 group-hover:opacity-100 transition-opacity"/>
                              </button>
                          </div>
                      )}

                      {selectedCheck.status === 'COMPENSADO' && (
                           <div className="bg-slate-50 p-4 rounded border border-slate-200">
                               <p className="text-sm text-slate-600 mb-3">
                                   Este cheque foi compensado em: <br/> 
                                   <strong>{new Date(selectedCheck.updated_at).toLocaleDateString()}</strong>
                               </p>
                               <button 
                                onClick={() => updateStatus(selectedCheck, 'DEVOLVIDO')}
                                className="w-full border-2 border-red-500 text-red-600 hover:bg-red-50 p-3 rounded font-bold text-sm flex items-center justify-center gap-2"
                              >
                                  <AlertTriangle size={18}/> Marcar como DEVOLVIDO (Estorno)
                              </button>
                              <p className="text-xs text-red-500 mt-2 text-center">Use isso caso o banco devolva o cheque dias após o depósito.</p>
                           </div>
                      )}

                      {(selectedCheck.status === 'DEVOLVIDO' || selectedCheck.status === 'CANCELADO') && (
                          <div className="text-center p-6 text-slate-400 bg-slate-50 rounded italic border border-slate-100">
                              Nenhuma ação disponível para este status.
                          </div>
                      )}
                  </div>
               </div>
            ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[300px]">
                  <CheckSquare size={48} className="mb-4 opacity-20"/>
                  <p>Selecione um cheque na lista ao lado</p>
                  <p className="text-xs mt-1">para visualizar opções de baixa ou devolução.</p>
               </div>
            )}
         </div>
      </div>
   );
};

const ExpensesTab: React.FC = () => {
   const [expenses, setExpenses] = useState<Expense[]>([]);
   const [categories, setCategories] = useState<ExpenseCategory[]>([]);
   const [form, setForm] = useState<Partial<Expense>>({ status: 'ABERTO' });
   const [showForm, setShowForm] = useState(false);
   const [showCategoryManager, setShowCategoryManager] = useState(false);

   useEffect(() => {
       loadData();
   }, []);

   const loadData = () => {
       setExpenses(db.getExpenses());
       const cats = db.getExpenseCategories();
       setCategories(cats);
       // Set default category if exists
       if (cats.length > 0 && !form.category) {
           setForm(prev => ({ ...prev, category: cats[0].name }));
       }
   };

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.description || !form.amount || !form.competence_date || !form.category) return;
      
      db.saveExpense(form as Expense);
      setShowForm(false);
      // Reset form but keep category
      setForm({ category: form.category, status: 'ABERTO' });
      loadData();
   };

   return (
      <div className="grid md:grid-cols-3 gap-6">
         <div className="md:col-span-2 bg-white rounded shadow p-4">
            <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-black">Histórico de Despesas</h3>
               <button onClick={() => setShowForm(true)} className="bg-slate-800 text-white px-3 py-1 rounded text-sm hover:bg-slate-700">Nova Despesa</button>
            </div>
            <table className="w-full text-sm">
               <thead className="bg-slate-50 text-left text-black">
                  <tr>
                     <th className="p-2">Data Comp.</th>
                     <th className="p-2">Descrição</th>
                     <th className="p-2">Categoria</th>
                     <th className="p-2 text-right">Valor</th>
                     <th className="p-2 text-center">Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y text-black">
                  {expenses.map(e => (
                     <tr key={e.id}>
                        <td className="p-2">{new Date(e.competence_date).toLocaleDateString()}</td>
                        <td className="p-2">{e.description}</td>
                        <td className="p-2">{e.category}</td>
                        <td className="p-2 text-right">R$ {e.amount.toFixed(2)}</td>
                        <td className="p-2 text-center">
                           {e.status === 'PAGO' ? <span className="text-green-600 font-bold text-xs">PAGO</span> : <span className="text-red-500 font-bold text-xs">ABERTO</span>}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>

         {showForm && (
            <div className="bg-white rounded shadow p-4 border border-blue-200">
               <div className="flex justify-between items-start mb-4">
                 <h3 className="font-bold text-black">Lançar Conta/Despesa</h3>
                 <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-black"><X size={18} /></button>
               </div>
               
               <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                     <label className="text-xs font-bold text-black">Descrição</label>
                     <input 
                        className="w-full border p-2 rounded bg-slate-700 text-white border-slate-600 focus:ring-blue-500 focus:border-blue-500" 
                        required 
                        value={form.description || ''} 
                        onChange={e => setForm({...form, description: e.target.value})} 
                     />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-black">Valor</label>
                     <input 
                        type="number" step="0.01" 
                        className="w-full border p-2 rounded bg-slate-700 text-white border-slate-600 focus:ring-blue-500 focus:border-blue-500" 
                        required 
                        value={form.amount || ''} 
                        onChange={e => setForm({...form, amount: parseFloat(e.target.value)})} 
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                     <div>
                        <label className="text-xs font-bold text-black">Data Competência</label>
                        <input 
                            type="date" 
                            className="w-full border p-2 rounded bg-slate-700 text-white border-slate-600 focus:ring-blue-500 focus:border-blue-500" 
                            required 
                            value={form.competence_date || ''} 
                            onChange={e => setForm({...form, competence_date: e.target.value})} 
                        />
                     </div>
                     <div>
                         <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-black">Categoria</label>
                            <button type="button" onClick={() => setShowCategoryManager(true)} title="Gerenciar Categorias" className="text-blue-600 hover:text-blue-800">
                                <Settings size={14} />
                            </button>
                         </div>
                         <select 
                            className="w-full border p-2 rounded bg-slate-700 text-white border-slate-600 focus:ring-blue-500 focus:border-blue-500" 
                            value={form.category} 
                            onChange={e => setForm({...form, category: e.target.value})}
                         >
                            <option value="">Selecione...</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                         </select>
                     </div>
                  </div>
                  <div>
                      <label className="flex items-center gap-2 mt-2">
                         <input type="checkbox" checked={form.status === 'PAGO'} onChange={e => setForm({...form, status: e.target.checked ? 'PAGO' : 'ABERTO', payment_date: e.target.checked ? new Date().toISOString() : undefined})} />
                         <span className="text-sm text-black">Já foi pago? (Baixar do Caixa)</span>
                      </label>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                     <button type="button" onClick={() => setShowForm(false)} className="text-sm text-black hover:text-red-500">Cancelar</button>
                     <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Salvar</button>
                  </div>
               </form>
            </div>
         )}

         {/* Modal Gerenciar Categorias */}
         {showCategoryManager && (
            <CategoryManagerModal 
                categories={categories} 
                onClose={() => { setShowCategoryManager(false); loadData(); }} 
            />
         )}
      </div>
   );
};

const CategoryManagerModal: React.FC<{categories: ExpenseCategory[], onClose: () => void}> = ({ categories, onClose }) => {
    const [localCats, setLocalCats] = useState(categories);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [newName, setNewName] = useState('');

    const handleSave = (id: number) => {
        if (!editName.trim()) return;
        const cat = { id, name: editName };
        db.saveExpenseCategory(cat);
        setLocalCats(db.getExpenseCategories());
        setEditingId(null);
    };

    const handleAdd = () => {
        if (!newName.trim()) return;
        const cat = { id: 0, name: newName };
        db.saveExpenseCategory(cat);
        setLocalCats(db.getExpenseCategories());
        setNewName('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
           <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 relative">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                 <h3 className="font-bold text-lg text-black">Gerenciar Categorias</h3>
                 <button onClick={onClose}><X size={20} className="text-slate-500 hover:text-black"/></button>
              </div>

              {/* Add New */}
              <div className="flex gap-2 mb-4">
                 <input 
                    className="flex-1 border p-2 rounded text-black bg-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Nova Categoria..."
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                 />
                 <button onClick={handleAdd} className="bg-green-600 text-white p-2 rounded hover:bg-green-700">
                    <Plus size={20} />
                 </button>
              </div>
              
              {/* List */}
              <div className="overflow-y-auto max-h-60 border rounded">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-black font-semibold">
                        <tr>
                            <th className="p-2">Nome</th>
                            <th className="p-2 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {localCats.map(c => (
                            <tr key={c.id} className="border-t hover:bg-slate-50">
                                <td className="p-2">
                                    {editingId === c.id ? (
                                        <input 
                                            className="w-full border p-1 rounded text-black"
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="text-black">{c.name}</span>
                                    )}
                                </td>
                                <td className="p-2 text-right">
                                    {editingId === c.id ? (
                                        <button onClick={() => handleSave(c.id)} className="text-green-600 font-bold text-xs">Salvar</button>
                                    ) : (
                                        <button onClick={() => { setEditingId(c.id); setEditName(c.name); }} className="text-blue-600 hover:text-blue-800">
                                            <Edit size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
    );
};

export default Financial;