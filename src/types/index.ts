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
  roles?: string[];
}

/*export interface Role {
  id: number;
  nombre: string;
  categoria: Categoria;
  es_opcional: boolean;
}*/

export interface Assignment {
  id?: string; // Opcional porque al crearla aun no tiene ID de base de datos
  fecha: Date;
  user_id: string;
  role_id: string;
  turno: Turno;
}

// Esta interfaz nos ayuda a mostrar la lista combinada en el calendario
export interface AssignmentWithDetails extends Assignment {
  user: User;
}
export interface UserRole {
  user_id: string;
  role_id: number;
}