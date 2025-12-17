import { ExternalVideo } from "../types";

// URL original fornecida (Dropbox)
// A função getDirectLink irá converter automaticamente para dl.dropboxusercontent.com
const CSV_URL_ORIGINAL = "https://www.dropbox.com/scl/fi/rd59ld79ykf8b05en1esc/log.csv?rlkey=d7dym879ek116esunlb2syerh&st=sfzk9rmk&dl=1";

// Mock Data para fallback
const MOCK_DATA = `timestamp,video_name,caption,dropbox_link,message_link
2023-10-27 14:30:00,Achadinho Cozinha,"Olha esse processador! Link: https://shope.ee/mock1",https://www.dropbox.com/s/mock1/video.mp4,https://t.me/exemplo/1
26/10/2023 12:15,Fone Bluetooth,"Melhor custo benefício. https://amzn.to/outrolink https://shope.ee/mock2",https://www.dropbox.com/s/mock2/video.mp4,https://t.me/exemplo/2
2023-10-26 09:00:00,Garrafa Térmica,"Mantém gelado!",https://www.dropbox.com/s/mock3/video.mp4,https://t.me/exemplo/3`;

/**
 * Gera um Hash numérico simples a partir de uma string.
 * Usado para criar IDs estáveis baseados no conteúdo.
 */
const generateHash = (str: string): string => {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Converte para 32bit integer
  }
  return Math.abs(hash).toString(36);
};

/**
 * Transforma URLs do Dropbox para garantir o download direto e compatibilidade CORS.
 * Agora utiliza URL Object para manipulação segura e valida se é um arquivo.
 */
const getDirectLink = (url: string): string => {
  if (!url) return '';
  let cleanUrl = url.trim();
  
  // Se não for Dropbox, retorna como está (assumindo link direto válido de outra fonte)
  if (!cleanUrl.includes('dropbox.com')) return cleanUrl;

  try {
    // 1. Validação de Estrutura: Links de pasta (/sh/) não são arquivos diretos
    // Tentar baixar uma pasta como vídeo resulta em erro ou HTML, então filtramos aqui.
    if (cleanUrl.includes('/sh/')) {
       return '';
    }

    // 2. Normalização do Domínio para DL (Download Direct)
    // dl.dropboxusercontent.com força o download do binário e evita a renderização da página HTML de preview
    cleanUrl = cleanUrl.replace(/^(https?:\/\/)?(www\.)?dropbox\.com/, 'https://dl.dropboxusercontent.com');

    // 3. Sanitização de Parâmetros via URL Object (Mais robusto que Regex)
    const urlObj = new URL(cleanUrl);
    
    // Remove parâmetros que controlam a visualização na interface web ou forçam download via header
    // dl=1 ou raw=1 às vezes conflitam com o domínio dl.dropboxusercontent.com
    urlObj.searchParams.delete('dl');
    urlObj.searchParams.delete('raw');
    urlObj.searchParams.delete('preview');
    urlObj.searchParams.delete('subfolder_nav_tracking');
    
    // IMPORTANTE: Mantém 'rlkey' e 'st' que são tokens de segurança obrigatórios para links privados
    
    return urlObj.toString();

  } catch (e) {
    // Fallback silencioso se a URL estiver mal formatada
    return '';
  }
};

/**
 * Extrai links da legenda priorizando Shopee.
 * Refinado para lidar com pontuação no final do link e múltiplos links.
 */
const extractLinkFromCaption = (caption: string): string => {
  if (!caption) return '';
  
  // Regex que captura URLs começando com http/https até o próximo espaço
  const urlRegex = /https?:\/\/[^\s]+/g;
  const matches = caption.match(urlRegex);
  
  if (!matches || matches.length === 0) return '';

  // Limpa pontuações comuns que podem ficar grudadas no final da URL (.,;:)
  const cleanMatches = matches.map(url => url.replace(/[.,;:)]+$/, ''));

  // Prioridade 1: Links Curtos Shopee (shope.ee ou s.shopee) - Mais valiosos para afiliados
  const shopeeShort = cleanMatches.find(url => 
    url.includes('shope.ee') || 
    url.includes('s.shopee')
  );
  if (shopeeShort) return shopeeShort;

  // Prioridade 2: Links Shopee Completos
  const shopeeLong = cleanMatches.find(url => 
    url.includes('shopee.com.br')
  );
  if (shopeeLong) return shopeeLong;

  // Fallback: Retorna o primeiro link encontrado se não houver Shopee
  return cleanMatches[0];
};

/**
 * Parser de CSV robusto para lidar com aspas contendo vírgulas.
 */
const parseCSVLine = (text: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // Remove aspas envolventes e substitui aspas duplas por simples
      result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      current = '';
    } else {
      current += char;
    }
  }
  // Adiciona o último campo
  result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
  return result;
};

/**
 * Parse Robust de Timestamp
 * Suporta: YYYY-MM-DD HH:mm:ss E DD/MM/YYYY HH:mm:ss
 */
