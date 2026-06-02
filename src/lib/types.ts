export interface Novel {
  id: string;
  userId: string;
  title: string;
  description: string;
  notes?: string; // 小说笔记
  coverImage?: string;
  genre: string;
  status: 'draft' | 'ongoing' | 'completed';
  createdAt: string;
  updatedAt: string;
  characters: Character[];
  chapters: Chapter[];
  worldSettings: WorldSetting[];
}

export interface Character {
  id: string;
  name: string;
  age?: number;
  appearance?: string;
  personality?: string;
  background?: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Chapter {
  id: string;
  novelId: string;
  title: string;
  content: string;
  keywords?: string;
  outline?: string;
  order: number;
  status: 'draft' | 'published';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorldSetting {
  id: string;
  novelId: string;
  category: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface AIGenerationRequest {
  type: 'outline' | 'chapter' | 'continue' | 'character' | 'plot';
  novelId?: string;
  chapterId?: string;
  prompt: string;
  context?: {
    previousContent?: string;
    characters?: Character[];
    worldSettings?: WorldSetting[];
    chapterCount?: number;
  };
}

export interface AIGenerationResponse {
  success: boolean;
  content: string;
  error?: string;
}
