
import React, { useState, useMemo } from 'react';
import { PatientCase, AppLists, CaseStatus } from '../types';
import { Card } from './Card';
import { Button } from './Button';
import { Download, Filter, Calendar, List, PieChart, Activity } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  cases: PatientCase[];
  lists: AppLists;
}

type ReportType = 'listado' | 'ejecutivo' | 'seguimiento';

export const Reports: React.FC<ReportsProps> = ({ cases, lists }) => {
  const [reportType, setReportType] = useState<ReportType>('listado');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'Todos',
    ciudad: 'Todas',
    institucion: 'Todas',
    medico: 'Todos',
    aseguradora: 'Todas'
  });

  const normalizeDate = (dateStr: string | undefined): string => {
    if (!dateStr || dateStr === '-') return '';
    const str = String(dateStr).trim();
    const match = str.match(/^(\d{4})[-/](\d{1,2})/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      return `${year}/${month}`;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${year}/${month}`;
    }
    return '';
  };

  const calculateMonths = (startStr: string, endStr?: string, status?: string) => {
    if (!startStr) return '-';
    const getYearMonth = (str: string): [number, number] | null => {
      const match = str.match(/^(\d{4})[-/](\d{1,2})/);
      if (match) return [parseInt(match[1]), parseInt(match[2])];
      const d = new Date(str);
      if (!isNaN(d.getTime())) return [d.getFullYear(), d.getMonth() + 1];
      return null;
    };
    const start = getYearMonth(startStr);
    if (!start) return '-';
    let end: [number, number] | null = null;
    if (status === CaseStatus.BAJA && endStr) end = getYearMonth(endStr);
    else if (status !== CaseStatus.BAJA) {
       const now = new Date();
       end = [now.getFullYear(), now.getMonth() + 1];
    }
    if (!end) return '-';
    const months = (end[0] - start[0]) * 12 + (end[1] - start[1]);
    return months < 0 ? 0 : months; 
  };

  const filteredData = useMemo(() => {
    return cases.filter(c => {
      const filterStart = normalizeDate(filters.startDate);
      const filterEnd = normalizeDate(filters.endDate);
      const caseDate = normalizeDate(c.fechaIngreso);
      const matchDate = (!filterStart || caseDate >= filterStart) && (!filterEnd || caseDate <= filterEnd);
      const matchStatus = filters.status === 'Todos' || c.status === filters.status;
      const matchCity = filters.ciudad === 'Todas' || (c.ciudad || '').toLowerCase().trim() === filters.ciudad.toLowerCase().trim();
      const matchInst = filters.institucion === 'Todas' || (c.institucion || '').toLowerCase().trim() === filters.institucion.toLowerCase().trim();
      const matchMedico = filters.medico === 'Todos' || (c.medico || '').toLowerCase().trim() === filters.medico.toLowerCase().trim();
      const matchAseguradora = filters.aseguradora === 'Todas' || (c.aseguradora || '').toLowerCase().trim() === filters.aseguradora.toLowerCase().trim();
      return matchDate && matchStatus && matchCity && matchInst && matchMedico && matchAseguradora;
    });
  }, [cases, filters]);

  const getGroupedData = (key: keyof PatientCase) => {
    const counts = filteredData.reduce((acc, curr) => {
      const val = String(curr[key] || 'Sin Dato').trim();
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).sort(([,a], [,b]) => (b as number) - (a as number));
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const generatePDF = () => {
    const doc = new jsPDF({ orientation: reportType === 'ejecutivo' ? 'portrait' : 'landscape' });
    const currentDate = new Date().toLocaleDateString('es-PE');
    let title = reportType === 'listado' ? 'Reporte General' : reportType === 'ejecutivo' ? 'Reporte Ejecutivo' : 'Reporte de Seguimiento';

    doc.setFontSize(16); doc.setTextColor(41, 128, 185); doc.text(title, 14, 20);
    doc.setFontSize(10); doc.setTextColor(100); doc.text(`Fecha: ${currentDate} | Registros: ${filteredData.length}`, 14, 28);
    
    if (reportType === 'listado') {
      const tableColumn = ["ID", "PJS", "Ciudad", "Ingreso", "Tiempo (m)", "Médico", "Institución", "Seguro", "Estado"];
      const tableRows = filteredData.map(c => [
        c.id, c.pjs, c.ciudad, normalizeDate(c.fechaIngreso), calculateMonths(c.fechaIngreso, c.fechaBaja, c.status as string), c.medico, c.institucion, c.aseguradora, c.status
      ]);
      autoTable(doc, { head: [tableColumn], body: tableRows, startY: 35, theme: 'grid', styles: { fontSize: 7 } });
    } else if (reportType === 'ejecutivo') {
      let finalY = 35;
      const sections = [['Estado', 'status'], ['PJS', 'pjs'], ['Médicos', 'medico'], ['Ciudades', 'ciudad'], ['Instituciones', 'institucion'], ['Seguros', 'aseguradora']];
      sections.forEach(([label, key]) => {
        doc.setFontSize(11); doc.setTextColor(0); doc.text(`Por ${label}`, 14, finalY);
        autoTable(doc, { startY: finalY + 2, head: [[label, 'Cantidad']], body: getGroupedData(key as any).slice(0, 10), theme: 'striped' });
        finalY = (doc as any).lastAutoTable.finalY + 10;
        if (finalY > 250) { doc.addPage(); finalY = 20; }
      });
    } else if (reportType === 'seguimiento') {
      const tableColumn = ["ID", "PJS", "Médico", "Ingreso", "Baja", "Meses", "Estado"];
      const tableRows = filteredData.map(c => [
        c.id, c.pjs, c.medico, normalizeDate(c.fechaIngreso), normalizeDate(c.fechaBaja), calculateMonths(c.fechaIngreso, c.fechaBaja, c.status as string), c.status
      ]);
      autoTable(doc, { head: [tableColumn], body: tableRows, startY: 35, theme: 'grid', styles: { fontSize: 9 } });
    }
    doc.save(`reporte_${reportType}_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const renderPreviewContent = () => {
    if (filteredData.length === 0) return <div className="text-center py-8 text-gray-500">No hay datos que coincidan con los filtros.</div>;
    
    if (reportType === 'listado' || reportType === 'seguimiento') {
      return (
        <div className="overflow-x-auto border dark:border-slate-800 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0">
              <tr>
                {["ID", "PJS", "Ciudad", "Ingreso", "Baja", "Tiempo", "Médico", "Institución", "Seguro", "Estado"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
              {filteredData.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2 text-[10px] font-medium text-gray-900 dark:text-white">{c.id}</td>
                  <td className="px-3 py-2 text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{c.pjs}</td>
                  <td className="px-3 py-2 text-[10px] text-gray-500 dark:text-gray-400">{c.ciudad}</td>
                  <td className="px-3 py-2 text-[10px] text-gray-500 dark:text-gray-400">{normalizeDate(c.fechaIngreso)}</td>
                  <td className="px-3 py-2 text-[10px] text-red-400">{normalizeDate(c.fechaBaja) || '-'}</td>
                  <td className="px-3 py-2 text-[10px] text-blue-600 font-bold">{calculateMonths(c.fechaIngreso, c.fechaBaja, c.status as string)} m</td>
                  <td className="px-3 py-2 text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[120px]">{c.medico}</td>
                  <td className="px-3 py-2 text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[120px]">{c.institucion}</td>
                  <td className="px-3 py-2 text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[100px]">{c.aseguradora}</td>
                  <td className="px-3 py-2 text-[10px]">
                    <span className={`px-2 py-0.5 inline-flex text-[9px] font-semibold rounded-full ${c.status === CaseStatus.ACTIVO ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'}`}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[['Distribución por Estado', 'status'], ['Distribución por PJS', 'pjs'], ['Principales Instituciones', 'institucion'], ['Principales Seguros', 'aseguradora']].map(([title, key], idx) => (
          <div key={idx} className="border dark:border-slate-800 rounded-lg p-4 bg-white dark:bg-slate-900 shadow-sm">
            <h4 className="font-semibold text-xs text-gray-700 dark:text-gray-300 mb-3 border-b dark:border-slate-800 pb-2 flex justify-between">
              <span>{title}</span>
              <span className="text-blue-500">n={filteredData.length}</span>
            </h4>
            <ul className="space-y-2">
              {getGroupedData(key as any).slice(0, 8).map(([k, val]) => (
                <li key={k} className="flex justify-between text-[11px]">
                  <span className="text-gray-600 dark:text-gray-400 truncate max-w-[150px]" title={k}>{k}</span>
                  <span className="font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 px-1.5 rounded">{val}</span>
                </li>
              ))}
              {getGroupedData(key as any).length === 0 && <li className="text-gray-400 italic text-[10px]">Sin datos</li>}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[ { id: 'listado', label: 'Listado General', icon: List }, { id: 'ejecutivo', label: 'Resumen Ejecutivo', icon: PieChart }, { id: 'seguimiento', label: 'Control de Permanencia', icon: Activity } ].map((t) => (
          <button key={t.id} onClick={() => setReportType(t.id as any)} className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${reportType === t.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm' : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-400 hover:border-blue-300'}`}>
            <t.icon className="w-6 h-6 mb-2" />
            <span className="font-semibold text-sm">{t.label}</span>
          </button>
        ))}
      </div>

      <Card title="Filtros de Reporte" icon={<Filter className="w-5 h-5" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
          {['startDate', 'endDate'].map(f => (
            <div key={f}>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{f === 'startDate' ? 'Mes Inicio' : 'Mes Fin'}</label>
              <input type="month" className="w-full text-sm border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md border p-2" value={(filters as any)[f]} onChange={(e) => handleFilterChange(f, e.target.value)} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
            <select className="w-full text-sm border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md border p-2" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
              <option value="Todos">Todos</option>
              <option value={CaseStatus.ACTIVO}>ACTIVO</option>
              <option value={CaseStatus.BAJA}>BAJA</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Médico</label>
            <select className="w-full text-sm border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md border p-2" value={filters.medico} onChange={(e) => handleFilterChange('medico', e.target.value)}>
              <option value="Todos">Todos</option>
              {lists.medicos.filter(m => m.active).map(m => <option key={m.value} value={m.value}>{m.value}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Ciudad</label>
            <select className="w-full text-sm border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md border p-2" value={filters.ciudad} onChange={(e) => handleFilterChange('ciudad', e.target.value)}>
              <option value="Todas">Todas</option>
              {lists.ciudades.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
            </select>
          </div>
          <div>
             <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Institución</label>
             <select className="w-full text-sm border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md border p-2" value={filters.institucion} onChange={(e) => handleFilterChange('institucion', e.target.value)}>
               <option value="Todas">Todas</option>
               {lists.instituciones.filter(i => i.active).map(i => <option key={i.value} value={i.value}>{i.value}</option>)}
             </select>
          </div>
          <div>
             <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Seguro</label>
             <select className="w-full text-sm border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md border p-2" value={filters.aseguradora} onChange={(e) => handleFilterChange('aseguradora', e.target.value)}>
               <option value="Todas">Todas</option>
               {lists.aseguradoras.filter(a => a.active).map(a => <option key={a.value} value={a.value}>{a.value}</option>)}
             </select>
          </div>
        </div>
        <div className="flex justify-between items-center border-t dark:border-slate-800 pt-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Resultados filtrados: <span className="font-bold text-gray-900 dark:text-white">{filteredData.length}</span>
          </div>
          <div className="flex gap-3">
             <Button variant="secondary" size="sm" onClick={() => setFilters({ startDate: '', endDate: '', status: 'Todos', ciudad: 'Todas', institucion: 'Todas', medico: 'Todos', aseguradora: 'Todas' })}>Limpiar Filtros</Button>
             <Button onClick={generatePDF} size="sm" icon={<Download className="w-4 h-4" />} disabled={filteredData.length === 0}>Descargar PDF</Button>
          </div>
        </div>
      </Card>

      <Card title={`Vista Previa de Información (${reportType === 'listado' ? 'Listado' : reportType === 'ejecutivo' ? 'Ejecutivo' : 'Seguimiento'})`}>
        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
          {renderPreviewContent()}
        </div>
      </Card>
    </div>
  );
};