const parseTimestamp = (ts: string): number => {
  if (!ts) return 0;
  const cleanTs = ts.trim();

  try {
    let day, month, year, hour = 0, minute = 0, second = 0;
    
    // Tenta dividir por separadores comuns: barra, traço, espaço ou dois pontos
    const parts = cleanTs.split(/[\/\-\s:]+/);

    // Detecção de formato baseada na primeira parte (Ano vs Dia)
    const firstPart = parseInt(parts[0], 10);
    
    if (firstPart > 31) {
      // Formato ISO/DB: YYYY-MM-DD (ex: 2023-10-27 14:30)
      year = firstPart;
      month = parseInt(parts[1], 10) - 1; // JS months are 0-11
      day = parseInt(parts[2], 10);
      if (parts.length > 3) hour = parseInt(parts[3], 10);
      if (parts.length > 4) minute = parseInt(parts[4], 10);
      if (parts.length > 5) second = parseInt(parts[5], 10);
    } else {
      // Formato BR: DD/MM/YYYY (ex: 27/10/2023 14:30)
      day = firstPart;
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
      if (year < 100) year += 2000; // Tratamento para ano com 2 dígitos
      if (parts.length > 3) hour = parseInt(parts[3], 10);
      if (parts.length > 4) minute = parseInt(parts[4], 10);
      if (parts.length > 5) second = parseInt(parts[5], 10);
    }

    const date = new Date(year, month, day, hour, minute, second);
    
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
    
    // Fallback básico
    return new Date(cleanTs).getTime();
  } catch { 
    return 0; 
  }
};

export const fetchExternalVideos = async (lastVisitTimestamp: number): Promise<ExternalVideo[]> => {
  let csvText = '';
  
  try {
    // Aplica a conversão para link direto na URL do CSV também
    const directCsvUrl = getDirectLink(CSV_URL_ORIGINAL);
    
    // Usa cache: 'no-store' para garantir dados frescos
    const response = await fetch(directCsvUrl, {
      cache: 'no-store',
      headers: {
        'Accept': 'text/csv, text/plain, */*'
      }
    });
    
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    csvText = await response.text();
    
    // Verificação se retornou HTML (Erro comum do Dropbox)
    if (csvText.trim().toLowerCase().startsWith('<!doctype html') || csvText.includes('<html')) {
      throw new Error("Dropbox retornou HTML em vez de CSV. Verifique o link.");
    }

  } catch (error) {
    console.error("Erro ao carregar CSV, usando mock:", error);
    csvText = MOCK_DATA;
  }

  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  const videos: ExternalVideo[] = [];

  // Pula header se encontrar 'timestamp' na primeira linha
  const startIndex = lines[0].toLowerCase().includes('timestamp') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    
    // Garante que tem colunas suficientes
    if (cols.length < 4) continue;

    const rawTimestamp = cols[0];
    const videoName = cols[1] || 'Produto sem nome';
    const caption = cols[2] || '';
    const rawDropboxLink = cols[3] || '';
    const messageLink = cols[4] || '';

    // Filtra vídeos que não são do Dropbox
    if (!rawDropboxLink.includes('dropbox.com')) {
      continue;
    }

    // Aplica getDirectLink em cada vídeo para garantir que o link seja 'baixável' via CORS
    const finalVideoUrl = getDirectLink(rawDropboxLink);

    // VALIDAÇÃO: Se o link foi identificado como inválido (ex: pasta /sh/), ignoramos este item
    if (!finalVideoUrl) {
      continue;
    }

    const timestamp = parseTimestamp(rawTimestamp);
    
    // Formata a data para exibição (Incluindo Hora e Minuto)
    const dateDisplay = timestamp 
      ? new Date(timestamp).toLocaleString('pt-BR', {
          day: '2-digit', 
          month: '2-digit', 
          year: '2-digit',
          hour: '2-digit', 
          minute: '2-digit'
        }) 
      : rawTimestamp;

    const affiliateLink = extractLinkFromCaption(caption) || messageLink;

    // --- ID ROBUSTO ---
    // Removemos query strings do link para gerar o ID, pois o Dropbox muda os parâmetros (rlkey, st, etc)
    // Usamos o 'timestamp' numérico.
    const cleanUrlKey = finalVideoUrl.split('?')[0].split('&')[0];
    const uniqueKey = `${timestamp}-${cleanUrlKey}`; 
    const stableId = `vid-${generateHash(uniqueKey)}`;

    const isNew = timestamp > lastVisitTimestamp;

    videos.push({
      id: stableId,
      date: dateDisplay,
      timestamp,
      productName: videoName,
      caption: caption,
      videoUrl: finalVideoUrl,
      telegramLink: messageLink,
      affiliateLink: affiliateLink,
      isNew
    });
  }

  // Ordena do mais recente para o mais antigo (baseado no timestamp real analisado)
  return videos.sort((a, b) => b.timestamp - a.timestamp);
};