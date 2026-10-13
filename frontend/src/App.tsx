import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { SummarizePage } from './pages/SummarizePage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { ActiveTab, ConfigStatus, Summary, SummaryHistoryItem } from './types';
import { api } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [history, setHistory] = useState<SummaryHistoryItem[]>([]);
  const [activeSummary, setActiveSummary] = useState<Summary | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fetchConfig = async () => {
    try {
      const data = await api.getConfigStatus();
      setConfig(data);
    } catch (err) {
      console.error('Error fetching config status:', err);
    }
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await api.getSummaryHistory();
      setHistory(data);
    } catch (err) {
      console.error('Error fetching summary history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchHistory();
  }, []);

  const handleViewSummary = async (summaryId: string) => {
    try {
      const fullSummary = await api.getSummaryById(summaryId);
      setActiveSummary(fullSummary);
      setActiveTab('summarize');
    } catch (err) {
      console.error('Error fetching full summary:', err);
    }
  };

  const handleSummaryGenerated = (newSummary: Summary) => {
    setActiveSummary(newSummary);
    fetchHistory();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Navigation Bar */}
      <Navbar
        config={config}
        onOpenSummarize={() => {
          setActiveSummary(null);
          setActiveTab('summarize');
        }}
      />

      {/* Main Body Layout */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab === 'summarize' && activeTab !== 'summarize') {
              setActiveSummary(null);
            }
            setActiveTab(tab);
          }}
          config={config}
          historyCount={history.length}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <Dashboard
              config={config}
              history={history}
              onNavigateToSummarize={() => {
                setActiveSummary(null);
                setActiveTab('summarize');
              }}
              onNavigateToHistory={() => setActiveTab('history')}
              onViewSummary={handleViewSummary}
            />
          )}

          {activeTab === 'summarize' && (
            <SummarizePage
              config={config}
              onSummaryGenerated={handleSummaryGenerated}
              activeSummary={activeSummary}
              setActiveSummary={setActiveSummary}
            />
          )}

          {activeTab === 'history' && (
            <HistoryPage
              history={history}
              onViewSummary={handleViewSummary}
              onRefreshHistory={fetchHistory}
              isLoading={isLoadingHistory}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              config={config}
              onRefreshConfig={fetchConfig}
            />
          )}
        </main>
      </div>

      {/* Modern Footer */}
      <footer className="border-t border-slate-200 bg-white/70 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            <strong>DocuMind AI</strong> • Intelligent Document Summarizer on AWS S3 + SageMaker AI
          </p>
          <p className="text-slate-400">
            College Mini Project • Cloud Computing &amp; Machine Learning Architecture
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
