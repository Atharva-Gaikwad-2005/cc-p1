import React from 'react';
import {
  LayoutDashboard,
  FileText,
  History,
  Settings,
  HardDrive,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ActiveTab, ConfigStatus } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  config: ConfigStatus | null;
  historyCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  config,
  historyCount,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'summarize' as ActiveTab,
      label: 'Summarize Document',
      icon: FileText,
      badge: 'New',
    },
    {
      id: 'history' as ActiveTab,
      label: 'Summary History',
      icon: History,
      badge: historyCount > 0 ? historyCount.toString() : null,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-6">
        {/* Navigation list */}
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Navigation
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isActive
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Capability Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <HardDrive className="w-4 h-4 text-brand-600" />
            <span>Specifications</span>
          </div>
          <div className="space-y-1 text-slate-500">
            <div className="flex justify-between">
              <span>Max File Size:</span>
              <span className="font-medium text-slate-800">{config?.max_file_size_mb || 10} MB</span>
            </div>
            <div className="flex justify-between">
              <span>Formats:</span>
              <span className="font-medium text-slate-800">PDF, TXT, DOCX</span>
            </div>
            <div className="flex justify-between">
              <span>Mode:</span>
              <span className="font-medium text-brand-700 uppercase">{config?.app_mode || 'Demo'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud connection mini status */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/80">
          {config?.app_mode === 'aws' ? (
            config.s3_connected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )
          ) : (
            <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            <p className="font-medium text-slate-800">
              {config?.app_mode === 'aws'
                ? config.s3_connected
                  ? 'AWS S3 Connected'
                  : 'AWS Mode Alert'
                : 'Local Demo Active'}
            </p>
            <p className="text-slate-500 line-clamp-1">
              {config?.app_mode === 'aws'
                ? config.aws_region || 'Region set'
                : 'Offline NLP summarizer'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
