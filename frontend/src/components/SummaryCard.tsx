import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  Eye,
  RotateCcw,
  Sparkles,
  Cloud,
  HardDrive,
  Calendar,
  Layers,
  Tag,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { Summary } from '../types';

interface SummaryCardProps {
  summary: Summary;
  originalText?: string;
  onSummarizeAgain: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  summary,
  originalText,
  onSummarizeAgain,
}) => {
  const [copied, setCopied] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary.summary_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownloadTxt = () => {
    const filenameBase = summary.filename.replace(/\.[^/.]+$/, '');
    const filename = `${filenameBase}_summary.txt`;
    const blob = new Blob([summary.summary_text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const isS3 = summary.storage_location.startsWith('s3://');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-6 sm:p-8 space-y-6 animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-navy-900 break-all">{summary.filename}</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-brand-50 text-brand-700 border border-brand-200 capitalize">
              {summary.length} Length
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-violet-50 text-violet-700 border border-violet-200 capitalize">
              {summary.format.replace('_', ' ')}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(summary.created_at)}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-medium text-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              {summary.model_used}
            </span>
          </div>
        </div>

        {/* Persistence Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isS3
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {isS3 ? <Cloud className="w-3.5 h-3.5 text-emerald-600" /> : <HardDrive className="w-3.5 h-3.5 text-slate-600" />}
            <span>{isS3 ? 'Saved to Amazon S3' : 'Saved Locally'}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </span>
        </div>
      </div>

      {/* Analytics / Compression Pill */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
        <div>
          <span className="text-slate-500 block">Original Length</span>
          <span className="text-sm font-semibold text-slate-800">
            {summary.original_word_count.toLocaleString()} words
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Summary Length</span>
          <span className="text-sm font-semibold text-slate-800">
            {summary.summary_word_count.toLocaleString()} words
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Reduction Rate</span>
          <span className="text-sm font-bold text-emerald-600">
            {summary.compression_ratio}% reduction
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Read Time Saved</span>
          <span className="text-sm font-semibold text-brand-700">
            ~{Math.max(1, Math.round((summary.original_word_count - summary.summary_word_count) / 200))} min
          </span>
        </div>
      </div>

      {/* Main Summary Content */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Generated AI Summary
        </h3>
        <div className="p-6 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans">
          {summary.summary_text}
        </div>
      </div>

      {/* Key Points / Highlights Section */}
      {summary.key_points && summary.key_points.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Layers className="w-3.5 h-3.5 text-brand-600" />
            <span>Key Points & Findings</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {summary.key_points.map((pt, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-lg bg-brand-50/50 border border-brand-100 text-xs sm:text-sm text-slate-700"
              >
                <span className="w-5 h-5 rounded-full bg-brand-200 text-brand-800 font-bold flex items-center justify-center shrink-0 text-xs">
                  {idx + 1}
                </span>
                <span>{pt}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keywords / Salient Tags */}
      {summary.keywords && summary.keywords.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Tag className="w-3.5 h-3.5 text-violet-600" />
            <span>Identified Topics & Keywords</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.keywords.map((kw, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-md text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-100"
              >
                #{kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              copied
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Summary'}</span>
          </button>

          {/* Download TXT Button */}
          <button
            onClick={handleDownloadTxt}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download TXT</span>
          </button>

          {/* View Original Text Toggle */}
          {originalText && (
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>{showOriginal ? 'Hide Original' : 'View Original Text'}</span>
            </button>
          )}
        </div>

        {/* Summarize Again Button */}
        <button
          onClick={onSummarizeAgain}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white gradient-brand shadow-xs hover:opacity-95 transition-opacity"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Summarize Another Document</span>
        </button>
      </div>

      {/* Original Document Modal / Drawer */}
      {showOriginal && originalText && (
        <div className="p-5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed animate-in fade-in">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
            <span className="font-semibold text-slate-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-500" />
              Original Extracted Document Text
            </span>
            <button
              onClick={() => setShowOriginal(false)}
              className="text-xs text-brand-600 hover:underline"
            >
              Close
            </button>
          </div>
          {originalText}
        </div>
      )}
    </div>
  );
};
