import React, { useState } from 'react';
import Layout from './components/Layout';
import Clients from './pages/Clients';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Financial from './pages/Financial';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';
import { db } from './services/db';
import { AlertCircle, Wallet, CreditCard, Banknote, FileText, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'clients':
        return <Clients />;
      case 'inventory':
        return <Inventory />;
      case 'pos':
        return <POS />;
      case 'financial':
        return <Financial />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

// Simple Dashboard Component inside App to save file count
const Dashboard: React.FC<{onNavigate: (p: string) => void}> = ({ onNavigate }) => {
  const products = db.getProducts();
  const sales = db.getSales();
  const clients = db.getClients();
  const checks = db.getChecks();
  const movements = db.getMovements();
  
  const todayStr = new Date().toDateString();

  // --- CALCULO FINANCEIRO DETALHADO DO DIA ---
  
  // 1. Dinheiro (Cash) - Entradas (Vendas + Recebimentos)
  const moneyIn = movements
    .filter(m => m.type === 'ENTRADA' && m.payment_method === 'DINHEIRO' && new Date(m.date).toDateString() === todayStr)
    .reduce((acc, m) => acc + m.amount, 0);

  // 2. Pix - Entradas (Vendas + Recebimentos)
  const pixIn = movements
    .filter(m => m.type === 'ENTRADA' && m.payment_method === 'PIX' && new Date(m.date).toDateString() === todayStr)
    .reduce((acc, m) => acc + m.amount, 0);

  // 3. Cheques Compensados Hoje
  const checkIn = movements
    .filter(m => m.type === 'ENTRADA' && m.payment_method === 'CHEQUE' && new Date(m.date).toDateString() === todayStr)
    .reduce((acc, m) => acc + m.amount, 0);

  // 4. Vendas no Rotativo (Fiado) do Dia (Não é entrada de caixa, mas é produção)
  const rotativoSales = sales
    .filter(s => s.payment_method === 'ROTATIVO' && s.status !== 'CANCELADA' && new Date(s.date).toDateString() === todayStr)
    .reduce((acc, s) => acc + s.total, 0);

  // Total Real Recebido (Caixa Líquido)
  const totalReceivedToday = moneyIn + pixIn + checkIn;

  // Outros Indicadores
  const lowStock = products.filter(p => p.current_stock <= 5).length;
  const custodyChecksTotal = checks
    .filter(c => c.status === 'CUSTODIA')
    .reduce((acc, c) => acc + c.amount, 0);

  // --- Top 10 Debtors Logic ---
  const topDebtors = clients
    .filter(c => c.current_debt > 0)
    .map(c => {
      const clientSales = sales
        .filter(s => s.client_id === c.id && s.payment_method === 'ROTATIVO')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const lastSale = clientSales.length > 0 ? clientSales[0] : null;
      return {
        ...c,
        lastPurchase: lastSale ? lastSale.date : null,
        nextDueDate: lastSale?.due_date ? new Date(lastSale.due_date) : null
      };
    })
    .sort((a, b) => b.current_debt - a.current_debt)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <h1 className="text-3xl font-bold text-slate-800">Resumo do Dia</h1>
         <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold border border-blue-200">
            {new Date().toLocaleDateString()}
         </span>
      </div>
      
      {/* SEÇÃO 1: CAIXA REAL (Entradas Efetivas) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* TOTAL GERAL */}
          <div className="bg-slate-800 text-white p-5 rounded-lg shadow-lg flex flex-col justify-between">
              <div>
                  <p className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">Caixa Total (Hoje)</p>
                  <p className="text-3xl font-bold">R$ {totalReceivedToday.toFixed(2)}</p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                  <ArrowUpCircle size={14} className="text-green-400"/> Entradas confirmadas
              </div>
          </div>

          {/* PIX */}
          <div className="bg-white p-5 rounded-lg shadow border-l-4 border-green-500">
              <div className="flex justify-between items-start mb-2">
                 <div className="p-2 bg-green-100 rounded-lg text-green-600"><Wallet size={20}/></div>
                 <span className="text-xs font-bold text-slate-400 uppercase">Pix</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">R$ {pixIn.toFixed(2)}</p>
          </div>

          {/* DINHEIRO */}
          <div className="bg-white p-5 rounded-lg shadow border-l-4 border-blue-500">
              <div className="flex justify-between items-start mb-2">
                 <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Banknote size={20}/></div>
                 <span className="text-xs font-bold text-slate-400 uppercase">Dinheiro</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">R$ {moneyIn.toFixed(2)}</p>
          </div>

          {/* CHEQUE COMPENSADO */}
          <div className="bg-white p-5 rounded-lg shadow border-l-4 border-yellow-500">
              <div className="flex justify-between items-start mb-2">
                 <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600"><FileText size={20}/></div>
                 <span className="text-xs font-bold text-slate-400 uppercase">Cheque (Comp.)</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">R$ {checkIn.toFixed(2)}</p>
          </div>
      </div>

      {/* SEÇÃO 2: VENDAS A PRAZO E PENDÊNCIAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Vendas no Rotativo (Hoje) */}
          <div className="bg-white p-5 rounded-lg shadow border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="text-purple-600" size={20}/>
                  <h3 className="font-bold text-slate-700">Vendas no Rotativo (Hoje)</h3>
              </div>
              <p className="text-3xl font-bold text-purple-600">R$ {rotativoSales.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-2">Novas dívidas geradas hoje. Não entrou no caixa.</p>
          </div>

          {/* Cheques em Custódia */}
          <div className="bg-white p-5 rounded-lg shadow border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                  <FileText className="text-orange-600" size={20}/>
                  <h3 className="font-bold text-slate-700">Cheques em Custódia (Total)</h3>
              </div>
              <p className="text-3xl font-bold text-orange-600">R$ {custodyChecksTotal.toFixed(2)}</p>
              <button onClick={() => onNavigate('financial')} className="text-xs text-blue-600 mt-2 hover:underline">Gerenciar Cheques &rarr;</button>
          </div>

          {/* Estoque Alerta */}
          <div className="bg-white p-5 rounded-lg shadow border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="text-red-600" size={20}/>
                  <h3 className="font-bold text-slate-700">Produtos em Alerta</h3>
              </div>
              <p className="text-3xl font-bold text-red-600">{lowStock}</p>
              <button onClick={() => onNavigate('inventory')} className="text-xs text-blue-600 mt-2 hover:underline">Repor Estoque &rarr;</button>
          </div>
      </div>

      {/* Acesso Rápido */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-bold text-slate-700 mb-4">Acesso Rápido</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button onClick={() => onNavigate('pos')} className="p-4 bg-slate-50 hover:bg-slate-100 rounded text-center border group">
                <span className="block font-bold text-blue-600 group-hover:scale-105 transition-transform">PDV</span>
                <span className="text-xs text-slate-500">Realizar Venda</span>
            </button>
            <button onClick={() => onNavigate('inventory')} className="p-4 bg-slate-50 hover:bg-slate-100 rounded text-center border group">
                <span className="block font-bold text-green-600 group-hover:scale-105 transition-transform">Entrada</span>
                <span className="text-xs text-slate-500">Nota Fiscal</span>
            </button>
            <button onClick={() => onNavigate('clients')} className="p-4 bg-slate-50 hover:bg-slate-100 rounded text-center border group">
                <span className="block font-bold text-purple-600 group-hover:scale-105 transition-transform">Cliente</span>
                <span className="text-xs text-slate-500">Cadastro</span>
            </button>
            <button onClick={() => onNavigate('financial')} className="p-4 bg-slate-50 hover:bg-slate-100 rounded text-center border group">
                <span className="block font-bold text-orange-600 group-hover:scale-105 transition-transform">Contas</span>
                <span className="text-xs text-slate-500">Livro Caixa</span>
            </button>
        </div>
      </div>

      {/* TOP 10 DEVEDORES */}
      <div className="bg-white p-6 rounded-lg shadow border-t-4 border-red-500">
         <h3 className="font-bold text-red-700 mb-4 text-lg flex items-center gap-2">
            <AlertCircle size={22} /> Top 10 Maiores Devedores
         </h3>
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
               <thead className="bg-red-50 text-red-900 font-bold border-b border-red-100">
                  <tr>
                     <th className="p-3">Cliente</th>
                     <th className="p-3 text-center">Última Compra</th>
                     <th className="p-3 text-center">Vencimento</th>
                     <th className="p-3 text-right">Dívida Total</th>
                  </tr>
               </thead>
               <tbody className="divide-y">
                  {topDebtors.map(c => (
                     <tr key={c.id} className="hover:bg-red-50/30">
                        <td className="p-3 font-medium text-black">{c.name}</td>
                        <td className="p-3 text-center text-black">{c.lastPurchase ? new Date(c.lastPurchase).toLocaleDateString() : '-'}</td>
                        <td className="p-3 text-center text-black font-medium">{c.nextDueDate ? c.nextDueDate.toLocaleDateString() : '-'}</td>
                        <td className="p-3 text-right font-bold text-red-600 text-base">R$ {c.current_debt.toFixed(2)}</td>
                     </tr>
                  ))}
                  {topDebtors.length === 0 && (
                     <tr><td colSpan={4} className="p-6 text-center text-slate-500">Nenhum cliente com débito pendente.</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default App;