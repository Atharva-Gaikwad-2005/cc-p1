import React, { useState } from 'react';
import {
  History,
  Search,
  Trash2,
  Eye,
  Calendar,
  Sparkles,
  Cloud,
  HardDrive,
  FileText,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { SummaryHistoryItem } from '../types';
import { api } from '../services/api';

interface HistoryPageProps {
  history: SummaryHistoryItem[];
  onViewSummary: (id: string) => void;
  onRefreshHistory: () => void;
  isLoading: boolean;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  history,
  onViewSummary,
  onRefreshHistory,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = history.filter((item) =>
    item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.summary_preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (summaryId: string) => {
    setDeletingId(summaryId);
    setError(null);
    try {
      await api.deleteSummary(summaryId);
      setDeleteConfirmId(null);
      onRefreshHistory();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to delete summary record.';
      setError(msg);
    } finally {
      setDeletingId(null);
    }
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-600 mb-1">
            <History className="w-4 h-4" />
            <span>Persistence &amp; Audit Trail</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
            Summary History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Access, review, and manage previous document summaries stored in Amazon S3 or local demo storage.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search summaries by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading summary records from backend...</p>
        </div>
      ) : filtered.length === 0 ? (
        /* Empty State */
        <div className="py-16 text-center bg-white border border-slate-200 rounded-2xl p-8 space-y-3 shadow-xs">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-navy-900 text-sm">
            {searchQuery ? 'No matching summaries found' : 'No summary history available'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'Try modifying your search term or clearing the query.'
              : 'Summaries you generate will appear here with full persistence and delete options.'}
          </p>
        </div>
      ) : (
        /* History Items List */
        <div className="space-y-3">
          {filtered.map((item) => {
            const isS3 = item.storage_location.startsWith('s3://');
            const isConfirming = deleteConfirmId === item.summary_id;

            return (
              <div
                key={item.summary_id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-sm text-navy-900 truncate">
                        {item.filename}
                      </h3>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                        {item.length}
                      </span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                        {item.format.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.created_at)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <Sparkles className="w-3 h-3 text-brand-600" />
                        {item.model_used}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {isS3 ? (
                          <Cloud className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <HardDrive className="w-3 h-3 text-slate-500" />
                        )}
                        {isS3 ? 'Amazon S3' : 'Local Storage'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onViewSummary(item.summary_id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>

                    {isConfirming ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in">
                        <button
                          onClick={() => handleDelete(item.summary_id)}
                          disabled={deletingId === item.summary_id}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                        >
                          {deletingId === item.summary_id ? 'Deleting...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(item.summary_id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete summary"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Preview text */}
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100 font-sans">
                  {item.summary_preview}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
