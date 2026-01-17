
import React, { useState, useEffect } from 'react';
import { PatientCase, PatientCaseFormData, AppLists, ListItem } from './types';
import { Dashboard } from './components/Dashboard';
import { CaseList } from './components/CaseList';
import { CaseForm } from './components/CaseForm';
import { Settings } from './components/Settings';
import { Reports } from './components/Reports';
import { Login } from './components/Login';
import { Modal } from './components/Modal';
import { Button } from './components/Button';
import { LayoutDashboard, Table, PlusCircle, Activity, Settings as SettingsIcon, FileBarChart, RefreshCw, Database, Menu, X, Sun, Moon, LogOut } from 'lucide-react';
import { api, getApiUrl, setApiUrl } from './services/api';

const App: React.FC = () => {
  // Estado de Autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('oncotrack_auth') === 'true');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<'dashboard' | 'cases' | 'reports' | 'settings'>('dashboard');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  
  // Estados de datos
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [lists, setLists] = useState<AppLists>({
    pjs: [], ciudades: [], medicos: [], aseguradoras: [], 
    instituciones: [], dispensaciones: [], indicaciones: [],
    distribuidores: [], dosis: []
  });

  // Estados de UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<PatientCase | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [configUrlOpen, setConfigUrlOpen] = useState(false);
  const [scriptUrl, setScriptUrl] = useState(getApiUrl());
  const [errorMsg, setErrorMsg] = useState('');
  const [needsSetup, setNeedsSetup] = useState(false);

  // Efecto para aplicar Modo Oscuro
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Carga inicial (solo si está autenticado)
  useEffect(() => {
    if (isAuthenticated) {
      if (scriptUrl) {
        loadData(true);
      } else {
        setConfigUrlOpen(true);
      }
    }
  }, [isAuthenticated]);

  // Polling cada 15 segundos
  useEffect(() => {
    if (!isAuthenticated || !scriptUrl) return;
    const intervalId = setInterval(() => loadData(false), 15000);
    return () => clearInterval(intervalId);
  }, [scriptUrl, isAuthenticated]);

  const handleLogin = (user: string, pass: string) => {
    if (user === 'mbraschi' && pass === 'Zafiro641') {
      setIsAuthenticated(true);
      setLoginError('');
      localStorage.setItem('oncotrack_auth', 'true');
    } else {
      setLoginError('Credenciales incorrectas. Verifique usuario y contraseña.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('oncotrack_auth');
    setActiveTab('dashboard');
  };

  const loadData = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    else setRefreshing(true);
    
    setErrorMsg('');
    try {
      const data = await api.getData();
      setCases(data.cases);
      const listKeys = data.lists ? Object.keys(data.lists) : [];
      if (listKeys.length === 0) setNeedsSetup(true);
      else { setNeedsSetup(false); setLists(data.lists); }
    } catch (err: any) {
      if (showLoadingSpinner) {
        setErrorMsg('Error cargando datos. Verifique la URL del Script. ' + err.message);
        if (err.message.includes('fetch') || err.message.includes('API')) setConfigUrlOpen(true);
      }
    } finally {
      if (showLoadingSpinner) setLoading(false);
      else setRefreshing(false);
    }
  };

  const handleAutoSetup = async () => {
    setLoading(true);
    try {
      const res = await api.setupDatabase();
      if (res.success) { alert('Estructura generada correctamente.'); setNeedsSetup(false); loadData(true); }
      else { alert('Aviso: ' + (res.message || 'Operación completada')); loadData(true); }
    } catch (err: any) { alert('Error inicializando: ' + err.message); }
    finally { setLoading(false); }
  };

  const handleSaveUrl = () => {
    setApiUrl(scriptUrl);
    setConfigUrlOpen(false);
    loadData(true);
  };

  const syncListsWithData = async (data: PatientCaseFormData) => {
    const listFieldMapping: Partial<Record<keyof PatientCaseFormData, keyof AppLists>> = {
      pjs: 'pjs', ciudad: 'ciudades', medico: 'medicos', aseguradora: 'aseguradoras', 
      institucion: 'instituciones', dispensacion: 'dispensaciones', indicacion: 'indicaciones', 
      distribuidor: 'distribuidores', dosis: 'dosis'
    };
    let updatedLists = { ...lists };
    let hasChanges = false;
    for (const [fieldKey, listKey] of Object.entries(listFieldMapping)) {
      const value = data[fieldKey as keyof PatientCaseFormData];
      if (typeof value === 'string' && value.trim() !== '') {
        const cleanValue = value.trim();
        const targetList = updatedLists[listKey as keyof AppLists];
        const exists = targetList.some(item => item.value.toLowerCase() === cleanValue.toLowerCase());
        if (!exists) {
          hasChanges = true;
          const newItem: ListItem = { value: cleanValue, active: true };
          const newList = [...targetList, newItem].sort((a, b) => a.value.localeCompare(b.value));
          updatedLists = { ...updatedLists, [listKey]: newList };
          try { await api.updateList(listKey as string, newList); } catch (e) {}
        }
      }
    }
    if (hasChanges) setLists(updatedLists);
  };

  const handleUpdateList = async (key: keyof AppLists, newList: ListItem[]) => {
    setLists(prev => ({ ...prev, [key]: newList }));
    try { await api.updateList(key, newList); loadData(false); } catch (err) { alert("Error guardando lista"); loadData(true); }
  };

  const handleAddCase = async (data: PatientCaseFormData) => {
    const numericIds = cases.map(c => parseInt(c.id, 10)).filter(n => !isNaN(n));
    const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
    const nextId = (maxId + 1).toString();
    const newCase: PatientCase = { ...data, id: nextId };
    await syncListsWithData(newCase);
    const prevCases = [...cases];
    setCases([...cases, newCase]);
    setIsModalOpen(false);
    try { await api.saveCase(newCase); loadData(false); } catch (err) { alert("Error guardando"); setCases(prevCases); }
  };

  const handleUpdateCase = async (data: PatientCaseFormData) => {
    if (!editingCase) return;
    const updatedCase = { ...data, id: editingCase.id } as PatientCase;
    await syncListsWithData(updatedCase);
    const prevCases = [...cases];
    setCases(cases.map(c => c.id === editingCase.id ? updatedCase : c));
    setIsModalOpen(false);
    setEditingCase(undefined);
    try { await api.saveCase(updatedCase); loadData(false); } catch (err) { alert("Error actualizando"); setCases(prevCases); }
  };

  const handleDeleteCase = async (id: string) => {
    if (confirm('¿Desea eliminar este registro?')) {
      const prevCases = [...cases];
      setCases(cases.filter(c => c.id !== id));
      try { await api.deleteCase(id); loadData(false); } catch (err) { alert("Error eliminando"); setCases(prevCases); }
    }
  };

  const openAddModal = () => { setEditingCase(undefined); setIsModalOpen(true); };
  const openEditModal = (data: PatientCase) => { setEditingCase(data); setIsModalOpen(true); };
  const handleNavClick = (tab: typeof activeTab) => { setActiveTab(tab); setIsSidebarOpen(false); };

  // Render Login if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} error={loginError} />;
  }

  // Render Configuration only if authenticated but no script URL
  if (!scriptUrl && !configUrlOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-950">
        <Button onClick={() => setConfigUrlOpen(true)}>Configurar Conexión a Base de Datos</Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-slate-950 transition-colors">
      
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 dark:bg-slate-900 text-white shadow-lg transition-transform duration-300 ease-in-out shrink-0 flex flex-col h-full
        md:static md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between gap-3 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">OncoTrack</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'cases', label: 'Registro de Casos', icon: Table },
            { id: 'reports', label: 'Reportes', icon: FileBarChart },
            { id: 'settings', label: 'Configuración', icon: SettingsIcon }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 sticky bottom-0 bg-slate-900 space-y-2">
           <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>

          <div className="flex items-center gap-3 px-2 py-2 cursor-pointer hover:bg-slate-800 rounded" onClick={() => setConfigUrlOpen(true)}>
             <Database className={`w-4 h-4 ${refreshing ? 'text-blue-400 animate-pulse' : 'text-green-400'}`} />
             <span className={`text-xs ${refreshing ? 'text-blue-400' : 'text-green-400'}`}>
               {refreshing ? 'Sincronizando...' : 'Conexión Activa'}
             </span>
          </div>

          <div className="flex items-center gap-3 px-2 border-t border-slate-800 pt-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-sm text-blue-300">MB</div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">Mariana Braschi</p>
              <p className="text-xs text-slate-500 truncate">mbraschi@oncotrack.com</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 h-full overflow-y-auto bg-gray-50 dark:bg-slate-950 relative w-full transition-colors">
        {loading && (
          <div className="fixed inset-0 bg-white/50 dark:bg-slate-900/50 z-50 flex items-center justify-center backdrop-blur-sm">
             <div className="flex flex-col items-center gap-3">
               <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
               <span className="text-blue-900 dark:text-blue-200 font-medium">Cargando...</span>
             </div>
          </div>
        )}

        <header className="bg-white dark:bg-slate-900 shadow-sm border-b border-gray-200 dark:border-slate-800 sticky top-0 z-20">
          <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center ${activeTab === 'cases' ? 'max-w-full' : 'max-w-7xl'}`}>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 focus:outline-none">
                <Menu className="w-6 h-6" />
              </button>
              <h2 className="text-lg md:text-2xl font-bold text-gray-800 dark:text-white truncate">
                {activeTab === 'dashboard' && 'Resumen Ejecutivo'}
                {activeTab === 'cases' && 'Gestión de Pacientes'}
                {activeTab === 'reports' && 'Generación de Reportes'}
                {activeTab === 'settings' && 'Listas y Configuración'}
              </h2>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                onClick={() => setDarkMode(!darkMode)} 
                title="Cambiar Tema"
                icon={darkMode ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              />
              <Button variant="secondary" onClick={() => loadData(true)} title="Forzar Recarga" icon={<RefreshCw className={`w-4 h-4 ${refreshing || loading ? 'animate-spin' : ''}`} />}>
                 <span className="hidden sm:inline">Refrescar</span>
              </Button>
              {activeTab === 'cases' && (
                <Button onClick={openAddModal} icon={<PlusCircle className="w-4 h-4" />}>
                  <span className="hidden sm:inline">Nuevo Caso</span>
                  <span className="sm:hidden">Nuevo</span>
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 ${activeTab === 'cases' ? 'max-w-full' : 'max-w-7xl'}`}>
          {errorMsg && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-4">
              {errorMsg}
            </div>
          )}
          {activeTab === 'dashboard' && <Dashboard cases={cases} />}
          {activeTab === 'cases' && <CaseList cases={cases} onEdit={openEditModal} onDelete={handleDeleteCase} />}
          {activeTab === 'reports' && <Reports cases={cases} lists={lists} />}
          {activeTab === 'settings' && <Settings lists={lists} onUpdateList={handleUpdateList} />}
        </div>
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCase ? 'Editar Caso' : 'Registrar Nuevo Caso'}>
        <CaseForm initialData={editingCase} lists={lists} onSubmit={editingCase ? handleUpdateCase : handleAddCase} onCancel={() => setIsModalOpen(false)} />
      </Modal>

      <Modal isOpen={configUrlOpen} onClose={() => scriptUrl ? setConfigUrlOpen(false) : null} title="Configuración">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Ingrese la URL del Google Apps Script desplegado.</p>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Script URL</label>
            <input type="text" className="w-full border dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded p-2 text-sm" placeholder="https://script.google.com/..." value={scriptUrl} onChange={(e) => setScriptUrl(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
             <Button onClick={handleSaveUrl} disabled={!scriptUrl}>Guardar y Conectar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;
