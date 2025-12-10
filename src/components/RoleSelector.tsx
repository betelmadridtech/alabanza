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
import { XCircle, AlertCircle, CheckCircle2, CalendarX2, Star } from "lucide-react"; // Añadido Star

interface RoleSelectorProps {
  slotId: string;       
  label?: string;       
  capability: string;   
  users: User[];
  turno: Turno | "AMBOS"; 
  disabled?: boolean;
  unavailableUsers?: string[]; 
}

export function RoleSelector({ 
  slotId, 
  label, 
  capability, 
  users, 
  turno, 
  disabled,
  unavailableUsers = [] 
}: RoleSelectorProps) {
  
  const { currentAssignments, addAssignment, removeAssignment, selectedDate } = useScheduleStore();

  const assignment = currentAssignments.find(
    (a) => a.role_id === slotId && a.turno === turno
  );

  const selectedUser = users.find(u => u.id === assignment?.user_id);

  // --- FUNCIÓN DE CONFLICTOS ---
  const isYouthRole = (id: string) => id.toLowerCase().includes('youth');

  const getConflictInfo = (userId: string) => {
    return currentAssignments.find(a => {
      if (a.user_id !== userId) return false;
      if (a.role_id === slotId) return false; 

      const timeOverlap = (a.turno === 'AMBOS' || turno === 'AMBOS' || a.turno === turno);
      if (!timeOverlap) return false;

      const currentIsYouth = isYouthRole(slotId);     
      const conflictIsYouth = isYouthRole(a.role_id); 
      if (currentIsYouth !== conflictIsYouth) return false;

      return true;
    });
  };

  const handleSelect = (value: string) => {
    if (value === "CLEAR_SELECTION") {
        removeAssignment(slotId, turno);
        return;
    }
    if (!selectedDate) return;
    
    addAssignment({
      id: crypto.randomUUID(),
      fecha: new Date(selectedDate),
      role_id: slotId, 
      user_id: value,
      turno: turno
    });
  };

  // --- 2. PREPARACIÓN DE DATOS ---
  
  // A. Filtrar solo por CAPACIDAD (PRINCIPAL O SECUNDARIO)
  const qualifiedUsers = users.filter(user => {
    const isPrimary = user.primary_role === capability;
    const isSecondary = user.roles && user.roles.includes(capability);
    return isPrimary || isSecondary;
  });

  // B. Enriquecer datos con estados
  const usersWithStatus = qualifiedUsers.map(user => {
    const conflict = getConflictInfo(user.id);
    const isUnavailableToday = unavailableUsers.includes(user.id); 
    const isPrimary = user.primary_role === capability; // ¿Es su rol fuerte?

    return {
      ...user,
      conflictInfo: conflict,
      isBusy: !!conflict,
      isUnavailableToday: isUnavailableToday,
      isPrimary: isPrimary, // Guardamos este dato para mostrar la estrella
      availability: user.disponibilidad ?? 100
    };
  });

  // C. Ordenar 
  const sortedUsers = usersWithStatus.sort((a, b) => {
    // 1. Si uno está "No disponible hoy" y el otro no, el no disponible va AL FINAL
    if (a.isUnavailableToday !== b.isUnavailableToday) {
        return a.isUnavailableToday ? 1 : -1;
    }

    // 2. Si ambos pueden hoy, miramos si están ocupados en otro puesto
    if (a.isBusy !== b.isBusy) {
        return a.isBusy ? 1 : -1; 
    }

    // 3. Priorizar TITULARES sobre SUPLENTES visualmente
    if (a.isPrimary !== b.isPrimary) {
        return a.isPrimary ? -1 : 1;
    }

    // 4. Desempate por porcentaje
    return b.availability - a.availability;
  });


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
          {selectedUser ? (
             <span className="truncate text-slate-800 font-medium flex items-center gap-1">
                {selectedUser.nombre}
             </span>
          ) : (
             <SelectValue placeholder={label || "Seleccionar..."} />
          )}
        </SelectTrigger>
        
        <SelectContent className="max-h-[300px]">
          
          <SelectItem value="CLEAR_SELECTION" className="text-red-500 font-medium focus:text-red-600 focus:bg-red-50 py-3 mb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <XCircle size={16} />
                    <span>Quitar selección</span>
                </div>
          </SelectItem>

          {sortedUsers.length === 0 ? (
            <div className="p-4 text-sm text-slate-400 text-center italic">
              Nadie con rol: {capability}
            </div>
          ) : (
            sortedUsers.map((user) => {
              const isLowAvailability = user.availability < 20;
              const isDisabled = user.isBusy || user.isUnavailableToday; 

              return (
                <SelectItem 
                  key={user.id} 
                  value={user.id}
                  disabled={isDisabled}
                  className={`
                    py-3 my-1 cursor-pointer border-b border-slate-50 last:border-0
                    ${isDisabled ? "opacity-50 bg-slate-50" : "hover:bg-slate-50"}
                  `}
                >
                  <div className="flex justify-between items-center w-full pr-2">
                    <div className="flex flex-col gap-0.5">
                      {/* Nombre con Estrella si es Titular */}
                      <span className={`text-sm flex items-center gap-1 ${isLowAvailability ? "text-red-600 font-medium" : "text-slate-700"} ${isDisabled ? "line-through text-slate-400 decoration-slate-300" : ""}`}>
                        {user.nombre}
                        {user.isPrimary && <Star size={10} className="text-amber-500 fill-amber-500" />}
                      </span>
                      
                      {/* LÓGICA DE MENSAJES INFERIORES */}
                      {user.isUnavailableToday ? (
                        <span className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                             <CalendarX2 size={10} /> No disponible hoy
                        </span>
                      ) : user.isBusy && user.conflictInfo ? (
                        <span className="text-[11px] text-amber-600 flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded w-fit">
                             <AlertCircle size={10} /> {user.conflictInfo.role_id}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                            {user.isPrimary ? "Rol Titular" : "Rol Secundario"}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col items-end">
                        {!isDisabled && (
                            <div className={`flex items-center gap-1 text-xs ${isLowAvailability ? "text-red-500" : "text-green-600"}`}>
                                {user.availability}%
                                {user.availability > 80 && <CheckCircle2 size={12} />}
                            </div>
                        )}
                         {isDisabled && (
                            <span className="text-[10px] text-slate-400 font-medium">
                                {user.isUnavailableToday ? "BAJA" : "OCUPADO"}
                            </span>
                         )}
                    </div>
                  </div>
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