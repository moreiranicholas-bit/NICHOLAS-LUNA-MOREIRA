import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Client } from '../types';
import { Plus, Search, Edit } from 'lucide-react';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<Client>>({});

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = () => {
    setClients(db.getClients());
  };

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData(client);
    } else {
      setEditingClient(null);
      setFormData({ active: true, credit_limit: 1000 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    // Ensure cpf_cnpj is string empty if not provided
    const clientToSave = {
      ...formData,
      cpf_cnpj: formData.cpf_cnpj || ''
    } as Client;

    db.saveClient(clientToSave);
    setIsModalOpen(false);
    loadClients();
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.cpf_cnpj && c.cpf_cnpj.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          <Plus size={20} /> Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou CPF/CNPJ..." 
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 border-b">
              <tr>
                <th className="px-4 py-3 font-semibold">Nome</th>
                <th className="px-4 py-3 font-semibold">CPF/CNPJ</th>
                <th className="px-4 py-3 font-semibold">Limite</th>
                <th className="px-4 py-3 font-semibold">Saldo Devedor</th>
                <th className="px-4 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredClients.map(client => {
                const available = client.credit_limit - client.current_debt;
                return (
                  <tr key={client.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-black">{client.name}</td>
                    <td className="px-4 py-3 text-slate-500">{client.cpf_cnpj || '-'}</td>
                    <td className="px-4 py-3 text-black font-medium">R$ {client.credit_limit.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className={client.current_debt > 0 ? "text-red-600 font-bold" : "text-green-600"}>
                          R$ {client.current_debt.toFixed(2)}
                        </span>
                        <span className="text-xs text-slate-400">Disp: R$ {available.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => handleOpenModal(client)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-slate-800 text-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center p-4 border-b border-slate-700">
              <h3 className="text-lg font-bold">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400 hover:text-white" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Nome Completo</label>
                <input 
                  required
                  className="mt-1 block w-full border border-slate-600 bg-slate-700 text-white rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400"
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">CPF/CNPJ (Opcional)</label>
                <input 
                  className="mt-1 block w-full border border-slate-600 bg-slate-700 text-white rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.cpf_cnpj || ''}
                  onChange={e => setFormData({...formData, cpf_cnpj: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300">Limite de Crédito</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2 text-slate-400">R$</span>
                    <input 
                      type="number" step="0.01"
                      required
                      className="block w-full border border-slate-600 bg-slate-700 text-white rounded-md p-2 pl-10 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.credit_limit || ''}
                      onChange={e => setFormData({...formData, credit_limit: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="flex items-center mt-6">
                   <label className="flex items-center gap-2 cursor-pointer">
                     <input 
                       type="checkbox"
                       checked={formData.active}
                       onChange={e => setFormData({...formData, active: e.target.checked})}
                       className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded"
                     />
                     <span className="text-sm font-medium text-slate-300">Ativo</span>
                   </label>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-md transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Import needed for icon in modal
import { X } from 'lucide-react';

export default Clients;