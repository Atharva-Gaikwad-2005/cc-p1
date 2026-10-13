import React, { useState } from 'react';
import {
  FileText,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { FileUpload } from '../components/FileUpload';
import { SummarySettings } from '../components/SummarySettings';
import { SummaryCard } from '../components/SummaryCard';
import {
  DocumentPreview,
  Summary,
  SummaryFormat,
  SummaryLength,
  ConfigStatus,
} from '../types';
import { api } from '../services/api';

interface SummarizePageProps {
  config: ConfigStatus | null;
  onSummaryGenerated: (summary: Summary) => void;
  activeSummary: Summary | null;
  setActiveSummary: (summary: Summary | null) => void;
}

export const SummarizePage: React.FC<SummarizePageProps> = ({
  config,
  onSummaryGenerated,
  activeSummary,
  setActiveSummary,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<DocumentPreview | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Summarization Parameters
  const [length, setLength] = useState<SummaryLength>('medium');
  const [format, setFormat] = useState<SummaryFormat>('paragraph');

  const handleSelectFile = (file: File | null) => {
    setSelectedFile(file);
    setPreviewData(null);
    setError(null);
    setActiveSummary(null);
  };

  const handleExtractPreview = async () => {
    if (!selectedFile) return;
    setIsExtracting(true);
    setError(null);
    try {
      const result = await api.previewDocument(selectedFile);
      setPreviewData(result);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to extract text from document.';
      setError(msg);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedFile) return;
    setIsGenerating(true);
    setError(null);

    try {
      // If we don't have preview data yet, extract first
      let currentText = previewData?.full_text;
      let currentDocId = previewData?.document_id;

      if (!currentText) {
        const preview = await api.previewDocument(selectedFile);
        setPreviewData(preview);
        currentText = preview.full_text;
        currentDocId = preview.document_id;
      }

      const generated = await api.generateSummary({
        document_id: currentDocId,
        filename: selectedFile.name,
        text: currentText,
        length,
        format,
      });

      setActiveSummary(generated);
      onSummaryGenerated(generated);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to generate summary.';
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setLength('medium');
    setFormat('paragraph');
    setError(null);
  };

  const handleSummarizeAgain = () => {
    setActiveSummary(null);
    setSelectedFile(null);
    setPreviewData(null);
    setError(null);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-600 mb-1">
          <Sparkles className="w-4 h-4" />
          <span>Summarization Studio</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
          Summarize Document
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Ingest your PDF, DOCX, or TXT file, inspect the extracted preview, configure target parameters, and synthesize intelligence.
        </p>
      </div>

      {/* Error Notification Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-900 text-xs sm:text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">Processing Error</span>
            <p className="leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Main View: Active Result vs Workflow Input */}
      {activeSummary ? (
        <div className="space-y-4">
          <button
            onClick={() => setActiveSummary(null)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-navy-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Upload &amp; Settings</span>
          </button>
          <SummaryCard
            summary={activeSummary}
            originalText={previewData?.full_text}
            onSummarizeAgain={handleSummarizeAgain}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Step 1: Upload & Preview (Left Column) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="w-6 h-6 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center">
                1
              </span>
              <h2 className="text-sm font-bold text-navy-900">Upload &amp; Extract Document</h2>
            </div>

            <FileUpload
              selectedFile={selectedFile}
              onSelectFile={handleSelectFile}
              previewData={previewData}
              onExtractPreview={handleExtractPreview}
              isExtracting={isExtracting}
              maxSizeMb={config?.max_file_size_mb || 10}
            />
          </div>

          {/* Step 2: Settings & Generation (Right Column) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="w-6 h-6 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center">
                2
              </span>
              <h2 className="text-sm font-bold text-navy-900">Configure AI Summary</h2>
            </div>

            <SummarySettings
              length={length}
              setLength={setLength}
              format={format}
              setFormat={setFormat}
              onGenerate={handleGenerateSummary}
              onReset={handleReset}
              isGenerating={isGenerating}
              disabled={!selectedFile}
            />
          </div>
        </div>
      )}
    </div>
  );
};
