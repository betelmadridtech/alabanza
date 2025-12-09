// src/components/RoleSelector.tsx
"use client";

import { useScheduleStore } from "@/store/schedule";
import { User, Turno } from "@/types"; 
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { XCircle, AlertCircle } from "lucide-react"; 

interface RoleSelectorProps {
  slotId: string;       
  label?: string;       
  capability: string;   
  users: User[];
  turno: Turno | "AMBOS"; 
  disabled?: boolean;
}

export function RoleSelector({ 
  slotId, 
  label, 
  capability, 
  users, 
  turno, 
  disabled 
}: RoleSelectorProps) {
  
  const { currentAssignments, addAssignment, removeAssignment, selectedDate } = useScheduleStore();

  // 1. Encontrar asignación actual
  const assignment = currentAssignments.find(
    (a) => a.role_id === slotId && a.turno === turno
  );

  const handleSelect = (value: string) => {
    if (value === "CLEAR_SELECTION") {
        removeAssignment(slotId, turno);
        return;
    }

    // CORRECCIÓN: Aseguramos que selectedDate exista y lo usamos
    if (!selectedDate) return;
    
    addAssignment({
      id: crypto.randomUUID(),
      fecha: new Date(selectedDate), // <--- AQUÍ ESTABA EL ERROR
      role_id: slotId, 
      user_id: value,
      turno: turno
    });
  };

  // 2. Filtrado y Ordenamiento
  const qualifiedUsers = users.filter(user => 
    user.roles && user.roles.includes(capability)
  );

  const sortedUsers = [...qualifiedUsers].sort((a, b) => (b.disponibilidad ?? 100) - (a.disponibilidad ?? 100));

  // Helpers
  const isYouthRole = (id: string) => id.toLowerCase().includes('youth');

  // 3. Lógica de conflicto extraída para limpieza
  const checkUserConflict = (userId: string) => {
    return currentAssignments.find(a => {
      if (a.user_id !== userId) return false;
      if (a.role_id === slotId) return false; // No es conflicto consigo mismo en este slot

      // Verificar superposición de turnos
      const timeOverlap = (a.turno === 'AMBOS' || turno === 'AMBOS' || a.turno === turno);
      if (!timeOverlap) return false;

      // Regla de negocio: Youth vs Adultos no chocan (según tu código original)
      const currentIsYouth = isYouthRole(slotId);     
      const conflictIsYouth = isYouthRole(a.role_id); 
      if (currentIsYouth !== conflictIsYouth) return false;

      return true;
    });
  };

  if (disabled) {
    return <div className="h-10 bg-slate-50 border border-slate-100 rounded flex items-center px-3 text-slate-300 text-sm italic">Desactivado</div>;
  }

  return (
    <div className="w-full">
      <Select
        value={assignment?.user_id || ""}
        onValueChange={handleSelect}
      >
        <SelectTrigger className={`w-full ${!assignment ? "text-slate-400" : "text-black font-medium"}`}>
          <SelectValue placeholder={label || "Seleccionar..."} />
        </SelectTrigger>
        
        <SelectContent>
          
          {/* Opción de Limpiar */}
          <SelectItem value="CLEAR_SELECTION" className="text-red-500 font-medium focus:text-red-600 focus:bg-red-50">
                <div className="flex items-center gap-2">
                    <XCircle size={14} />
                    <span>Quitar selección</span>
                </div>
          </SelectItem>
          <div className="h-px bg-slate-100 my-1" />

          {sortedUsers.length === 0 ? (
            <div className="p-2 text-sm text-slate-400 text-center italic">
              Nadie con rol: {capability}
            </div>
          ) : (
            sortedUsers.map((user) => {
              const currentDisp = user.disponibilidad ?? 100;
              const isLowAvailability = currentDisp < 20;
              
              // Verificamos conflicto
              const conflictAssignment = checkUserConflict(user.id);
              const isDisabled = !!conflictAssignment;

              return (
                <SelectItem 
                  key={user.id} 
                  value={user.id}
                  disabled={isDisabled}
                  className="flex justify-between items-center py-2" // Un poco más de espacio vertical
                >
                  <div className="flex flex-col">
                    <span className={`${isLowAvailability ? "text-red-600" : ""} ${isDisabled ? "text-slate-400 line-through decoration-slate-300" : ""}`}>
                      {user.nombre}
                    </span>
                    
                    {/* MEJORA UX: Mostrar por qué está ocupado */}
                    {isDisabled && conflictAssignment && (
                        <span className="text-[10px] text-amber-600 font-medium no-underline flex items-center gap-1">
                             <AlertCircle size={10} /> Ocupado en: {conflictAssignment.role_id}
                        </span>
                    )}
                  </div>

                  <span className="ml-2 text-xs text-slate-400 min-w-[30px] text-right">
                    {!isDisabled && (
                        <>
                            {currentDisp}%
                            {isLowAvailability && " ⚠️"}
                        </>
                    )}
                  </span>
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>
      
      <div className="mt-1 flex justify-end">
        <Badge variant="outline" className="text-[10px] h-4 px-1 text-slate-400 border-slate-200">
          {turno === 'AMBOS' ? 'Todo el día' : turno}
        </Badge>
      </div>
    </div>
  );
}