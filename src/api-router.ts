import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';

export const apiRouter = Router();

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export type JobPlatform = 'linkedin' | 'computrabajo' | 'elempleo';

export interface RawUnifiedJob {
  id: string;
  title: string;
  company: string;
  companyUrl?: string;
  companyLogo?: string;
  location: string;
  postedDate: string;
  postedRelative: string;
  timestamp: number;
  linkedinUrl: string;
  benefits?: string;
  salary?: string;
  source: JobPlatform;
  portalName: string;
}

function parseRelativeTimestamp(postedRelative: string, postedDate?: string): number {
  const now = Date.now();
  if (!postedRelative && postedDate) {
    return new Date(postedDate).getTime() || now;
  }
  const lower = (postedRelative || '').toLowerCase().trim();

  const monthMatch = lower.match(/(\d+)\s*(?:mes(?:es)?|months?)/);
  if (monthMatch) return now - (parseInt(monthMatch[1], 10) || 1) * 30 * 86400 * 1000;

  const weekMatch = lower.match(/(\d+)\s*(?:sem(?:ana)?s?|weeks?|w\b)/);
  if (weekMatch) return now - (parseInt(weekMatch[1], 10) || 1) * 7 * 86400 * 1000;

  const dayMatch = lower.match(/(\d+)\s*(?:d[ií]as?|days?|d\b)/);
  if (dayMatch) return now - (parseInt(dayMatch[1], 10) || 1) * 86400 * 1000;

  const hourMatch = lower.match(/(\d+)\s*(?:horas?|hours?|h\b)/);
  if (hourMatch) return now - (parseInt(hourMatch[1], 10) || 1) * 3600 * 1000;

  const minMatch = lower.match(/(\d+)\s*(?:minutos?|mins?|minutes?|m\b)/);
  if (minMatch) return now - (parseInt(minMatch[1], 10) || 1) * 60 * 1000;

  if (lower.includes('just now') || lower.includes('ahora') || lower.includes('hoy') || lower.includes('recién')) return now;
  if (lower.includes('ayer')) return now - 86400 * 1000;
  if (postedDate) return new Date(postedDate).getTime() || now;
  return now;
}

