"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@/types"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, UserCircle, ChevronRight, Loader2, ShieldCheck } from "lucide-react";

interface Props {
  onSelectUser: (user: User) => void;
  onAdminClick: () => void;
}

export function MemberLogin({ onSelectUser, onAdminClick }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      // Buscamos usuarios que NO sean admin para la lista pública
      // Asumimos que la columna nueva se llama 'role'
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .neq('role', 'admin') 
        .order('nombre');
      
      if (data) setUsers(data);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    u.nombre && u.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold text-slate-800">Inchinare Team</CardTitle>
          <CardDescription>Busca tu nombre para marcar tu disponibilidad</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Escribe tu nombre..." 
              className="pl-10 h-12 text-lg bg-slate-50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="h-72 overflow-y-auto border rounded-md bg-white p-2 space-y-1">
            {loading ? (
               <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400"/></div>
            ) : filteredUsers.length === 0 ? (
               <div className="text-center py-10 text-slate-400 flex flex-col items-center">
                 <UserCircle size={30} className="mb-2 opacity-50" />
                 <p>No encontrado</p>
               </div>
            ) : (
               filteredUsers.map(user => (
                 <button
                   key={user.id}
                   onClick={() => onSelectUser(user)}
                   className="w-full flex items-center justify-between p-3 hover:bg-blue-50 rounded-lg transition-colors group text-left border border-transparent hover:border-blue-100"
                 >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 font-bold text-xs">
                          {user.nombre.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-700 group-hover:text-blue-700">{user.nombre}</span>
                    </div>
                    <ChevronRight className="text-slate-300 group-hover:text-blue-400" size={18} />
                 </button>
               ))
            )}
          </div>

          <div className="pt-4 border-t flex justify-center">
            <Button 
                variant="ghost" 
                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-2"
                onClick={onAdminClick}
            >
                <ShieldCheck size={12} />
                Acceso Administrador
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}