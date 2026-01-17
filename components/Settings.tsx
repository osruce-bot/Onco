
import React, { useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Plus, Power, Trash2 } from 'lucide-react';
import { AppLists, ListItem } from '../types';

interface SettingsProps {
  lists: AppLists;
  onUpdateList: (key: keyof AppLists, newList: ListItem[]) => void;
}

const ListManager = ({ 
  title, 
  items, 
  onUpdate
}: { 
  title: string, 
  items: ListItem[], 
  onUpdate: (items: ListItem[]) => void
}) => {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (trimmed) {
      // Check if exists
      if (!items.some(i => i.value.toLowerCase() === trimmed.toLowerCase())) {
        onUpdate([...items, { value: trimmed, active: true }].sort((a, b) => a.value.localeCompare(b.value)));
      } else {
        alert('Este elemento ya existe en la lista.');
      }
      setNewItem('');
    }
  };

  const toggleActive = (val: string) => {
    const updated = items.map(i => 
      i.value === val ? { ...i, active: !i.active } : i
    );
    onUpdate(updated);
  };

  const removePermanently = (val: string) => {
     if(confirm('¿Eliminar permanentemente? Solo se recomienda si el valor nunca fue usado.')) {
        onUpdate(items.filter(i => i.value !== val));
     }
  };

  return (
    <Card title={title} className="h-full">
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Nuevo elemento..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button onClick={handleAdd} size="sm" icon={<Plus className="w-4 h-4" />}>
          Agregar
        </Button>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
        {items.map((item, idx) => (
          <div 
            key={`${item.value}-${idx}`} 
            className={`flex justify-between items-center p-2 rounded text-sm group border ${item.active ? 'bg-white border-gray-100' : 'bg-gray-100 border-gray-200'}`}
          >
            <span className={`${item.active ? 'text-gray-700' : 'text-gray-400 italic line-through'}`}>
              {item.value}
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => toggleActive(item.value)}
                className={`p-1 rounded transition-colors ${item.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-200'}`}
                title={item.active ? "Desactivar" : "Activar"}
              >
                <Power className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => removePermanently(item.value)}
                className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Eliminar permanentemente"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-gray-400 text-xs text-center italic">Lista vacía</p>
        )}
      </div>
    </Card>
  );
};

export const Settings: React.FC<SettingsProps> = ({ lists, onUpdateList }) => {
  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500 bg-blue-50 p-4 rounded-md border border-blue-100 mb-4">
        <strong className="text-blue-700">Nota:</strong> Desactive los elementos (botón Power) en lugar de eliminarlos para mantener la integridad de los registros históricos.
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ListManager 
          title="Gestión de PJS" 
          items={lists.pjs} 
          onUpdate={(list) => onUpdateList('pjs', list)} 
        />
        <ListManager 
          title="Ciudades" 
          items={lists.ciudades} 
          onUpdate={(list) => onUpdateList('ciudades', list)} 
        />
        <ListManager 
          title="Médicos" 
          items={lists.medicos} 
          onUpdate={(list) => onUpdateList('medicos', list)} 
        />
        <ListManager 
          title="Aseguradoras" 
          items={lists.aseguradoras} 
          onUpdate={(list) => onUpdateList('aseguradoras', list)} 
        />
        <ListManager 
          title="Instituciones" 
          items={lists.instituciones} 
          onUpdate={(list) => onUpdateList('instituciones', list)} 
        />
        <ListManager 
          title="Dispensación" 
          items={lists.dispensaciones} 
          onUpdate={(list) => onUpdateList('dispensaciones', list)} 
        />
        <ListManager 
          title="Indicaciones" 
          items={lists.indicaciones} 
          onUpdate={(list) => onUpdateList('indicaciones', list)} 
        />
        <ListManager 
          title="Distribuidores" 
          items={lists.distribuidores} 
          onUpdate={(list) => onUpdateList('distribuidores', list)} 
        />
        <ListManager 
          title="Dosis" 
          items={lists.dosis} 
          onUpdate={(list) => onUpdateList('dosis', list)} 
        />
      </div>
    </div>
  );
};
