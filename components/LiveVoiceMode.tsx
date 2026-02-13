
import React, { useEffect, useRef, useState } from 'react';
import { getLiveClient } from '../services/geminiService';
import { LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { X, Mic, MicOff, Volume2, Radio, Activity } from 'lucide-react';
import { Portfolio, WatchlistItem, NewsItem } from '../types';

interface LiveVoiceModeProps {
  onClose: () => void;
  portfolio: Portfolio;
  watchlist?: WatchlistItem[];
  news?: NewsItem[];
}

const LiveVoiceMode: React.FC<LiveVoiceModeProps> = ({ onClose, portfolio, watchlist, news }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'closed'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // Refs for audio handling & Data (to access fresh state inside callbacks)
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Data Refs
  const portfolioRef = useRef(portfolio);
  const watchlistRef = useRef(watchlist);
  const newsRef = useRef(news);

  // Keep refs in sync with props
  useEffect(() => { portfolioRef.current = portfolio; }, [portfolio]);
  useEffect(() => { watchlistRef.current = watchlist; }, [watchlist]);
  useEffect(() => { newsRef.current = news; }, [news]);

  useEffect(() => {
    let session: any = null;

    // --- Tool Definitions ---
    const tools: { functionDeclarations: FunctionDeclaration[] }[] = [{
      functionDeclarations: [
        {
          name: 'get_portfolio_summary',
          description: 'Get the user\'s current total portfolio value, 24h change, and top holdings.',
        },
        {
          name: 'get_asset_price',
          description: 'Get the current real-time price of a specific asset or stock symbol.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING, description: 'The stock/crypto symbol (e.g. AAPL, BTC)' }
            },
            required: ['symbol']
          }
        },
        {
          name: 'get_market_news',
          description: 'Get the latest financial news headlines and sentiment.',
        }
      ]
    }];

    // --- Tool Execution Logic ---
    const executeTool = (name: string, args: any) => {
      setActiveTool(name);
      setTimeout(() => setActiveTool(null), 2000); // Visual feedback

      if (name === 'get_portfolio_summary') {
        const p = portfolioRef.current;
        return {
          total_value: p.totalValue,
          change_24h_percent: p.change24hPercent,
          holdings_count: p.assets.length,
          top_assets: p.assets.slice(0, 3).map(a => `${a.symbol}: $${a.price.toFixed(2)}`)
        };
      }

      if (name === 'get_asset_price') {
        const symbol = args.symbol?.toUpperCase();
        // Check portfolio first
        const inPortfolio = portfolioRef.current.assets.find(a => a.symbol === symbol);
        if (inPortfolio) return { symbol, price: inPortfolio.price, change_24h: inPortfolio.change24h, source: 'Portfolio' };

        // Check watchlist
        const inWatchlist = watchlistRef.current.find(w => w.symbol === symbol);
        if (inWatchlist) return { symbol, price: inWatchlist.price, change_24h: inWatchlist.change24h, source: 'Watchlist' };

        // Fallback simulation for demo purposes if not found
        return { symbol, price: 0, error: "Asset not found in portfolio or watchlist." };
      }

      if (name === 'get_market_news') {
        return newsRef.current.map(n => ({ title: n.title, sentiment: n.sentiment }));
      }

      return { error: 'Unknown tool' };
    };

    const startSession = async () => {
      try {
        const liveClient = getLiveClient();

        // Initialize Audio Contexts
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const inputCtx = new AudioContextClass({ sampleRate: 16000 });
        const outputCtx = new AudioContextClass({ sampleRate: 24000 });
        audioContextRef.current = outputCtx;

        // Get User Media
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // Connect to Gemini Live
        const sessionPromise = liveClient.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          config: {
            tools: tools,
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: `You are DJ-AI, an expert financial voice assistant. 
            CRITICAL: You have access to the user's REAL-TIME data via tools. 
            - Always use 'get_asset_price' when asked for a price. 
            - Always use 'get_portfolio_summary' when asked about account status.
            - Keep audio responses concise, professional, and friendly. Don't read out JSON, summarize it naturally.`,
          },
          callbacks: {
            onopen: () => {
              setStatus('connected');

              // Setup Audio Input Streaming
              const source = inputCtx.createMediaStreamSource(stream);
              const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);

              scriptProcessor.onaudioprocess = (e) => {
                if (isMuted) return; // Don't send data if muted

                const inputData = e.inputBuffer.getChannelData(0);
                const l = inputData.length;
                const int16 = new Int16Array(l);
                for (let i = 0; i < l; i++) {
                  int16[i] = inputData[i] * 32768;
                }

                let binary = '';
                const bytes = new Uint8Array(int16.buffer);
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                  binary += String.fromCharCode(bytes[i]);
                }
                const base64Data = btoa(binary);

                sessionPromise.then((s: any) => {
                  s.sendRealtimeInput({
                    media: {
                      mimeType: 'audio/pcm;rate=16000',
                      data: base64Data
                    }
                  });
                });
              };

              source.connect(scriptProcessor);
              scriptProcessor.connect(inputCtx.destination);

              inputSourceRef.current = source;
              processorRef.current = scriptProcessor;
            },
            onmessage: async (message: LiveServerMessage) => {
              // 1. Handle Tool Calls (The core integration)
              if (message.toolCall) {
                const responses = [];
                for (const fc of message.toolCall.functionCalls) {
                  console.log(`Executing tool: ${fc.name}`, fc.args);
                  const result = executeTool(fc.name, fc.args);
                  responses.push({
                    id: fc.id,
                    name: fc.name,
                    response: { result }
                  });
                }

                // Send response back to model
                sessionPromise.then((s: any) => {
                  s.sendToolResponse({ functionResponses: responses });
                });
              }

              // 2. Handle Audio Output
              const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (base64Audio) {
                const binaryString = atob(base64Audio);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }

                const dataInt16 = new Int16Array(bytes.buffer);
                const buffer = outputCtx.createBuffer(1, dataInt16.length, 24000);
                const channelData = buffer.getChannelData(0);
                for (let i = 0; i < dataInt16.length; i++) {
                  channelData[i] = dataInt16[i] / 32768.0;
                }

                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                const source = outputCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(outputCtx.destination);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;

                sourcesRef.current.add(source);
                source.onended = () => sourcesRef.current.delete(source);
              }

              if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
              }
            },
            onclose: () => setStatus('closed'),
            onerror: (err) => {
              console.error(err);
              setStatus('error');
            }
          }
        });

        session = await sessionPromise;
      } catch (e) {
        console.error("Live Connect Error:", e);
        setStatus('error');
      }
    };

    startSession();

    return () => {
      if (processorRef.current) processorRef.current.disconnect();
      if (inputSourceRef.current) inputSourceRef.current.disconnect();
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700 flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-700 rounded-full text-slate-300 hover:bg-slate-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="mt-8 mb-8 relative">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${status === 'connected' ? 'bg-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.3)]' : 'bg-slate-700'
            }`}>
            <div className={`w-24 h-24 rounded-full flex items-center justify-center ${status === 'connected' ? 'bg-indigo-500 animate-pulse' : 'bg-slate-600'
              }`}>
              <Radio className="w-10 h-10 text-white" />
            </div>
          </div>
          {status === 'connected' && (
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/20">
              LIVE
            </div>
          )}
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">DJ-AI Voice Mode</h2>
        <p className="text-slate-400 text-center mb-8 h-6">
          {activeTool ? (
            <span className="text-indigo-400 flex items-center justify-center gap-2 animate-pulse">
              <Activity className="w-4 h-4" /> Reading {activeTool.replace(/_/g, ' ')}...
            </span>
          ) : (
            <>
              {status === 'connecting' && "Connecting to Gemini..."}
              {status === 'connected' && "Listening... Ask me about your portfolio."}
              {status === 'error' && "Connection failed. Please retry."}
              {status === 'closed' && "Session ended."}
            </>
          )}
        </p>

        <div className="flex gap-6">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <button className="p-4 rounded-full bg-slate-700 text-slate-500 cursor-not-allowed">
            <Volume2 className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveVoiceMode;
