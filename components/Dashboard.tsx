
import React, { useState, useMemo } from 'react';
import { PatientCase, CaseStatus } from '../types';
import { Card } from './Card';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Users, Activity, Building, BriefcaseMedical, Filter, Clock } from 'lucide-react';

interface DashboardProps {
  cases: PatientCase[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const Dashboard: React.FC<DashboardProps> = ({ cases }) => {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    sector: 'Todos',
    status: 'Todos',
    pjs: 'Todos',
    aseguradora: 'Todas'
  });

  const normalizeDate = (dateStr: string | undefined): string => {
    if (!dateStr || dateStr === '-') return '';
    const str = String(dateStr).trim();
    // Soporta YYYY-MM, YYYY/MM, YYYY-M, YYYY/M
    const match = str.match(/^(\d{4})[-/](\d{1,2})/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      return `${year}/${month}`;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    return '';
  };

  const calculateMonths = (startStr: string, endStr?: string, status?: string) => {
    if (!startStr) return 0;
    const getYearMonth = (str: string): [number, number] | null => {
      const match = str.match(/^(\d{4})[-/](\d{1,2})/);
      if (match) return [parseInt(match[1]), parseInt(match[2])];
      const d = new Date(str);
      if (!isNaN(d.getTime())) return [d.getFullYear(), d.getMonth() + 1];
      return null;
    };
    const start = getYearMonth(startStr);
    if (!start) return 0;
    let end: [number, number] | null = null;
    if (status === CaseStatus.BAJA && endStr) end = getYearMonth(endStr);
    else if (status !== CaseStatus.BAJA) {
       const now = new Date();
       end = [now.getFullYear(), now.getMonth() + 1];
    }
    if (!end) return 0;
    const months = ((end[0] as number) - (start[0] as number)) * 12 + ((end[1] as number) - (start[1] as number));
    return months < 0 ? 0 : months;
  };

  const uniquePJS = useMemo(() => {
    const pjsSet = new Set(cases.map(c => c.pjs).filter(Boolean));
    return Array.from(pjsSet).sort();
  }, [cases]);

  const uniqueAseguradoras = useMemo(() => {
    const set = new Set(cases.map(c => c.aseguradora).filter(Boolean));
    return Array.from(set).sort();
  }, [cases]);

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const filterStart = normalizeDate(filters.startDate);
      const filterEnd = normalizeDate(filters.endDate);
      const caseDate = normalizeDate(c.fechaIngreso);
      const matchDate = (!filterStart || caseDate >= filterStart) && (!filterEnd || caseDate <= filterEnd);
      const matchSector = filters.sector === 'Todos' || c.sector === filters.sector;
      const matchStatus = filters.status === 'Todos' || c.status === filters.status;
      const matchPJS = filters.pjs === 'Todos' || c.pjs === filters.pjs;
      const matchAseguradora = filters.aseguradora === 'Todas' || c.aseguradora === filters.aseguradora;
      return matchDate && matchSector && matchStatus && matchPJS && matchAseguradora;
    });
  }, [cases, filters]);

  const totalCases = filteredCases.length;
  const activeCases = filteredCases.filter(c => c.status === CaseStatus.ACTIVO).length;
  const publicSector = filteredCases.filter(c => c.sector === 'Público').length;
  const privateSector = filteredCases.filter(c => c.sector === 'Privado').length;

  const avgDuration = useMemo(() => {
    if (totalCases === 0) return 0;
    const totalMonths = filteredCases.reduce((acc, c) => acc + (calculateMonths(c.fechaIngreso, c.fechaBaja, c.status as string) as number), 0);
    return (totalMonths / totalCases).toFixed(1);
  }, [filteredCases, totalCases]);

  const trendData = useMemo(() => {
    const grouped = filteredCases.reduce((acc, curr) => {
      const date = normalizeDate(curr.fechaIngreso);
      if (date) acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const data = Object.keys(grouped).sort().map(date => ({ name: date, registros: (grouped[date] || 0) as number, tendencia: 0 }));
    const n = data.length;
    if (n > 1) {
      let sumX: number = 0, sumY: number = 0, sumXY: number = 0, sumXX: number = 0;
      data.forEach((p, i) => { 
        const registros = p.registros as number;
        sumX += i; 
        sumY += registros; 
        sumXY += i * registros; 
        sumXX += i * i; 
      });
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      return data.map((p, i) => ({ ...p, tendencia: Math.max(0, Number(((slope as number) * i + (intercept as number)).toFixed(1))) }));
    }
    return data.map(d => ({ ...d, tendencia: d.registros }));
  }, [filteredCases]);

  const topStats = (key: keyof PatientCase) => {
    const counts = filteredCases.reduce((acc, curr) => {
      const val = String(curr[key]);
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 5);
  };

  const cityData = useMemo(() => {
    const counts = filteredCases.reduce((acc, curr) => { acc[curr.ciudad] = (acc[curr.ciudad] || 0) + 1; return acc; }, {} as Record<string, number>);
    return Object.keys(counts).map(name => ({ name, casos: counts[name] })).sort((a, b) => (b.casos as number) - (a.casos as number));
  }, [filteredCases]);

  const statusData = useMemo(() => {
    const counts = filteredCases.reduce((acc, curr) => { acc[curr.status] = (acc[curr.status] || 0) + 1; return acc; }, {} as Record<string, number>);
    return Object.keys(counts).map(name => ({ name, value: counts[name] }));
  }, [filteredCases]);

  const StatCard = ({ title, value, icon, color, subtitle }: any) => (
    <Card className={`flex items-center h-full border-l-4 ${color.replace('bg-', 'border-')}`}>
      <div className={`p-3 rounded-full ${color} text-white mr-4`}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
    </Card>
  );

  const TopListCard = ({ title, data, headerColor }: any) => (
    <Card className="h-full flex flex-col" title={title}>
       {data.length > 0 ? (
         <ul className="space-y-3 mt-2">
           {data.map(([name, count]: any, idx: number) => (
             <li key={name} className="flex justify-between items-center text-sm border-b border-gray-100 dark:border-slate-800 pb-2 last:border-0">
               <div className="flex items-center gap-3 overflow-hidden">
                 <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${headerColor}`}>{idx + 1}</span>
                 <span className="text-gray-700 dark:text-gray-300 truncate font-medium" title={name}>{name}</span>
               </div>
               <span className="font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-xs">{count}</span>
             </li>
           ))}
         </ul>
       ) : <p className="text-gray-400 text-sm text-center py-4">Sin datos</p>}
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card className="!p-4 bg-white dark:bg-slate-900 md:sticky md:top-20 z-10 shadow-md">
        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium mr-2">
            <Filter className="w-5 h-5" />
            <span>Filtros:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
            {['startDate', 'endDate'].map(f => (
              <div key={f}>
                <label className="block text-xs text-gray-500 mb-1">{f === 'startDate' ? 'Mes Inicio' : 'Mes Fin'}</label>
                <input type="month" className="w-full text-sm border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md border p-2" value={(filters as any)[f]} onChange={(e) => setFilters(p => ({...p, [f]: e.target.value}))} />
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-500 mb-1">PJS</label>
              <select className="w-full text-sm border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md border p-2" value={filters.pjs} onChange={(e) => setFilters(p => ({...p, pjs: e.target.value}))}>
                <option value="Todos">Todos</option>
                {uniquePJS.map(pjs => <option key={pjs} value={pjs}>{pjs}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Sector</label>
              <select className="w-full text-sm border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md border p-2" value={filters.sector} onChange={(e) => setFilters(p => ({...p, sector: e.target.value}))}>
                <option value="Todos">Todos</option>
                <option value="Público">Público</option>
                <option value="Privado">Privado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Seguro</label>
              <select className="w-full text-sm border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md border p-2" value={filters.aseguradora} onChange={(e) => setFilters(p => ({...p, aseguradora: e.target.value}))}>
                <option value="Todas">Todas</option>
                {uniqueAseguradoras.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Estado</label>
              <select className="w-full text-sm border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-md border p-2" value={filters.status} onChange={(e) => setFilters(p => ({...p, status: e.target.value}))}>
                <option value="Todos">Todos</option>
                <option value={CaseStatus.ACTIVO}>ACTIVO</option>
                <option value={CaseStatus.BAJA}>BAJA</option>
              </select>
            </div>
          </div>
          <button onClick={() => setFilters({ startDate: '', endDate: '', sector: 'Todos', status: 'Todos', pjs: 'Todos', aseguradora: 'Todas' })} className="text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap px-2">Limpiar</button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Casos Filtrados" value={totalCases} icon={<Users />} color="bg-blue-600" />
        <StatCard title="Activos" value={activeCases} icon={<Activity />} color="bg-green-500" />
        <StatCard title="Permanencia Promedio" value={`${avgDuration} m`} subtitle="Meses de tratamiento" icon={<Clock />} color="bg-indigo-500" />
        <StatCard title="Sector Público" value={publicSector} icon={<Building />} color="bg-purple-500" />
        <StatCard title="Sector Privado" value={privateSector} icon={<BriefcaseMedical />} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <TopListCard title="Top PJS" data={topStats('pjs')} headerColor="bg-blue-500" />
        <TopListCard title="Top Médicos" data={topStats('medico')} headerColor="bg-green-500" />
        <TopListCard title="Top Instituciones" data={topStats('institucion')} headerColor="bg-purple-500" />
        <TopListCard title="Top Aseguradoras" data={topStats('aseguradora')} headerColor="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card title="Curva de Efectividad (Registros Mensuales)">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} allowDecimals={false} domain={[0, 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line name="Registros" type="monotone" dataKey="registros" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
                <Line name="Tendencia" type="monotone" dataKey="tendencia" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Distribución por Ciudad" className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
              <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} interval={0} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff' }} />
              <Bar dataKey="casos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Estado de Casos" className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                {statusData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};
