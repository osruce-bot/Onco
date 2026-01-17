
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PatientCase, CaseStatus } from '../types';
import { Card } from './Card';
import { Search, Edit2, Trash2, Filter, X, Check } from 'lucide-react';

interface CaseListProps {
  cases: PatientCase[];
  onEdit: (data: PatientCase) => void;
  onDelete: (id: string) => void;
}

const columnsConfig: { key: keyof PatientCase | 'acc' | 'tiempo'; label: string }[] = [
  { key: 'id', label: 'ID' },
  { key: 'pjs', label: 'PJS' },
  { key: 'ciudad', label: 'Ciudad' },
  { key: 'fechaIngreso', label: 'Ingreso' },
  { key: 'fechaBaja', label: 'Baja' },
  { key: 'tiempo', label: 'Tiempo' },
  { key: 'medico', label: 'Médico' },
  { key: 'aseguradora', label: 'Seguro' },
  { key: 'sector', label: 'Sector' },
  { key: 'institucion', label: 'Institución' },
  { key: 'dispensacion', label: 'Dispens.' },
  { key: 'distribuidor', label: 'Distrib.' },
  { key: 'indicacion', label: 'Ind.' },
  { key: 'dosis', label: 'Dosis' },
  { key: 'status', label: 'Est.' },
  { key: 'acc', label: 'Acc.' }
];

export const CaseList: React.FC<CaseListProps> = ({ cases, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [openFilterCol, setOpenFilterCol] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpenFilterCol(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizeDateForDisplay = (dateStr: string | undefined): string => {
    if (!dateStr || dateStr === '-' || dateStr === '') return '-';
    const str = String(dateStr).trim();
    
    // 1. Intentar patrón simple YYYY/MM o YYYY-MM
    const match = str.match(/^(\d{4})[-/](\d{1,2})/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      return `${year}/${month}`;
    }

    // 2. Fallback para objetos Date o cadenas largas (como se ve en la imagen)
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${year}/${month}`;
    }
    
    return str;
  };

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const matchesSearch = (c.pjs || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.medico || '').toLowerCase().includes(searchTerm.toLowerCase()) || c.id.includes(searchTerm);
      const matchesFilters = Object.entries(filters).every(([key, value]) => !value || String(c[key as keyof PatientCase] || '') === value);
      return matchesSearch && matchesFilters;
    });
  }, [cases, searchTerm, filters]);

  const calculateMonths = (start: string, end?: string, status?: string) => {
    const getYM = (s: string): [number, number] | null => {
      const m = s.match(/^(\d{4})[-/](\d{1,2})/);
      if (m) return [parseInt(m[1]), parseInt(m[2])];
      const d = new Date(s);
      return !isNaN(d.getTime()) ? [d.getFullYear(), d.getMonth() + 1] : null;
    };
    const sYM = getYM(start);
    if (!sYM) return '-';
    let eYM = status === CaseStatus.BAJA && end ? getYM(end) : [new Date().getFullYear(), new Date().getMonth() + 1];
    if (!eYM) return '-';
    return Math.max(0, (eYM[0] - sYM[0]) * 12 + (eYM[1] - sYM[1]));
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col lg:flex-row justify-between gap-4 p-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-gray-400 absolute inset-y-0 left-3 my-auto pointer-events-none" />
          <input type="text" className="block w-full pl-9 pr-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 dark:text-white text-xs" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {searchTerm && <button onClick={() => setSearchTerm('')} className="text-xs text-blue-600">Limpiar</button>}
      </div>

      <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[calc(100vh-220px)] bg-white dark:bg-slate-900">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
          <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0 z-10">
            <tr>
              {columnsConfig.map((col) => (
                <th key={col.key} className="px-1 py-2 text-left text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider relative">
                  <div className="flex items-center justify-between gap-1">
                    <span>{col.label}</span>
                    {col.key !== 'acc' && col.key !== 'tiempo' && (
                      <button onClick={(e) => { e.stopPropagation(); setOpenFilterCol(openFilterCol === col.key ? null : col.key); }} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700">
                        <Filter className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
            {filteredCases.map((c) => (
              <tr key={c.id} className="hover:bg-blue-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-1 py-1.5 text-[10px] font-bold text-gray-900 dark:text-white">{c.id}</td>
                <td className="px-1 py-1.5 text-[10px] text-gray-700 dark:text-gray-300">{c.pjs}</td>
                <td className="px-1 py-1.5 text-[10px] text-gray-700 dark:text-gray-300">{c.ciudad}</td>
                <td className="px-1 py-1.5 text-[10px] text-gray-700 dark:text-gray-300">{normalizeDateForDisplay(c.fechaIngreso)}</td>
                <td className="px-1 py-1.5 text-[10px] text-red-600 dark:text-red-400">{normalizeDateForDisplay(c.fechaBaja)}</td>
                <td className="px-1 py-1.5 text-[10px] text-blue-700 dark:text-blue-400 font-bold">{calculateMonths(c.fechaIngreso, c.fechaBaja, c.status)} m</td>
                <td className="px-1 py-1.5 text-[10px] text-gray-700 dark:text-gray-300 truncate max-w-[100px]">{c.medico}</td>
                <td className="px-1 py-1.5 text-[10px] text-gray-700 dark:text-gray-300">{c.aseguradora}</td>
                <td className="px-1 py-1.5 text-[10px]">
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${c.sector === 'Público' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'}`}>{c.sector.substring(0,3)}</span>
                </td>
                <td className="px-1 py-1.5 text-[10px] text-gray-700 dark:text-gray-300 truncate max-w-[100px]">{c.institucion}</td>
                <td className="px-1 py-1.5 text-[10px] text-gray-700 dark:text-gray-300 truncate max-w-[100px]">{c.dispensacion}</td>
                <td className="px-1 py-1.5 text-[10px] text-gray-700 dark:text-gray-300">{c.distribuidor}</td>
                <td className="px-1 py-1.5 text-[10px] text-gray-700 dark:text-gray-300">{c.indicacion}</td>
                <td className="px-1 py-1.5 text-[10px] text-gray-700 dark:text-gray-300">{c.dosis}</td>
                <td className="px-1 py-1.5 text-[10px]">
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${c.status === CaseStatus.ACTIVO ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'}`}>{c.status === CaseStatus.ACTIVO ? 'ACT' : 'BAJA'}</span>
                </td>
                <td className="px-1 py-1.5">
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(c)} className="text-blue-600 dark:text-blue-400 p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30"><Edit2 className="w-3 h-3" /></button>
                    <button onClick={() => onDelete(c.id)} className="text-red-400 p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-50 dark:bg-slate-800 border-t dark:border-slate-700 p-2 text-[10px] text-gray-500 dark:text-gray-400 text-right">{filteredCases.length} registros</div>
    </Card>
  );
};
