import React from 'react';
import {
  FileText,
  Sparkles,
  ArrowRight,
  History,
  Cloud,
  CheckCircle2,
  HardDrive,
  Clock,
  ExternalLink,
  Shield,
  Layers,
} from 'lucide-react';
import { ConfigStatus, SummaryHistoryItem } from '../types';

interface DashboardProps {
  config: ConfigStatus | null;
  history: SummaryHistoryItem[];
  onNavigateToSummarize: () => void;
  onNavigateToHistory: () => void;
  onViewSummary: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  config,
  history,
  onNavigateToSummarize,
  onNavigateToHistory,
  onViewSummary,
}) => {
  const isAws = config?.app_mode === 'aws';
  const totalSummaries = history.length;
  // Calculate unique documents
  const uniqueDocs = new Set(history.map((h) => h.document_id)).size;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl gradient-brand-subtle border border-brand-100 p-8 sm:p-10">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-brand-200 text-brand-700 text-xs font-semibold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Next-Gen Document Intelligence</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-900 tracking-tight leading-tight">
            Turn lengthy documents into clear insights
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Upload complex reports, legal agreements, research papers, and technical manuals.
            Generate concise, structured AI summaries powered by Amazon SageMaker AI with durable
            Amazon S3 cloud storage.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onNavigateToSummarize}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white gradient-brand shadow-md shadow-brand-500/20 hover:opacity-95 transition-all active:scale-[0.98]"
            >
              <FileText className="w-4 h-4" />
              <span>Summarize a Document</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
            <button
              onClick={onNavigateToHistory}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <History className="w-4 h-4" />
              <span>View History ({totalSummaries})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Total Summaries</span>
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-navy-900">{totalSummaries}</p>
          <p className="text-xs text-slate-500">Recorded across active sessions</p>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Processed Docs</span>
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-navy-900">{uniqueDocs}</p>
          <p className="text-xs text-slate-500">PDF, DOCX, and TXT files</p>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">AWS Cloud Engine</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isAws
                ? config?.s3_connected
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-amber-50 text-amber-600'
                : 'bg-brand-50 text-brand-600'
            }`}>
              <Cloud className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm font-bold text-navy-900 mt-1">
            {isAws ? (config?.s3_connected ? 'AWS Connected' : 'AWS Config Alert') : 'Demo Mode Active'}
          </p>
          <p className="text-xs text-slate-500 line-clamp-1">
            {isAws ? config?.s3_status_message : 'Extractive NLP Engine'}
          </p>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Max Upload Limit</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-navy-900">{config?.max_file_size_mb || 10} MB</p>
          <p className="text-xs text-slate-500">Guarded by server validation</p>
        </div>
      </div>

      {/* Quick Upload CTA & Architecture Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Summarize Action Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-navy-900 text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600" />
                Quick Document Summarization
              </h3>
              <span className="text-xs text-slate-500">Supports .pdf, .txt, .docx</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Extract and digest the most critical information in seconds. Choose your target length (Short, Medium, or Detailed) and output structure (Paragraphs, Bullet Points, or Key Takeaways).
            </p>
          </div>

          <div
            onClick={onNavigateToSummarize}
            className="border-2 border-dashed border-slate-200 hover:border-brand-400 hover:bg-brand-50/30 rounded-xl p-8 text-center cursor-pointer transition-all"
          >
            <FileText className="w-10 h-10 text-brand-500 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-800">
              Drop document here or click to open Summarize Studio
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Validation checks file size &amp; text extractability automatically
            </p>
          </div>
        </div>

        {/* AWS Architecture Explanation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-navy-900 font-bold text-sm pb-2 border-b border-slate-100">
            <Cloud className="w-4 h-4 text-brand-600" />
            <span>AWS Infrastructure Stack</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-brand-600" />
                Amazon S3 Storage
              </span>
              <p className="text-slate-500 leading-relaxed">
                Source documents and generated summary files (.json and .txt) are isolated within private S3 buckets.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                Amazon SageMaker AI
              </span>
              <p className="text-slate-500 leading-relaxed">
                Real-time inference endpoints host transformer models (e.g. BART Large CNN, FLAN-T5) with long-document chunking.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                Zero-Secret Security
              </span>
              <p className="text-slate-500 leading-relaxed">
                Zero AWS credentials are exposed to frontend clients. All interactions execute via least-privilege backend IAM roles.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Summaries Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-navy-900 text-sm">Recent Summaries</h3>
            <p className="text-xs text-slate-500">Previously generated summaries in this environment</p>
          </div>
          {history.length > 0 && (
            <button
              onClick={onNavigateToHistory}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>View all ({history.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Clock className="w-8 h-8 mx-auto opacity-50" />
            <p className="text-sm font-medium text-slate-600">No summaries generated yet</p>
            <p className="text-xs text-slate-400">
              Upload your first PDF, TXT, or DOCX document to get started.
            </p>
            <button
              onClick={onNavigateToSummarize}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white gradient-brand"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Summarize First Document</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.slice(0, 4).map((item) => (
              <div
                key={item.summary_id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 rounded-xl px-2 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-navy-900 truncate">
                      {item.filename}
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {item.format.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">
                    {item.summary_preview}
                  </p>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(item.created_at)} • {item.model_used}
                  </span>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => onViewSummary(item.summary_id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
                  >
                    View Summary
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
