export type SummaryLength = 'short' | 'medium' | 'detailed';

export type SummaryFormat = 'paragraph' | 'bullet_points' | 'key_takeaways';

export type ActiveTab = 'dashboard' | 'summarize' | 'history' | 'settings';

export interface DocumentPreview {
  document_id: string;
  filename: string;
  file_size: number;
  file_type: string;
  char_count: number;
  word_count: number;
  preview_text: string;
  full_text: string;
  truncated: boolean;
}

export interface Summary {
  summary_id: string;
  document_id: string;
  filename: string;
  created_at: string;
  length: SummaryLength;
  format: SummaryFormat;
  summary_text: string;
  key_points: string[];
  keywords: string[];
  model_used: string;
  storage_location: string;
  saved: boolean;
  original_word_count: number;
  summary_word_count: number;
  compression_ratio: number;
}

export interface SummaryHistoryItem {
  summary_id: string;
  document_id: string;
  filename: string;
  created_at: string;
  length: SummaryLength;
  format: SummaryFormat;
  summary_preview: string;
  model_used: string;
  storage_location: string;
}

export interface ConfigStatus {
  app_mode: 'demo' | 'aws';
  aws_configured: boolean;
  aws_region: string | null;
  s3_bucket: string | null;
  s3_connected: boolean;
  s3_status_message: string;
  sagemaker_endpoint: string | null;
  sagemaker_connected: boolean;
  sagemaker_status_message: string;
  max_file_size_mb: number;
  supported_file_types: string[];
  status_description: string;
}
