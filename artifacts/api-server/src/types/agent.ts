import type { PartialInfrastructureParams } from './infrastructure.js';

export type MessageRole = 'agent' | 'user' | 'system';

export type UserRegister =
  | 'technical'
  | 'plain'
  | 'sensory'
  | 'undetected';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  imageAttachment?: string;
}

export interface AgentTurnRequest {
  sessionId: string;
  userMessage: string;
  imageData?: {
    base64: string;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  };
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  currentParams: PartialInfrastructureParams;
  confidenceScores: Partial<Record<keyof PartialInfrastructureParams, number>>;
  turnCount: number;
  register: UserRegister;
}

export interface AgentTurnResponse {
  agentMessage: string;
  extractedParam?: {
    parameter: keyof PartialInfrastructureParams;
    value: string | number;
    confidence: number;
    method: ExtractionMethod;
  };
  updatedRegister: UserRegister;
  isComplete: boolean;
  quickReplies?: string[];
  triggerImageUpload?: boolean;
  error?: string;
}

export type ExtractionMethod =
  | 'direct_statement'
  | 'description_inference'
  | 'sensory_proxy'
  | 'image_analysis'
  | 'conservative_default';

export interface ParameterExtraction {
  parameter: keyof PartialInfrastructureParams;
  value: string | number;
  confidence: number;
  method: ExtractionMethod;
}
