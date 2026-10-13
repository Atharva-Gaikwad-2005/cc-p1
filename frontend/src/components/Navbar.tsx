import React from 'react';
import { Sparkles, Cloud, ShieldAlert, Cpu, ExternalLink } from 'lucide-react';
import { ConfigStatus } from '../types';

interface NavbarProps {
  config: ConfigStatus | null;
  onOpenSummarize: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ config, onOpenSummarize }) => {
  const isAws = config?.app_mode === 'aws';
  const isHealthy = isAws ? config?.s3_connected && config?.sagemaker_connected : true;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl text-navy-900 tracking-tight">DocuMind AI</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Intelligent Document Summarizer on AWS S3 + SageMaker AI
            </p>
          </div>
        </div>

        {/* Status & Quick Actions */}
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-slate-50">
            {isAws ? (
              <>
                <Cloud className={`w-3.5 h-3.5 ${isHealthy ? 'text-emerald-600' : 'text-amber-600'}`} />
                <span className="text-slate-700 font-semibold">AWS Mode:</span>
                <span className={isHealthy ? 'text-emerald-700' : 'text-amber-700'}>
                  {isHealthy ? 'Connected' : 'Partial / Config Check'}
                </span>
                <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-brand-600" />
                <span className="text-slate-700 font-semibold">Demo Mode:</span>
                <span className="text-brand-700">Local NLP Extractive</span>
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              </>
            )}
          </div>

          {/* New Summary CTA */}
          <button
            onClick={onOpenSummarize}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white gradient-brand rounded-lg shadow-sm hover:opacity-95 transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Summarize Doc</span>
          </button>
        </div>
      </div>
    </header>
  );
};
