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
  BASE_ASSIGNMENT: 100,       // Base por cumplir el requisito
  
  // REGLA DEL 15%:
  // Disponibilidad vale 1 punto por %. (100% = 100 ptos).
  // Ser Titular (Primary) vale 15 puntos extra.
  // Por tanto, un secundario necesita +15% disp para ganar al titular.
  AVAILABILITY_MULTIPLIER: 1, 
  PRIMARY_ROLE_BONUS: 15,     
  
  PARTNER_TOGETHER_BONUS: 50, // Premio pareja junta
  PARTNER_SEPARATED_PENALTY: -200, // Castigo fuerte separar pareja
};

export type RoleRequirements = Record<string, number>;

interface AssignmentAttempt {
  userId: string;
  role: string;
  user: User;
  isPrimary: boolean; // Marcamos si está ejerciendo su rol principal
}

// Helper para saber si un usuario puede hacer un rol (Ya sea como principal o secundario)
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
  unavailableUserIds: string[]
): AssignmentAttempt[] {
  const assignment: AssignmentAttempt[] = [];
  const assignedIds = new Set<string>();

  for (const [roleName, count] of Object.entries(requirements)) {
    
    // A. Filtramos candidatos válidos (Titulares O Secundarios)
    const validCandidates = users.filter(u => 
      canUserPerformRole(u, roleName) &&   // Puede hacer el rol
      !unavailableUserIds.includes(u.id) && 
      !assignedIds.has(u.id)
    );

    // B. Barajamos
    const shuffled = [...validCandidates].sort(() => Math.random() - 0.5);

    // C. Seleccionamos
    const selected = shuffled.slice(0, count);

    selected.forEach(u => {
      assignment.push({ 
          userId: u.id, 
          role: roleName, 
          user: u,
          isPrimary: u.primary_role === roleName // Detectamos si es su rol fuerte
      });
      assignedIds.add(u.id);
    });
  }

  return assignment;
}

// ==========================================
// 2. FUNCIÓN DE CALIDAD (FITNESS FUNCTION)
// ==========================================

function calculateFitness(team: AssignmentAttempt[]): number {
  let score = 0;
  const teamIds = new Set(team.map(a => a.userId));

  for (const assignment of team) {
    const user = assignment.user;

    // 1. BASE
    score += WEIGHTS.BASE_ASSIGNMENT;

    // 2. DISPONIBILIDAD (0 a 100 puntos)
    const avail = user.disponibilidad ?? 100;
    score += (avail * WEIGHTS.AVAILABILITY_MULTIPLIER);

    // 3. ROL PRINCIPAL vs SECUNDARIO (La regla del 15%)
    if (assignment.isPrimary) {
        score += WEIGHTS.PRIMARY_ROLE_BONUS; // +15 puntos
    }

    // 4. PAREJAS
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
  unavailableUserIds: string[] = [] 
) {
  // LOGS para depuración
  console.log(`🤖 Algoritmo V2 (Principal/Secundario) - Fecha: ${targetDate}`);
  
  const ITERATIONS = 2000; 
  let bestTeam: AssignmentAttempt[] = [];
  let bestScore = -Infinity;

  for (let i = 0; i < ITERATIONS; i++) {
    const candidateTeam = generateRandomCandidate(users, requirements, unavailableUserIds);
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