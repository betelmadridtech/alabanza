"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@/types";
import { GENERIC_ROLES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Trash2, Pencil, Save, Plus, Loader2, Users } from "lucide-react"; // Importamos Users
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
import { Badge } from "@/components/ui/badge"; // Importamos Badge

interface TeamManagerProps {
  users: User[];
  onUpdate: () => void;
}

export function TeamManagerDialog({ users, onUpdate }: TeamManagerProps) {
  const [open, setOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  // Estados para la edición
  const [editName, setEditName] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  
  // --- NUEVOS ESTADOS PARA GRUPOS ---
  const [isBanda, setIsBanda] = useState(false);
  const [isJovenes, setIsJovenes] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Abrir modo edición
  const startEditing = (user: User) => {
    setEditingUserId(user.id);
    setEditName(user.nombre); // o user.name si usas name
    setSelectedRoles(user.roles || []);
    // Cargamos los valores de la BD
    setIsBanda(user.es_banda || false);
    setIsJovenes(user.es_jovenes || false);
    setIsCreating(false);
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setIsCreating(false);
    setEditName("");
    setSelectedRoles([]);
    setIsBanda(false);
    setIsJovenes(false);
  };

  const handleSave = async () => {
    if (!editName.trim()) return alert("El nombre es obligatorio");
    // Validación: Debe pertenecer al menos a un grupo
    if (!isBanda && !isJovenes) return alert("Debes seleccionar al menos un grupo (Banda o Jóvenes)");

    setLoading(true);
    try {
      const payload = {
        nombre: editName,
        roles: selectedRoles,
        disponibilidad: 100,
        // Guardamos los nuevos campos
        es_banda: isBanda,
        es_jovenes: isJovenes
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

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => 
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
      
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Gestión de Personas</DialogTitle>
          <DialogDescription>Añade, edita o elimina miembros del equipo.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-1 flex flex-col">
          {editingUserId || isCreating ? (
            <div className="space-y-4 p-4 border rounded-md bg-slate-50 overflow-y-auto max-h-[60vh]">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                 {isCreating ? <><Plus size={18}/> Nueva Persona</> : <><Pencil size={18}/> Editando Perfil</>}
              </h3>
              
              {/* NOMBRE */}
              <div className="space-y-2">
                <Label>Nombre Completo</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Ej: Ana García" />
              </div>

              {/* SELECCIÓN DE GRUPO (BANDA / JOVENES) */}
              <div className="space-y-2 bg-white p-3 rounded border">
                <Label className="mb-2 block text-blue-800 font-semibold">¿A qué grupo pertenece?</Label>
                <div className="flex gap-6">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="grp-banda" checked={isBanda} onCheckedChange={(v) => setIsBanda(!!v)} />
                        <label htmlFor="grp-banda" className="text-sm cursor-pointer">Banda Principal</label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="grp-jovenes" checked={isJovenes} onCheckedChange={(v) => setIsJovenes(!!v)} />
                        <label htmlFor="grp-jovenes" className="text-sm cursor-pointer">Jóvenes</label>
                    </div>
                </div>
                <p className="text-xs text-slate-400 mt-1">Selecciona uno o ambos.</p>
              </div>

              {/* ROLES */}
              <div className="space-y-2">
                <Label>Roles / Capacidades</Label>
                <ScrollArea className="h-[200px] border rounded bg-white p-2">
                  <div className="grid grid-cols-2 gap-2">
                    {GENERIC_ROLES.map(role => (
                      <div key={role.id} className="flex items-center space-x-2 p-1 hover:bg-slate-50 rounded">
                        <Checkbox 
                          id={`role-${role.id}`} 
                          checked={selectedRoles.includes(role.id)}
                          onCheckedChange={() => toggleRole(role.id)}
                        />
                        <label htmlFor={`role-${role.id}`} className="text-sm font-medium leading-none cursor-pointer flex-1">
                          {role.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" onClick={cancelEdit} disabled={loading}>Cancelar</Button>
                <Button onClick={handleSave} disabled={loading} className="min-w-[100px]">
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} className="mr-2" /> Guardar</>}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <Button className="mb-4 gap-2 self-end" onClick={() => { setIsCreating(true); setEditName(""); setSelectedRoles([]); setIsBanda(true); setIsJovenes(false); }}>
                <Plus size={16} /> Añadir Persona
              </Button>
              
              <div className="flex-1 border rounded-md overflow-y-auto max-h-[50vh] bg-slate-50 p-2 space-y-2">
                {users.length === 0 ? (
                    <p className="text-center text-slate-400 py-10">No hay miembros en el equipo.</p>
                ) : (
                    users.map(user => {
                        const roleText = (user.roles || []).map(rId => getRoleLabel(rId)).join(", ");

                        return (
                          <div key={user.id} className="flex items-center justify-between p-3 bg-white border rounded hover:shadow-sm transition-shadow">
                            <div>
                              <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-800">{user.nombre}</span>
                                  {/* Etiquetas visuales */}
                                  {user.es_banda && <Badge variant="secondary" className="text-[10px] h-5">Banda</Badge>}
                                  {user.es_jovenes && <Badge variant="outline" className="text-[10px] h-5 border-purple-300 text-purple-600">Jóvenes</Badge>}
                              </div>
                              <div className="text-xs text-slate-500 truncate max-w-[300px] mt-1">
                                {roleText || <span className="italic text-slate-300">Sin roles asignados</span>}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => startEditing(user)} title="Editar">
                                <Pencil size={16} className="text-blue-600" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDelete(user.id)} title="Eliminar">
                                <Trash2 size={16} className="text-red-500" />
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