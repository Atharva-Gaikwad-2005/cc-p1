import React, { useState } from 'react';
import {
  Settings,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Shield,
  HardDrive,
  Cpu,
  RefreshCw,
  Terminal,
  Lock,
  ExternalLink,
  Info,
} from 'lucide-react';
import { ConfigStatus } from '../types';
import { api } from '../services/api';

interface SettingsPageProps {
  config: ConfigStatus | null;
  onRefreshConfig: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  config,
  onRefreshConfig,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshConfig();
    } finally {
      setIsRefreshing(false);
    }
  };

  const isAws = config?.app_mode === 'aws';

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-600 mb-1">
            <Settings className="w-4 h-4" />
            <span>Environment &amp; Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
            System Settings &amp; Cloud Status
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time diagnostics of backend configuration, Amazon S3 storage, and SageMaker inference readiness.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Checking Cloud...' : 'Probe AWS Status'}</span>
        </button>
      </div>

      {/* Operating Mode Banner */}
      <div className={`p-6 rounded-2xl border ${
        isAws
          ? config?.s3_connected && config?.sagemaker_connected
            ? 'bg-emerald-50/60 border-emerald-200'
            : 'bg-amber-50/60 border-amber-200'
          : 'bg-brand-50/60 border-brand-200'
      } space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
              isAws ? (config?.s3_connected ? 'bg-emerald-600' : 'bg-amber-600') : 'gradient-brand'
            }`}>
              {isAws ? <Cloud className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-navy-900 text-base">
                  Active Mode: {isAws ? 'AWS Production Mode' : 'Local Demo Mode'}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isAws
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-brand-100 text-brand-800'
                }`}>
                  {config?.app_mode}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {config?.status_description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Amazon S3 Diagnostics */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-navy-900 font-bold text-sm">
              <HardDrive className="w-4 h-4 text-brand-600" />
              <span>Storage Provider</span>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
              config?.s3_connected
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {config?.s3_connected && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
              <span>{config?.s3_connected ? 'Operational' : 'Local Fallback'}</span>
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Storage Backend:</span>
              <span className="font-medium text-slate-800">{isAws ? 'Amazon S3 (Private)' : 'Local Filesystem (data/)'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Bucket Name:</span>
              <span className="font-medium text-slate-800">{config?.s3_bucket || 'N/A (Demo Mode)'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">AWS Region:</span>
              <span className="font-medium text-slate-800">{config?.aws_region || 'N/A (Demo Mode)'}</span>
            </div>
            <div className="pt-2 text-slate-500">
              <span className="block font-semibold text-slate-700 mb-1">Backend Status Message:</span>
              <p className="p-2.5 rounded-lg bg-slate-50 font-mono text-[11px] text-slate-600 border border-slate-100">
                {config?.s3_status_message}
              </p>
            </div>
          </div>
        </div>

        {/* Amazon SageMaker Diagnostics */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-navy-900 font-bold text-sm">
              <Cpu className="w-4 h-4 text-violet-600" />
              <span>AI Inference Engine</span>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
              config?.sagemaker_connected
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-brand-50 text-brand-700 border border-brand-200'
            }`}>
              {config?.sagemaker_connected ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>InService</span>
                </>
              ) : (
                <span>Local Extractive Engine</span>
              )}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Model Provider:</span>
              <span className="font-medium text-slate-800">
                {isAws ? 'Amazon SageMaker Endpoint' : 'Built-in Extractive NLP'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Endpoint Name:</span>
              <span className="font-medium text-slate-800">
                {config?.sagemaker_endpoint || 'None (Using Local Adapter)'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Long Text Strategy:</span>
              <span className="font-medium text-slate-800">800-Word Overlapping Sliding Chunks</span>
            </div>
            <div className="pt-2 text-slate-500">
              <span className="block font-semibold text-slate-700 mb-1">Endpoint Status Message:</span>
              <p className="p-2.5 rounded-lg bg-slate-50 font-mono text-[11px] text-slate-600 border border-slate-100">
                {config?.sagemaker_status_message}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Constraints & Security Assurance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Document Constraints Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-navy-900 font-bold text-sm pb-2 border-b border-slate-100">
            <Info className="w-4 h-4 text-brand-600" />
            <span>Document Constraints</span>
          </div>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Maximum File Size:</span>
              <strong className="text-navy-900">{config?.max_file_size_mb || 10} MB</strong>
            </div>
            <div className="flex justify-between">
              <span>Supported Extensions:</span>
              <strong className="text-navy-900">.pdf, .txt, .docx</strong>
            </div>
            <div className="flex justify-between">
              <span>Max Extracted Characters:</span>
              <strong className="text-navy-900">50,000 Characters</strong>
            </div>
            <div className="flex justify-between">
              <span>OCR Pipeline:</span>
              <span className="text-slate-500">Digital text only (scanned requires OCR)</span>
            </div>
          </div>
        </div>

        {/* Security & Credentials Isolation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-navy-900 font-bold text-sm pb-2 border-b border-slate-100">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Zero-Secret Security Architecture</span>
          </div>
          <div className="space-y-2 text-xs text-slate-600">
            <p className="flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>No Client-Side Secrets:</strong> AWS Access Keys, Secret Keys, and Session Tokens are strictly blocked from API responses and frontend bundles.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Private S3 Enclosure:</strong> All documents and summary files are written to private S3 bucket paths indexed by UUIDs, preventing path traversal attacks.
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Guide: How to enable AWS Mode */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-navy-900 font-bold text-sm pb-2 border-b border-slate-100">
          <Terminal className="w-4 h-4 text-slate-700" />
          <span>Switching Between Demo Mode and AWS Mode</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          The application follows 12-factor application architecture. To switch to AWS Mode:
        </p>
        <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-1">
          <p className="text-slate-400"># 1. Edit backend/.env file:</p>
          <p className="text-emerald-400">APP_MODE=aws</p>
          <p className="text-emerald-400">AWS_REGION=us-east-1</p>
          <p className="text-emerald-400">S3_BUCKET_NAME=your-private-documind-bucket</p>
          <p className="text-emerald-400">SAGEMAKER_ENDPOINT_NAME=documind-summarizer-endpoint</p>
          <p className="text-slate-400 mt-2"># 2. Restart backend server:</p>
          <p className="text-brand-300">python -m uvicorn app.main:app --reload --port 8000</p>
        </div>
        <p className="text-xs text-slate-500">
          Detailed deployment scripts and cost management guides are documented in <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">docs/aws-setup.md</code>.
        </p>
      </div>
    </div>
  );
};
