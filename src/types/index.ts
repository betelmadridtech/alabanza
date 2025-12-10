// src/types/index.ts

export type Categoria = 'Banda' | 'Sonido' | 'Streaming' | 'Jovenes';
export type Turno = 'AM' | 'PM' | 'AMBOS';

export interface User {
  id: string;
  nombre: string;
  email?: string;
  disponibilidad: number;
  es_banda?: boolean;
  es_jovenes?: boolean;
  primary_role?: string;
  roles?: string[];
  // NUEVO CAMPO: Referencia al ID de su pareja (si la tiene)
  partner_id?: string | null; 
}

/*export interface Role {
  id: number;
  nombre: string;
  categoria: Categoria;
  es_opcional: boolean;
}*/

export interface Assignment {
  id?: string; 
  fecha: Date;
  user_id: string;
  role_id: string;
  turno: Turno;
}

export interface AssignmentWithDetails extends Assignment {
  user: User;
}

export interface UserRole {
  user_id: string;
  role_id: number;
}