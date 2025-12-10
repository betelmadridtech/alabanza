import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { User } from "@/types" // Importamos solo User, que SÍ existe en tu index

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ==========================================
// DEFINICIONES LOCALES (Para no tocar types/index.ts)
// ==========================================

// Como 'Availability' no está en tu index.ts, la definimos aquí
// para que la función sepa qué datos va a recibir.
export interface LocalAvailability {
  user_id: string;
  date: string; // Formato YYYY-MM-DD
  status: 'confirmed' | 'maybe' | 'emergency' | 'unavailable';
}

// Configuración de pesos
const AVAILABILITY_SCORES: Record<string, number> = {
  'confirmed': 10,
  'maybe': 5,
  'emergency': 1,
  'unavailable': 0 
};

export type RoleRequirements = Record<string, number>;

// ==========================================
// ALGORITMO DE SELECCIÓN
// ==========================================

export function generateAutoAssignments(
  users: User[],
  availabilities: LocalAvailability[], // Usamos la definición local
  requirements: RoleRequirements,
  targetDate: string
) {
  // Array donde guardaremos los resultados
  const proposedAssignments: { userId: string; role: string; date: string }[] = [];

  for (const [roleName, requiredCount] of Object.entries(requirements)) {
    
    // 1. FILTRADO: Buscamos usuarios que tengan el rol
    // Usamos 'user.roles' (tu tipo lo tiene como opcional 'roles?: string[]')
    const eligibleUsers = users.filter(u => u.roles && u.roles.includes(roleName));

    // 2. PUNTUACIÓN
    const candidates = eligibleUsers.map(user => {
      // Buscamos disponibilidad
      const userAvail = availabilities.find(
        a => a.user_id === user.id && a.date === targetDate
      );

      const status = userAvail?.status; 
      const score = status ? (AVAILABILITY_SCORES[status] || 0) : 0;

      return { user, score };
    });

    // 3. SOLO DISPONIBLES (Score > 0)
    const availableCandidates = candidates.filter(c => c.score > 0);

    // 4. ORDENAR
    availableCandidates.sort((a, b) => {
      // Prioridad: Puntuación
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      
      // Desempate: Usamos 'nombre' (propiedad de TU tipo User)
      return a.user.nombre.localeCompare(b.user.nombre);
    });

    // 5. SELECCIONAR LOS NECESARIOS
    const selected = availableCandidates.slice(0, requiredCount);

    selected.forEach(candidate => {
      proposedAssignments.push({
        userId: candidate.user.id,
        role: roleName,
        date: targetDate,
      });
    });
  }

  return proposedAssignments;
}