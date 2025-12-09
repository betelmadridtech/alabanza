"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, CalendarClock, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ProcessedDate {
  fecha: string; // Viene como string YYYY-MM-DD
  created_at?: string;
}

interface Props {
    onUpdate: () => void; // Para refrescar la app principal si es necesario
}

export function ProcessedDatesManager({ onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [dates, setDates] = useState<ProcessedDate[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("processed_dates")
      .select("*")
      .order("fecha", { ascending: false });

    if (!error && data) {
      setDates(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      fetchDates();
    }
  }, [open]);

  const handleDelete = async (fechaStr: string) => {
    const confirmMsg = "⚠️ ATENCIÓN ⚠️\n\nAl borrar esta fecha:\n1. Se revertirán las disponibilidades de los usuarios (+5% / -5%).\n2. La planificación se mantendrá como 'borrador'.\n\n¿Estás seguro?";
    
    if (!window.confirm(confirmMsg)) return;

    setDeletingId(fechaStr);
    
    // El trigger en la BD se encargará de actualizar las disponibilidades
    const { error } = await supabase
      .from("processed_dates")
      .delete()
      .eq("fecha", fechaStr);

    if (error) {
      alert("Error al eliminar: " + error.message);
    } else {
      // Recargamos la lista local
      await fetchDates();
      // Avisamos al componente padre para que refresque datos si coincide la fecha
      onUpdate();
    }
    setDeletingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="gap-2 text-slate-500 hover:text-slate-800">
          <CalendarClock size={18} />
          <span className="hidden sm:inline">Historial</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fechas Procesadas (Cerradas)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>
                    Estas fechas ya han modificado la disponibilidad de los usuarios. 
                    Si borras una, <strong>el sistema revertirá automáticamente los porcentajes</strong> a su estado anterior.
                </p>
            </div>

          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="animate-spin text-slate-400" />
            </div>
          ) : dates.length === 0 ? (
            <p className="text-center text-slate-400 py-4">No hay fechas procesadas aún.</p>
          ) : (
            <div className="space-y-2">
              {dates.map((item) => {
                const dateObj = new Date(item.fecha + 'T00:00:00'); // Forzar hora local
                return (
                  <div
                    key={item.fecha}
                    className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700 capitalize">
                        {format(dateObj, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                      </span>
                      <span className="text-xs text-slate-400">
                        {item.fecha}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                      disabled={deletingId === item.fecha}
                      onClick={() => handleDelete(item.fecha)}
                    >
                      {deletingId === item.fecha ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}