function normalizeLocationString(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLocationMatch(jobLoc: string, requestedLoc: string): boolean {
  const normReq = normalizeLocationString(requestedLoc);
  if (!normReq || normReq === 'todo el mundo' || normReq === 'mundial' || normReq === 'cualquiera') {
    return true;
  }

  const normJob = normalizeLocationString(jobLoc);

  if (normReq === 'remoto' || normReq === 'remote') {
    return (
      normJob.includes('remot') ||
      normJob.includes('teletrabajo') ||
      normJob.includes('virtual') ||
      normJob.includes('home office') ||
      normJob.includes('wfh')
    );
  }

  if (normReq === 'colombia') {
    return (
      normJob.includes('colombia') ||
      normJob.includes('bogota') ||
      normJob.includes('medellin') ||
      normJob.includes('cali') ||
      normJob.includes('cartagena') ||
      normJob.includes('barranquilla') ||
      normJob.includes('bucaramanga') ||
      normJob.includes('pereira') ||
      normJob.includes('manizales') ||
      normJob.includes('cucuta') ||
      normJob.includes('ibague') ||
      normJob.includes('santa marta') ||
      normJob.includes('remot')
    );
  }

  if (normReq.includes('cartagena')) {
    return normJob.includes('cartagena');
  }

  if (normReq.includes('bogota')) {
    return (
      normJob.includes('bogota') ||
      normJob.includes('bogota d c') ||
      normJob.includes('bogota dc') ||
      normJob.includes('distrito capital')
    );
  }

  if (normReq.includes('medellin')) {
    return (
      normJob.includes('medellin') ||
      normJob.includes('envigado') ||
      normJob.includes('itagui') ||
      normJob.includes('bello') ||
      normJob.includes('sabaneta') ||
      normJob.includes('valle de aburra')
    );
  }

  if (normReq.includes('cali')) {
    return (
      normJob.includes('cali') ||
      normJob.includes('jamundi') ||
      normJob.includes('yumbo') ||
      normJob.includes('palmira')
    );
  }

  if (normReq.includes('barranquilla')) {
    return (
      normJob.includes('barranquilla') ||
      normJob.includes('soledad') ||
      normJob.includes('puerto colombia')
    );
  }

  if (normReq.includes('bucaramanga')) {
    return (
      normJob.includes('bucaramanga') ||
      normJob.includes('floridablanca') ||
      normJob.includes('giron') ||
      normJob.includes('piedecuesta')
    );
  }

  if (normReq.includes('pereira')) {
    return normJob.includes('pereira') || normJob.includes('dosquebradas');
  }

  if (normReq.includes('manizales')) {
    return normJob.includes('manizales') || normJob.includes('villamaria');
  }

  if (normReq.includes('santa marta')) {
    return normJob.includes('santa marta');
  }

  if (normReq.includes('cucuta')) {
    return normJob.includes('cucuta') || normJob.includes('los patios');
  }

  if (normReq.includes('ibague')) {
    return normJob.includes('ibague');
  }

  if (normReq.includes('villavicencio')) {
    return normJob.includes('villavicencio');
  }

  if (normReq.includes('pasto')) {
    return normJob.includes('pasto');
  }

  if (normReq.includes('monteria')) {
    return normJob.includes('monteria');
  }

  if (normReq.includes('valledupar')) {
    return normJob.includes('valledupar');
  }

  if (normReq.includes('popayan')) {
    return normJob.includes('popayan');
  }

  if (normReq.includes('neiva')) {
    return normJob.includes('neiva');
  }

  if (normReq.includes('armenia')) {
    return normJob.includes('armenia');
  }

  if (normReq.includes('sincelejo')) {
    return normJob.includes('sincelejo');
  }

  if (normReq.includes('tunja')) {
    return normJob.includes('tunja');
  }

  if (normReq.includes('soacha')) {
    return normJob.includes('soacha');
  }

  if (normReq.includes('chia')) {
    return normJob.includes('chia');
  }

  const cleanTokens = normReq
    .split(' ')
    .filter(
      (t) =>
        t.length > 2 &&
        t !== 'colombia' &&
        t !== 'espana' &&
        t !== 'mexico' &&
        t !== 'estados' &&
        t !== 'unidos' &&
        t !== 'argentina' &&
        t !== 'chile' &&
        t !== 'valle' &&
        t !== 'del' &&
        t !== 'norte' &&
        t !== 'de' &&
        t !== 'san' &&
        t !== 'santa'
    );

  if (cleanTokens.length > 0) {
    return cleanTokens.some((t) => normJob.includes(t));
  }

  return normJob.includes(normReq);
}

function getComputrabajoCitySlug(location: string): string | null {
  const norm = normalizeLocationString(location);
  if (!norm || norm === 'colombia' || norm === 'remoto' || norm === 'remote' || norm === 'todo el mundo') return null;
  if (norm.includes('cartagena')) return 'cartagena-de-indias';
  if (norm.includes('bogota')) return 'bogota-dc';
  if (norm.includes('santa marta')) return 'santa-marta';
  if (norm.includes('san andres')) return 'san-andres';
  if (norm.includes('norte de santander')) return 'cucuta';
  if (norm.includes('medellin')) return 'medellin';
  if (norm.includes('cali')) return 'cali';
  if (norm.includes('barranquilla')) return 'barranquilla';
  if (norm.includes('bucaramanga')) return 'bucaramanga';
  if (norm.includes('pereira')) return 'pereira';
  if (norm.includes('manizales')) return 'manizales';
  if (norm.includes('cucuta')) return 'cucuta';
  if (norm.includes('ibague')) return 'ibague';
  if (norm.includes('villavicencio')) return 'villavicencio';
  if (norm.includes('pasto')) return 'pasto';
  if (norm.includes('monteria')) return 'monteria';
  if (norm.includes('valledupar')) return 'valledupar';
  if (norm.includes('popayan')) return 'popayan';
  if (norm.includes('neiva')) return 'neiva';
  if (norm.includes('armenia')) return 'armenia';
  if (norm.includes('sincelejo')) return 'sincelejo';
  if (norm.includes('tunja')) return 'tunja';
  if (norm.includes('florencia')) return 'florencia';
  if (norm.includes('riohacha')) return 'riohacha';
  if (norm.includes('quibdo')) return 'quibdo';
  if (norm.includes('yopal')) return 'yopal';
  if (norm.includes('palmira')) return 'palmira';
  if (norm.includes('buenaventura')) return 'buenaventura';
  if (norm.includes('bello')) return 'bello';
  if (norm.includes('itagui')) return 'itagui';
  if (norm.includes('envigado')) return 'envigado';
  if (norm.includes('rionegro')) return 'rionegro';
  if (norm.includes('dosquebradas')) return 'dosquebradas';
  if (norm.includes('barrancabermeja')) return 'barrancabermeja';
  if (norm.includes('chia')) return 'chia';
  if (norm.includes('soacha')) return 'soacha';
  return null;
}

async function fetchLinkedInBatch(params: {
  keywords: string;
  location: string;
  start: number;
  timeFilter?: string;
  sortBy?: 'DD' | 'R';
  workplaceType?: string;
}): Promise<RawUnifiedJob[]> {
  const isRemoteSearch = (params.location || '').toLowerCase().includes('remot');
  const queryParams = new URLSearchParams();
  queryParams.set('keywords', params.keywords || '');
  if (isRemoteSearch) {
    queryParams.set('location', 'Colombia');
    queryParams.set('f_WT', '2');
  } else {
    queryParams.set('location', params.location || 'Colombia');
    if (params.workplaceType) queryParams.set('f_WT', params.workplaceType);
  }
  queryParams.set('start', String(params.start));

  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${queryParams.toString()}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    return [];
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const jobs: RawUnifiedJob[] = [];

  $('li').each((_, el) => {
    const card = $(el).find('.base-card, .job-search-card');
    if (!card.length) return;

    const urn = card.attr('data-entity-urn') || '';
    const id = urn.split(':').pop() || '';
    const rawLink = card.find('a.base-card__full-link').attr('href') || '';
    
    let cleanLink = '';
    if (rawLink) {
      try {
        const parsed = new URL(rawLink);
        cleanLink = `${parsed.origin}${parsed.pathname}`;
      } catch {
        cleanLink = rawLink.split('?')[0];
      }
    }
    if (!cleanLink && id) {
      cleanLink = `https://www.linkedin.com/jobs/view/${id}`;
    }

    const title = card.find('.base-search-card__title').text().trim();
    const company = card.find('.base-search-card__subtitle a').text().trim() || 
                    card.find('.base-search-card__subtitle').text().trim();
    const companyUrl = card.find('.base-search-card__subtitle a').attr('href') || '';
    let cardLocation = card.find('.job-search-card__location').text().trim() || params.location || 'No especificada';

    if (isRemoteSearch && !cardLocation.toLowerCase().includes('remot')) {
      cardLocation = `Remoto (${cardLocation})`;
    }

    if (!isLocationMatch(cardLocation, params.location)) {
      return;
    }

    const timeEl = card.find('time');
    const postedDate = timeEl.attr('datetime') || '';
    const postedRelative = timeEl.text().trim();
    const timestamp = parseRelativeTimestamp(postedRelative, postedDate);

    const companyLogo = card.find('img').attr('data-delayed-url') || card.find('img').attr('src') || '';
    const benefits = card.find('.job-search-card__benefits').text().trim() || undefined;
    const salary = card.find('.job-search-card__salary-info').text().trim() || undefined;

    if (title && (cleanLink || id)) {
      jobs.push({
        id: id || Buffer.from(cleanLink).toString('base64').substring(0, 16),
        title,
        company: company || 'Confidencial',
        companyUrl,
        companyLogo,
        location: cardLocation,
        postedDate,
        postedRelative,
        timestamp,
        linkedinUrl: cleanLink,
        benefits,
        salary,
        source: 'linkedin',
        portalName: 'LinkedIn',
      });
    }
  });

  return jobs;
}

async function fetchComputrabajoBatch(keywords: string, location: string, timeFilter?: string): Promise<RawUnifiedJob[]> {
  try {
    const qParam = encodeURIComponent(keywords || 'Desarrollador');
    const isRemoteSearch = (location || '').toLowerCase().includes('remot');
    let url = `https://co.computrabajo.com/ofertas-de-trabajo/?q=${qParam}&by=date`;
    if (isRemoteSearch) {
      url = `https://co.computrabajo.com/empleos-en-teletrabajo?q=${qParam}&by=date`;
    } else {
      const citySlug = getComputrabajoCitySlug(location);
      if (citySlug) {
        url = `https://co.computrabajo.com/empleos-en-${citySlug}?q=${qParam}&by=date`;
      } else if (location && location.toLowerCase() !== 'colombia' && location.toLowerCase() !== 'todo el mundo') {
        const city = location.split(',')[0].trim();
        url += `&l=${encodeURIComponent(city)}`;
      }
    }

    if (timeFilter === 'r3600' || timeFilter === 'r43200' || timeFilter === 'r86400') {
      url += '&pubdate=1';
    } else if (timeFilter === 'r604800') {
      url += '&pubdate=7';
    } else if (timeFilter === 'r2592000') {
      url += '&pubdate=30';
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-CO,es;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);
    const jobs: RawUnifiedJob[] = [];
    const seenLinks = new Set<string>();

    $('article.box_offer').each((_, el) => {
      const art = $(el);
      const titleEl = art.find('h2 a, a.js-o-link').first();
      const rawTitle = titleEl.text().trim();
      const title = rawTitle.replace(/Postulado|Vista/gi, '').replace(/\s+/g, ' ').trim();
      
      let link = titleEl.attr('href') || art.find('a').attr('href') || '';
      if (!link) return;
      if (!link.startsWith('http')) {
        link = 'https://co.computrabajo.com' + link;
      }
      const cleanLink = link.split('#')[0];
      if (seenLinks.has(cleanLink)) return;
      seenLinks.add(cleanLink);

      const companyEl = art.find('a.fc_base.t_ellipsis, p.dFlex a, p.fs16 a').first();
      let company = companyEl.text().trim();
      if (!company) {
        const compText = art.find('p.dFlex.vm_fx, p.fs16').first().text().replace(/^[\s\d,]+/, '').trim();
        company = compText || 'Empresa confidencial';
      }

      let jobLocation = '';
      const locSpan = art.find('p.fs16 span.mr10').filter((_, s) => !$(s).hasClass('dIB') && !$(s).hasClass('fx_none')).first();
      if (locSpan.length) {
        jobLocation = locSpan.text().replace(/\s+/g, ' ').trim();
      }
      if (!jobLocation) {
        art.find('span.mr10, p.fs16').each((_, s) => {
          const t = $(s).text().replace(/\s+/g, ' ').trim();
          if (t && !t.includes('$') && !t.includes('Presencial') && !t.includes('Remoto') && !t.includes('Hace') && !t.match(/^[\d,]+$/)) {
            if (!jobLocation && (t.includes(',') || t.includes('Bogotá') || t.includes('Medellín') || t.includes('Cali') || t.includes('Cartagena') || t.includes('Barranquilla') || t.includes('Colombia') || t.includes('Bolívar') || t.includes('Antioquia') || t.includes('Risaralda') || t.includes('Valle'))) {
              jobLocation = t;
            }
          }
        });
      }

      const linkCityMatch = cleanLink.match(/-en-([a-z0-9-]+)-\w{32}/i);
      if (linkCityMatch && linkCityMatch[1]) {
        const slugCity = linkCityMatch[1].replace(/-/g, ' ');
        if (!jobLocation || jobLocation === 'Colombia') {
          jobLocation = slugCity;
        }
      }

      if (!jobLocation) {
        jobLocation = 'Colombia';
      }

      if (isRemoteSearch && !jobLocation.toLowerCase().includes('remot')) {
        jobLocation = `Remoto (${jobLocation})`;
      }

      if (!isLocationMatch(jobLocation, location)) {
        return;
      }

      const salaryTag = art.find('span.tag, .fs13.fc_aux').filter((_, tag) => {
        const t = $(tag).text();
        return t.includes('$') || t.includes('Convenio') || t.includes('Mes');
      }).first().text().trim();

      const dateText = art.find('.fc_aux.fs13, p.fs13').last().text().trim();
      const timestamp = parseRelativeTimestamp(dateText);

      if (title && cleanLink) {
        jobs.push({
          id: `comp-${createHash('md5').update(cleanLink).digest('hex')}`,
          title,
          company,
          location: jobLocation,
          postedDate: new Date(timestamp).toISOString().split('T')[0],
          postedRelative: dateText || 'Reciente',
          timestamp,
          linkedinUrl: cleanLink,
          salary: salaryTag || undefined,
          source: 'computrabajo',
          portalName: 'Computrabajo',
        });
      }
    });

    return jobs;
  } catch {
    return [];
  }
}

async function fetchElempleoBatch(keywords: string, location: string): Promise<RawUnifiedJob[]> {
  try {
    const isRemoteSearch = (location || '').toLowerCase().includes('remot');
    const qParam = encodeURIComponent(keywords || 'Desarrollador');
    let url = `https://www.elempleo.com/co/ofertas-empleo?trabajo=${qParam}`;
    if (isRemoteSearch) {
      url = `https://www.elempleo.com/co/ofertas-empleo?trabajo=${qParam}%20Remoto`;
    } else if (location && location.toLowerCase() !== 'colombia' && location.toLowerCase() !== 'todo el mundo') {
      const city = location.split(',')[0].trim();
      url += `&ciudad=${encodeURIComponent(city)}`;
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-CO,es;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);
    const jobs: RawUnifiedJob[] = [];
    const seenLinks = new Set<string>();

    $('.result-item').each((_, el) => {
      const item = $(el);
      const titleEl = item.find('a.js-offer-title, [class*="offer-title"]').first();
      const rawTitle = titleEl.text().trim();
      if (!rawTitle) return;

      let link = titleEl.attr('href') || item.find('a').attr('href') || '';
      if (!link) return;
      if (!link.startsWith('http')) {
        link = 'https://www.elempleo.com' + link;
      }
      const cleanLink = link.split('?')[0];
      if (seenLinks.has(cleanLink)) return;
      seenLinks.add(cleanLink);

      const companyRaw = item.find('.info-company, [class*="company"]').first().text().replace(/industry/gi, '').trim();
      const company = companyRaw || 'Empresa confidencial';
      let loc = item.find('.info-city, [class*="city"]').first().text().trim().replace(/\s+/g, ' ');
      if (!loc) {
        try {
          const ga4 = item.find('[data-ga4-offerdata]').attr('data-ga4-offerdata');
          if (ga4) {
            const parsed = JSON.parse(ga4);
            if (parsed.location) loc = parsed.location;
          }
        } catch {
          // ignore
        }
      }
      if (!loc) loc = 'Colombia';

      if (isRemoteSearch && !loc.toLowerCase().includes('remot')) {
        loc = `Remoto (${loc})`;
      }

      if (!isLocationMatch(loc, location)) {
        return;
      }

      const salary = item.find('.info-salary, [class*="salary"]').first().text().trim();
      const date = item.find('.info-publish-date, [class*="publish-date"]').first().text().trim();
      const timestamp = parseRelativeTimestamp(date);

      jobs.push({
        id: `elempleo-${createHash('md5').update(cleanLink).digest('hex')}`,
        title: rawTitle,
        company,
        location: loc,
        postedDate: new Date(timestamp).toISOString().split('T')[0],
        postedRelative: date || 'Reciente',
        timestamp,
        linkedinUrl: cleanLink,
        salary: salary || undefined,
        source: 'elempleo',
        portalName: 'El Empleo',
      });
    });

    return jobs;
  } catch {
    return [];
  }
}

// Attach CORS helper
apiRouter.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

// Health check
const handleHealth = (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'Extractor de Empleo API', timestamp: Date.now() });
};
apiRouter.get('/health', handleHealth);
apiRouter.get('/api/health', handleHealth);

