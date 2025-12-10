import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { User } from "@/types" 

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ==========================================
// CONFIGURACIÓN DE LA "INTELIGENCIA ARTIFICIAL"
// ==========================================

const WEIGHTS = {
  BASE_ASSIGNMENT: 100,       
  AVAILABILITY_MULTIPLIER: 1, 
  PRIMARY_ROLE_BONUS: 15,     
  PARTNER_TOGETHER_BONUS: 50, 
  PARTNER_SEPARATED_PENALTY: -200, 
};

export type RoleRequirements = Record<string, number>;

interface AssignmentAttempt {
  userId: string;
  role: string;
  user: User;
  isPrimary: boolean; 
}

function canUserPerformRole(user: User, roleRequired: string): boolean {
    if (user.primary_role === roleRequired) return true;
    if (user.roles && user.roles.includes(roleRequired)) return true;
    return false;
}

// ==========================================
// 1. GENERADOR ALEATORIO
// ==========================================

function generateRandomCandidate(
  users: User[],
  requirements: RoleRequirements,
  unavailableUserIds: string[],
  requiredGroup?: 'es_banda' | 'es_jovenes' // NUEVO PARÁMETRO
): AssignmentAttempt[] {
  const assignment: AssignmentAttempt[] = [];
  const assignedIds = new Set<string>();

  for (const [roleName, count] of Object.entries(requirements)) {
    
    // A. Filtramos candidatos válidos
    const validCandidates = users.filter(u => {
      // 1. ¿Puede hacer el rol?
      const hasRole = canUserPerformRole(u, roleName);
      // 2. ¿Está bloqueado hoy?
      const isAvailable = !unavailableUserIds.includes(u.id);
      // 3. ¿Ya fue elegido en este intento?
      const isNotAssigned = !assignedIds.has(u.id);
      
      // 4. (NUEVO) ¿Pertenece al grupo correcto? (Banda o Jóvenes)
      // Si requiredGroup es undefined, saltamos este check.
      const isInGroup = requiredGroup ? u[requiredGroup] === true : true;

      return hasRole && isAvailable && isNotAssigned && isInGroup;
    });

    // B. Barajamos
    const shuffled = [...validCandidates].sort(() => Math.random() - 0.5);

    // C. Seleccionamos
    const selected = shuffled.slice(0, count);

    selected.forEach(u => {
      assignment.push({ 
          userId: u.id, 
          role: roleName, 
          user: u,
          isPrimary: u.primary_role === roleName 
      });
      assignedIds.add(u.id);
    });
  }

  return assignment;
}

// ==========================================
// 2. FUNCIÓN DE CALIDAD
// ==========================================

function calculateFitness(team: AssignmentAttempt[]): number {
  let score = 0;
  const teamIds = new Set(team.map(a => a.userId));

  for (const assignment of team) {
    const user = assignment.user;
    score += WEIGHTS.BASE_ASSIGNMENT;
    const avail = user.disponibilidad ?? 100;
    score += (avail * WEIGHTS.AVAILABILITY_MULTIPLIER);

    if (assignment.isPrimary) {
        score += WEIGHTS.PRIMARY_ROLE_BONUS; 
    }

    if (user.partner_id) {
      const isPartnerInTeam = teamIds.has(user.partner_id);
      if (isPartnerInTeam) {
        score += WEIGHTS.PARTNER_TOGETHER_BONUS;
      } else {
        score += WEIGHTS.PARTNER_SEPARATED_PENALTY;
      }
    }
  }
  return score;
}

// ==========================================
// 3. PROCESO PRINCIPAL
// ==========================================

export function generateAutoAssignments(
  users: User[],
  requirements: RoleRequirements,
  targetDate: string, 
  unavailableUserIds: string[],
  requiredGroup?: 'es_banda' | 'es_jovenes' // AÑADIDO AQUÍ TAMBIÉN
) {
  console.log(`🤖 Algoritmo V3 (Grupos) - Fecha: ${targetDate} - Grupo: ${requiredGroup}`);
  
  const ITERATIONS = 2000; 
  let bestTeam: AssignmentAttempt[] = [];
  let bestScore = -Infinity;

  for (let i = 0; i < ITERATIONS; i++) {
    // Pasamos el grupo al generador
    const candidateTeam = generateRandomCandidate(users, requirements, unavailableUserIds, requiredGroup);
    const score = calculateFitness(candidateTeam);

    if (score > bestScore) {
      bestScore = score;
      bestTeam = candidateTeam;
    }
  }

  console.log(`✅ Mejor puntuación: ${bestScore} | Equipo de ${bestTeam.length} personas.`);

  return bestTeam.map(a => ({
    userId: a.userId,
    role: a.role,
    date: targetDate
  }));
}