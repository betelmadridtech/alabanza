// src/app/page.tsx
"use client";

import { toJpeg } from 'html-to-image';
import { useState, useEffect } from "react";
import { useTeamData } from "@/hooks/useTeamData";
import { useScheduleStore } from "@/store/schedule";
import { supabase } from "@/lib/supabase";

// COMPONENTES
import { LoginScreen } from "@/components/LoginScreen";
import { TeamManagerDialog } from "@/components/TeamManagerDialog";
import { RoleSelector } from "@/components/RoleSelector";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// IMPORTAMOS LOS NUEVOS ICONOS AQUÍ 👇
import { 
  Save, Download, Loader2, Power, LogOut, 
  Mic, Guitar, Music, Drum, Sliders, Video, 
  Users, User, Keyboard, Zap 
} from "lucide-react";
import { es } from "date-fns/locale";

// DEFINICIÓN DE LA ESTRUCTURA DEL CULTO CON ICONOS
const SERVICE_SECTIONS = [
  {
    title: 'Banda',
    category: 'Banda',
    items: [
      { id: 'worshipLeader', label: 'Líder', req: 'voice', icon: User }, // Líder diferenciado
      { id: 'voice1', label: 'Voz 1', req: 'voice', icon: Mic },
      { id: 'voice2', label: 'Voz 2', req: 'voice', icon: Mic },
      { id: 'voice3', label: 'Voz 3', req: 'voice', icon: Mic }, 
      { id: 'voice4', label: 'Voz 4', req: 'voice', icon: Mic }, 
      { id: 'piano', label: 'Piano', req: 'piano', icon: Keyboard },
      { id: 'acousticGuitar', label: 'Acústica', req: 'guitar', icon: Guitar },
      { id: 'bass', label: 'Bajo', req: 'bass', icon: Music }, // Usamos nota musical para graves
      { id: 'drums', label: 'Batería', req: 'drums', icon: Drum },
      { id: 'electricGuitar', label: 'Eléctrica', req: 'guitar', icon: Zap },
    ]
  },
  {
    title: 'Sonido',
    category: 'Sonido',
    items: [
      { id: 'sound', label: 'Sala', req: 'media', icon: Sliders }, 
    ]
  },
  {
    title: 'Streaming',
    category: 'Sonido', 
    items: [
      { id: 'streaming', label: 'Streaming', req: 'media', icon: Video }, 
    ]
  },
  {
    title: 'Jovenes',
    category: 'Jovenes',
    badge: 'Sábado',
    items: [
      { id: 'youthLeader', label: 'Líder', req: 'voice', icon: User },
      { id: 'youthVoice1', label: 'Voz 1', req: 'voice', icon: Mic },
      { id: 'youthVoice2', label: 'Voz 2', req: 'voice', icon: Mic }, 
      { id: 'youthGuitar', label: 'Guitarra', req: 'guitar', icon: Guitar },
      { id: 'youthBass', label: 'Bajo', req: 'bass', icon: Music },
      { id: 'youthDrums', label: 'Batería', req: 'drums', icon: Drum },
    ]
  }
];

