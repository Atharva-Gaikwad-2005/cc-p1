import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  FileCheck,
  AlertCircle,
  X,
  Eye,
  FileCode,
  File,
} from 'lucide-react';
import { DocumentPreview } from '../types';

interface FileUploadProps {
  selectedFile: File | null;
  onSelectFile: (file: File | null) => void;
  previewData: DocumentPreview | null;
  onExtractPreview: () => void;
  isExtracting: boolean;
  maxSizeMb?: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  selectedFile,
  onSelectFile,
  previewData,
  onExtractPreview,
  isExtracting,
  maxSizeMb = 10,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedExtensions = ['.pdf', '.txt', '.docx'];

  const validateAndSet = (file: File) => {
    setError(null);
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!supportedExtensions.includes(ext)) {
      setError(`Unsupported file format '${ext}'. Please upload a PDF, TXT, or DOCX document.`);
      return;
    }
    const maxBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File size exceeds ${maxSizeMb} MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      return;
    }
    if (file.size === 0) {
      setError('The selected file is empty (0 bytes).');
      return;
    }
    onSelectFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSet(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSet(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-8 h-8 text-rose-500" />;
    if (ext === 'docx') return <File className="w-8 h-8 text-blue-500" />;
    return <FileCode className="w-8 h-8 text-slate-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Upload Dropzone */}
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-brand-500 bg-brand-50/60 scale-[1.01]'
              : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50/80 bg-white'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.docx"
            onChange={handleFileInput}
            className="hidden"
            id="document-file-input"
          />
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 shadow-sm">
              <UploadCloud className="w-8 h-8 animate-bounce-short" />
            </div>
            <div>
              <p className="text-base font-semibold text-navy-900">
                Click to upload or drag and drop your document
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supported formats: <strong className="text-slate-700">PDF, TXT, DOCX</strong> (Up to {maxSizeMb} MB)
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-medium">
                Text-based PDFs
              </span>
              <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-medium">
                Word Documents
              </span>
              <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-medium">
                UTF-8 Plaintext
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Selected File Card */
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                {getFileIcon(selectedFile.name)}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-navy-900 break-all">
                  {selectedFile.name}
                </h4>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>Size: {formatFileSize(selectedFile.size)}</span>
                  <span>•</span>
                  <span className="uppercase font-semibold text-brand-600">
                    {selectedFile.name.split('.').pop()}
                  </span>
                  {previewData && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <FileCheck className="w-3.5 h-3.5" />
                        {previewData.word_count.toLocaleString()} words extracted
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectFile(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Text preview extraction toolbar */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            {!previewData ? (
              <button
                onClick={onExtractPreview}
                disabled={isExtracting}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isExtracting ? 'Extracting text preview...' : 'Extract Text Preview'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  {previewData.char_count.toLocaleString()} chars parsed
                </span>
                <button
                  onClick={() => setShowPreviewModal(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Extracted Text</span>
                </button>
              </div>
            )}
            <span className="text-xs text-slate-400">Ready for summarization</span>
          </div>
        </div>
      )}

      {/* Validation Error Banner */}
      {error && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Extracted Text Preview Modal */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-navy-900 text-sm">Extracted Document Text</h3>
                <p className="text-xs text-slate-500">
                  {previewData.filename} ({previewData.word_count.toLocaleString()} words)
                </p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-mono bg-slate-50/50 rounded-b-2xl">
              {previewData.full_text}
            </div>
            <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
