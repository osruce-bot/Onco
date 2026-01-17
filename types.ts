
export enum CaseStatus {
  ACTIVO = 'ACTIVO',
  BAJA = 'BAJA'
}

export interface PatientCase {
  id: string; // CÓDIGO
  pjs: string; // PJS (Patient Journey Specialist)
  ciudad: string;
  fechaIngreso: string;
  fechaBaja?: string; // Nuevo campo para fecha de baja
  medico: string;
  aseguradora: string;
  sector: string; // Público, Privado
  institucion: string;
  dispensacion: string; // Location of dispensing
  distribuidor: string;
  indicacion: string; // Code like QSDB03
  dosis: string;
  status: CaseStatus | string;
}

export type PatientCaseFormData = Omit<PatientCase, 'id'> & { id?: string };

export interface ListItem {
  value: string;
  active: boolean;
}

export interface AppLists {
  pjs: ListItem[];
  ciudades: ListItem[];
  medicos: ListItem[];
  aseguradoras: ListItem[];
  instituciones: ListItem[];
  dispensaciones: ListItem[];
  indicaciones: ListItem[];
  distribuidores: ListItem[];
  dosis: ListItem[];
}
