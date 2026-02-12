
import React, { useState } from 'react';
import { CvFile, CallResult } from '../types';
import { ScoreRing } from './ScoreRing';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Loader2, 
  Phone, 
  Video, 
  UserCheck, 
  MessageSquare, 
  ChevronRight, 
  Star,
  Zap,
  Target
} from 'lucide-react';
import { CallInterface } from './CallInterface';

interface ResultCardProps {
  cv: CvFile;
  roleTitle: string;
  jdText: string;
  onCallFinish: (result: CallResult) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ cv, roleTitle, jdText, onCallFinish }) => {
  const [isCalling, setIsCalling] = useState(false);

  if (cv.status === 'pending') {
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 flex items-center justify-between shadow-sm opacity-60">
        <div className="flex items-center gap-8">
          <div className="p-5 bg-slate-50 rounded-2xl"><FileText className="w-10 h-10 text-slate-300" /></div>
          <div>
            <h3 className="font-bold text-slate-800 text-xl">{cv.name}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Awaiting Initial Screening</p>
          </div>
        </div>
      </div>
    );
  }

  if (cv.status === 'processing') {
    return (
      <div className="bg-white rounded-[2.5rem] border border-indigo-100 p-10 flex items-center justify-between shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-50/20 animate-pulse"></div>
        <div className="flex items-center gap-8 relative z-10">
          <div className="p-5 bg-indigo-50 rounded-2xl"><Loader2 className="w-10 h-10 text-indigo-600 animate-spin" /></div>
          <div>
            <h3 className="font-bold text-indigo-900 text-xl">{cv.name}</h3>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">AI analyzing expertise...</p>
          </div>
        </div>
      </div>
    );
  }

  if (cv.status === 'error') {
    return (
      <div className="bg-rose-50 rounded-[2.5rem] border border-rose-100 p-10 shadow-sm">
        <div className="flex items-center gap-8">
          <div className="p-5 bg-rose-100 rounded-2xl"><AlertCircle className="w-10 h-10 text-rose-600" /></div>
          <div>
            <h3 className="font-bold text-rose-900 text-xl">{cv.name}</h3>
            <p className="text-sm text-rose-600 font-medium mt-1">{cv.errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!cv.result) return null;
  const { result, callResult } = cv;

  return (
    <>
      {isCalling && (
        <CallInterface 
          roleTitle={roleTitle}
          jdText={jdText}
          candidateName={result.candidateName} 
          phoneNumber={result.phoneNumber || 'Not provided'} 
          onClose={() => setIsCalling(false)}
          onFinished={(res) => onCallFinish(res)}
        />
      )}
      <div className={`bg-white rounded-[3rem] border transition-all duration-500 group relative overflow-hidden ${callResult?.verdict === 'HIRE' ? 'border-emerald-200 shadow-2xl shadow-emerald-500/10' : callResult?.verdict === 'REJECT' ? 'border-rose-100 opacity-90' : 'border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-indigo-500/10'}`}>
        <div className="p-10 relative z-10">
          <div className="flex flex-col xl:flex-row justify-between gap-10">
            <div className="flex-grow">
              <div className="flex flex-wrap items-center gap-6 mb-8">
                 <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{result.candidateName}</h2>
                 {callResult ? (
                   <div className={`flex items-center gap-3 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${callResult.verdict === 'HIRE' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                      {callResult.verdict === 'HIRE' ? <><UserCheck className="w-3.5 h-3.5" /> INTERVIEW SELECT</> : <><XCircle className="w-3.5 h-3.5" /> INTERVIEW REJECT</>}
                   </div>
                 ) : (
                   <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100">
                      <Star className="w-3 h-3" /> CV Screened
                   </div>
                 )}
              </div>

              <div className="flex flex-wrap items-center gap-x-10 gap-y-4 mb-10">
                 <div className="flex items-center gap-3 text-slate-400">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm font-bold text-slate-600">{result.phoneNumber}</span>
                 </div>
                 {!callResult && (
                    <button 
                      onClick={() => setIsCalling(true)}
                      className="group/btn flex items-center gap-4 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-indigo-200 hover:bg-slate-900 transition-all active:scale-95"
                    >
                      <Video className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" /> 
                      Start Screening Call
                      <ChevronRight className="w-4 h-4 opacity-40 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                 )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                 <div className="bg-emerald-50/30 rounded-[2rem] p-8 border border-emerald-50">
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-5 flex items-center gap-3">
                       <Zap className="w-4 h-4" /> Top Strengths
                    </h4>
                    <ul className="space-y-3">
                       {result.strengths.map((s, i) => (
                         <li key={i} className="text-sm text-slate-700 flex items-start gap-3 font-semibold">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                            {s}
                         </li>
                       ))}
                    </ul>
                 </div>

                 <div className="bg-amber-50/30 rounded-[2rem] p-8 border border-amber-50">
                    <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-5 flex items-center gap-3">
                       <Target className="w-4 h-4" /> Identified Gaps
                    </h4>
                    <ul className="space-y-3">
                       {result.weaknesses.map((w, i) => (
                         <li key={i} className="text-sm text-slate-700 flex items-start gap-3 font-semibold">
                            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0" />
                            {w}
                         </li>
                       ))}
                    </ul>
                 </div>
              </div>

              {callResult && (
                 <div className="bg-white border-2 border-indigo-100 rounded-[2.5rem] p-8 shadow-xl shadow-indigo-100/20">
                    <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                       <MessageSquare className="w-4 h-4" /> Interview Notes & Reasoning
                    </h4>
                    <p className="text-base text-slate-700 leading-relaxed font-semibold italic">
                       "{callResult.assessmentText}"
                    </p>
                 </div>
              )}
            </div>

            <div className="xl:w-56 flex flex-col items-center gap-10 xl:pl-10 xl:border-l border-slate-100">
               <div className="text-center">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Resume Score</h5>
                  <ScoreRing score={result.matchScore} size={100} strokeWidth={10} />
               </div>
               
               <div className="text-center">
                  <h5 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-3">Interview Score</h5>
                  {callResult ? (
                    <div className="animate-in zoom-in duration-500">
                       <ScoreRing score={callResult.callScore} size={100} strokeWidth={10} />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-[10px] font-black uppercase text-center p-4">
                       Pending Call
                    </div>
                  )}
               </div>

               {callResult && (
                  <div className={`mt-auto w-full py-5 rounded-[1.5rem] text-center shadow-lg transition-all ${callResult.verdict === 'HIRE' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Final Verdict</p>
                     <p className="text-lg font-black tracking-tight">{callResult.verdict === 'HIRE' ? 'SELECT' : 'REJECT'}</p>
                  </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