// Main /api/jobs handler
const handleJobsSearch = async (req: Request, res: Response) => {
  const keywords = (req.query['keywords'] as string) || '';
  const location = (req.query['location'] as string) || '';
  const sortBy = ((req.query['sortBy'] as string) || 'DD') as 'DD' | 'R';
  const timeFilter = (req.query['timeFilter'] as string) || '';
  const workplaceType = (req.query['workplaceType'] as string) || '';
  const platformsParam = (req.query['platforms'] as string) || 'linkedin,computrabajo,elempleo';
  const requestedPlatforms = platformsParam.split(',').map((p) => p.trim()) as JobPlatform[];
  const activePlatforms = requestedPlatforms.length > 0 ? requestedPlatforms : (['linkedin', 'computrabajo', 'elempleo'] as JobPlatform[]);

  try {
    const tasks: Promise<RawUnifiedJob[]>[] = [];

    if (activePlatforms.includes('linkedin')) {
      tasks.push(
        fetchLinkedInBatch({ keywords, location, start: 0, timeFilter, sortBy, workplaceType }).catch(() => [])
      );
      tasks.push(
        fetchLinkedInBatch({ keywords, location, start: 25, timeFilter, sortBy, workplaceType }).catch(() => [])
      );
    }

    if (activePlatforms.includes('computrabajo')) {
      tasks.push(fetchComputrabajoBatch(keywords, location, timeFilter).catch(() => []));
    }

    if (activePlatforms.includes('elempleo')) {
      tasks.push(fetchElempleoBatch(keywords, location).catch(() => []));
    }

    const results = await Promise.allSettled(tasks);
    const allJobs: RawUnifiedJob[] = [];
    const seenIds = new Set<string>();

    for (const resItem of results) {
      if (resItem.status === 'fulfilled' && Array.isArray(resItem.value)) {
        for (const job of resItem.value) {
          if (!seenIds.has(job.id)) {
            seenIds.add(job.id);
            allJobs.push(job);
          }
        }
      }
    }

    const filteredJobs = allJobs.filter((job) => isLocationMatch(job.location, location));
    filteredJobs.sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      success: true,
      total: filteredJobs.length,
      query: {
        keywords,
        location,
        sortBy,
        timeFilter,
        workplaceType,
        platforms: activePlatforms,
      },
      jobs: filteredJobs,
    });
  } catch (error: unknown) {
    console.error('Error in multi-portal extraction:', error);
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: err.message || 'Error extracting multi-platform jobs',
      jobs: [],
    });
  }
};

