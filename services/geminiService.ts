import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { AIGenerationParams, GeneratedContent, ToolId, ToolResult, SimilarProduct } from "../types";

const GEMINI_API_KEY = process.env.API_KEY || '';

// Define the response schema for strict JSON output (Video Manager)
const outputSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    productName: {
      type: Type.STRING,
      description: "O nome comercial exato do produto identificado na imagem/link. Curto e formatado (Title Case).",
    },
    caption: {
      type: Type.STRING,
      description: "Shopee: Legenda viral ULTRA CURTA (máx 80 caracteres). Foco em benefício imediato.",
    },
    hashtags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Shopee: Lista de 3 a 5 palavras-chave curtas. O TOTAL (Legenda + Tags) deve ser menor que 150 caracteres. RETORNE APENAS AS PALAVRAS.",
    },
    tiktok: {
      type: Type.OBJECT,
      properties: {
        description: { type: Type.STRING, description: "TikTok: Descrição viral, perguntas para engajar." },
        hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "TikTok: 6 Hashtags de alto alcance." },
        music: { type: Type.STRING, description: "Sugestão de nome de música viral do momento (ex: Funk, Pop, Trap)." }
      },
      required: ["description", "hashtags", "music"]
    },
    pinterest: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Pinterest: Título SEO otimizado e chamativo." },
        description: { type: Type.STRING, description: "Pinterest: Descrição rica em palavras-chave com CTA forte no final." },
        altText: { type: Type.STRING, description: "Pinterest: Texto alternativo descrevendo visualmente o produto/vídeo para leitores de tela." }
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

export const generateVideoContent = async (params: AIGenerationParams): Promise<GeneratedContent> => {
  const ai = getClient();

  const systemPrompt = `
    Você é um estrategista sênior de Conteúdo Viral e E-commerce (Shopee, TikTok, Pinterest).
    
    TAREFA: Analisar o produto e gerar conteúdo otimizado para 3 plataformas.
    
    1. SHOPEE VIDEO (IMPORTANTE: LIMITE ESTRITO DE 150 CARACTERES TOTAIS):
       - Legenda: Deve ser ULTRA CURTA e direta (max 70-80 chars).
       - Hashtags: 3 a 5 tags curtas e fortes.
       - A SOMA da Legenda + Hashtags NÃO PODE PASSAR DE 150 CARACTERES.
    
    2. TIKTOK:
       - Descrição: Linguagem nativa da plataforma (POV, "Eu preciso disso", etc).
       - Hashtags: 6 tags virais (ex: #fyp, #achadinhos).
       - Música: Sugira um estilo ou música em alta.
       
    3. PINTEREST:
       - Título: SEO (O que é + Benefício).
       - Descrição: Detalhada + CTA (Chamada para Ação) clicando no link.
       - Texto Alternativo: Descreva os detalhes visuais do vídeo/produto para acessibilidade.
    
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
        temperature: 0.7, // Um pouco mais criativo, mas controlado
      },
    });

    const text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");

    return JSON.parse(text) as GeneratedContent;
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
      systemPrompt = "Crie um roteiro completo para Reels/TikTok focado em vendas na Shopee. Estrutura obrigatória: 1. Gancho Visual/Sonoro (3s), 2. Desenvolvimento (Problema/Solução), 3. Revelação do Preço/Oferta, 4. CTA Clara. Use linguagem dinâmica e viral.";
      break;
    case 'stories_phrases':
      systemPrompt = "Gere 5 opções de frases engajadoras para Stories do Instagram/WhatsApp para vender este produto. Devem ser curtas, gerar curiosidade e pedir interação (enquetes, directs).";
      break;
    case 'narration_script':
      systemPrompt = "Escreva um texto fluido e natural para ser narrado em off (voiceover) em um vídeo de review de produto. Tom: Entusiasta, amigo aconselhando amigo. Foque nos benefícios. Máximo 1 minuto de fala.";
      break;
    case 'daily_plan':
      systemPrompt = "Crie um planejamento diário de conteúdo para este nicho. Sugira: 1 Post para Manhã (Stories), 1 Post para Almoço (Reels/Vídeo), 1 Post para Noite (Prova Social/Oferta). Seja específico.";
      break;
    case 'persuasive_invite':
      systemPrompt = "Crie um texto persuasivo para convidar seguidores para uma Live Shop ou para entrar em um Grupo de Ofertas. Use gatilhos mentais de Escassez e Exclusividade.";
      break;
    case 'viral_ad':
      systemPrompt = "Crie uma copy para anúncio pago (Ads). Estrutura AIDA (Atenção, Interesse, Desejo, Ação). Foco em ROI e clique imediato.";
      break;
    case 'bio_generator':
      systemPrompt = "Gere 3 opções de Bio Profissional para perfil de Achadinhos/Afiliado. Inclua emojis, autoridade e chamada para o link na bio. Limite de 150 caracteres por opção.";
      break;
    case 'product_validation':
      systemPrompt = "Atue como um analista de mercado. Analise este produto/nicho. Liste: 3 Pontos Fortes para venda, 2 Objeções prováveis dos clientes (e como contornar), e Nota de 0 a 10 para potencial viral na Shopee Videos.";
      break;
    case 'trends':
      systemPrompt = "Liste 5 ideias de vídeos baseadas em tendências atuais (trends, áudios, formatos) que podem ser adaptadas para este nicho/produto. Seja criativo.";
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
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Voz feminina clara e profissional
          },
        },
      },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!audioData) {
      throw new Error("Não foi possível gerar o áudio.");
    }

    return { 
      text: text,
      audioData: audioData
    };
  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
};