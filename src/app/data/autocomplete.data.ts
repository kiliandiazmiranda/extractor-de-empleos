/**
 * Autocomplete data and suggestions for locations (Colombia and Worldwide) and tech/professional roles
 */

export const WORLDWIDE_LOCATIONS: string[] = [
  'Remoto',
  'Colombia',
  'Cartagena, Bolívar, Colombia',
  'Bogotá, D.C., Colombia',
  'Medellín, Antioquia, Colombia',
  'Cali, Valle del Cauca, Colombia',
  'Barranquilla, Atlántico, Colombia',
  'Bucaramanga, Santander, Colombia',
  'Pereira, Risaralda, Colombia',
  'Manizales, Caldas, Colombia',
  'Santa Marta, Magdalena, Colombia',
  'Cúcuta, Norte de Santander, Colombia',
  'Ibagué, Tolima, Colombia',
  'Villavicencio, Meta, Colombia',
  'Pasto, Nariño, Colombia',
  'Montería, Córdoba, Colombia',
  'Valledupar, Cesar, Colombia',
  'Popayán, Cauca, Colombia',
  'Neiva, Huila, Colombia',
  'Armenia, Quindío, Colombia',
  'Sincelejo, Sucre, Colombia',
  'Tunja, Boyacá, Colombia',
  'Riohacha, La Guajira, Colombia',
  'Florencia, Caquetá, Colombia',
  'Yopal, Casanare, Colombia',
  'Quibdó, Chocó, Colombia',
  'San Andrés, Islas, Colombia',
  'Mocoa, Putumayo, Colombia',
  'Arauca, Arauca, Colombia',
  'San José del Guaviare, Colombia',
  'Leticia, Amazonas, Colombia',
  'Inírida, Guainía, Colombia',
  'Mitú, Vaupés, Colombia',
  'Puerto Carreño, Vichada, Colombia',
  // Centros metropolitanos e industriales
  'Soacha, Cundinamarca, Colombia',
  'Chía, Cundinamarca, Colombia',
  'Envigado, Antioquia, Colombia',
  'Itagüí, Antioquia, Colombia',
  'Bello, Antioquia, Colombia',
  'Rionegro, Antioquia, Colombia',
  'Sabaneta, Antioquia, Colombia',
  'Floridablanca, Santander, Colombia',
  'Girón, Santander, Colombia',
  'Piedecuesta, Santander, Colombia',
  'Palmira, Valle del Cauca, Colombia',
  'Yumbo, Valle del Cauca, Colombia',
  'Buenaventura, Valle del Cauca, Colombia',
  'Dosquebradas, Risaralda, Colombia',
  'Soledad, Atlántico, Colombia',
  'Barrancabermeja, Santander, Colombia',
  'Duitama, Boyacá, Colombia',
  'Sogamoso, Boyacá, Colombia',
  'Cartago, Valle del Cauca, Colombia',
  'Tuluá, Valle del Cauca, Colombia',
  'Buga, Valle del Cauca, Colombia',
  'Facatativá, Cundinamarca, Colombia',
  'Zipaquirá, Cundinamarca, Colombia',
  'Mosquera, Cundinamarca, Colombia',
  'Madrid, Cundinamarca, Colombia',
  'Funza, Cundinamarca, Colombia',
  'Girardot, Cundinamarca, Colombia',
  // Internacionales
  'España',
  'Madrid, España',
  'Barcelona, España',
  'Valencia, España',
  'México',
  'Ciudad de México, México',
  'Guadalajara, Jalisco, México',
  'Monterrey, Nuevo León, México',
  'Estados Unidos (USA / Remote)',
  'California, Estados Unidos',
  'Nueva York, Estados Unidos',
  'Miami, Florida, Estados Unidos',
  'Argentina',
  'Buenos Aires, Argentina',
  'Córdoba, Argentina',
  'Chile',
  'Santiago, Chile',
  'Perú',
  'Lima, Perú',
  'Uruguay',
  'Montevideo, Uruguay',
  'Costa Rica',
  'San José, Costa Rica',
  'Panamá',
  'Ciudad de Panamá, Panamá',
  'Alemania',
  'Berlín, Alemania',
  'Reino Unido',
  'Londres, Reino Unido',
  'Canadá',
  'Toronto, Canadá',
  'Todo el mundo (Global)',
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

export function searchAutocomplete(list: string[], query: string, maxResults = 10): string[] {
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
