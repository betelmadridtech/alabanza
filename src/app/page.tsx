// src/app/page.tsx
"use client";

import { toJpeg } from 'html-to-image';
import { useState, useEffect } from "react";
import { useTeamData } from "@/hooks/useTeamData";
import { useScheduleStore } from "@/store/schedule";
import { supabase } from "@/lib/supabase";
import { User as UserType } from "@/types"; 

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
  Save, Download, Loader2, Power, LogOut, 
  Mic, Guitar, Music, Drum, Sliders, Video, 
  Users, User, Keyboard, Zap,
  Copy, Check, ChevronDown, ImageIcon
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { es } from "date-fns/locale";

// DEFINICIÓN DE LA ESTRUCTURA
const SERVICE_SECTIONS = [
  {
    title: 'Banda',
    category: 'Banda',
    id_dom: 'capture-banda', 
    items: [
      { id: 'worshipLeader', label: 'Líder', req: 'voice', icon: User },
      { id: 'voice1', label: 'Voz 1', req: 'voice', icon: Mic },
      { id: 'voice2', label: 'Voz 2', req: 'voice', icon: Mic },
      { id: 'voice3', label: 'Voz 3', req: 'voice', icon: Mic }, 
      { id: 'voice4', label: 'Voz 4', req: 'voice', icon: Mic }, 
      { id: 'piano', label: 'Piano', req: 'piano', icon: Keyboard },
      { id: 'acousticGuitar', label: 'Acústica', req: 'guitar', icon: Guitar },
      { id: 'bass', label: 'Bajo', req: 'bass', icon: Music },
      { id: 'drums', label: 'Batería', req: 'drums', icon: Drum },
      { id: 'electricGuitar', label: 'Eléctrica', req: 'guitar', icon: Zap },
    ]
  },
  {
    title: 'Técnica (Sonido & Streaming)', 
    category: 'Sonido',
    id_dom: 'capture-tecnica', 
    items: [
      { id: 'sound', label: 'Sala', req: 'media', icon: Sliders }, 
      { id: 'streaming', label: 'Streaming', req: 'media', icon: Video }, 
    ]
  },
  {
    title: 'Jovenes',
    category: 'Jovenes',
    id_dom: 'capture-jovenes',
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
  const [disabledRoles, setDisabledRoles] = useState<string[]>([]);
  const [occupiedDates, setOccupiedDates] = useState<Date[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // 1. ESTADO PARA LOS USUARIOS NO DISPONIBLES (NUEVO)
  const [unavailableUsers, setUnavailableUsers] = useState<string[]>([]);

  // --- EFECTOS ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

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

  // 2. EFECTO PARA CARGAR "NO DISPONIBLES" CUANDO CAMBIA LA FECHA (NUEVO)
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
  }, [selectedDate, session]); // Se ejecuta al cambiar la fecha


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

  // --- HANDLERS ---
  const handleLogout = async () => await supabase.auth.signOut();
  
  const toggleRole = (slotId: string) => {
    setDisabledRoles(prev => prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]);
  };

  const handleSave = async () => {
    if (!selectedDate) return alert("Por favor selecciona una fecha primero");
    
    const allItems = SERVICE_SECTIONS.flatMap(s => s.items);
    const activeItems = allItems.filter(item => !disabledRoles.includes(item.id));
    const requiredTurnos = isSplitService ? ['AM', 'PM'] : ['AMBOS'];
    const missingAssignments: string[] = [];

    activeItems.forEach(item => {
      requiredTurnos.forEach(turnoRequired => {
        const hasAssignment = currentAssignments.some(a => 
          a.role_id === item.id && a.turno === turnoRequired && a.user_id 
        );
        if (!hasAssignment) missingAssignments.push(`${item.label}${isSplitService ? ` (${turnoRequired})` : ''}`);
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

      const { data: existingLock } = await supabase.from('processed_dates').select('fecha').eq('fecha', dateStr).single();
      const isAlreadyProcessed = !!existingLock; 

      if (!confirm(isAlreadyProcessed ? "📅 Guardar cambios (sin alterar disponibilidades)?" : "🚀 Primera vez guardando. ¿Actualizar disponibilidades (+5%/-5%)?")) {
        setIsSaving(false); return;
      }

      await supabase.from('assignments').delete().eq('fecha', dateStr);
      
      const validAssignments = currentAssignments.filter(a => !disabledRoles.includes(a.role_id));
      const dataToInsert = validAssignments.map(a => ({ fecha: dateStr, user_id: a.user_id, role_id: a.role_id, turno: a.turno }));
      
      if (dataToInsert.length > 0) await supabase.from('assignments').insert(dataToInsert);

      if (!isAlreadyProcessed) {
        const workersIds = new Set(dataToInsert.map(a => a.user_id));
        const updates = users.map(user => {
            let d = user.disponibilidad ?? 100;
            d = workersIds.has(user.id) ? d - 5 : d + 5;
            if(d > 100) d = 100; if(d < 0) d = 0;
            return supabase.from('users').update({ disponibilidad: d }).eq('id', user.id);
        });
        await Promise.all(updates);
        await supabase.from('processed_dates').insert([{ fecha: dateStr }]);
        await refreshTeam();
        alert("¡Guardado y estadísticas actualizadas!");
      } else {
        alert("¡Cambios guardados!");
      }

      const { data } = await supabase.from('assignments').select('fecha');
      if(data) setOccupiedDates(Array.from(new Set(data.map(i => i.fecha))).map(d => new Date(d+'T00:00:00')));

    } catch (error) { console.error(error); alert("Error al guardar."); } 
    finally { setIsSaving(false); }
  };

  const handleCopyText = () => {
    if (!selectedDate) return;
    
    const dateStr = selectedDate.toLocaleDateString('es-ES', { dateStyle: 'full' });
    let text = `🗓️ *PLANIFICACIÓN - ${dateStr.toUpperCase()}*\n\n`;

    SERVICE_SECTIONS.forEach(section => {
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

         if (isSplitService) {
             text += `- ${item.label}: AM: ${getNames('AM')} | PM: ${getNames('PM')}\n`;
         } else {
             text += `- ${item.label}: ${getNames('AMBOS')}\n`;
         }
      });
      text += `\n`;
    });
    text += `_Generado con Inchinare App_`;

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
            if (targetId === "report-capture-area") {
                const gridElement = clonedNode.querySelector('#service-grid-layout');
                if (gridElement instanceof HTMLElement) { 
                    gridElement.style.display = 'grid';
                    gridElement.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
                    gridElement.style.gap = '24px'; 
                }
            } else {
                clonedNode.style.borderRadius = '0';
                clonedNode.style.boxShadow = 'none';
                clonedNode.style.border = 'none';
            }
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

  const renderSection = (section: typeof SERVICE_SECTIONS[0]) => {
    const sectionUsers = users.filter(user => {
        if (section.category === 'Banda') return user.es_banda;
        if (section.category === 'Jovenes') return user.es_jovenes;
        return true;
    });

    return (
        <div id={section.id_dom} key={section.title} className="bg-slate-50/50 rounded-xl border border-slate-200/60 p-5 shadow-sm h-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                {section.title}
                {section.badge && <Badge className="bg-slate-800 text-white">{section.badge}</Badge>}
                </h3>
            </div>
            
            <div className="space-y-3">
            {section.items.map(item => {
                const isDisabled = disabledRoles.includes(item.id);
                const Icon = item.icon; 

                return (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
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

                    <div className="flex-1 w-full">
                    {isSplitService ? (
                        <div className="flex gap-2">
                        {/* 3. PASAMOS LA LISTA DE NO DISPONIBLES A LOS SELECTORES (NUEVO) */}
                        <RoleSelector slotId={item.id} label={item.label} capability={item.req} users={sectionUsers} turno="AM" disabled={isDisabled} unavailableUsers={unavailableUsers} />
                        <RoleSelector slotId={item.id} label={item.label} capability={item.req} users={sectionUsers} turno="PM" disabled={isDisabled} unavailableUsers={unavailableUsers} />
                        </div>
                    ) : (
                        <RoleSelector slotId={item.id} label={item.label} capability={item.req} users={sectionUsers} turno="AMBOS" disabled={isDisabled} unavailableUsers={unavailableUsers} />
                    )}
                    </div>
                </div>
                );
            })}
            </div>
        </div>
    );
  };


  // --- RENDERIZADO PRINCIPAL ---

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
                    disabled={(date) => date.getDay() !== 0} 
                    modifiers={{ ocupado: occupiedDates }}
                    modifiersClassNames={{ ocupado: "bg-blue-100 text-blue-700 font-bold hover:bg-blue-200" }}
                />
                <div className="mt-4 flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-sm font-medium text-slate-600">Separar turnos (AM / PM)</span>
                  <Switch checked={isSplitService} onCheckedChange={toggleSplitService} />
                </div>
              </CardContent>
            </Card>
        </div>

        {/* 2. ÁREA DE REPORTE */}
        <div className="w-full max-w-6xl" id="report-capture-area">
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
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={handleLogout}><LogOut size={20} /></Button>
                </div>
              </div>

              <div id="service-grid-layout" className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <div className="w-full">
                      {SERVICE_SECTIONS.filter(s => s.category === 'Banda').map(section => renderSection(section))}
                  </div>
                  <div className="w-full space-y-6">
                        {SERVICE_SECTIONS.filter(s => s.category !== 'Banda').map(section => renderSection(section))}
                  </div>
              </div>
              
            </div>
        </div>

        {/* 3. BARRA INFERIOR MODIFICADA */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t p-4 shadow-2xl z-50">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              
              <div className="flex items-center gap-4 w-full md:w-auto justify-center md:justify-start">
                  <ProcessedDatesManager onUpdate={refreshTeam} />
                  <span className="text-xs font-medium text-slate-400 hidden lg:block">Inchinare Team</span>
              </div>

              <div className="flex items-center gap-2">
                  <Button 
                      variant="ghost" 
                      onClick={handleCopyText} 
                      className={`gap-2 ${copied ? "text-green-600 bg-green-50" : "text-slate-600 hover:bg-slate-100"}`}
                  >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      <span className="hidden sm:inline font-medium">{copied ? "¡Copiado!" : "Copiar Texto"}</span>
                  </Button>

                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="gap-2" disabled={isExporting}>
                              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                              Captura <ChevronDown size={14} className="opacity-50" />
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center">
                          <DropdownMenuItem onClick={() => handleExport("report-capture-area")}>
                              📸 Reporte Completo
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport("capture-banda", "-Banda")}>
                              🎸 Solo Banda
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport("capture-tecnica", "-Tecnica")}>
                              🎚️ Solo Sonido
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport("capture-jovenes", "-Jovenes")}>
                              🌟 Solo Jóvenes
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
              </div>

              <div className="w-full md:w-auto flex justify-center md:justify-end">
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