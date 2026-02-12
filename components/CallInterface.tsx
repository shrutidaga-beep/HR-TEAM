
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { X, Mic, MicOff, PhoneOff, MessageSquare, AlertCircle, Loader2, CheckCircle, XCircle, UserCheck, Star, Sparkles, Volume2 } from 'lucide-react';
import { CallResult } from '../types';
import { decodeBase64, decodeAudioData, createPcmBlob } from '../utils/audio';

interface CallInterfaceProps {
  roleTitle: string;
  jdText: string;
  candidateName: string;
  phoneNumber: string;
  onClose: () => void;
  onFinished: (result: CallResult) => void;
}

export const CallInterface: React.FC<CallInterfaceProps> = ({ roleTitle, jdText, candidateName, phoneNumber, onClose, onFinished }) => {
  const [status, setStatus] = useState<'connecting' | 'active' | 'finished' | 'error'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<{ type: 'user' | 'ai'; text: string }[]>([]);
  const [assessment, setAssessment] = useState<{ text: string, verdict: 'HIRE' | 'REJECT' | 'MAYBE', score: number }>({ text: '', verdict: 'MAYBE', score: 0 });
  
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);
  const currentTranscriptionRef = useRef({ user: '', ai: '' });

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextsRef.current = { input: inputCtx, output: outputCtx };

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `
            IDENTITY & MISSION:
            You are a Recruitment Specialist from **Teachmint**. 
            Teachmint is an education infrastructure platform that helps schools, teachers, and students digitize and manage learning globally.
            
            IMMEDIATE START:
            As soon as the connection is established, START TALKING FIRST. Do not wait for the candidate.
            
            OPENING SCRIPT:
            "Hi ${candidateName}, this is the hiring team from Teachmint. We're calling about your application for the ${roleTitle} position. Before we dive into your experience, to give you some context—Teachmint is building the backbone for modern education, and for this role specifically, we're looking for someone to ${jdText.substring(0, 100)}... How's your day going so far?"

            INTERVIEW STYLE:
            - Probing and Conversational. If they give a generic answer, dig deeper. "Why did you choose that tech stack?" or "What was the hardest part of that project?".
            - Use Situational Questions derived from the JD: ${jdText}

            REQUIRED EVALUATION:
            - Experience fit.
            - Tech stack expertise.
            - Ambition and Hustle (Startup fit).
            - Logistical fit (Bangalore based, 6-day week).

            FINAL OUTPUT:
            Thank them. Your final output text must contain:
            - A holistic, detailed assessment of their performance and fit.
            - [SCORE:XX] (0-100).
            - [VERDICT:HIRE] or [VERDICT:REJECT]. No "Maybe".
            - End with: "THANK_YOU_CALL_FINISHED".
          `,
        },
        callbacks: {
          onopen: () => {
            setStatus('active');
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromise.then(s => s.sendRealtimeInput({ media: createPcmBlob(inputData) }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputCtx) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decodeBase64(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of sourcesRef.current.values()) {
                try { source.stop(); } catch (e) {}
                sourcesRef.current.delete(source);
              }
              nextStartTimeRef.current = 0;
            }

            if (message.serverContent?.inputTranscription) currentTranscriptionRef.current.user += message.serverContent.inputTranscription.text;
            if (message.serverContent?.outputTranscription) currentTranscriptionRef.current.ai += message.serverContent.outputTranscription.text;

            if (message.serverContent?.turnComplete) {
              const userText = currentTranscriptionRef.current.user;
              const aiText = currentTranscriptionRef.current.ai;
              setTranscript(prev => [...prev, { type: 'user' as const, text: userText }, { type: 'ai' as const, text: aiText }].filter(t => t.text.trim()));
              
              if (aiText.includes("THANK_YOU_CALL_FINISHED")) {
                 let verdict: 'HIRE' | 'REJECT' | 'MAYBE' = 'MAYBE';
                 if (aiText.includes("[VERDICT:HIRE]")) verdict = 'HIRE';
                 if (aiText.includes("[VERDICT:REJECT]")) verdict = 'REJECT';
                 
                 const scoreMatch = aiText.match(/\[SCORE:(\d+)\]/);
                 const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;

                 const cleanedText = aiText.replace(/\[VERDICT:.*\]/, '').replace(/\[SCORE:.*\]/, '').replace("THANK_YOU_CALL_FINISHED", "").trim();
                 const finalResult: CallResult = { verdict, assessmentText: cleanedText, callScore: score, timestamp: Date.now() };
                 
                 setAssessment({ text: cleanedText, verdict, score });
                 setStatus('finished');
                 onFinished(finalResult);
              }
              currentTranscriptionRef.current = { user: '', ai: '' };
            }
          },
          onerror: () => setStatus('error'),
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { setStatus('error'); }
  };

  useEffect(() => { startCall(); return () => { sessionRef.current?.close(); audioContextsRef.current?.input.close(); audioContextsRef.current?.output.close(); }; }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl transition-all duration-500">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20 animate-in zoom-in-95 duration-300">
        <div className="px-10 py-8 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-6">
             <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center border border-white/20 shadow-lg backdrop-blur-sm animate-pulse">
                <Volume2 className="w-8 h-8 text-white" />
             </div>
             <div>
                <h3 className="font-black text-xl tracking-tight">{candidateName}</h3>
                <p className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.2em] opacity-80">Teachmint Recruitment</p>
             </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-all hover:rotate-90"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-grow overflow-y-auto p-12 space-y-10 bg-slate-50/50">
          {status === 'connecting' && (
            <div className="flex flex-col items-center justify-center h-96 text-slate-400 space-y-6">
               <div className="relative">
                 <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
                 <Loader2 className="w-16 h-16 animate-spin text-indigo-500 relative z-10" />
               </div>
               <div className="text-center">
                 <p className="text-lg font-black text-slate-900 tracking-tight">Initializing Secure Line...</p>
                 <p className="text-sm font-medium text-slate-400 mt-2 uppercase tracking-widest">Calling from Teachmint HQ</p>
               </div>
            </div>
          )}

          {status === 'active' && (
            <div className="flex flex-col items-center py-10">
              <div className="relative mb-20 scale-125">
                <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-10 scale-150"></div>
                <div className="absolute inset-0 bg-indigo-400 rounded-full animate-pulse opacity-5 scale-125"></div>
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center border-4 border-indigo-50 shadow-2xl z-10 relative">
                   <div className="flex gap-1.5 items-end h-10">
                      {[1,2,3,4,3,2,1].map((h, i) => (
                        <div key={i} className="w-1.5 bg-indigo-600 rounded-full animate-bounce" style={{height: `${h * 15}%`, animationDelay: `${i*0.05}s`}}></div>
                      ))}
                   </div>
                </div>
              </div>
              <div className="w-full space-y-6">
                {transcript.slice(-3).map((line, i) => (
                  <div key={i} className={`flex ${line.type === 'ai' ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-4`}>
                    <div className={`max-w-[85%] px-6 py-4 rounded-3xl text-sm shadow-xl font-semibold leading-relaxed ${line.type === 'ai' ? 'bg-white text-slate-700 rounded-tl-none border border-slate-100' : 'bg-indigo-600 text-white rounded-tr-none'}`}>
                      {line.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status === 'finished' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-700">
               <div className={`p-12 rounded-[3rem] border-4 flex items-center justify-between shadow-2xl transition-all ${assessment.verdict === 'HIRE' ? 'bg-emerald-50 border-emerald-200' : assessment.verdict === 'REJECT' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center gap-10">
                     <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg transform rotate-3 ${assessment.verdict === 'HIRE' ? 'bg-emerald-600 text-white' : assessment.verdict === 'REJECT' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'}`}>
                        {assessment.verdict === 'HIRE' ? <UserCheck className="w-10 h-10" /> : assessment.verdict === 'REJECT' ? <XCircle className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
                     </div>
                     <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Final Verdict</h4>
                        <div className="flex items-baseline gap-4">
                           <span className="text-6xl font-black text-slate-900 tracking-tighter">{assessment.score}%</span>
                           <span className={`text-sm font-black uppercase tracking-[0.2em] ${assessment.verdict === 'HIRE' ? 'text-emerald-600' : 'text-slate-400'}`}>
                             {assessment.verdict === 'HIRE' ? 'READY TO HIRE' : 'REJECTED'}
                           </span>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="bg-white border border-slate-200 p-12 rounded-[3rem] shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
                  <h4 className="font-black text-slate-900 mb-8 flex items-center gap-4 text-xs uppercase tracking-[0.2em] relative z-10">
                     <Sparkles className="w-5 h-5 text-indigo-500" />
                     Gemini Expert Feedback
                  </h4>
                  <div className="text-slate-700 leading-relaxed font-semibold text-base bg-slate-50/80 p-8 rounded-3xl border border-slate-100 italic relative z-10 shadow-inner">
                     {assessment.text}
                  </div>
               </div>

               <button onClick={onClose} className="w-full py-6 bg-slate-900 text-white font-black uppercase tracking-[0.3em] text-xs rounded-[2rem] shadow-2xl hover:bg-indigo-600 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4">
                  Finalize Candidate Profile
               </button>
            </div>
          )}
        </div>

        {status === 'active' && (
          <div className="px-12 py-10 bg-white border-t border-slate-100 flex items-center justify-center gap-12">
            <button onClick={() => setIsMuted(!isMuted)} className={`p-6 rounded-3xl transition-all shadow-xl ${isMuted ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {isMuted ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>
            <button onClick={() => { sessionRef.current?.close(); setStatus('finished'); }} className="px-16 py-6 bg-rose-600 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-rose-200 hover:bg-rose-700 hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-5 text-sm">
              <PhoneOff className="w-6 h-6" /> End Interview
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
