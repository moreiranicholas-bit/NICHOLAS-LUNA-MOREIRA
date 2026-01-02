import React from 'react';
import { db } from '../services/db';
import { Download, Upload, Shield, AlertTriangle } from 'lucide-react';

const Settings: React.FC = () => {
  const handleDownloadBackup = () => {
    const data = db.exportDatabase();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_pedrinho_pescados_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("ATENÇÃO: Restaurar um backup substituirá TODOS os dados atuais.\n\nVocê tem certeza que deseja continuar?")) {
      e.target.value = ''; // Reset input
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
         const success = db.importDatabase(content);
         if (success) {
            alert("Backup restaurado com sucesso! A página será recarregada.");
            window.location.reload();
         } else {
            alert("Erro ao restaurar backup. Arquivo inválido ou corrompido.");
         }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Configurações e Segurança</h1>

      <div className="bg-white p-6 rounded-lg shadow border-t-4 border-slate-600">
         <h3 className="font-bold text-slate-800 mb-4 text-lg flex items-center gap-2">
            <Shield size={22} /> Backup e Restauração
         </h3>
         <p className="text-slate-600 mb-6">
            Gere cópias de segurança de todos os dados do sistema (Clientes, Vendas, Estoque, Financeiro) ou restaure a partir de um arquivo salvo anteriormente.
         </p>
         
         <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1 bg-slate-50 p-4 rounded border border-slate-200 w-full">
                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Download size={18}/> Exportar Dados</h4>
                <p className="text-sm text-slate-500 mb-4">Baixa um arquivo .JSON com todos os dados atuais.</p>
                <button 
                   onClick={handleDownloadBackup}
                   className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded font-medium transition w-full"
                >
                   Baixar Backup Agora
                </button>
            </div>
            
            <div className="flex-1 bg-red-50 p-4 rounded border border-red-200 w-full">
                <h4 className="font-bold text-red-700 mb-2 flex items-center gap-2"><Upload size={18}/> Importar Dados</h4>
                <p className="text-sm text-red-600 mb-4">Substitui o banco de dados atual pelo arquivo selecionado. <br/><strong>Cuidado: Ação irreversível.</strong></p>
                <label className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition w-full block text-center cursor-pointer">
                   Selecionar Arquivo para Restaurar
                   <input type="file" accept=".json" className="hidden" onChange={handleRestoreBackup} />
                </label>
            </div>
         </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-yellow-500"/> Informações do Sistema
          </h3>
          <div className="text-sm text-slate-600 space-y-2">
             <p><strong>Versão:</strong> 1.0.0</p>
             <p><strong>Armazenamento:</strong> LocalStorage (Navegador)</p>
             <p><strong>Usuário:</strong> Admin (Único)</p>
          </div>
      </div>
    </div>
  );
};

export default Settings;