import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { AIGenerationParams, GeneratedContent, ToolId, ToolResult, SimilarProduct } from "../types";

const GEMINI_API_KEY = process.env.API_KEY || '';

// Define the response schema for strict JSON output (Video Manager)
const outputSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    productName: {
      type: Type.STRING,
      description: "O nome comercial do produto identificado.",
    },
    caption: {
      type: Type.STRING,
      description: "Shopee: Legenda criativa e focada em benefícios e persuasão.",
    },
    hashtags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Shopee: Lista de hashtags relevantes para o nicho do produto.",
    },
    tiktok: {
      type: Type.OBJECT,
      properties: {
        description: { type: Type.STRING, description: "TikTok: Descrição com linguagem viral e engajadora." },
        hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "TikTok: Hashtags de alto alcance e nicho." },
        music: { type: Type.STRING, description: "Sugestão de música ou estilo em alta." }
      },
      required: ["description", "hashtags", "music"]
    },
    pinterest: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Pinterest: Título otimizado para SEO." },
        description: { type: Type.STRING, description: "Pinterest: Descrição detalhada e inspiradora com CTA." },
        altText: { type: Type.STRING, description: "Pinterest: Texto alternativo para acessibilidade visual." }
      },
      required: ["title", "description", "altText"]
    }
  },
  required: ["productName", "caption", "hashtags", "tiktok", "pinterest"],
};

// Schema para lista de termos de busca
const searchTermsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    terms: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lista de 5 termos de busca (palavras-chave) otimizados para encontrar este produto na Shopee Brasil.",
    },
  },
  required: ["terms"],
};

const getClient = () => {
  if (!GEMINI_API_KEY) {
    throw new Error("API Key ausente. Verifique a configuração.");
  }
  return new GoogleGenAI({ apiKey: GEMINI_API_KEY });
};

// --- AUDIO HELPERS ---

const writeUTFBytes = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

// Converte Raw PCM (24kHz, 1ch, 16bit) para WAV com Header
const pcmToWav = (base64Pcm: string): string => {
  const binaryString = atob(base64Pcm);
  const len = binaryString.length;
  const buffer = new ArrayBuffer(44 + len);
  const view = new DataView(buffer);
  
  // RIFF identifier
  writeUTFBytes(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + len, true);
  // RIFF type
  writeUTFBytes(view, 8, 'WAVE');
  // format chunk identifier
  writeUTFBytes(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 is PCM)
  view.setUint16(20, 1, true);
  // channel count (1 for mono)
  view.setUint16(22, 1, true);
  // sample rate (24000)
  view.setUint32(24, 24000, true);
  // byte rate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint32(28, 48000, true);
  // block align (NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeUTFBytes(view, 36, 'data');
  // data chunk length
  view.setUint32(40, len, true);

  // Write PCM data
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < len; i++) {
    bytes[44 + i] = binaryString.charCodeAt(i);
  }

  // Convert buffer back to base64 string
  let binary = '';
  const bytesLen = bytes.byteLength;
  const chunk = 8192; // Process in chunks to avoid stack overflow
  for (let i = 0; i < bytesLen; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  
  return btoa(binary);
};

