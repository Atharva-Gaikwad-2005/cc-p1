import React from 'react';
import {
  AlignLeft,
  List,
  Sparkles,
  RotateCcw,
  Sliders,
  Check,
  Zap,
} from 'lucide-react';
import { SummaryFormat, SummaryLength } from '../types';

interface SummarySettingsProps {
  length: SummaryLength;
  setLength: (len: SummaryLength) => void;
  format: SummaryFormat;
  setFormat: (fmt: SummaryFormat) => void;
  onGenerate: () => void;
  onReset: () => void;
  isGenerating: boolean;
  disabled: boolean;
}

export const SummarySettings: React.FC<SummarySettingsProps> = ({
  length,
  setLength,
  format,
  setFormat,
  onGenerate,
  onReset,
  isGenerating,
  disabled,
}) => {
  const lengthOptions = [
    {
      id: 'short' as SummaryLength,
      title: 'Short',
      desc: 'One concise paragraph or small group of key points for quick overviews.',
      target: '~75-150 words',
    },
    {
      id: 'medium' as SummaryLength,
      title: 'Medium',
      desc: 'Balanced overview covering core sections, arguments, and conclusions.',
      target: '~200-350 words',
    },
    {
      id: 'detailed' as SummaryLength,
      title: 'Detailed',
      desc: 'In-depth structured analysis preserving evidence, figures, and nuances.',
      target: '~400-600 words',
    },
  ];

  const formatOptions = [
    {
      id: 'paragraph' as SummaryFormat,
      title: 'Paragraph',
      icon: AlignLeft,
      desc: 'Fluid narrative prose grouped into readable paragraphs.',
    },
    {
      id: 'bullet_points' as SummaryFormat,
      title: 'Bullet Points',
      icon: List,
      desc: 'Scannable bullet points focusing on key arguments and facts.',
    },
    {
      id: 'key_takeaways' as SummaryFormat,
      title: 'Key Takeaways',
      icon: Zap,
      desc: 'Numbered executive takeaways with actionable insights.',
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-navy-900 font-semibold text-sm">
          <Sliders className="w-4 h-4 text-brand-600" />
          <span>Summarization Parameters</span>
        </div>
        <button
          onClick={onReset}
          disabled={isGenerating}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* Summary Length Selector */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Summary Length
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {lengthOptions.map((opt) => {
            const isSelected = length === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setLength(opt.id)}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-navy-900">{opt.title}</span>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{opt.desc}</p>
                <span className="inline-block mt-2 text-[10px] font-semibold text-brand-700 bg-brand-100/60 px-2 py-0.5 rounded">
                  {opt.target}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Output Format Selector */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Output Structure
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {formatOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = format === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setFormat(opt.id)}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-brand-600' : 'text-slate-500'}`} />
                    <span className="text-sm font-semibold text-navy-900">{opt.title}</span>
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{opt.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action CTA */}
      <div className="pt-2">
        <button
          onClick={onGenerate}
          disabled={disabled || isGenerating}
          className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm text-white gradient-brand shadow-md shadow-brand-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Generating AI Summary...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Document Summary</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
