
export interface TikTokContent {
  description: string;
  hashtags: string[];
  music: string;
}

export interface PinterestContent {
  title: string;
  description: string;
  altText: string;
}

export interface GeneratedContent {
  productName: string; // A IA vai definir o nome correto
  caption: string; // Shopee Caption
  hashtags: string[]; // Shopee Hashtags
  tiktok?: TikTokContent;
  pinterest?: PinterestContent;
}

export type ItemStatus = 'draft' | 'ready' | 'posted';

export interface SimilarProduct {
  name: string;
  url: string;
}

export interface VideoItem {
  id: string;
  productName: string;
  description: string;
  category?: string;
  thumbnailUrl?: string; // Data URL for preview
  affiliateLink?: string; // Novo campo para o link
  generatedContent?: GeneratedContent;
  similarProducts?: SimilarProduct[]; // Lista de objetos
  status: ItemStatus;
  scheduledDate?: string; // ISO string
  createdAt: number;
  updatedAt?: number; // Timestamp da última modificação
  postedAt?: number; // Timestamp de quando foi marcado como postado
  hasVideo?: boolean; // Flag indicando se existe arquivo de vídeo salvo
}

// Interface para a aba "Recebidos"
export interface ExternalVideo {
  id: string;
  date: string; // Formato original do CSV ou ISO
  timestamp: number;
  productName: string;
  videoUrl: string;
  affiliateLink: string;
  telegramLink?: string; // Link para a mensagem no Telegram
  caption?: string; // Legenda original do vídeo
  isNew: boolean;
}

export interface AIGenerationParams {
  productName: string;
  description: string;
  category?: string;
  imageBase64?: string;
  affiliateLink?: string;
}

// Novos tipos para as Ferramentas
export type ToolId = 
  | 'tts' 
  | 'reels_script' 
  | 'stories_phrases' 
  | 'narration_script' 
  | 'daily_plan' 
  | 'persuasive_invite' 
  | 'viral_ad' 
  | 'bio_generator' 
  | 'product_validation' 
  | 'trends'
  | 'find_similar';

export interface ToolConfig {
  id: ToolId;
  title: string;
  icon: any; // Lucide Icon component
  color: string;
  description: string;
  inputLabel: string;
  inputPlaceholder: string;
  buttonLabel: string;
}

export interface ToolResult {
  text: string;
  audioData?: string; // Base64 audio for TTS
}

export interface ToolHistoryItem {
  id: string;
  toolId: ToolId;
  input: string;
  result: ToolResult;
  timestamp: number;
}