// Helper function to force 150 char limit
const enforceShopeeLimit = (caption: string, hashtags: string[]): { caption: string, hashtags: string[] } => {
  const MAX_CHARS = 150;
  
  // Clean input
  let cleanCaption = caption.trim();
  // Ensure valid hashtags
  let cleanHashtags = hashtags
    .map(tag => tag.replace(/[#\s.,;!?]/g, ''))
    .filter(tag => tag.length > 1);

  // Calculate current length of hashtags (including spaces and #)
  const calculateHashtagLength = (tags: string[]) => {
    if (tags.length === 0) return 0;
    // Each tag adds '#' + length + ' ' (space)
    // Actually, join(' ') adds spaces between.
    const fullTagString = tags.map(t => `#${t}`).join(' ');
    return fullTagString.length;
  };

  // 1. If hashtags alone exceed limit (unlikely but possible), reduce hashtags
  while (calculateHashtagLength(cleanHashtags) > 100 && cleanHashtags.length > 1) {
    cleanHashtags.pop();
  }

  const tagsLength = calculateHashtagLength(cleanHashtags);
  // Space needed for separator if both exist
  const separatorLength = (cleanCaption.length > 0 && tagsLength > 0) ? 1 : 0; 
  
  const availableForCaption = MAX_CHARS - tagsLength - separatorLength;

  // 2. Truncate caption if necessary
  if (cleanCaption.length > availableForCaption) {
    if (availableForCaption < 10) {
      // Priority to hashtags, caption is sacrificed
      cleanCaption = "";
    } else {
      // Truncate and add ellipsis, ensuring we don't exceed limit
      // Subtract 1 for ellipsis if needed, though strictly we just chop
      cleanCaption = cleanCaption.substring(0, availableForCaption);
    }
  }

  return { caption: cleanCaption, hashtags: cleanHashtags };
};

export const generateVideoContent = async (params: AIGenerationParams): Promise<GeneratedContent> => {
  const ai = getClient();

  const systemPrompt = `
    Você é um estrategista de Conteúdo Viral e E-commerce.
    
    TAREFA: Analisar o produto e gerar conteúdo otimizado para 3 plataformas.
    
    1. SHOPEE VIDEO:
       - Legenda: Criativa, persuasiva e com uso estratégico de emojis. Foque em benefícios.
       - Hashtags: 5 a 8 tags relevantes.
       - REGRA CRÍTICA: A soma dos caracteres da Legenda + Hashtags NÃO deve ultrapassar 150 caracteres no total. 
       - Se necessário, reduza a legenda para caber. Priorize as hashtags mais fortes.
    
    2. TIKTOK:
       - Descrição: Linguagem nativa da plataforma (POV, trends, narrativa).
       - Hashtags: Misture tags do nicho com tags virais.
       - Música: Sugira um estilo ou música que combine com o produto.
       
    3. PINTEREST:
       - Título: SEO (O que é + Benefício).
       - Descrição: Inspiradora e informativa com CTA.
       - Texto Alternativo: Descrição visual clara do produto.
    
    IMPORTANTE: Retorne APENAS as palavras das hashtags, sem o símbolo '#'.
  `;

  // Se não tiver descrição, a IA deve focar na imagem
  const descriptionPrompt = params.description 
    ? `Notas/Descrição: ${params.description}`
    : `IMPORTANTE: Analise a imagem visualmente para definir o NOME EXATO do produto e criar a copy.`;

  const userPrompt = `
    Input do Usuário (Nome provisório): ${params.productName}
    ${descriptionPrompt}
    ${params.affiliateLink ? `Link: ${params.affiliateLink}` : ''}
    
    Gere o JSON completo seguindo o schema para Shopee, TikTok e Pinterest.
  `;

  try {
    const parts: any[] = [{ text: userPrompt }];

    if (params.imageBase64) {
      const base64Data = params.imageBase64.split(',')[1] || params.imageBase64;
      const mimeType = params.imageBase64.split(';')[0].split(':')[1] || 'image/jpeg';
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        role: "user",
        parts: parts
      },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: outputSchema,
        temperature: 0.7, 
      },
    });

    const text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");

    const content = JSON.parse(text) as GeneratedContent;

    // Post-processing to strict enforce limits
    const limitResult = enforceShopeeLimit(content.caption || "", content.hashtags || []);
    content.caption = limitResult.caption;
    content.hashtags = limitResult.hashtags;

    if (Array.isArray(content.tiktok?.hashtags)) {
        content.tiktok!.hashtags = content.tiktok!.hashtags
        .map(tag => tag.replace(/[#\s.,;!?]/g, ''))
        .filter(tag => tag.length > 1);
    }

    return content;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

export const findSimilarProducts = async (productName: string, affiliateLink?: string, imageBase64?: string): Promise<SimilarProduct[]> => {
  const ai = getClient();

  const systemPrompt = `
    Atue como um especialista em SEO da Shopee Brasil.
    Gere 5 termos de busca (palavras-chave) para encontrar concorrentes deste produto.
    PRIORIZE A ANÁLISE VISUAL se houver imagem.
    Retorne apenas os textos das palavras-chave.
  `;

  const userPrompt = `
    Produto: "${productName}"
    ${affiliateLink ? `Link: ${affiliateLink}` : ''}
    ${imageBase64 ? 'Analise a imagem anexa.' : ''}
  `;

  try {
    const parts: any[] = [{ text: userPrompt }];

    if (imageBase64) {
      const base64Data = imageBase64.split(',')[1] || imageBase64;
      const mimeType = imageBase64.split(';')[0].split(':')[1] || 'image/jpeg';
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        role: "user",
        parts: parts
      },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: searchTermsSchema,
        temperature: 0.5,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");
    
    const json = JSON.parse(text);
    const terms: string[] = json.terms || [];

    const products: SimilarProduct[] = terms.map(term => ({
      name: term,
      url: `https://shopee.com.br/search?keyword=${encodeURIComponent(term)}`
    }));

    return products;
  } catch (error) {
    console.error("Find Similar Error:", error);
    return [
      { name: productName, url: `https://shopee.com.br/search?keyword=${encodeURIComponent(productName)}` }
    ];
  }
};

// --- NEW TOOLS FUNCTIONALITY ---

export const generateToolContent = async (toolId: ToolId, input: string): Promise<ToolResult> => {
  const ai = getClient();

  // Special Case: Audio Generation
  if (toolId === 'tts') {
    return generateAudio(input);
  }

  let systemPrompt = "Você é um especialista em Marketing Digital e E-commerce.";
  
  switch (toolId) {
    case 'find_similar':
      systemPrompt = `You are an AI assistant. Task: Generate 5 Shopee search keywords for this product.`;
      break;
    case 'reels_script':
      systemPrompt = "Crie um roteiro completo para Reels/TikTok focado em vendas na Shopee. Estrutura: Gancho (3s), Desenvolvimento e CTA.";
      break;
    case 'stories_phrases':
      systemPrompt = "Gere 5 opções de frases engajadoras para Stories do Instagram/WhatsApp para vender este produto.";
      break;
    case 'narration_script':
      systemPrompt = "Escreva um texto fluido e natural para ser narrado em off (voiceover) em um vídeo de review de produto. Foco nos benefícios.";
      break;
    case 'daily_plan':
      systemPrompt = "Crie um planejamento diário de conteúdo para este nicho (Manhã, Tarde, Noite).";
      break;
    case 'persuasive_invite':
      systemPrompt = "Crie um texto persuasivo para convidar seguidores para uma Live Shop ou Grupo de Ofertas.";
      break;
    case 'viral_ad':
      systemPrompt = "Crie uma copy para anúncio pago (Ads) usando estrutura AIDA.";
      break;
    case 'bio_generator':
      systemPrompt = "Gere 3 opções de Bio Profissional para perfil de Achadinhos/Afiliado.";
      break;
    case 'product_validation':
      systemPrompt = "Analise este produto: Pontos Fortes, Objeções e Potencial Viral (0-10).";
      break;
    case 'trends':
      systemPrompt = "Liste 5 ideias de vídeos baseadas em tendências atuais para este nicho.";
      break;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { role: "user", parts: [{ text: input }] },
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
      },
    });

    return { text: response.text || "Sem resposta." };
  } catch (error) {
    console.error("Tool Generation Error:", error);
    throw error;
  }
};

export const generateAudio = async (text: string): Promise<ToolResult> => {
  const ai = getClient();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: {
        role: "user",
        parts: [{ text: text }]
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!audioData) {
      throw new Error("Não foi possível gerar o áudio.");
    }
    
    // Convert Raw PCM to valid WAV with header
    const wavData = pcmToWav(audioData);

    return { 
      text: text,
      audioData: wavData
    };
  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
};