apiRouter.get('/jobs', handleJobsSearch);
apiRouter.get('/api/jobs', handleJobsSearch);

// Details handler
const handleJobDetails = async (req: Request, res: Response) => {
  const jobId = (req.query['id'] as string) || '';
  const jobUrl = (req.query['url'] as string) || '';

  if (!jobId && !jobUrl) {
    res.status(400).json({ error: 'Missing job id or url parameter' });
    return;
  }

  try {
    // 1. Computrabajo details
    if (jobUrl.includes('computrabajo.com')) {
      const response = await fetch(jobUrl, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'es-CO,es;q=0.9',
        },
      });

      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);
        const title = $('h1.title_offer, h1').first().text().trim() || 'Oferta de Computrabajo';
        const company = $('a.it-blank, p.fs16, .box_border a').first().text().trim() || 'Empresa';
        const location = $('p.fs13.fc_base').first().text().trim() || 'Colombia';

        const detailContainer = $('div.box_border.box_detail, div.box_detail, div.box_border').first().clone();
        detailContainer.find('.similar_offers, .banner, aside, nav, script, style, .social_share, .tags_cloud, a[href*="empresas"], a[href*="salarios"], .b_btn').remove();
        const descHtml = detailContainer.html() || $('p.mbB').parent().html() || '';
        const descText = detailContainer.text().replace(/\s+/g, ' ').trim() || '';

        const promoBlacklist = [
          'mejores empresas',
          'compara los salarios',
          'unete a nosotros',
          'únete a nosotros',
          'publica ofertas',
          'encontrar un empleo mejor',
          'a convenir',
          'postularme',
          'enviar mi cv',
          'talycap',
          'bogota',
          'bogotá',
          'computrabajo',
          'guarda tu busqueda',
          'recibir ofertas',
        ];

        const criteria: { label: string; value: string }[] = [];
        const seenVals = new Set<string>();

        $('.box_detail ul.list_check li, .box_detail ul.disc li, ul.list_check li, ul.disc li').each((_, el) => {
          const raw = $(el).text().replace(/\s+/g, ' ').trim();
          if (!raw || raw.length > 90) return;
          const lower = raw.toLowerCase();
          if (promoBlacklist.some((p) => lower.includes(p))) return;
          if (seenVals.has(lower)) return;
          seenVals.add(lower);

          let label = 'Requisito';
          let val = raw;

          if (raw.includes(':')) {
            const parts = raw.split(':');
            label = parts[0].trim();
            val = parts.slice(1).join(':').trim();
          } else if (/educaci[oó]n|universita|t[eé]cnic|profesional/i.test(raw)) {
            label = 'Educación';
          } else if (/a[ñn]o|experiencia/i.test(raw)) {
            label = 'Experiencia';
          } else if (/idioma|ingl[eé]s/i.test(raw)) {
            label = 'Idiomas';
          } else if (/conocimiento|habilidad|herramienta/i.test(raw)) {
            label = 'Conocimientos';
          } else if (/jornada|tiempo completo|medio tiempo/i.test(raw)) {
            label = 'Jornada';
          } else if (/contrato|indefinido|obra/i.test(raw)) {
            label = 'Contrato';
          }

          criteria.push({ label, value: val || raw });
        });

        if (criteria.length < 5) {
          $('div.box_detail span.tag, .box_detail a.tag').each((_, el) => {
            const raw = $(el).text().replace(/\s+/g, ' ').trim();
            if (!raw || raw.length > 40) return;
            const lower = raw.toLowerCase();
            if (promoBlacklist.some((p) => lower.includes(p))) return;
            if (seenVals.has(lower)) return;
            seenVals.add(lower);
            criteria.push({ label: 'Modalidad / Tipo', value: raw });
          });
        }

        res.json({
          success: true,
          id: jobId,
          title,
          company,
          location,
          criteria: criteria.slice(0, 6),
          descriptionHtml: descHtml,
          descriptionText: descText,
          linkedinUrl: jobUrl,
          source: 'computrabajo',
          portalName: 'Computrabajo',
        });
        return;
      }
    }

    // 2. El Empleo details
    if (jobUrl.includes('elempleo.com')) {
      const response = await fetch(jobUrl, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'es-CO,es;q=0.9',
        },
      });

      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);
        const title = $('h1.job-title, h1').first().text().trim() || 'Oferta de El Empleo';
        const company = $('.job-company, .company-name').first().text().trim() || 'Empresa confidencial';
        const location = $('.job-city, .info-city').first().text().trim() || 'Colombia';
        const descHtml = $('.job-description, .description, .offer-description').html() || '';
        const descText = $('.job-description, .description, .offer-description').text().trim() || '';

        res.json({
          success: true,
          id: jobId,
          title,
          company,
          location,
          criteria: [{ label: 'Plataforma', value: 'El Empleo Colombia' }],
          descriptionHtml: descHtml,
          descriptionText: descText,
          linkedinUrl: jobUrl,
          source: 'elempleo',
          portalName: 'El Empleo',
        });
        return;
      }
    }

    // 3. LinkedIn default details
    const numericId = jobId.replace(/\D/g, '') || jobId;
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${encodeURIComponent(numericId)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
    });

    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);

      const title = $('.top-card-layout__title').text().trim();
      const company = $('.topcard__org-name-link').text().trim() || 
                      $('.top-card-layout__first-subline a').text().trim();
      const companyUrl = $('.topcard__org-name-link').attr('href') || 
                         $('.top-card-layout__first-subline a').attr('href') || '';
      const location = $('.topcard__flavor--bullet').first().text().trim() || 
                       $('.top-card-layout__first-subline span').first().text().trim();
      const applicants = $('.num-applicants__caption').text().trim();
      const postedTime = $('time.posted-time-ago__text').text().trim();

      const criteria: { label: string; value: string }[] = [];
      $('.description__job-criteria-item').each((_, el) => {
        const label = $(el).find('.description__job-criteria-subheader').text().trim();
        const value = $(el).find('.description__job-criteria-text').text().trim();
        if (label && value) criteria.push({ label, value });
      });

      const descriptionHtml = $('.show-more-less-html__markup').html() || '';
      const descriptionText = $('.show-more-less-html__markup').text().trim();

      res.json({
        success: true,
        id: jobId,
        title,
        company,
        companyUrl,
        companyLogo: $('.topcard__logo-image').attr('src') || '',
        location,
        applicants,
        postedTime,
        criteria,
        descriptionHtml,
        descriptionText,
        linkedinUrl: jobUrl || `https://www.linkedin.com/jobs/view/${numericId}`,
        source: 'linkedin',
        portalName: 'LinkedIn',
      });
      return;
    }

    res.json({
      success: true,
      id: jobId,
      title: 'Detalles de la vacante',
      company: 'Empresa',
      location: 'Ubicación especificada en la oferta',
      criteria: [],
      descriptionHtml: `<p>Consulta la oferta oficial completa en la plataforma original.</p><p><a href="${jobUrl || '#'}" target="_blank" rel="noopener noreferrer">Abrir oferta en portal oficial</a></p>`,
      descriptionText: 'Consulta la oferta oficial completa en la plataforma original.',
      linkedinUrl: jobUrl,
      source: 'linkedin',
      portalName: 'Portal de empleo',
    });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({ error: err.message || 'Error fetching details' });
  }
};

apiRouter.get('/jobs/details', handleJobDetails);
apiRouter.get('/api/jobs/details', handleJobDetails);
