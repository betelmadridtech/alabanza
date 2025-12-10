// src/components/UserAvailabilityView.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@/types";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Save, RotateCcw } from "lucide-react";
import { es } from "date-fns/locale";

interface Props {
  user: User;
  onBack: () => void;
}

export function UserAvailabilityView({ user, onBack }: Props) {
  // Guardamos las fechas como STRINGS ("YYYY-MM-DD") para facilitar la comparación
  const [originalDates, setOriginalDates] = useState<string[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false); // Cargando inicial
  const [isSaving, setIsSaving] = useState(false); // Guardando cambios

  // 1. CARGA INICIAL
  useEffect(() => {
    const fetchAvailability = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('unavailability')
        .select('fecha')
        .eq('user_id', user.id);
      
      if (data) {
        const dates = data.map(d => d.fecha); // Ya vienen como YYYY-MM-DD
        setOriginalDates(dates);
        setSelectedDates(dates); // Inicialmente son iguales
      }
      setLoading(false);
    };
    fetchAvailability();
  }, [user.id]);

  // 2. MANEJAR CLIC EN FECHA (Solo local, no guarda en BD aún)
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    // Convertir a YYYY-MM-DD usando hora local para evitar problemas de zona horaria
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Lógica de Toggle (Si existe se quita, si no existe se añade)
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(prev => prev.filter(d => d !== dateStr));
    } else {
      setSelectedDates(prev => [...prev, dateStr]);
    }
  };

  // 3. GUARDAR CAMBIOS EN BASE DE DATOS
  const handleSaveChanges = async () => {
    setIsSaving(true);

    // Calcular diferencias
    const toAdd = selectedDates.filter(d => !originalDates.includes(d));
    const toRemove = originalDates.filter(d => !selectedDates.includes(d));

    try {
      // Borrar las que el usuario desmarcó
      if (toRemove.length > 0) {
        const { error: delError } = await supabase
          .from('unavailability')
          .delete()
          .eq('user_id', user.id)
          .in('fecha', toRemove);
        if (delError) throw delError;
      }

      // Insertar las nuevas marcadas
      if (toAdd.length > 0) {
        const { error: insError } = await supabase
          .from('unavailability')
          .insert(toAdd.map(dateStr => ({ user_id: user.id, fecha: dateStr })));
        if (insError) throw insError;
      }

      // Actualizar el estado "original" para que coincida con lo nuevo
      setOriginalDates(selectedDates);
      alert("¡Disponibilidad actualizada correctamente!");

    } catch (error) {
      console.error(error);
      alert("Error al guardar cambios");
    } finally {
      setIsSaving(false);
    }
  };

  // Función auxiliar para saber si hay cambios pendientes
  const hasChanges = JSON.stringify(originalDates.sort()) !== JSON.stringify(selectedDates.sort());

  // Convertimos los strings a Date objects para el calendario
  const blockedDatesObjects = selectedDates.map(dateStr => new Date(dateStr + 'T00:00:00'));

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center justify-center">
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        
        {/* HEADER */}
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b mb-4">
           <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2">
             <ArrowLeft size={20} className="text-slate-500" />
           </Button>
           <div className="text-right">
             <CardTitle className="text-lg font-bold text-slate-800">Hola, {user.nombre.split(' ')[0]}</CardTitle>
             <p className="text-xs text-slate-500">Marca los días que <span className="text-red-600 font-bold">NO</span> puedes venir</p>
           </div>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center">
           
           {loading ? (
             <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500"/></div>
           ) : (
             <div className="w-full flex flex-col items-center">
               <Calendar
                  mode="single"
                  selected={undefined}
                  onSelect={handleDateSelect}
                  locale={es}
                  className="rounded-md border shadow-sm p-3 bg-white mb-4"
                  // 👇 AQUÍ ESTÁ LA LÓGICA DE BLOQUEO DE DÍAS 👇
                  disabled={(date) => {
                    // Deshabilitar pasado (ayer hacia atrás)
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    if (date < today) return true;
                    
                    // Deshabilitar todo lo que NO sea Domingo (0)
                    return date.getDay() !== 0;
                  }}
                  modifiers={{
                    blocked: blockedDatesObjects
                  }}
                  modifiersClassNames={{
                    blocked: "bg-red-500 text-white font-bold hover:bg-red-600 hover:text-white rounded-md"
                  }}
               />
               
               {/* LEYENDA */}
               <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-600 w-full mb-6">
                  <div className="flex items-center gap-3 mb-2">
                     <div className="w-6 h-6 bg-red-500 rounded text-center text-white text-xs flex items-center justify-center font-bold">X</div>
                     <span>No disponible</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-6 h-6 bg-transparent rounded border border-slate-200"></div>
                     <span>Disponible</span>
                  </div>
               </div>

               {/* BOTÓN GUARDAR */}
               <div className="w-full flex gap-3">
                 {hasChanges && (
                    <Button 
                      variant="outline" 
                      className="flex-1 border-slate-300 text-slate-500"
                      onClick={() => setSelectedDates(originalDates)} // Resetear cambios
                      disabled={isSaving}
                    >
                      <RotateCcw size={16} className="mr-2"/>
                      Cancelar
                    </Button>
                 )}
                 
                 <Button 
                    className={`flex-1 ${hasChanges ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 text-slate-500 cursor-not-allowed"}`}
                    onClick={handleSaveChanges}
                    disabled={!hasChanges || isSaving}
                 >
                    {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save size={18} className="mr-2"/>}
                    {isSaving ? "Guardando..." : "Guardar Cambios"}
                 </Button>
               </div>
             </div>
           )}

        </CardContent>
      </Card>
    </div>
  );
}