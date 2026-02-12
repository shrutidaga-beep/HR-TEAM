
import React, { useState, useCallback, useRef, useMemo } from 'react';
import { CvFile, FileTypes, CallResult, Role, ViewState } from './types';
import { formatBytes, fileToBase64, downloadDetailedCSV } from './utils/file';
import { evaluateCvWithGemini } from './services/gemini';
import { ResultCard } from './components/ResultCard';
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  PlayCircle, 
  Briefcase, 
  Users,
  AlertCircle,
  Trophy,
  BarChart3,
  TrendingUp,
  UserCheck,
  Loader2,
  FileDown,
  Plus,
  ChevronDown,
  LayoutDashboard,
  ArrowRight,
  Zap,
  Globe,
  Settings,
  XCircle,
  ChevronRight,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  MessageSquareQuote,
  Filter
} from 'lucide-react';

type DashboardTab = 'selected' | 'rejected' | 'all';

export default function App() {
  const [view, setView] = useState<ViewState>('onboarding');
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('selected');
  const [roles, setRoles] = useState<Role[]>([
    { id: '1', title: 'Senior Software Engineer', jd: '', candidates: [] }
  ]);
  const [activeRoleId, setActiveRoleId] = useState('1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleTitle, setNewRoleTitle] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeRole = useMemo(() => roles.find(r => r.id === activeRoleId)!, [roles, activeRoleId]);

  const updateActiveRole = (updates: Partial<Role>) => {
    setRoles(prev => prev.map(r => r.id === activeRoleId ? { ...r, ...updates } : r));
  };

  const addRole = () => {
    if (!newRoleTitle.trim()) return;
    const id = Math.random().toString(36).substring(7);
    setRoles(prev => [...prev, { id, title: newRoleTitle, jd: '', candidates: [] }]);
    setActiveRoleId(id);
    setNewRoleTitle('');
    setIsAddingRole(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map((file: File) => ({
        id: Math.random().toString(36).substring(7),
        file,
        name: file.name,
        size: file.size,
        status: 'pending' as const,
      }));
      
      const validFiles = newFiles.filter(f => 
        f.file.type === FileTypes.PDF || 
        f.file.type === FileTypes.TXT ||
        f.name.toLowerCase().endsWith('.pdf') ||
        f.name.toLowerCase().endsWith('.txt')
      );

      updateActiveRole({ candidates: [...activeRole.candidates, ...validFiles] });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeCandidate = (id: string) => {
    updateActiveRole({ candidates: activeRole.candidates.filter(c => c.id !== id) });
  };

  const startScreening = async () => {
    if (!activeRole.jd.trim()) { setGlobalError("Please provide a Job Description."); return; }
    if (activeRole.candidates.length === 0) { setGlobalError("Please upload CVs."); return; }
    setGlobalError(null);
    setIsProcessing(true);

    const updatedCandidates = [...activeRole.candidates];
    for (let i = 0; i < updatedCandidates.length; i++) {
      const targetCv = updatedCandidates[i];
      if (targetCv.status === 'success') continue;
      
      updatedCandidates[i] = { ...targetCv, status: 'processing' };
      updateActiveRole({ candidates: [...updatedCandidates] });

      try {
        const base64Data = await fileToBase64(targetCv.file);
        let mimeType = targetCv.file.type || (targetCv.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/plain');
        const result = await evaluateCvWithGemini(activeRole.jd, base64Data, mimeType);
        updatedCandidates[i] = { ...targetCv, status: 'success', result };
        updateActiveRole({ candidates: [...updatedCandidates] });
      } catch (error: any) {
        updatedCandidates[i] = { ...targetCv, status: 'error', errorMessage: error.message };
        updateActiveRole({ candidates: [...updatedCandidates] });
      }
    }
    setIsProcessing(false);
    setView('dashboard');
  };

  const handleCallFinish = (cvId: string, callResult: CallResult) => {
    updateActiveRole({
      candidates: activeRole.candidates.map(c => c.id === cvId ? { ...c, callResult } : c)
    });
  };

  const exportDetailedData = () => {
    const data = activeRole.candidates
      .filter(f => f.status === 'success' && f.callResult)
      .map(f => ({
        Candidate: f.result?.candidateName,
        Phone: f.result?.phoneNumber,
        Role: activeRole.title,
        CV_Score: f.result?.matchScore,
        Interview_Score: f.callResult?.callScore,
        Comprehensive_Score: ((f.result?.matchScore || 0) + (f.callResult?.callScore || 0)) / 2,
        Final_Verdict: f.callResult?.verdict === 'HIRE' ? 'SELECT' : 'REJECT',
        Detailed_Feedback: f.callResult?.assessmentText
      }));
    downloadDetailedCSV(data, `${activeRole.title}_Selection_Report.csv`);
  };

  const interviewedCandidates = useMemo(() => 
    activeRole.candidates.filter(f => f.callResult).sort((a, b) => {
      const scoreA = a.callResult?.callScore || 0;
      const scoreB = b.callResult?.callScore || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.result?.matchScore || 0) - (a.result?.matchScore || 0);
    }),
  [activeRole]);

  const selectedCandidates = useMemo(() => interviewedCandidates.filter(c => c.callResult?.verdict === 'HIRE'), [interviewedCandidates]);
  const rejectedCandidates = useMemo(() => interviewedCandidates.filter(c => c.callResult?.verdict === 'REJECT'), [interviewedCandidates]);

  const filteredFeed = useMemo(() => {
    if (dashboardTab === 'selected') return selectedCandidates;
    if (dashboardTab === 'rejected') return rejectedCandidates;
    return activeRole.candidates.slice().sort((a,b) => {
      if (a.callResult && !b.callResult) return -1;
      if (!a.callResult && b.callResult) return 1;
      return (b.result?.matchScore || 0) - (a.result?.matchScore || 0);
    });
  }, [dashboardTab, selectedCandidates, rejectedCandidates, activeRole.candidates]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] selection:bg-indigo-100 overflow-x-hidden">
      {/* Decorative Background Elements */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/20 blur-[120px] rounded-full z-0 pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-200/20 blur-[120px] rounded-full z-0 pointer-events-none"></div>
      <div className="fixed top-[20%] right-[10%] w-[30%] h-[30%] bg-blue-200/10 blur-[120px] rounded-full z-0 pointer-events-none"></div>

      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm px-8">
        <div className="max-w-7xl mx-auto h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView('onboarding')}>
              <div className="bg-slate-900 p-3 rounded-2xl shadow-xl shadow-slate-200 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-2xl font-black text-slate-900 tracking-tighter leading-tight">TalentPulse <span className="text-indigo-600">AI</span></h1>
                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" /> Internal Console
                </span>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center gap-8">
               <button 
                 onClick={() => setView('onboarding')}
                 className={`text-sm font-bold transition-all px-4 py-2 rounded-xl ${view === 'onboarding' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-900'}`}
               >
                 Role Setup
               </button>
               <button 
                 onClick={() => setView('dashboard')}
                 className={`text-sm font-bold transition-all px-4 py-2 rounded-xl ${view === 'dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-900'}`}
               >
                 Dashboard
               </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative group">
                <button className="flex items-center gap-3 px-5 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-white transition-all shadow-sm">
                   <Briefcase className="w-4 h-4 text-slate-400" />
                   <span className="text-sm font-black text-slate-800 tracking-tight">{activeRole.title}</span>
                   <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
                <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 py-4 hidden group-hover:block animate-in fade-in slide-in-from-top-4 z-[60]">
                   <div className="px-6 py-2 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Manage Pipelines</div>
                   {roles.map(r => (
                     <button key={r.id} onClick={() => setActiveRoleId(r.id)} className={`w-full px-6 py-4 text-left text-sm font-bold flex items-center justify-between transition-all ${r.id === activeRoleId ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600 hover:bg-slate-50'}`}>
                        {r.title}
                        {r.id === activeRoleId && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                     </button>
                   ))}
                   <div className="px-4 pt-3 mt-3 border-t border-slate-100">
                     <button onClick={() => setIsAddingRole(true)} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-50 rounded-2xl transition-all">
                        <Plus className="w-4 h-4" /> New Pipeline
                     </button>
                   </div>
                </div>
             </div>
             
             {view === 'dashboard' && interviewedCandidates.length > 0 && (
               <button onClick={exportDetailedData} className="flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 shadow-xl shadow-slate-200 transition-all active:scale-95">
                 <FileDown className="w-5 h-5" /> Export Report
               </button>
             )}
          </div>
        </div>
      </header>

      {isAddingRole && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-all">
           <div className="bg-white rounded-[3rem] p-12 w-full max-w-lg shadow-[0_50px_100px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-4 mb-10">
                <div className="p-4 bg-indigo-50 rounded-3xl"><Zap className="w-8 h-8 text-indigo-600" /></div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">New Pipeline</h3>
                  <p className="text-sm font-medium text-slate-400">Build a role-specific hiring agent</p>
                </div>
              </div>
              <input 
                autoFocus
                className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:border-indigo-500 focus:bg-white transition-all font-bold text-slate-800 placeholder:text-slate-300 mb-10 text-lg shadow-inner" 
                placeholder="e.g. Lead Product Manager"
                value={newRoleTitle}
                onChange={e => setNewRoleTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addRole()}
              />
              <div className="flex gap-6">
                 <button onClick={() => setIsAddingRole(false)} className="flex-1 py-5 font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest text-xs transition-colors">Discard</button>
                 <button onClick={addRole} className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-widest text-xs">Create Role</button>
              </div>
           </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-8 py-12 relative z-10">
        {view === 'onboarding' ? (
          <div className="animate-in fade-in slide-in-from-bottom-10 duration-700">
             <div className="flex items-center justify-center mb-16">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-[2rem] shadow-sm">
                   <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                   <span className="text-xs font-black text-slate-600 uppercase tracking-[0.2em]">Configuration Console</span>
                   <div className="w-px h-4 bg-slate-200 mx-2"></div>
                   <span className="text-xs font-bold text-slate-400">{activeRole.title}</span>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <section className="bg-white rounded-[3.5rem] shadow-2xl shadow-indigo-200/50 border-2 border-indigo-100 p-10 flex flex-col h-[600px] hover:shadow-indigo-300/40 transition-all group/jd overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover/jd:scale-110 transition-transform"></div>
                  <div className="flex items-center gap-4 mb-8 relative z-10">
                     <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-lg shadow-indigo-200">
                        <Briefcase className="w-7 h-7 text-white" />
                     </div>
                     <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Job Description</h3>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Requirements Specification</p>
                     </div>
                  </div>
                  <textarea
                    className="flex-grow w-full border-2 border-indigo-50 bg-indigo-50/30 rounded-[2.5rem] p-10 text-xl text-slate-700 focus:bg-white focus:border-indigo-200 focus:ring-8 focus:ring-indigo-50 transition-all resize-none placeholder:text-indigo-200 font-semibold leading-relaxed shadow-inner relative z-10"
                    placeholder="Enter Job Description requirements... Gemini will use this to brief the Teachmint voice agent."
                    value={activeRole.jd}
                    onChange={(e) => updateActiveRole({ jd: e.target.value })}
                    disabled={isProcessing}
                  />
                </section>

                <section className="bg-white rounded-[3.5rem] shadow-2xl shadow-emerald-200/50 border-2 border-emerald-100 p-10 flex flex-col hover:shadow-emerald-300/40 transition-all group/pool overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 group-hover/pool:scale-110 transition-transform"></div>
                  <div className="flex items-center gap-4 mb-8 relative z-10">
                     <div className="p-4 bg-emerald-600 rounded-[1.5rem] shadow-lg shadow-emerald-200">
                        <UploadCloud className="w-7 h-7 text-white" />
                     </div>
                     <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Candidate Pool</h3>
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">CV Submission</p>
                     </div>
                  </div>
                  <div 
                    className={`flex-grow border-4 border-dashed rounded-[3rem] p-12 text-center transition-all flex flex-col items-center justify-center relative z-10
                      ${isProcessing ? 'border-slate-50 bg-slate-50 opacity-40 cursor-not-allowed' : 'border-emerald-100 bg-emerald-50/20 hover:bg-white hover:border-emerald-300 cursor-pointer shadow-inner'}
                    `}
                    onClick={() => !isProcessing && fileInputRef.current?.click()}
                  >
                    <input type="file" multiple accept=".pdf,.txt" className="hidden" ref={fileInputRef} onChange={handleFileChange} disabled={isProcessing} />
                    <div className="w-24 h-24 bg-emerald-100 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-emerald-100 transition-transform group-hover/pool:scale-110">
                       <Plus className="w-12 h-12 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-black text-slate-800">Add Candidate CVs</p>
                    <p className="text-xs text-emerald-500 mt-4 font-black uppercase tracking-[0.3em] bg-emerald-100/50 px-4 py-1.5 rounded-full">Automated ingestion ready</p>
                  </div>

                  {activeRole.candidates.length > 0 && (
                    <div className="mt-10 space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scroll relative z-10">
                       {activeRole.candidates.map(cv => (
                         <div key={cv.id} className="group flex items-center justify-between p-6 bg-white rounded-3xl border border-emerald-50 shadow-md hover:border-emerald-200 transition-all">
                            <div className="flex items-center gap-5">
                               <div className="p-2 bg-emerald-50 rounded-xl">
                                  <FileText className="w-6 h-6 text-emerald-500" />
                               </div>
                               <div>
                                  <p className="text-base font-black text-slate-800">{cv.name}</p>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatBytes(cv.size)}</p>
                               </div>
                            </div>
                            {cv.status === 'pending' && <button onClick={() => removeCandidate(cv.id)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"><Trash2 className="w-6 h-6" /></button>}
                            {cv.status === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                            {cv.status === 'processing' && <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />}
                         </div>
                       ))}
                    </div>
                  )}
                </section>
             </div>

             <div className="mt-20 flex justify-center">
                <button
                  onClick={startScreening}
                  disabled={isProcessing || activeRole.candidates.length === 0 || !activeRole.jd.trim()}
                  className={`group relative flex items-center gap-8 px-24 py-10 rounded-[3rem] font-black uppercase tracking-[0.4em] text-base text-white transition-all shadow-[0_30px_100px_rgba(79,70,229,0.3)] overflow-hidden
                    ${(isProcessing || activeRole.candidates.length === 0 || !activeRole.jd.trim()) 
                      ? 'bg-slate-300 cursor-not-allowed grayscale' 
                      : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.05] active:scale-95'}
                  `}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  {isProcessing ? <><Loader2 className="w-8 h-8 animate-spin" /> Screening Profiles...</> : <><Sparkles className="w-7 h-7" /> Execute Screening <ArrowRight className="w-6 h-6 group-hover:translate-x-3 transition-transform" /></>}
                </button>
             </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-10 duration-700">
             <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
                <div>
                   <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-4 shadow-sm border border-emerald-100">
                      <LayoutDashboard className="w-3 h-3" /> Live Recruitment Dashboard
                   </div>
                   <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">Hiring Intelligence: <span className="text-indigo-600">{activeRole.title}</span></h2>
                   <p className="text-slate-500 font-semibold mt-2 flex items-center gap-2 italic">
                     <ShieldCheck className="w-4 h-4 text-emerald-500" />
                     Authenticated Internal Review Session
                   </p>
                </div>
                <div className="flex gap-4">
                   <div className="bg-white p-7 rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 flex items-center gap-6">
                      <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                         <Users className="w-7 h-7 text-white" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pool</p>
                         <p className="text-2xl font-black text-slate-900 tracking-tight">{activeRole.candidates.length}</p>
                      </div>
                   </div>
                   <div className="bg-white p-7 rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 flex items-center gap-6">
                      <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
                         <UserCheck className="w-7 h-7 text-white" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Selects</p>
                         <p className="text-2xl font-black text-slate-900 tracking-tight">{selectedCandidates.length}</p>
                      </div>
                   </div>
                </div>
             </div>

             <div className="space-y-16">
               {/* Dashboard Tabs */}
               <div className="flex items-center gap-8 border-b border-slate-200 pb-px mb-12">
                  <button 
                    onClick={() => setDashboardTab('selected')}
                    className={`pb-6 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${dashboardTab === 'selected' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Selects ({selectedCandidates.length})
                    {dashboardTab === 'selected' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-full"></div>}
                  </button>
                  <button 
                    onClick={() => setDashboardTab('rejected')}
                    className={`pb-6 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${dashboardTab === 'rejected' ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Rejects ({rejectedCandidates.length})
                    {dashboardTab === 'rejected' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-600 rounded-full"></div>}
                  </button>
                  <button 
                    onClick={() => setDashboardTab('all')}
                    className={`pb-6 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${dashboardTab === 'all' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Complete Feed ({activeRole.candidates.length})
                    {dashboardTab === 'all' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full"></div>}
                  </button>
               </div>

               {dashboardTab === 'selected' && selectedCandidates.length > 0 && (
                 <section className="mb-24 animate-in fade-in slide-in-from-bottom-6 duration-500">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-10 flex items-center gap-4">
                       <Trophy className="w-5 h-5 text-amber-500" /> Elite Selections
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                       {selectedCandidates.slice(0, 3).map((cv, idx) => {
                         const cvScore = cv.result?.matchScore || 0;
                         const callScore = cv.callResult?.callScore || 0;
                         return (
                           <div key={cv.id} className="bg-white rounded-[3.5rem] p-12 shadow-[0_40px_80px_rgba(0,0,0,0.12)] border-2 border-emerald-200 ring-8 ring-emerald-50/50 transition-all hover:scale-[1.03] relative overflow-hidden group flex flex-col">
                              <div className="absolute top-0 right-0 p-10">
                                 {idx === 0 && <Trophy className="w-14 h-14 text-amber-400 opacity-30 rotate-12 absolute -right-2 -top-2" />}
                                 <div className="bg-emerald-600 text-white p-3 rounded-2xl shadow-xl shadow-emerald-200 relative z-10">
                                    <UserCheck className="w-7 h-7" />
                                 </div>
                              </div>
                              <div className="flex items-center gap-8 mb-10">
                                 <div className="w-20 h-20 bg-slate-900 text-white rounded-[1.8rem] flex items-center justify-center text-3xl font-black shadow-2xl group-hover:rotate-6 transition-transform">
                                    {cv.result?.candidateName?.charAt(0)}
                                 </div>
                                 <div>
                                    <h4 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight">{cv.result?.candidateName}</h4>
                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Rank #{idx + 1}</p>
                                 </div>
                              </div>

                              <div className="bg-slate-50/50 rounded-3xl p-6 mb-8 border border-slate-100 flex-grow">
                                 <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <MessageSquareQuote className="w-3 h-3 text-indigo-500" /> Interview Notes
                                 </h5>
                                 <p className="text-xs text-slate-600 font-bold leading-relaxed italic">
                                    "{cv.callResult?.assessmentText.substring(0, 150)}..."
                                 </p>
                              </div>

                              <div className="space-y-6 mt-auto">
                                 <div className="flex justify-between items-center px-2">
                                    <div className="text-center">
                                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Resume</p>
                                       <p className="text-lg font-black text-slate-900">{cvScore}%</p>
                                    </div>
                                    <div className="w-px h-8 bg-slate-200"></div>
                                    <div className="text-center">
                                       <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Interview</p>
                                       <p className="text-lg font-black text-indigo-600">{callScore}%</p>
                                    </div>
                                 </div>
                                 <div className="py-5 px-8 rounded-[1.5rem] text-center font-black text-xs uppercase tracking-[0.3em] border-2 shadow-sm transition-all bg-emerald-600 text-white border-emerald-400 shadow-emerald-100 group-hover:bg-emerald-700">
                                    SELECT
                                 </div>
                              </div>
                           </div>
                         );
                       })}
                    </div>
                 </section>
               )}

               <section className="animate-in fade-in duration-700">
                  <div className="flex items-center justify-between mb-10">
                     <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-4">
                        <Filter className="w-5 h-5 text-indigo-500" /> 
                        {dashboardTab === 'selected' ? 'Selected Pipeline' : dashboardTab === 'rejected' ? 'Rejected Pipeline' : 'Complete Pipeline Feed'}
                     </h3>
                     <div className="h-px bg-slate-200 flex-grow mx-10 opacity-50"></div>
                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{filteredFeed.length} Profiles</p>
                  </div>
                  <div className="space-y-10">
                    {filteredFeed.length > 0 ? (
                      filteredFeed.map(cv => (
                        <ResultCard 
                          key={cv.id} 
                          cv={cv} 
                          roleTitle={activeRole.title} 
                          jdText={activeRole.jd} 
                          onCallFinish={(res) => handleCallFinish(cv.id, res)} 
                        />
                      ))
                    ) : (
                      <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                         <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Users className="w-10 h-10 text-slate-200" />
                         </div>
                         <p className="text-lg font-black text-slate-300 uppercase tracking-widest">No candidates found in this segment</p>
                      </div>
                    )}
                  </div>
               </section>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
