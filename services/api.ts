
import { PatientCase, AppLists, ListItem } from '../types';

// Helper para obtener/guardar la URL en localStorage
// Actualizada con la nueva URL provista
export const getApiUrl = () => localStorage.getItem('ONCOTRACK_API_URL') || 'https://script.google.com/macros/s/AKfycbxI5FBEb8_PY1Ui52dqGbkNZhB0PV4jyygHWvR560n30SGIVElk54PEJHWe9RmvTZo/exec';
export const setApiUrl = (url: string) => localStorage.setItem('ONCOTRACK_API_URL', url);

const callScript = async (action: string, payload: any = {}) => {
  const url = getApiUrl();
  if (!url) throw new Error("API URL not configured");

  // CRITICAL FIX: Usamos 'text/plain;charset=utf-8' para evitar que el navegador envíe una petición OPTIONS (Preflight)
  // que Google Apps Script a veces rechaza o no maneja correctamente.
  // Google Apps Script recibirá el body como string y nosotros lo parseamos manualmente en el backend.
  const response = await fetch(url, {
    method: 'POST',
    redirect: "follow",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({ action, ...payload })
  });

  const json = await response.json();
  if (json.error) throw new Error(json.error);
  return json;
};

export const api = {
  // Obtener todos los datos (Casos y Listas)
  getData: async (): Promise<{ cases: PatientCase[], lists: AppLists }> => {
    return callScript('getData');
  },

  // Guardar o Actualizar un caso
  saveCase: async (data: PatientCase): Promise<void> => {
    await callScript('saveCase', { data });
  },

  // Eliminar un caso
  deleteCase: async (id: string): Promise<void> => {
    await callScript('deleteCase', { id });
  },

  // Actualizar una lista completa (categoría)
  updateList: async (key: string, list: ListItem[]): Promise<void> => {
    await callScript('updateList', { key, list });
  },

  // Inicializar/Generar estructura en Google Sheets
  setupDatabase: async (): Promise<{ success: boolean; message: string }> => {
    return callScript('setupDatabase');
  }
};
