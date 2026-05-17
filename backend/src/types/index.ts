export interface Session {
  id: string;
  problemSlug: string;
  containerId: string;
  containerName: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'starting' | 'ready' | 'expired';
}

export interface Problem {
  slug: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  tags: string[];
  hints: string[];
  dockerImage: string;
  timeLimit: number;
}

export interface TerminalMessage {
  type: 'data' | 'resize' | 'ping';
  data?: string;
  cols?: number;
  rows?: number;
}

export interface VerifyResult {
  success: boolean;
  message: string;
}
