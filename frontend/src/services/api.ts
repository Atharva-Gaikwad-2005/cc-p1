import axios from 'axios';
import {
  DocumentPreview,
  Summary,
  SummaryHistoryItem,
  ConfigStatus,
  SummaryLength,
  SummaryFormat,
} from '../types';

// Defaults to relative /api (works out-of-the-box with Vite dev proxy and unified deployments)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s timeout for ML inference
});

export const api = {
  async getHealth(): Promise<{ status: string; app_name: string; version: string; mode: string }> {
    const res = await apiClient.get('/health');
    return res.data;
  },

  async getConfigStatus(): Promise<ConfigStatus> {
    const res = await apiClient.get<ConfigStatus>('/config/status');
    return res.data;
  },

  async previewDocument(file: File): Promise<DocumentPreview> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<DocumentPreview>('/documents/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  async uploadDocument(file: File): Promise<{
    document_id: string;
    filename: string;
    file_size: number;
    file_type: string;
    storage_location: string;
    uploaded_at: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  async generateSummary(params: {
    document_id?: string;
    filename: string;
    text: string;
    length: SummaryLength;
    format: SummaryFormat;
  }): Promise<Summary> {
    const res = await apiClient.post<Summary>('/summaries/generate', params);
    return res.data;
  },

  async getSummaryHistory(): Promise<SummaryHistoryItem[]> {
    const res = await apiClient.get<SummaryHistoryItem[]>('/summaries');
    return res.data;
  },

  async getSummaryById(summaryId: string): Promise<Summary> {
    const res = await apiClient.get<Summary>(`/summaries/${summaryId}`);
    return res.data;
  },

  async deleteSummary(summaryId: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete(`/summaries/${summaryId}`);
    return res.data;
  },
};
