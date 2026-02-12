
export interface EvaluationResult {
  candidateName: string;
  phoneNumber?: string;
  matchScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  action: 'Strong Hire' | 'Interview' | 'Reject';
}

export interface CallResult {
  verdict: 'HIRE' | 'REJECT' | 'MAYBE';
  assessmentText: string;
  callScore: number;
  timestamp: number;
}

export interface CvFile {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'processing' | 'success' | 'error';
  result?: EvaluationResult;
  callResult?: CallResult;
  errorMessage?: string;
}

export interface Role {
  id: string;
  title: string;
  jd: string;
  candidates: CvFile[];
}

export enum FileTypes {
  PDF = 'application/pdf',
  TXT = 'text/plain',
}

export type ViewState = 'onboarding' | 'dashboard';
