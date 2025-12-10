// src/lib/constants.ts

// 1. LISTA PARA EL SELECTOR (Al crear persona)
export const GENERIC_ROLES = [
  { id: 'voice', label: 'Voz' },
  { id: 'guitar', label: 'Guitarra' },
  { id: 'piano', label: 'Piano' },
  { id: 'drums', label: 'Batería' },
  { id: 'bass', label: 'Bajo' },
  { id: 'media', label: 'Sonido' },
  { id: 'indemn', label: 'Indemn' },
];

// 2. MAPEO: Qué rol genérico pide cada puesto del planificador
// (La clave es el nombre del campo en tu base de datos/estado)
export const ROLE_REQUIREMENTS: Record<string, string> = {
  // --- ADULTOS ---
  worshipLeader: 'voice',   // El líder debe saber cantar
  voice1: 'voice',
  voice2: 'voice',
  voice3: 'voice',
  voice4: 'voice',
  
  acousticGuitar: 'guitar',
  electricGuitar: 'guitar',
  
  piano: 'piano',
  synthesizer: 'piano',
  
  drums: 'drums',
  bass: 'bass',
  
  // --- JÓVENES ---
  youthLeader: 'voice',     // Líder jóvenes también es cantante
  youthGuitar: 'guitar',
  youthPiano: 'piano',
  youthDrums: 'drums',
  youthBass: 'bass',        // <--- El nuevo campo de bajo
  
  // Nota: Las voces de jóvenes suelen ser dinámicas, 
  // esas las manejaremos con lógica directa 'voice' en el componente.
};