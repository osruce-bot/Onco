
import React, { useState, useEffect } from 'react';
import { PatientCase, PatientCaseFormData, CaseStatus, AppLists, ListItem } from '../types';
import { Button } from './Button';

interface CaseFormProps {
  initialData?: PatientCase;
  lists: AppLists;
  onSubmit: (data: PatientCaseFormData) => void;
  onCancel: () => void;
}

export const CaseForm: React.FC<CaseFormProps> = ({ initialData, lists, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<PatientCaseFormData>({
    pjs: '', ciudad: '', fechaIngreso: new Date().toISOString().slice(0, 7).replace('-', '/'),
    fechaBaja: '', medico: '', aseguradora: '', sector: 'Público', institucion: '',
    dispensacion: '', distribuidor: '', indicacion: '', dosis: '', status: CaseStatus.ACTIVO
  });

  useEffect(() => {
    if (initialData) {
      const cleanDate = (d: any) => {
        if (!d || d === '-' || d === '') return '';
        const str = String(d).trim();
        const match = str.match(/^(\d{4})[-/](\d{1,2})/);
        if (match) {
          const year = match[1];
          const month = match[2].padStart(2, '0');
          return `${year}/${month}`;
        }
        const date = new Date(d);
        return !isNaN(date.getTime()) ? `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}` : d;
      };
      setFormData({ 
        ...initialData, 
        fechaIngreso: cleanDate(initialData.fechaIngreso), 
        fechaBaja: cleanDate(initialData.fechaBaja) 
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<any>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'status') newData.fechaBaja = value === CaseStatus.BAJA ? new Date().toISOString().slice(0, 7).replace('-', '/') : '';
      return newData;
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length > 6) val = val.slice(0, 6);
    let fmt = val;
    if (val.length > 4) {
      fmt = `${val.slice(0, 4)}/${val.slice(4)}`;
    }
    setFormData(prev => ({ ...prev, [e.target.name]: fmt }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanData = { ...formData };
    // Validación final de formato YYYY/MM para fechas
    const dateFields: (keyof PatientCaseFormData)[] = ['fechaIngreso', 'fechaBaja'];
    dateFields.forEach(field => {
      const val = cleanData[field];
      if (val && typeof val === 'string' && val !== '-') {
        const match = val.match(/^(\d{4})[-/](\d{1,2})/);
        if (match) {
          cleanData[field] = `${match[1]}/${match[2].padStart(2, '0')}`;
        }
      }
    });

    Object.keys(cleanData).forEach(k => { if (typeof (cleanData as any)[k] === 'string') (cleanData as any)[k] = (cleanData as any)[k].trim(); });
    onSubmit(cleanData);
  };

  const inputClass = "mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300";

  const renderCombobox = (label: string, name: keyof PatientCaseFormData, options: ListItem[]) => (
    <div>
      <label className={labelClass}>{label}</label>
      <input type="text" name={name} list={`list-${name}`} required value={formData[name] as string} onChange={handleChange} className={inputClass} placeholder="Seleccione o escriba..." autoComplete="off" />
      <datalist id={`list-${name}`}>{options.filter(i => i.active).map(item => <option key={item.value} value={item.value} />)}</datalist>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs p-2 rounded">
        <strong>Tip:</strong> Seleccione de la lista o escriba un valor nuevo. Formato fecha: 2025/01.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderCombobox("PJS (Gestor)", "pjs", lists.pjs)}
        {renderCombobox("Ciudad", "ciudad", lists.ciudades)}
        <div>
          <label className={labelClass}>Fecha Ingreso (YYYY/MM)</label>
          <input type="text" name="fechaIngreso" required maxLength={7} value={formData.fechaIngreso} onChange={handleDateChange} className={inputClass} placeholder="2025/01" />
        </div>
        {renderCombobox("Nombre Médico", "medico", lists.medicos)}
        {renderCombobox("Aseguradora", "aseguradora", lists.aseguradoras)}
        <div>
          <label className={labelClass}>Sector</label>
          <select name="sector" value={formData.sector} onChange={handleChange} className={inputClass}>
            <option value="Público">Público</option>
            <option value="Privado">Privado</option>
          </select>
        </div>
        {renderCombobox("Institución", "institucion", lists.instituciones)}
        {renderCombobox("Dispensación", "dispensacion", lists.dispensaciones)}
        {renderCombobox("Distribuidor", "distribuidor", lists.distribuidores)}
        {renderCombobox("Indicación", "indicacion", lists.indicaciones)}
        {renderCombobox("Dosis", "dosis", lists.dosis)}
        <div>
          <label className={labelClass}>Status</label>
          <select name="status" value={formData.status} onChange={handleChange} className={inputClass}>
            <option value={CaseStatus.ACTIVO}>ACTIVO</option>
            <option value={CaseStatus.BAJA}>BAJA</option>
          </select>
        </div>
        {formData.status === CaseStatus.BAJA && (
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-100 dark:border-red-900">
            <label className="block text-sm font-medium text-red-700 dark:text-red-400">Fecha de Baja (YYYY/MM)</label>
            <input type="text" name="fechaBaja" required maxLength={7} value={formData.fechaBaja || ''} onChange={handleDateChange} className={`${inputClass} !border-red-500`} placeholder="2025/02" />
          </div>
        )}
      </div>
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-slate-800">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Guardar Caso</Button>
      </div>
    </form>
  );
};
