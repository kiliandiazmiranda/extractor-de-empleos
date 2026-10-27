/**
 * Autocomplete data and suggestions oriented to the Colombian job market
 */

export const COLOMBIA_LOCATIONS: string[] = [
  'Colombia',
  'Remoto (Colombia)',
  'Bogotá, D.C., Colombia',
  'Medellín, Antioquia, Colombia',
  'Cali, Valle del Cauca, Colombia',
  'Barranquilla, Atlántico, Colombia',
  'Bucaramanga, Santander, Colombia',
  'Cartagena, Bolívar, Colombia',
  'Pereira, Risaralda, Colombia',
  'Manizales, Caldas, Colombia',
  'Santa Marta, Magdalena, Colombia',
  'Cúcuta, Norte de Santander, Colombia',
  'Ibagué, Tolima, Colombia',
  'Villavicencio, Meta, Colombia',
  'Pasto, Nariño, Colombia',
  'Armenia, Quindío, Colombia',
  'Popayán, Cauca, Colombia',
  'Valledupar, Cesar, Colombia',
  'Montería, Córdoba, Colombia',
  'Neiva, Huila, Colombia',
  'Sincelejo, Sucre, Colombia',
  'Tunja, Boyacá, Colombia',
  'Rionegro, Antioquia, Colombia',
  'Envigado, Antioquia, Colombia',
  'Itagüí, Antioquia, Colombia',
  'Chía, Cundinamarca, Colombia',
  'Soacha, Cundinamarca, Colombia',
];

export const TECH_ROLES_KEYWORDS: string[] = [
  'Desarrollador Frontend',
  'Desarrollador Backend',
  'Desarrollador Full Stack',
  'Ingeniero de Software',
  'Python Developer',
  'Java Developer',
  'React Developer',
  'Angular Developer',
  'Node.js Developer',
  '.NET / C# Developer',
  'PHP / Laravel Developer',
  'Analista de Datos (Data Analyst)',
  'Científico de Datos (Data Scientist)',
  'Ingeniero de Datos (Data Engineer)',
  'DevOps Engineer (AWS / Azure / GCP)',
  'Cloud Engineer',
  'QA Automation Engineer',
  'Tester QA Manual',
  'Arquitecto de Software',
  'Administrador de Bases de Datos (DBA SQL)',
  'Ciberseguridad / Seguridad Informática',
  'Diseñador UX / UI',
  'Product Manager / Product Owner',
  'Scrum Master / Agile Coach',
  'Desarrollador Mobile (Flutter / React Native)',
  'Desarrollador Android (Kotlin)',
  'Desarrollador iOS (Swift)',
  'Administrador de Sistemas Linux / Windows',
  'Soporte Técnico TI / Help Desk',
  'Especialista en Inteligencia Artificial / GenAI',
  'Power BI / Business Intelligence Specialist',
  'Ingeniero de Redes y Telecomunicaciones',
  'Desarrollador Salesforce',
  'Desarrollador Golang',
];

export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function searchAutocomplete(list: string[], query: string, maxResults = 8): string[] {
  const normQuery = normalizeText(query);
  if (!normQuery) {
    return list.slice(0, maxResults);
  }

  const queryTokens = normQuery.split(/\s+/).filter(Boolean);

  const matched = list.filter((item) => {
    const normItem = normalizeText(item);
    return queryTokens.every((token) => normItem.includes(token));
  });

  return matched.slice(0, maxResults);
}
