"use client";

import { useState } from "react";
import { supabase } from '@/lib/supabase';
// import { Role } from "@/types"; // Ya no necesitamos el tipo Role antiguo
import { GENERIC_ROLES } from "@/lib/constants"; // <--- IMPORTAMOS LAS CONSTANTES
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddUserDialogProps {
  // roles: Role[];  <-- YA NO NECESITAMOS ESTO
  onUserAdded: () => void;
}

export function AddUserDialog({ onUserAdded }: AddUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Formulario
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  
  // Lista de roles seleccionados (strings del archivo constants)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([""]);

  // Añadir un nuevo selector vacío
  const addRoleField = () => {
    setSelectedRoles([...selectedRoles, ""]);
  };

  // Eliminar un selector específico
  const removeRoleField = (index: number) => {
    const newList = [...selectedRoles];
    newList.splice(index, 1);
    setSelectedRoles(newList);
  };

  // Actualizar el valor de un selector específico
  const updateRoleField = (index: number, value: string) => {
    const newList = [...selectedRoles];
    newList[index] = value;
    setSelectedRoles(newList);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = `${firstName} ${lastName}`.trim();
    
    // Filtramos roles vacíos y eliminamos duplicados
    const validRoles = Array.from(new Set(selectedRoles.filter(r => r !== "")));

    if (!fullName || validRoles.length === 0) {
      alert("Debes poner nombre, apellido y asignar al menos un rol.");
      return;
    }

    setLoading(true);
    try {
      // 1. Crear Usuario y guardar sus roles directamente en el array
      const { error } = await supabase
        .from('users')
        .insert([{ 
            nombre: fullName, 
            disponibilidad: 100,
            roles: validRoles // <--- GUARDAMOS EL ARRAY DE STRINGS DIRECTAMENTE
        }]);

      if (error) throw error;

      // Éxito
      setOpen(false);
      setFirstName("");
      setLastName("");
      setSelectedRoles([""]);
      onUserAdded();
      
    } catch (error) {
      console.error(error);
      alert("Error al crear usuario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2">
          <Plus size={16} /> Nueva Persona
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nueva Persona</DialogTitle>
            <DialogDescription>
              Introduce nombre completo y asigna sus capacidades (Voz, Guitarra, etc).
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Nombre y Apellido */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fname">Nombre</Label>
                <Input id="fname" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="David" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lname">Apellido</Label>
                <Input id="lname" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="García" required />
              </div>
            </div>

            {/* Roles Dinámicos desde CONSTANTS */}
            <div className="space-y-3 border-t pt-4">
              <Label>Roles / Capacidades</Label>
              {selectedRoles.map((roleValue, index) => (
                <div key={index} className="flex gap-2">
                  <Select 
                    value={roleValue} 
                    onValueChange={(val) => updateRoleField(index, val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar capacidad..." />
                    </SelectTrigger>
                    <SelectContent>
                      {/* MAPEO DESDE TU ARCHIVO CONSTANTS */}
                      {GENERIC_ROLES.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Botón borrar (solo si hay más de uno) */}
                  {selectedRoles.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeRoleField(index)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              ))}

              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="w-full border-dashed"
                onClick={addRoleField}
              >
                <Plus size={14} className="mr-2" /> Añadir otra capacidad
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Persona
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}