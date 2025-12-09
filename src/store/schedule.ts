// src/store/schedule.ts
import { create } from 'zustand';
import { Assignment, Turno } from '@/types';

interface ScheduleState {
  // Datos (Estado)
  selectedDate: Date | undefined;
  isSplitService: boolean; 
  currentAssignments: Assignment[]; 

  // Acciones
  setDate: (date: Date | undefined) => void;
  toggleSplitService: () => void;
  addAssignment: (assignment: Assignment) => void;
  
  // --- CAMBIO AQUÍ: roleId ahora es string ---
  removeAssignment: (roleId: string, turno: Turno) => void;
  
  setAssignments: (assignments: Assignment[]) => void;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  selectedDate: new Date(), 
  isSplitService: false,    
  currentAssignments: [],

  setDate: (date) => set({ selectedDate: date }),
  
  toggleSplitService: () => set((state) => ({ isSplitService: !state.isSplitService })),

  addAssignment: (newAssignment) => set((state) => {
    // 1. Filtramos para quitar si ya había alguien en ese puesto y turno
    // (TypeScript ya sabe que a.role_id es string gracias al tipo Assignment)
    const filtered = state.currentAssignments.filter(
      (a) => !(a.role_id === newAssignment.role_id && a.turno === newAssignment.turno)
    );
    // 2. Añadimos la nueva
    return { currentAssignments: [...filtered, newAssignment] };
  }),

  // Aquí el parámetro roleId recibe un string (ej: 'worshipLeader')
  removeAssignment: (roleId, turno) => set((state) => ({
    currentAssignments: state.currentAssignments.filter(
      (a) => !(a.role_id === roleId && a.turno === turno)
    )
  })),

  setAssignments: (list) => set({ currentAssignments: list })
}));