export default function Home() {
  const { users, loading, refreshTeam } = useTeamData();
  
  const { 
    selectedDate, 
    setDate, 
    isSplitService, 
    toggleSplitService, 
    currentAssignments,
    setAssignments
  } = useScheduleStore();

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [disabledRoles, setDisabledRoles] = useState<string[]>([]);
  const [occupiedDates, setOccupiedDates] = useState<Date[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  // Effect: Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Effect: Fechas ocupadas
  useEffect(() => {
    const fetchOccupiedDates = async () => {
      const { data } = await supabase.from('assignments').select('fecha');
      if (data) {
        const uniqueDates = Array.from(new Set(data.map(item => item.fecha)))
          .map(dateStr => new Date(dateStr + 'T00:00:00')); 
        setOccupiedDates(uniqueDates);
      }
    };
    if (session) fetchOccupiedDates();
  }, [isSaving, session]);

  // Effect: Cargar organización
  useEffect(() => {
    const loadScheduleForDate = async () => {
      if (!selectedDate) {
        setAssignments([]); 
        return;
      }
      setIsLoadingSchedule(true);
      try {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const { data, error } = await supabase
          .from('assignments')
          .select('*')
          .eq('fecha', dateStr);

        if (error) throw error;
        setAssignments(data && data.length > 0 ? data : []);
      } catch (err) {
        console.error("Error al cargar el día:", err);
      } finally {
        setIsLoadingSchedule(false);
      }
    };
    if (session) loadScheduleForDate();
  }, [selectedDate, session, setAssignments]); 

  // Funciones Auxiliares
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const toggleRole = (slotId: string) => {
    setDisabledRoles(prev => 
      prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]
    );
  };

  const handleSave = async () => {
    if (!selectedDate) {
      alert("Por favor selecciona una fecha primero");
      return;
    }

    const allItems = SERVICE_SECTIONS.flatMap(s => s.items);
    const activeItems = allItems.filter(item => !disabledRoles.includes(item.id));
    const requiredTurnos = isSplitService ? ['AM', 'PM'] : ['AMBOS'];
    const missingAssignments: string[] = [];

    activeItems.forEach(item => {
      requiredTurnos.forEach(turnoRequired => {
        const assignmentExists = currentAssignments.some(assignment => 
          assignment.role_id === item.id && 
          assignment.turno === turnoRequired &&
          assignment.user_id 
        );
        if (!assignmentExists) {
          const turnoLabel = isSplitService ? ` (${turnoRequired})` : '';
          missingAssignments.push(`${item.label}${turnoLabel}`);
        }
      });
    });

    if (missingAssignments.length > 0) {
      alert(`⚠️ Faltan asignar personas en:\n\n- ${missingAssignments.join('\n- ')}\n\nAsigna a alguien o apaga el puesto.`);
      return; 
    }

    setIsSaving(true);
    try {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const { data: existingLock, error: lockError } = await supabase
        .from('processed_dates')
        .select('fecha')
        .eq('fecha', dateStr)
        .single();
      
      if (lockError && lockError.code !== 'PGRST116') throw lockError;
      const isAlreadyProcessed = !!existingLock; 

      let confirmMessage = "";
      if (isAlreadyProcessed) {
        confirmMessage = "📅 Este día YA fue guardado anteriormente.\n\nSe guardarán los cambios en el equipo, pero las disponibilidades NO volverán a cambiar.";
      } else {
        confirmMessage = "🚀 Es la primera vez que guardas este día.\n\nSe actualizará la disponibilidad (+5% / -5%) de TODOS los usuarios automáticamente.\n\n¿Es la versión definitiva?";
      }

      if (!confirm(confirmMessage)) {
        setIsSaving(false);
        return;
      }

      const { error: deleteError } = await supabase.from('assignments').delete().eq('fecha', dateStr);
      if (deleteError) throw deleteError;

      const validAssignments = currentAssignments.filter(a => !disabledRoles.includes(a.role_id));
      const dataToInsert = validAssignments.map(a => ({
        fecha: dateStr,
        user_id: a.user_id,
        role_id: a.role_id, 
        turno: a.turno
      }));

      if (dataToInsert.length > 0) {
        const { error: insertError } = await supabase.from('assignments').insert(dataToInsert);
        if (insertError) throw insertError;
      }

      if (!isAlreadyProcessed) {
        console.log("Actualizando estadísticas...");
        const workersIds = new Set(dataToInsert.map(a => a.user_id));

        const updatesPromises = users.map(user => {
            let currentDisp = user.disponibilidad ?? 100;
            if (workersIds.has(user.id)) {
                currentDisp -= 5; 
            } else {
                currentDisp += 5; 
            }
            if (currentDisp > 100) currentDisp = 100;
            if (currentDisp < 0) currentDisp = 0;
            return supabase.from('users').update({ disponibilidad: currentDisp }).eq('id', user.id);
        });

        await Promise.all(updatesPromises);
        await supabase.from('processed_dates').insert([{ fecha: dateStr }]);
        await refreshTeam();
        alert("¡Guardado! Disponibilidades actualizadas correctamente.");
      } else {
        alert("¡Cambios guardados! (Sin alterar disponibilidades).");
      }
      
      const { data } = await supabase.from('assignments').select('fecha');
      if (data) {
        const uniqueDates = Array.from(new Set(data.map(item => item.fecha)))
          .map(dateStr => new Date(dateStr + 'T00:00:00')); 
        setOccupiedDates(uniqueDates);
      }

    } catch (error) {
      console.error(error);
      alert("Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    if (!selectedDate) return;
    setIsExporting(true);
    try {
      const element = document.getElementById("report-capture-area");
      if (!element) return;
      const dataUrl = await toJpeg(element, { quality: 0.95, backgroundColor: '#ffffff', style: { margin: '0' } });
      const link = document.createElement('a');
      link.download = `Inchinare-${selectedDate.toISOString().split('T')[0]}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Error al exportar:", error);
      alert("Error al generar imagen.");
    } finally {
      setIsExporting(false);
    }
  };

  if (authLoading) {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-slate-50">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            <p className="text-slate-500 font-medium">Verificando sesión...</p>
        </div>
    );
  }

  if (!session) return <LoginScreen />;
  if (loading) return <div className="p-10 text-center flex items-center justify-center gap-2"><Loader2 className="animate-spin"/> Cargando equipo...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-24 md:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* PANEL IZQUIERDO */}
        <div className="md:col-span-4 space-y-6">
          <Card>
            <CardHeader><CardTitle>Planificador</CardTitle></CardHeader>
            <CardContent>
              <Calendar
                 mode="single"
                  selected={selectedDate}
                  onSelect={setDate}
                  locale={es}
                  className="rounded-md border shadow-sm mx-auto"
                  disabled={(date) => date.getDay() !== 0} 
                  modifiers={{
                    ocupado: occupiedDates 
                  }}
                  modifiersClassNames={{
                    ocupado: "bg-blue-100 text-blue-700 font-bold hover:bg-blue-200"
                  }}
              />
              <div className="mt-6 flex items-center justify-between bg-slate-100 p-3 rounded-lg">
                <span className="text-sm font-medium">Separar AM / PM</span>
                <Switch checked={isSplitService} onCheckedChange={toggleSplitService} />
              </div>
            </CardContent>
          </Card>
          
          <div className="text-xs text-slate-400 px-2">
            <p>🟢 Botón verde: Puesto activo</p>
            <p>⚪ Botón gris: Puesto desactivado</p>
          </div>
        </div>

        {/* PANEL DERECHO */}
        <div className="md:col-span-8 space-y-6" id="report-capture-area">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative">
            
            {/* OVERLAY DE CARGA */}
            {isLoadingSchedule && (
              <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm rounded-xl">
                 <Loader2 className="animate-spin text-blue-600 mb-2" size={40} />
                 <span className="text-sm font-medium text-slate-600 animate-pulse">Cargando organización...</span>
              </div>
            )}

            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Organización del Culto</h1>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-slate-500">
                    {selectedDate 
                        ? `Fecha: ${selectedDate.toLocaleDateString('es-ES', { dateStyle: 'full' })}`
                        : "Selecciona una fecha..."}
                    </p>
                    {session?.user?.email && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {session.user.email}
                        </span>
                    )}
                </div>
              </div>
        
              <div className="flex gap-2">
                <TeamManagerDialog users={users} onUpdate={refreshTeam} />
                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={handleLogout} title="Cerrar Sesión">
                    <LogOut size={20} />
                </Button>
              </div>
           </div>

            {/* SECCIONES */}
            <div className="space-y-8">
              {SERVICE_SECTIONS.map((section) => {
                
                // Filtro de usuarios
                const sectionUsers = users.filter(user => {
                    if (section.category === 'Banda') return user.es_banda;
                    if (section.category === 'Jovenes') return user.es_jovenes;
                    return true;
                });

                return (
                <div key={section.title} className="border-b last:border-0 pb-4">
                  <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    {section.title}
                    {section.badge && <Badge variant="secondary">{section.badge}</Badge>}
                  </h3>
                  
                  <div className="space-y-3 pl-2">
                    {section.items.map(item => {
                       const isDisabled = disabledRoles.includes(item.id);
                       // Asignamos el icono a una variable para usarlo como componente
                       const Icon = item.icon; 

                       return (
                        <div key={item.id} className="grid grid-cols-12 gap-4 items-center py-1">
                          
                          {/* ETIQUETA + ICONO */}
                          <div className="col-span-4 flex items-center gap-2">
                             <button 
                               onClick={() => toggleRole(item.id)}
                               className={`p-1 rounded-full transition-colors ${isDisabled ? "bg-slate-200 text-slate-400" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
                               title={isDisabled ? "Activar" : "Desactivar"}
                             >
                               <Power size={14} />
                             </button>
                             <div className={`flex items-center gap-2 font-medium text-sm transition-colors ${isDisabled ? "text-slate-300 decoration-slate-300 line-through" : "text-slate-600"}`}>
                               {/* Renderizamos el icono aquí */}
                               <Icon size={16} className={isDisabled ? "text-slate-300" : "text-slate-500"} />
                               {item.label}
                             </div>
                          </div>

                          <div className="col-span-8 flex gap-2">
                            {isSplitService ? (
                              <>
                                <RoleSelector 
                                  slotId={item.id} 
                                  label={item.label} 
                                  capability={item.req} 
                                  users={sectionUsers} 
                                  turno="AM" 
                                  disabled={isDisabled} 
                                />
                                <RoleSelector 
                                  slotId={item.id} 
                                  label={item.label} 
                                  capability={item.req} 
                                  users={sectionUsers} 
                                  turno="PM" 
                                  disabled={isDisabled} 
                                />
                              </>
                            ) : (
                              <RoleSelector 
                                slotId={item.id} 
                                label={item.label} 
                                capability={item.req} 
                                users={sectionUsers} 
                                turno="AMBOS" 
                                disabled={isDisabled} 
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )})}
            </div>
            
          </div>
        </div>
      </div>

      {/* BARRA INFERIOR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-50">
        <div className="max-w-7xl mx-auto flex justify-end gap-4">
            <Button 
              variant="outline" 
              className="gap-2 border-slate-300" 
              onClick={handleExport}
              disabled={isExporting} 
            >
              {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              Descargar Imagen
            </Button>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />} 
              Guardar Cambios
            </Button>
        </div>
      </div>
    </main>
  );
}