"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@/types";
import { GENERIC_ROLES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Trash2, Pencil, Save, Plus, Loader2, Heart, Star } from "lucide-react"; 
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface TeamManagerProps {
  users: User[];
  onUpdate: () => void;
}

export function TeamManagerDialog({ users, onUpdate }: TeamManagerProps) {
  const [open, setOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  // Estados para la edición
  const [editName, setEditName] = useState("");
  
  // Estados: ROLES
  const [primaryRole, setPrimaryRole] = useState<string>(""); 
  const [secondaryRoles, setSecondaryRoles] = useState<string[]>([]);
  
  // Estados para grupos
  const [isBanda, setIsBanda] = useState(false);
  const [isJovenes, setIsJovenes] = useState(false);

  // Estados para parejas
  const [hasPartner, setHasPartner] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // --- FUNCIÓN HELPER: LIMPIAR FORMULARIO (NUEVA) ---
  const resetForm = () => {
    setEditingUserId(null);
    setEditName("");
    setPrimaryRole("");
    setSecondaryRoles([]);
    setIsBanda(false);
    setIsJovenes(false);
    setHasPartner(false);
    setSelectedPartnerId("");
  };

  // Abrir modo edición
  const startEditing = (user: User) => {
    resetForm(); // Limpiamos primero por seguridad
    setEditingUserId(user.id);
    setEditName(user.nombre);
    
    // Cargar roles
    setPrimaryRole(user.primary_role || "");
    setSecondaryRoles(user.roles || []);
    
    setIsBanda(user.es_banda || false);
    setIsJovenes(user.es_jovenes || false);
    
    // Cargar datos de pareja
    if (user.partner_id) {
        setHasPartner(true);
        setSelectedPartnerId(user.partner_id);
    } else {
        setHasPartner(false);
        setSelectedPartnerId("");
    }

    setIsCreating(false);
  };

  // Cancelar / Cerrar formulario
  const cancelEdit = () => {
    setIsCreating(false);
    resetForm();
  };

  // Iniciar creación (CORREGIDO)
  const handleCreateNew = () => {
    resetForm();        // 1. Limpiamos datos viejos
    setIsCreating(true); // 2. Abrimos el formulario
    // IMPORTANTE: Ya no llamamos a cancelEdit() aquí
  };

  const handleSave = async () => {
    if (!editName.trim()) return alert("El nombre es obligatorio");
    if (!isBanda && !isJovenes) return alert("Debes seleccionar al menos un grupo (Banda o Jóvenes)");
    
    // Validación de rol principal
    if (!primaryRole) return alert("Debes seleccionar un Rol Principal obligatoriamente.");

    // Validación de pareja
    if (hasPartner && !selectedPartnerId) return alert("Si marcas 'Casado', debes seleccionar a su pareja.");

    setLoading(true);
    try {
      // Limpiamos los secundarios: El rol principal NO debe estar repetido en secundarios
      const cleanSecondaryRoles = secondaryRoles.filter(r => r !== primaryRole);

      const payload = {
        nombre: editName,
        primary_role: primaryRole,      // Guardamos el titular
        roles: cleanSecondaryRoles,     // Guardamos los secundarios
        disponibilidad: 100, 
        es_banda: isBanda,
        es_jovenes: isJovenes,
        partner_id: (hasPartner && selectedPartnerId) ? selectedPartnerId : null
      };

      if (isCreating) {
        const { error } = await supabase.from('users').insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('users').update(payload).eq('id', editingUserId);
        if (error) throw error;
      }

      onUpdate();
      cancelEdit();

    } catch (error) {
      console.error(error);
      alert("Error al guardar cambios");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("¿Seguro que quieres borrar a esta persona?")) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;
      onUpdate();
    } catch (error) {
      alert("Error al borrar");
    }
  };

  const toggleSecondaryRole = (roleId: string) => {
    if (roleId === primaryRole) return; 

    setSecondaryRoles(prev => 
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  const getRoleLabel = (roleId: string) => {
    return GENERIC_ROLES.find(r => r.id === roleId)?.label || roleId;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Gestionar Equipo">
          <Settings size={20} />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Gestión de Personas</DialogTitle>
          <DialogDescription>Configura roles principales, secundarios y parejas.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-1 flex flex-col">
          {editingUserId || isCreating ? (
            <div className="space-y-5 p-5 border rounded-md bg-slate-50 overflow-y-auto max-h-[65vh]">
              
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-xl flex items-center gap-2 text-slate-800">
                    {isCreating ? <><Plus size={20}/> Nueva Persona</> : <><Pencil size={20}/> Editando Perfil</>}
                </h3>
                <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancelar</Button>
              </div>
              
              {/* --- NOMBRE DESTACADO --- */}
              <div className="space-y-2 bg-blue-50 p-4 rounded-lg border border-blue-200 shadow-md">
                <Label className="text-blue-800 font-bold text-md">Nombre Completo</Label>
                <Input 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    placeholder="Ej: Ana García" 
                    className="bg-white text-lg font-medium h-11"
                />
              </div>

              {/* GRUPOS */}
              <div className="space-y-2 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <Label className="mb-3 block text-slate-700 font-bold text-sm uppercase tracking-wider">Grupos de pertenencia</Label>
                <div className="flex gap-6">
                    <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded border">
                        <Checkbox id="grp-banda" checked={isBanda} onCheckedChange={(v) => setIsBanda(!!v)} />
                        <label htmlFor="grp-banda" className="text-sm font-medium cursor-pointer select-none">Banda Principal</label>
                    </div>
                    <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded border">
                        <Checkbox id="grp-jovenes" checked={isJovenes} onCheckedChange={(v) => setIsJovenes(!!v)} />
                        <label htmlFor="grp-jovenes" className="text-sm font-medium cursor-pointer select-none">Jóvenes</label>
                    </div>
                </div>
              </div>


              {/* --- ROL PRINCIPAL --- */}
              <div className="space-y-2 bg-amber-50 p-4 rounded-lg border-2 border-amber-300 shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 right-0 -mt-1 -mr-1 text-amber-200 opacity-20 pointer-events-none">
                    <Star size={80} fill="currentColor" />
                 </div>
                 <Label className="flex items-center gap-2 text-amber-800 font-black text-sm uppercase tracking-wider relative z-10">
                    <Star size={16} fill="currentColor" className="text-amber-500" /> Rol Principal (Titular)
                 </Label>
                 <p className="text-xs text-amber-700/80 mb-3 font-medium relative z-10">
                    Rol prioritario (+15%) en la asignación automática.
                 </p>
                 
                 <select 
                    className="flex h-11 w-full rounded-md border-2 border-amber-300 bg-white px-3 py-2 text-base font-medium focus:ring-2 focus:ring-amber-500 relative z-10 shadow-sm"
                    value={primaryRole}
                    onChange={(e) => setPrimaryRole(e.target.value)}
                 >
                    <option value="">-- Selecciona el Rol Titular --</option>
                    {GENERIC_ROLES.map(role => (
                        <option key={role.id} value={role.id}>{role.label}</option>
                    ))}
                 </select>
              </div>

              {/* ROLES SECUNDARIOS */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-bold text-sm">Roles Secundarios (Opcionales)</Label>
                <ScrollArea className="h-[160px] border rounded-lg bg-white p-3 shadow-sm">
                  <div className="grid grid-cols-2 gap-3">
                    {GENERIC_ROLES.map(role => {
                      const isPrimary = role.id === primaryRole;
                      return (
                        <div key={role.id} className={`flex items-center space-x-2 p-2 rounded border ${isPrimary ? 'bg-amber-50 border-amber-200 opacity-60' : 'hover:bg-slate-50 border-slate-100'}`}>
                          <Checkbox 
                            id={`role-${role.id}`} 
                            checked={isPrimary || secondaryRoles.includes(role.id)}
                            disabled={isPrimary}
                            onCheckedChange={() => toggleSecondaryRole(role.id)}
                          />
                          <label htmlFor={`role-${role.id}`} className={`text-sm leading-none cursor-pointer flex-1 select-none flex justify-between items-center ${isPrimary ? 'font-semibold text-amber-700' : 'font-medium'}`}>
                            {role.label}
                            {isPrimary && <Star size={12} className="text-amber-500 fill-amber-500" />}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

               {/* --- SECCIÓN: ESTADO CIVIL --- */}
               <div className="space-y-3 bg-pink-50/50 p-4 rounded-lg border border-pink-200 shadow-sm mt-6">
                <Label className="mb-2 block text-pink-700 font-bold text-xs uppercase tracking-wider">
                    Relaciones y Parejas
                </Label>
                
                <div className="flex flex-col gap-3 bg-white p-3 rounded border border-pink-100">
                    <div className="flex items-center space-x-3">
                        <Checkbox 
                            id="is-married" 
                            checked={hasPartner} 
                            onCheckedChange={(v) => {
                                setHasPartner(!!v);
                                if (!v) setSelectedPartnerId(""); 
                            }} 
                            className="data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
                        />
                        <label htmlFor="is-married" className="text-sm font-medium cursor-pointer select-none text-slate-700">
                            ¿Tiene pareja en el equipo?
                        </label>
                    </div>

                    {hasPartner && (
                        <div className="pl-7 animate-in fade-in slide-in-from-top-1 duration-200">
                            <select 
                                className="flex h-10 w-full rounded-md border-pink-300 border bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-pink-400"
                                value={selectedPartnerId}
                                onChange={(e) => setSelectedPartnerId(e.target.value)}
                            >
                                <option value="">-- Seleccionar Pareja --</option>
                                {users
                                    .filter(u => u.id !== editingUserId) 
                                    .sort((a, b) => a.nombre.localeCompare(b.nombre))
                                    .map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.nombre}
                                        </option>
                                    ))
                                }
                            </select>
                             <p className="text-[11px] text-pink-500 mt-1.5 font-medium flex items-center gap-1">
                                <Heart size={10} fill="currentColor" /> El algoritmo intentará asignarlos juntos.
                            </p>
                        </div>
                    )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 sticky bottom-0 bg-slate-50/90 backdrop-blur-sm py-4 border-t border-slate-200 z-10">
                <Button variant="outline" onClick={cancelEdit} disabled={loading} className="border-slate-300">Cancelar</Button>
                <Button onClick={handleSave} disabled={loading} className="min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md">
                  {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />} 
                  Guardar Perfil
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* AQUÍ ESTABA EL ERROR: AHORA LLAMAMOS A handleCreateNew */}
              <Button 
                className="mb-4 gap-2 self-end bg-blue-600 hover:bg-blue-700 text-white shadow-sm" 
                onClick={handleCreateNew}
              >
                <Plus size={18} /> Añadir Nueva Persona
              </Button>
              
              <div className="flex-1 border rounded-lg overflow-y-auto max-h-[50vh] bg-slate-50 p-3 space-y-3 shadow-inner">
                {users.length === 0 ? (
                    <div className="text-center text-slate-400 py-12 flex flex-col items-center gap-2">
                        <Settings size={40} className="text-slate-300" />
                        <p>No hay miembros en el equipo.</p>
                    </div>
                ) : (
                    users.map(user => {
                        const secondaryText = (user.roles || []).map(rId => getRoleLabel(rId)).join(", ");
                        const primaryLabel = getRoleLabel(user.primary_role || "");

                        return (
                          <div key={user.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-all">
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                  <span className="font-bold text-lg text-slate-800">{user.nombre}</span>
                                  
                                  {/* Etiquetas visuales */}
                                  <div className="flex gap-1">
                                    {user.es_banda && <Badge variant="secondary" className="text-[10px] px-2 bg-slate-100 text-slate-600">Banda</Badge>}
                                    {user.es_jovenes && <Badge variant="outline" className="text-[10px] px-2 border-purple-300 text-purple-600">Jóvenes</Badge>}
                                  </div>
                                  
                                  {/* Pareja */}
                                  {user.partner_id && (
                                    <span title="Tiene pareja asignada" className="flex items-center justify-center w-6 h-6 bg-pink-100 rounded-full ml-1">
                                      <Heart size={12} className="text-pink-500 fill-pink-500" />
                                    </span>
                                  )}
                              </div>

                              {/* VISUALIZACIÓN DE ROLES */}
                              <div className="text-sm space-y-1 pl-0.5">
                                {user.primary_role ? (
                                    <div className="text-amber-700 font-bold flex items-center gap-1.5 bg-amber-50 w-fit px-2 py-0.5 rounded text-xs uppercase tracking-wider">
                                        <Star size={12} fill="currentColor"/> {primaryLabel}
                                    </div>
                                ) : <span className="text-red-300 italic text-xs">Sin Rol Principal</span>}
                                
                                {secondaryText && (
                                    <div className="text-slate-500 text-xs flex items-center gap-1 pl-1">
                                        <span className="text-slate-300">Otros:</span> {secondaryText}
                                    </div>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2 pl-4 border-l ml-4">
                              <Button size="sm" variant="ghost" className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-600" onClick={() => startEditing(user)} title="Editar">
                                <Pencil size={18} />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(user.id)} title="Eliminar">
                                <Trash2 size={18} />
                              </Button>
                            </div>
                          </div>
                        );
                    })
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}