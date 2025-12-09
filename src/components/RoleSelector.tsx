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

interface RoleSelectorProps {
  slotId: string;       
  label?: string;       
  capability: string;   
  users: User[];
  turno: Turno;
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
  
  const { currentAssignments, addAssignment, selectedDate } = useScheduleStore();

  const assignment = currentAssignments.find(
    (a) => a.role_id === slotId && a.turno === turno
  );

  const handleSelect = (userId: string) => {
    if (!selectedDate) return;
    addAssignment({
      fecha: selectedDate,
      role_id: slotId, 
      user_id: userId,
      turno: turno
    });
  };

  // Filtrado de capacidad (Quién sabe tocar esto)
  const qualifiedUsers = users.filter(user => 
    user.roles && user.roles.includes(capability)
  );

  const sortedUsers = [...qualifiedUsers].sort((a, b) => b.disponibilidad - a.disponibilidad);

  // --- NUEVA LÓGICA DE EXCLUSIÓN ---
  // Función auxiliar para saber si un ID pertenece al grupo de Jóvenes
  // Basado en que los IDs de jóvenes en page.tsx empiezan por 'youth'
  const isYouthRole = (id: string) => id.toLowerCase().includes('youth');

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
          {sortedUsers.length === 0 ? (
            <div className="p-2 text-sm text-slate-400 text-center">
              Nadie con rol: {capability}
            </div>
          ) : (
            sortedUsers.map((user) => {
              const isLowAvailability = user.disponibilidad < 20;
              
              // LÓGICA DE CONFLICTOS ACTUALIZADA
              const userBusy = currentAssignments.find(a => {
                // 1. Si no es este usuario, no hay conflicto
                if (a.user_id !== user.id) return false;

                // 2. Si es ESTE mismo puesto que estamos editando, no cuenta como ocupado
                if (a.role_id === slotId) return false;

                // 3. Verificamos coincidencia de turno (AM/PM/AMBOS)
                const timeOverlap = (a.turno === 'AMBOS' || turno === 'AMBOS' || a.turno === turno);
                if (!timeOverlap) return false;

                // 4. --- LA MAGIA: REGLA DE EXCEPCIÓN PARA JÓVENES ---
                const currentIsYouth = isYouthRole(slotId);     // ¿El puesto que estoy editando es de jóvenes?
                const conflictIsYouth = isYouthRole(a.role_id); // ¿El puesto ocupado es de jóvenes?

                // Si uno es de jóvenes y el otro NO, permitimos la duplicidad (NO hay conflicto)
                if (currentIsYouth !== conflictIsYouth) return false;

                // Si ambos son del mismo grupo (ambos jóvenes o ambos banda), entonces SÍ está ocupado
                return true;
              });

              const isDisabled = !!userBusy;

              return (
                <SelectItem 
                  key={user.id} 
                  value={user.id}
                  disabled={isDisabled}
                  className="flex justify-between items-center"
                >
                  <span className={`${isLowAvailability ? "text-red-600" : ""} ${isDisabled ? "text-slate-300 line-through" : ""}`}>
                    {user.nombre}
                  </span>
                  <span className="ml-2 text-xs text-slate-400">
                    {isDisabled ? "(Ocupado)" : `${user.disponibilidad}%`}
                    {!isDisabled && isLowAvailability && " ⚠️"}
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