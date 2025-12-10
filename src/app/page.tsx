// src/app/page.tsx
"use client";

import { toJpeg } from 'html-to-image';
import { useState, useEffect } from "react";
import { useTeamData } from "@/hooks/useTeamData";
import { useScheduleStore } from "@/store/schedule";
import { supabase } from "@/lib/supabase";
import { User as UserType } from "@/types"; 

// IMPORTAMOS LA FUNCIÓN DEL ALGORITMO
import { generateAutoAssignments } from "@/lib/utils";

// COMPONENTES DE VISTAS
import { LoginScreen } from "@/components/LoginScreen";
import { TeamManagerDialog } from "@/components/TeamManagerDialog";
import { RoleSelector } from "@/components/RoleSelector";
import { ProcessedDatesManager } from "@/components/ProcessedDatesManager"; 
import { MemberLogin } from "@/components/MemberLogin";
import { UserAvailabilityView } from "@/components/UserAvailabilityView";

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Save, Loader2, Power, LogOut, 
  Mic, Guitar, Music, Drum, Sliders, Video, 
  User, Keyboard, Zap, MessageCircle, 
  Copy, Check, ImageIcon, Sparkles // Trash2 ELIMINADO para evitar errores
} from "lucide-react";
import { es } from "date-fns/locale";

// DEFINICIÓN DE LA ESTRUCTURA CON EMOJIS
const SERVICE_SECTIONS = [
  {
    title: 'Banda',
    category: 'Banda',
    id_dom: 'capture-banda', 
    items: [
      { id: 'worshipLeader', label: 'Líder', req: 'voice', icon: User, emoji: '🎙️' },
      // Indemn Banda (Descomenta si lo quieres activar)
      // { id: 'indemnMain', label: 'Indemn', req: 'indemn', icon: MessageCircle, emoji: '🙏' }, 
      { id: 'voice1', label: 'Voz 1', req: 'voice', icon: Mic, emoji: '🎤' },
      { id: 'voice2', label: 'Voz 2', req: 'voice', icon: Mic, emoji: '🎤' },
      { id: 'voice3', label: 'Voz 3', req: 'voice', icon: Mic, emoji: '🎤' }, 
      { id: 'voice4', label: 'Voz 4', req: 'voice', icon: Mic, emoji: '🎤' },
      { id: 'voice5', label: 'Voz 5', req: 'voice', icon: Mic, emoji: '🎤' }, 
      { id: 'voice6', label: 'Voz 6', req: 'voice', icon: Mic, emoji: '🎤' }, 
      { id: 'piano', label: 'Piano', req: 'piano', icon: Keyboard, emoji: '🎹' },
      { id: 'acousticGuitar', label: 'Acústica', req: 'guitar', icon: Guitar, emoji: '🎸' },
      { id: 'bass', label: 'Bajo', req: 'bass', icon: Music, emoji: '🎸' },
      { id: 'drums', label: 'Batería', req: 'drums', icon: Drum, emoji: '🥁' },
      { id: 'electricGuitar', label: 'Eléctrica', req: 'guitar', icon: Zap, emoji: '⚡' },
    ]
  },
  {
    title: 'Sonido', 
    category: 'Sonido',
    id_dom: 'capture-tecnica', 
    items: [
      { id: 'sound', label: 'Sala', req: 'media', icon: Sliders, emoji: '🎚️' }, 
      { id: 'streaming', label: 'Streaming', req: 'media', icon: Video, emoji: '🎥' }, 
    ]
  },
  {
    title: 'Jovenes',
    category: 'Jovenes',
    id_dom: 'capture-jovenes',
    badge: 'Sábado',
    items: [
      { id: 'youthLeader', label: 'Líder', req: 'voice', icon: User, emoji: '🗣️' },
      { id: 'indemnYouth', label: 'Indemn', req: 'indemn', icon: MessageCircle, emoji: '🙏' },
      { id: 'youthVoice1', label: 'Voz 1', req: 'voice', icon: Mic, emoji: '🎤' },
      { id: 'youthVoice2', label: 'Voz 2', req: 'voice', icon: Mic, emoji: '🎤' },
      { id: 'youthPiano', label: 'Piano', req: 'piano', icon: Keyboard, emoji: '🎹' },
      { id: 'youthGuitar', label: 'Guitarra', req: 'guitar', icon: Guitar, emoji: '🎸' },
      { id: 'youthBass', label: 'Bajo', req: 'bass', icon: Music, emoji: '🎸' },
      { id: 'youthDrums', label: 'Batería', req: 'drums', icon: Drum, emoji: '🥁' },
    ]
  }
];

export default function Home() {
  const [session, setSession] = useState<any>(null); 
  const [selectedMember, setSelectedMember] = useState<UserType | null>(null); 
  const [showAdminLogin, setShowAdminLogin] = useState(false); 
  const [authLoading, setAuthLoading] = useState(true);

  const { users, loading, refreshTeam } = useTeamData();
  const { 
    selectedDate, setDate, isSplitService, toggleSplitService, 
    currentAssignments, setAssignments
  } = useScheduleStore();

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false); 
  
  const [disabledRoles, setDisabledRoles] = useState<string[]>(['voice5', 'voice6']);
  
  const [occupiedDates, setOccupiedDates] = useState<Date[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [unavailableUsers, setUnavailableUsers] = useState<string[]>([]);

  // --- FUNCIÓN CENTRALIZADA PARA REFRESCAR EL CALENDARIO ---
  const refreshOccupiedDates = async () => {
    const { data } = await supabase.from('assignments').select('fecha');
    if (data) {
      const uniqueDates = Array.from(new Set(data.map(item => item.fecha)))
        .map(dateStr => new Date(dateStr + 'T00:00:00')); 
      setOccupiedDates(uniqueDates);
    }
  };

  // --- EFECTOS ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  // Cargar fechas ocupadas al iniciar o cambiar sesión
  useEffect(() => {
    if (session) refreshOccupiedDates();
  }, [session]);

  useEffect(() => {
    const fetchUnavailable = async () => {
      if (!selectedDate) {
        setUnavailableUsers([]);
        return;
      }
      
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const { data } = await supabase
        .from('unavailability')
        .select('user_id')
        .eq('fecha', dateStr);
        
      if (data) {
        setUnavailableUsers(data.map(item => item.user_id));
      } else {
        setUnavailableUsers([]);
      }
    };

    if (session) fetchUnavailable();
  }, [selectedDate, session]); 


  useEffect(() => {
    const loadScheduleForDate = async () => {
      if (!selectedDate) { setAssignments([]); return; }
      setIsLoadingSchedule(true);
      try {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const { data, error } = await supabase.from('assignments').select('*').eq('fecha', dateStr);
        if (error) throw error;
        setAssignments(data && data.length > 0 ? data : []);
      } catch (err) { console.error(err); } 
      finally { setIsLoadingSchedule(false); }
    };
    if (session) loadScheduleForDate();
  }, [selectedDate, session, setAssignments]); 

  // --- NUEVO EFECTO: LIMPIEZA AUTOMÁTICA DE DATOS ANTIGUOS ---
  useEffect(() => {
    const cleanupOldData = async () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const { error } = await supabase
        .from('unavailability')
        .delete()
        .lt('fecha', dateStr);

      if (error) console.error("Error limpiando datos antiguos:", error);
    };

    if (session) {
        cleanupOldData();
    }
  }, [session]);


  // --- HANDLERS ---
  const handleLogout = async () => await supabase.auth.signOut();
  
  const toggleRole = (slotId: string) => {
    setDisabledRoles(prev => prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]);
  };

  // --- HANDLER: AUTO SELECCIÓN ---
  const handleAutoSchedule = async () => {
    if (!selectedDate) return alert("Por favor selecciona una fecha primero.");
    
    setIsAutoGenerating(true);
    try {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // 1. Calcular Requisitos
        const requirements: Record<string, number> = {};
        const allItems = SERVICE_SECTIONS.flatMap(s => s.items);
        const isSaturday = selectedDate.getDay() === 6;
        const isSunday = selectedDate.getDay() === 0;

        // Filtramos items según el día
        const relevantItems = allItems.filter(item => {
             if (isSunday && item.id.toLowerCase().includes('youth')) return false;
             if (isSaturday && !item.id.toLowerCase().includes('youth')) return false;
             return !disabledRoles.includes(item.id); 
        });

        relevantItems.forEach(item => {
            const isAssigned = currentAssignments.some(a => a.role_id === item.id);
            if (!isAssigned) {
                const roleName = item.req; 
                requirements[roleName] = (requirements[roleName] || 0) + 1;
            }
        });

        if (Object.keys(requirements).length === 0) {
            alert("Todos los puestos activos ya están cubiertos.");
            setIsAutoGenerating(false);
            return;
        }

        // 2. Determinar Grupo Objetivo
        const requiredGroup = isSaturday ? 'es_jovenes' : 'es_banda';

        // 3. Ejecutar Algoritmo
        const suggestions = generateAutoAssignments(
            users, 
            requirements, 
            dateStr,
            unavailableUsers,
            requiredGroup 
        );

        if (suggestions.length === 0) {
            alert("No se encontraron candidatos adecuados para este grupo.");
            setIsAutoGenerating(false);
            return;
        }

        // 4. Aplicar sugerencias
        const newAssignments = [...currentAssignments];

        suggestions.forEach(sug => {
            const targetSlot = relevantItems.find(item => 
                item.req === sug.role && 
                !newAssignments.some(a => a.role_id === item.id) 
            );

            if (targetSlot) {
                newAssignments.push({
                    user_id: sug.userId,
                    role_id: targetSlot.id,
                    fecha: new Date(dateStr), 
                    turno: 'AMBOS' 
                } as any);
            }
        });

        setAssignments(newAssignments);
        alert(`✨ Se han sugerido ${suggestions.length} personas.`);

    } catch (e) {
        console.error(e);
        alert("Error generando organización automática.");
    } finally {
        setIsAutoGenerating(false);
    }
  };


  const handleSave = async () => {
    if (!selectedDate) return alert("Por favor selecciona una fecha primero");
    
    // --- VALIDACIONES DE SIEMPRE ---
    const isSaturday = selectedDate.getDay() === 6;
    const effectiveSplit = isSaturday ? false : isSplitService;
    const allItems = SERVICE_SECTIONS.flatMap(s => s.items);
    const activeItems = allItems.filter(item => !disabledRoles.includes(item.id));
    const requiredTurnos = effectiveSplit ? ['AM', 'PM'] : ['AMBOS'];
    const missingAssignments: string[] = [];

    activeItems.forEach(item => {
      requiredTurnos.forEach(turnoRequired => {
        const hasAssignment = currentAssignments.some(a => 
          a.role_id === item.id && a.turno === turnoRequired && a.user_id 
        );
        const isSunday = selectedDate.getDay() === 0;
        if (isSunday && item.id.toLowerCase().includes('youth')) return;
        if (isSaturday && !item.id.toLowerCase().includes('youth')) return;
        if (!hasAssignment) missingAssignments.push(`${item.label}${effectiveSplit ? ` (${turnoRequired})` : ''}`);
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

      // 1. CHEQUEO: ¿YA ESTABA GUARDADO ESTE DÍA?
      const { data: existingLock } = await supabase.from('processed_dates').select('fecha').eq('fecha', dateStr).single();
      const isAlreadyProcessed = !!existingLock; 

      const msg = isAlreadyProcessed 
        ? "🔄 EDITAR ORGANIZACIÓN EXISTENTE:\nSe recalcularán las disponibilidades (+/- 10%) solo para las personas que cambien de estado (Trabajar <-> Descansar)."
        : "🚀 NUEVA ORGANIZACIÓN:\nSe aplicará la regla estándar (+5% Descanso / -5% Trabajo).";

      if (!confirm(msg)) {
        setIsSaving(false); return;
      }

      // 2. SI ES EDICIÓN, NECESITAMOS SABER QUIÉN TRABAJABA ANTES DE BORRARLO
      let oldWorkersIds = new Set<string>();
      if (isAlreadyProcessed) {
         const { data: oldAssignments } = await supabase.from('assignments').select('user_id').eq('fecha', dateStr);
         if (oldAssignments) {
            oldWorkersIds = new Set(oldAssignments.map(a => a.user_id));
         }
      }

      // 3. BORRADO Y GUARDADO DE DATOS (ASSIGNMENTS)
      await supabase.from('assignments').delete().eq('fecha', dateStr);
      
      const validAssignments = currentAssignments.filter(a => !disabledRoles.includes(a.role_id));
      const dataToInsert = validAssignments.map(a => ({ fecha: dateStr, user_id: a.user_id, role_id: a.role_id, turno: a.turno }));
      
      if (dataToInsert.length > 0) await supabase.from('assignments').insert(dataToInsert);

      // 4. CÁLCULO INTELIGENTE DE DISPONIBILIDAD
      // Conjunto de los NUEVOS trabajadores
      const newWorkersIds = new Set(dataToInsert.map(a => a.user_id));
      
      const updates = users.map(user => {
          let currentDisp = Number(user.disponibilidad ?? 100); 
          let change = 0; // Cuánto vamos a sumar o restar

          if (!isAlreadyProcessed) {
              // --- ESCENARIO A: PRIMERA VEZ (Estándar) ---
              // Si trabaja: -5. Si descansa: +5.
              change = newWorkersIds.has(user.id) ? -5 : 5;
          } else {
              // --- ESCENARIO B: CORRECCIÓN (Diferencial) ---
              const wasWorking = oldWorkersIds.has(user.id);
              const isWorking = newWorkersIds.has(user.id);

              if (wasWorking && !isWorking) {
                  // Antes trabajaba -> Ahora descansa (+10)
                  change = 10;
                  console.log(`🔄 ${user.nombre}: Sale del equipo (+10)`);
              } else if (!wasWorking && isWorking) {
                  // Antes descansaba -> Ahora trabaja (-10)
                  change = -10;
                  console.log(`🔄 ${user.nombre}: Entra al equipo (-10)`);
              }
          }

          // Solo lanzamos actualización si hay cambio real
          if (change !== 0) {
              let newDisp = currentDisp + change;
              if (newDisp > 100) newDisp = 100;
              if (newDisp < 0) newDisp = 0;
              return supabase.from('users').update({ disponibilidad: newDisp }).eq('id', user.id);
          }
          return null;
      });
      
      await Promise.all(updates.filter(u => u !== null));

      if (!isAlreadyProcessed) {
          await supabase.from('processed_dates').insert([{ fecha: dateStr }]);
      }

      await refreshTeam();
      await refreshOccupiedDates();
      
      alert("¡Organización actualizada correctamente!");

    } catch (error) { 
        console.error("ERROR AL GUARDAR:", error); 
        alert("Error al guardar. Revisa la consola."); 
    } finally { 
        setIsSaving(false); 
    }
  };

  const handleCopyText = () => {
    if (!selectedDate) return;
    
    const dateStr = selectedDate.toLocaleDateString('es-ES', { dateStyle: 'full' });
    let text = `🗓️ *PLANIFICACIÓN - ${dateStr.toUpperCase()}*\n\n`;

    const isSaturday = selectedDate.getDay() === 6;
    const isSunday = selectedDate.getDay() === 0;
    
    const effectiveSplit = isSaturday ? false : isSplitService;

    SERVICE_SECTIONS.forEach(section => {
      if (isSunday && section.category === 'Jovenes') return;
      if (isSaturday && section.category !== 'Jovenes') return;

      const activeItemsInSection = section.items.filter(item => !disabledRoles.includes(item.id));
      if (activeItemsInSection.length === 0) return;

      text += `*${section.title.toUpperCase()}*\n`;
      
      activeItemsInSection.forEach(item => {
         const getNames = (turno: string) => {
           const assignment = currentAssignments.find(a => a.role_id === item.id && a.turno === turno);
           if (!assignment) return "Pendiente";
           const user = users.find(u => u.id === assignment.user_id);
           return user ? user.nombre : "Desconocido";
         };

         if (effectiveSplit) {
             text += `- ${item.emoji} ${item.label}: AM: ${getNames('AM')} | PM: ${getNames('PM')}\n`;
         } else {
             text += `- ${item.emoji} ${item.label}: ${getNames('AMBOS')}\n`;
         }
      });
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (targetId: string = "report-capture-area", filenameSuffix: string = "") => {
    if (!selectedDate) return;
    setIsExporting(true);
    try {
      const element = document.getElementById(targetId);
      if (!element) {
        alert("No se encontró el elemento para exportar.");
        return;
      }
      
      const options = { 
        quality: 0.95, 
        backgroundColor: '#ffffff',
        width: 1200, 
        style: { 
            margin: '0',
            minWidth: '1200px',
            maxWidth: '1200px',
            height: 'auto',
            padding: '40px'
        },
        onClone: (clonedNode: HTMLElement) => {
            clonedNode.style.borderRadius = '0';
            clonedNode.style.boxShadow = 'none';
            clonedNode.style.border = 'none';
        }
      } as any;

      const dataUrl = await toJpeg(element, options);
      const link = document.createElement('a');
      
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');

      link.download = `Inchinare${filenameSuffix}-${year}-${month}-${day}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (e) { 
        console.error("Error export:", e); 
        alert("Error al exportar"); 
    } finally { 
        setIsExporting(false); 
    }
  };

  const renderRoleRow = (item: any, category: string) => {
    const isDisabled = disabledRoles.includes(item.id);
    const Icon = item.icon; 
    
    const sectionUsers = users.filter(user => {
        if (category === 'Banda') return user.es_banda;
        if (category === 'Jovenes') return user.es_jovenes;
        return true;
    });

    const isSaturday = selectedDate?.getDay() === 6;
    const showSplit = isSplitService && !isSaturday; 

    return (
        <div key={item.id} className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 bg-white p-2 rounded-lg border border-slate-100 shadow-sm h-full">
            <div className="flex items-center gap-3 min-w-[130px]">
                <button 
                    onClick={() => toggleRole(item.id)}
                    className={`p-1.5 rounded-md transition-colors ${isDisabled ? "bg-slate-100 text-slate-400" : "bg-green-50 text-green-600 hover:bg-green-100"}`}
                >
                    <Power size={14} />
                </button>
                <div className={`flex items-center gap-2 font-medium text-sm ${isDisabled ? "text-slate-300 line-through" : "text-slate-700"}`}>
                    <Icon size={16} className={isDisabled ? "text-slate-300" : "text-slate-500"} />
                    {item.label}
                </div>
            </div>

            <div className="flex-1 w-full flex items-center">
            {showSplit ? (
                <div className="flex gap-2 w-full">
                    <RoleSelector slotId={item.id} label={item.label} capability={item.req} users={sectionUsers} turno="AM" disabled={isDisabled} unavailableUsers={unavailableUsers} />
                    <RoleSelector slotId={item.id} label={item.label} capability={item.req} users={sectionUsers} turno="PM" disabled={isDisabled} unavailableUsers={unavailableUsers} />
                </div>
            ) : (
                <RoleSelector slotId={item.id} label={item.label} capability={item.req} users={sectionUsers} turno="AMBOS" disabled={isDisabled} unavailableUsers={unavailableUsers} />
            )}
            </div>
        </div>
    );
  };

  if (authLoading) return <div className="h-screen w-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  if (session) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 pb-24 flex flex-col items-center gap-8">
        
        {/* 1. CALENDARIO */}
        <div className="w-full max-w-md space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-center text-slate-700">Planificador</CardTitle></CardHeader>
              <CardContent>
                <Calendar
                    mode="single" selected={selectedDate} onSelect={setDate} locale={es}
                    className="rounded-md mx-auto flex justify-center"
                    disabled={(date) => date.getDay() !== 0 && date.getDay() !== 6}
                    modifiers={{ ocupado: occupiedDates }}
                    modifiersClassNames={{ ocupado: "bg-blue-100 text-blue-700 font-bold hover:bg-blue-200" }}
                />
                
                {selectedDate?.getDay() !== 6 && (
                  <div className="mt-4 flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-sm font-medium text-slate-600">Separar turnos (AM / PM)</span>
                    <Switch checked={isSplitService} onCheckedChange={toggleSplitService} />
                  </div>
                )}
              </CardContent>
            </Card>
        </div>

        {/* 2. ÁREA DE REPORTE */}
        <div className="w-full max-w-5xl" id="report-capture-area">
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200 relative">
              
              {isLoadingSchedule && (
                <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm rounded-xl">
                    <Loader2 className="animate-spin text-blue-600 mb-2" size={40} />
                    <span className="text-sm font-medium text-slate-600 animate-pulse">Cargando organización...</span>
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Organización del Culto</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                      <Badge variant="outline" className="text-base px-3 py-1 border-slate-300 font-normal text-slate-600">
                          {selectedDate ? selectedDate.toLocaleDateString('es-ES', { dateStyle: 'full' }) : "Selecciona fecha..."}
                      </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <TeamManagerDialog users={users} onUpdate={refreshTeam} />
                  
                  {/* --- BOTÓN: AUTO SELECCIÓN --- */}
                  <Button 
                    variant="secondary" 
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={handleAutoSchedule}
                    disabled={isAutoGenerating || !selectedDate}
                  >
                     {isAutoGenerating ? <Loader2 className="animate-spin h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                     Auto-Organizar
                  </Button>

                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={handleLogout}><LogOut size={20} /></Button>
                </div>
              </div>

              <div id="service-grid-layout" className="flex flex-col gap-6">
                  
                  {selectedDate?.getDay() === 0 && (
                      <>
                        <div id="capture-banda" className="bg-slate-50/50 rounded-xl border border-slate-200/60 p-5 shadow-sm">
                             <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-700">Banda</h3>
                             </div>
                             
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pl-1">Instrumentos</h4>
                                    <div className="space-y-3">
                                        {SERVICE_SECTIONS
                                            .find(s => s.category === 'Banda')
                                            ?.items
                                            .filter(item => item.req !== 'voice') 
                                            .map(item => renderRoleRow(item, 'Banda'))
                                        }
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pl-1">Voces</h4>
                                    <div className="space-y-3">
                                        {SERVICE_SECTIONS
                                            .find(s => s.category === 'Banda')
                                            ?.items
                                            .filter(item => item.req === 'voice')
                                            .map(item => renderRoleRow(item, 'Banda'))
                                        }
                                    </div>
                                </div>
                             </div>
                        </div>

                        <div id="capture-tecnica" className="bg-slate-50/50 rounded-xl border border-slate-200/60 p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-700">Técnica</h3>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                 {SERVICE_SECTIONS
                                    .find(s => s.category === 'Sonido')
                                    ?.items
                                    .map(item => renderRoleRow(item, 'Sonido'))
                                 }
                            </div>
                        </div>
                      </>
                  )}

                  {selectedDate?.getDay() === 6 && (
                        <div className="w-full max-w-2xl mx-auto">
                           <div className="bg-slate-50/50 rounded-xl border border-slate-200/60 p-5 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-700 mb-4 flex gap-2">
                                    Jóvenes <Badge className="bg-slate-800">Sábado</Badge>
                                </h3>
                                <div className="space-y-3">
                                    {SERVICE_SECTIONS
                                        .find(s => s.category === 'Jovenes')
                                        ?.items
                                        .map(item => renderRoleRow(item, 'Jovenes'))
                                    }
                                </div>
                           </div>
                       </div>
                  )}

                  {!selectedDate && (
                      <div className="col-span-full text-center py-10 text-slate-400">
                          Selecciona un día en el calendario para comenzar.
                      </div>
                  )}
              </div>
              
            </div>
        </div>

        {/* 3. BARRA INFERIOR */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t p-4 shadow-2xl z-50">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              
              <div className="flex items-center gap-4 w-full md:w-auto justify-center md:justify-start">
                  <ProcessedDatesManager onUpdate={refreshTeam} />
                  <span className="text-xs font-medium text-slate-400 hidden lg:block">Inchinare Team</span>
              </div>

              <div className="flex items-center gap-3">
                  <Button 
                      variant="outline" 
                      onClick={handleCopyText} 
                      className={`gap-2 border-slate-300`}
                  >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      <span className="hidden sm:inline font-medium">{copied ? "Copiado" : "Copiar Texto"}</span>
                  </Button>

                  <Button 
                      variant="outline"
                      onClick={() => handleExport("report-capture-area")}
                      disabled={isExporting}
                      className="gap-2 border-slate-300"
                  >
                      {isExporting ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                      <span className="hidden sm:inline font-medium">Guardar Imagen</span>
                  </Button>
              </div>

              {/* DERECHA: Solo botón Guardar (El botón borrar ha sido movido al historial) */}
              <div className="w-full md:w-auto flex justify-center md:justify-end gap-2">
                  <Button className="gap-2 bg-blue-600 hover:bg-blue-700 w-full md:w-auto" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Guardar
                  </Button>
              </div>

          </div>
        </div>

      </main>
    );
  }

  if (selectedMember) {
      return (
        <UserAvailabilityView 
            user={selectedMember} 
            onBack={() => setSelectedMember(null)} 
        />
      );
  }

  if (showAdminLogin) {
      return (
        <div className="relative">
             <button 
                onClick={() => setShowAdminLogin(false)}
                className="absolute top-4 left-4 z-50 text-slate-500 hover:text-slate-800 text-sm font-medium flex items-center gap-1 bg-white/80 p-2 rounded backdrop-blur"
             >
                ← Volver
             </button>
             <LoginScreen />
        </div>
      );
  }

  return (
    <MemberLogin 
        onSelectUser={setSelectedMember} 
        onAdminClick={() => setShowAdminLogin(true)} 
    />
  );
}