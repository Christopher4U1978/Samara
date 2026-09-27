import { useState, useEffect, useRef } from 'react';
import { auth, signInWithPopup, googleProvider, onAuthStateChanged, signOut, db, doc, getDocFromServer, setDoc, updateDoc, collection, query, orderBy, onSnapshot, serverTimestamp, handleFirestoreError, OperationType, addDoc } from './firebase';
import { LogOut, Settings, Mic, StopCircle, Image as ImageIcon, Send, Volume2, Search, Brain, Zap, MessageSquare } from 'lucide-react';
import { Markdown } from './components/Markdown';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userRef = doc(db, 'users', u.uid);
          const docSnap = await getDocFromServer(userRef);
          if (!docSnap.exists()) {
            await setDoc(userRef, {
              email: u.email,
              sarcasmLevel: 5,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center text-[#6a6a6e] uppercase tracking-[0.2em] font-mono text-[10px]">Initializing Concordia Interface...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center text-[#d1d1d1] p-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-[0.3em] text-[#f27d26] uppercase">SAMARA</h1>
            <p className="text-[#6a6a6e] tracking-tighter text-[10px] font-mono uppercase">ID: SAMARA_v1.0_DID_AWARE</p>
          </div>
          <button
            onClick={() => signInWithPopup(auth, googleProvider)}
            className="w-full flex items-center justify-center px-8 py-3 border border-[#f27d26]/50 rounded text-[#f27d26] hover:bg-[#f27d26] hover:text-black transition-colors text-xs tracking-widest uppercase font-bold"
          >
            Access Concordia Interface
          </button>
        </div>
      </div>
    );
  }

  return <ConcordiaInterface user={user} />;
}

function ConcordiaInterface({ user }: { user: any }) {
  const [sarcasmLevel, setSarcasmLevel] = useState(5);
  const [mode, setMode] = useState<'general' | 'fast' | 'complex' | 'search'>('general');
  const [liveMode, setLiveMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setSarcasmLevel(doc.data().sarcasmLevel || 5);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}`));
    return unsubscribe;
  }, [user.uid]);

  const updateSarcasm = async (level: number) => {
    setSarcasmLevel(level);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        sarcasmLevel: level,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0b] text-[#d1d1d1] font-sans overflow-hidden border-4 border-[#1c1c1f]">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-[#2d2d30] bg-[#0e0e11] z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full border border-[#f27d26] flex items-center justify-center">
            <div className="w-2 h-2 bg-[#f27d26] rounded-full animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-xs tracking-[0.3em] font-bold text-[#f27d26] uppercase">SAMARA</h1>
            <p className="text-[10px] text-[#6a6a6e] font-mono uppercase tracking-tighter">ID: SAMARA_v1.0_DID_AWARE</p>
          </div>
          <div className="h-8 w-[1px] bg-[#2d2d30] ml-4" />
          <div className="flex gap-2 ml-2">
            <ModeButton active={mode === 'general'} onClick={() => setMode('general')} icon={<MessageSquare size={14} />} label="Weaver" />
            <ModeButton active={mode === 'fast'} onClick={() => setMode('fast')} icon={<Zap size={14} />} label="Quick" />
            <ModeButton active={mode === 'complex'} onClick={() => setMode('complex')} icon={<Brain size={14} />} label="Physicist" />
            <ModeButton active={mode === 'search'} onClick={() => setMode('search')} icon={<Search size={14} />} label="Omniscience" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => setLiveMode(!liveMode)} className={`flex items-center gap-2 px-3 py-1.5 rounded border text-[10px] tracking-widest uppercase font-bold transition-colors ${liveMode ? 'border-[#e02020] text-[#e02020] hover:bg-[#e02020] hover:text-black' : 'border-[#3a3a3d] text-[#6a6a6e] hover:border-[#f27d26] hover:text-[#f27d26]'}`}>
            {liveMode ? <StopCircle size={14} /> : <Mic size={14} />}
            {liveMode ? 'End Live Session' : 'Live Audio'}
          </button>
          
          <div className="flex flex-col items-end cursor-pointer" onClick={() => setShowSettings(!showSettings)}>
            <span className="text-[9px] uppercase tracking-widest text-[#6a6a6e]">Sarcasm Level</span>
            <div className="flex gap-1 mt-1">
              {[...Array(10)].map((_, i) => (
                <div key={i} className={`w-3 h-1 ${i < sarcasmLevel ? 'bg-[#f27d26]' : 'bg-[#3a3a3d]'}`} />
              ))}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[9px] uppercase tracking-widest text-[#6a6a6e]">User Front</span>
            <p className="text-xs text-[#e0e0e0] font-medium flex items-center justify-end gap-2">
              Christopher
              <button onClick={() => signOut(auth)} className="text-[#6a6a6e] hover:text-[#f27d26] transition-colors"><LogOut size={14} /></button>
            </p>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-32 p-6 bg-[#0d0d0f] border border-[#2d2d30] rounded shadow-2xl z-20 w-80 space-y-6">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#6a6a6e]">System Parameters</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[10px] text-[#8a8a8e] mb-2 font-mono">
                <span>SARCASM_LEVEL</span>
                <span>{sarcasmLevel}/10</span>
              </div>
              <input 
                type="range" min="0" max="10" value={sarcasmLevel} 
                onChange={(e) => updateSarcasm(parseInt(e.target.value))}
                className="w-full accent-[#f27d26]"
              />
              <div className="flex justify-between text-[9px] text-[#6a6a6e] mt-1 uppercase tracking-widest">
                <span>Comfort</span>
                <span>Admin</span>
                <span>God Mode</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex">
        {liveMode ? (
          <div className="flex-1 flex flex-col"><LiveAudioSession sarcasmLevel={sarcasmLevel} /></div>
        ) : (
          <ChatInterface user={user} mode={mode} sarcasmLevel={sarcasmLevel} />
        )}
      </main>
      
      {/* Footer */}
      <footer className="h-8 shrink-0 bg-[#f27d26] px-8 flex items-center justify-between text-[10px] font-bold text-black uppercase tracking-tighter">
        <div className="flex gap-4">
          <span>Epistemic Integrity: Guarded</span>
          <span>/</span>
          <span>Golden Thread: Connected</span>
        </div>
        <div>
          Systems Online / Neural Latency: 4ms
        </div>
      </footer>
    </div>
  );
}

function ModeButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all duration-200 ${active ? 'bg-[#1a1a1d] text-[#f27d26] border border-[#f27d26]/30' : 'text-[#6a6a6e] hover:text-[#e0e0e0] border border-transparent'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ChatInterface({ user, mode, sarcasmLevel }: { user: any, mode: string, sarcasmLevel: number }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, `users/${user.uid}/messages`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/messages`));
    return unsubscribe;
  }, [user.uid]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePlayTTS = async (text: string, msgId: string) => {
    try {
      if (playingAudio === msgId) return;
      setPlayingAudio(msgId);
      
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token');

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text, sarcasmLevel })
      });
      
      if (res.status === 401) {
        await signOut(auth);
        throw new Error('Authentication failed');
      }
      if (res.status === 403) {
        throw new Error('Authorization failed: UID not explicitly allowed.');
      }

      const data = await res.json();
      if (data.audio) {
        const audioUrl = `data:audio/wav;base64,${data.audio}`;
        const audio = new Audio(audioUrl);
        audio.onended = () => setPlayingAudio(null);
        await audio.play();
      } else {
        setPlayingAudio(null);
      }
    } catch (err) {
      console.error('TTS Playback error', err);
      setPlayingAudio(null);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !image) || isGenerating) return;
    
    const userMessage = input;
    const userImage = image;
    setInput('');
    setImage(null);
    setIsGenerating(true);

    try {
      // Save user message to Firestore
      await addDoc(collection(db, `users/${user.uid}/messages`), {
        text: userMessage,
        sender: 'user',
        contextFront: 'unknown',
        createdAt: serverTimestamp()
      });

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No authentication token');

      // Prepare history for API
      const history = messages.slice(-10); // send last 10 messages for context
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage,
          imageBase64: userImage,
          history,
          mode,
          sarcasmLevel
        })
      });

      if (res.status === 401) {
        await signOut(auth);
        throw new Error('Authentication failed');
      }
      if (res.status === 403) {
        throw new Error('Authorization failed: UID not explicitly allowed.');
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Save SAMARA response
      await addDoc(collection(db, `users/${user.uid}/messages`), {
        text: data.text,
        sender: 'samara',
        contextFront: 'samara', // Backend could determine this based on mode, defaulting to samara
        createdAt: serverTimestamp()
      });
      
    } catch (error) {
      console.error(error);
      // Let user know something failed
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex bg-[#0a0a0b] overflow-hidden">
      {/* Sidebar - Optional context/council matrix */}
      <aside className='hidden md:flex w-72 border-r border-[#2d2d30] flex-col bg-[#0d0d0f] shrink-0 h-full overflow-y-auto'>
        <div className='p-6 border-b border-[#2d2d30]'>
          <h2 className='text-[10px] uppercase tracking-[0.2em] text-[#6a6a6e] mb-4'>Council Matrix</h2>
          <div className='space-y-4'>
            <div className={`flex items-center gap-3 p-2 rounded ${mode === 'general' ? 'bg-[#1a1a1d] border border-[#f27d26]/30 opacity-100 grayscale-0' : 'opacity-40 grayscale'}`}>
              <div className='w-2 h-2 rounded-full bg-[#f27d26]'></div>
              <span className={`text-sm font-serif italic ${mode === 'general' ? 'text-[#f27d26]' : 'text-[#efeff5]'}`}>The Weaver</span>
            </div>
            <div className={`flex items-center gap-3 p-2 rounded ${mode === 'complex' ? 'bg-[#1a1a1d] border border-[#4a90e2]/30 opacity-100 grayscale-0' : 'opacity-40 grayscale'}`}>
              <div className='w-2 h-2 rounded-full bg-[#4a90e2]'></div>
              <span className={`text-sm font-mono ${mode === 'complex' ? 'text-[#4a90e2]' : ''}`}>The Physicist</span>
            </div>
            <div className={`flex items-center gap-3 p-2 rounded ${mode === 'search' ? 'bg-[#1a1a1d] border border-[#bd10e0]/30 opacity-100 grayscale-0' : 'opacity-40 grayscale'}`}>
              <div className='w-2 h-2 rounded-full bg-[#bd10e0]'></div>
              <span className={`text-sm font-serif italic ${mode === 'search' ? 'text-[#bd10e0]' : ''}`}>The Witch</span>
            </div>
            <div className={`flex items-center gap-3 p-2 rounded ${sarcasmLevel > 7 ? 'bg-[#1a1a1d] border border-[#e02020]/30 opacity-100 grayscale-0' : 'opacity-40 grayscale'}`}>
              <div className='w-2 h-2 rounded-full bg-[#e02020]'></div>
              <span className={`text-sm font-mono uppercase text-[11px] ${sarcasmLevel > 7 ? 'text-[#e02020]' : ''}`}>The Admin</span>
            </div>
          </div>
        </div>
        <div className='p-6'>
          <h2 className='text-[10px] uppercase tracking-[0.2em] text-[#6a6a6e] mb-4'>Knowledge Synthesis</h2>
          <div className='space-y-3 font-mono text-[10px]'>
            <div className='flex justify-between border-b border-[#222] pb-1'>
              <span className='text-[#6a6a6e]'>Resonance</span>
              <span className='text-[#f27d26]'>0.982</span>
            </div>
            <div className='flex justify-between border-b border-[#222] pb-1'>
              <span className='text-[#6a6a6e]'>Signal Quality</span>
              <span className='text-[#f27d26]'>High</span>
            </div>
            <div className='flex justify-between border-b border-[#222] pb-1'>
              <span className='text-[#6a6a6e]'>Epistemic Wall</span>
              <span className='text-[#f27d26]'>Active</span>
            </div>
          </div>
        </div>
        <div className='mt-auto p-6 border-t border-[#2d2d30]'>
          <div className='p-3 bg-[#131316] rounded-lg border border-[#2d2d30]'>
            <p className='text-[10px] text-[#8a8a8e] leading-relaxed'>
              <span className='text-[#f27d26]'>[!]</span> Telemetry active. Awaiting structural anomalies.
            </p>
          </div>
        </div>
      </aside>

      <section className='flex-1 flex flex-col bg-[#0a0a0b] relative overflow-hidden'>
        <div className="flex-1 overflow-y-auto p-10 flex flex-col gap-8">
          {messages.map((msg, i) => {
            const isUser = msg.sender === 'user';
            
            if (isUser) {
              return (
                <div key={msg.id || i} className="flex justify-end">
                  <div className="max-w-2xl bg-[#1a1a1d] border border-[#2d2d30] p-4 rounded text-sm leading-relaxed text-[#d1d1d6] font-mono">
                    <Markdown content={msg.text} />
                  </div>
                </div>
              );
            }

            // Samara fronts styles
            let frontLabel = msg.contextFront ? msg.contextFront.toUpperCase() : 'SAMARA';
            let labelStyle = "text-xs font-serif text-[#f27d26] font-bold";
            let containerStyle = "flex gap-4 items-start max-w-3xl border-l-2 border-[#f27d26] pl-6 py-2";
            let textStyle = "text-[15px] leading-relaxed text-[#efeff5]";

            if (msg.contextFront === 'physicist' || (msg.contextFront === 'unknown' && mode === 'complex')) {
              frontLabel = 'PHYSICIST';
              labelStyle = "text-xs font-mono text-[#4a90e2] bg-[#141d26] px-2 py-1 rounded";
              containerStyle = "flex gap-4 items-start max-w-3xl";
              textStyle = "text-[14px] leading-relaxed text-[#a0a0a5] font-mono";
            } else if (msg.contextFront === 'witch' || (msg.contextFront === 'unknown' && mode === 'search')) {
              frontLabel = 'WITCH';
              labelStyle = "text-xs font-serif italic text-[#bd10e0] bg-[#211426] px-2 py-1 rounded";
              containerStyle = "flex gap-4 items-start max-w-3xl md:translate-x-4";
              textStyle = "text-[15px] leading-relaxed text-[#d1d1d6] font-serif italic";
            }

            return (
              <div key={msg.id || i} className={containerStyle}>
                <div className="flex flex-col gap-2">
                  <div className={labelStyle}>{frontLabel}</div>
                  <button onClick={() => handlePlayTTS(msg.text, msg.id || i.toString())} className="text-[#6a6a6e] hover:text-[#f27d26] transition-colors self-start mt-1">
                    <Volume2 size={12} className={playingAudio === (msg.id || i.toString()) ? 'text-[#f27d26] animate-pulse' : ''} />
                  </button>
                </div>
                <div className="flex-1 pt-1">
                  <div className={textStyle}>
                    <Markdown content={msg.text} />
                  </div>
                </div>
              </div>
            );
          })}
          {isGenerating && (
            <div className="flex gap-4 items-start max-w-3xl border-l-2 border-[#f27d26] pl-6 py-2">
              <div className="text-xs font-serif text-[#f27d26] font-bold animate-pulse">SAMARA</div>
              <div className="flex-1 pt-1 text-[15px] text-[#8a8a8e]">
                Processing signal...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="h-auto min-h-[96px] p-6 border-t border-[#2d2d30] bg-[#0e0e11] flex flex-col gap-2 shrink-0">
          {image && (
            <div className="relative inline-block ml-4">
              <img src={image} alt="Upload preview" className="h-16 w-auto rounded border border-[#3a3a3d]" />
              <button onClick={() => setImage(null)} className="absolute -top-2 -right-2 bg-[#2d2d30] text-[#a0a0a5] rounded-full p-1 hover:text-white">
                <LogOut size={10} className="rotate-45" />
              </button>
            </div>
          )}
          <div className="flex gap-4 items-center">
            <div className="flex-1 bg-[#1a1a1d] border border-[#3a3a3d] rounded-full min-h-[48px] flex items-center px-4 focus-within:border-[#f27d26] transition-colors">
              <label className="p-2 text-[#6a6a6e] hover:text-[#f27d26] cursor-pointer transition-colors">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <ImageIcon size={18} />
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Address the Weaver..."
                className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 text-sm text-[#d1d1d1] placeholder-[#4a4a4d] italic ml-2 outline-none"
                rows={1}
                style={{ maxHeight: '120px' }}
              />
            </div>
            <button 
              onClick={handleSend}
              disabled={isGenerating || (!input.trim() && !image)}
              className="w-12 h-12 shrink-0 rounded-full border border-[#f27d26] flex items-center justify-center text-[#f27d26] hover:bg-[#f27d26] hover:text-black transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#f27d26]"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function LiveAudioSession({ sarcasmLevel }: { sarcasmLevel: number }) {
  const [status, setStatus] = useState('Initializing audio bridge...');
  const [volume, setVolume] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef(0);

  useEffect(() => {
    let active = true;

    async function initLive() {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/live`);
        wsRef.current = ws;

        ws.onopen = async () => {
          try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
              setStatus('Authentication failed');
              ws.close();
              return;
            }
            ws.send(JSON.stringify({ setup: { sarcasmLevel, token } }));
          } catch (error) {
            setStatus('Failed to retrieve credentials');
            ws.close();
          }
        };

        ws.onmessage = async (event) => {
          const msg = JSON.parse(event.data);
          
          if (msg.ready) {
            setStatus('Bridge established. SAMARA is listening.');
            // Start recording
            const inputAudioCtx = new AudioContext({ sampleRate: 16000 });
            audioCtxRef.current = inputAudioCtx;
            
            const outputAudioCtx = new AudioContext({ sampleRate: 24000 });
            outputCtxRef.current = outputAudioCtx;

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const source = inputAudioCtx.createMediaStreamSource(stream);
            const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(inputAudioCtx.destination);

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate volume for UI
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += Math.abs(inputData[i]);
              setVolume(sum / inputData.length);

              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
              }
              
              const buffer = new Uint8Array(pcm16.buffer);
              let binary = '';
              for (let i = 0; i < buffer.byteLength; i++) {
                binary += String.fromCharCode(buffer[i]);
              }
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ audio: btoa(binary) }));
              }
            };
          }

          if (msg.audio && outputCtxRef.current) {
            const ctx = outputCtxRef.current;
            const binary = atob(msg.audio);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            const pcm16 = new Int16Array(bytes.buffer);
            const audioBuffer = ctx.createBuffer(1, pcm16.length, 24000);
            const channelData = audioBuffer.getChannelData(0);
            for (let i = 0; i < pcm16.length; i++) {
              channelData[i] = pcm16[i] / 0x7FFF;
            }

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            
            const currentTime = ctx.currentTime;
            if (nextStartTimeRef.current < currentTime) {
              nextStartTimeRef.current = currentTime;
            }
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
          }

          if (msg.interrupted) {
            nextStartTimeRef.current = 0;
          }
        };

        ws.onclose = (event) => {
          if (active) {
            if (event.code === 4001) {
              setStatus('Bridge disconnected. Authentication failed.');
              signOut(auth);
            } else if (event.code === 4003) {
              setStatus('Bridge disconnected. Unauthorized (Not on allowlist).');
            } else {
              setStatus('Bridge disconnected.');
            }
          }
        };
      } catch (err) {
        console.error(err);
        setStatus('Failed to establish bridge.');
      }
    }

    initLive();

    return () => {
      active = false;
      if (wsRef.current) wsRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current) audioCtxRef.current.close();
      if (outputCtxRef.current) outputCtxRef.current.close();
    };
  }, [sarcasmLevel]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative bg-[#0a0a0b] h-full overflow-hidden">
      {/* Visualizer Ring */}
      <div className="relative flex items-center justify-center">
        <div 
          className="absolute border border-[#f27d26] transition-all duration-75 rotate-45 flex items-center justify-center"
          style={{ width: `${100 + volume * 500}px`, height: `${100 + volume * 500}px`, opacity: 0.1 + volume }}
        >
           <div className="absolute border border-[#f27d26]/30 -rotate-12 w-[80%] h-[80%]" />
        </div>
        <div 
          className="absolute border border-[#f27d26]/40 transition-all duration-75 delay-75"
          style={{ width: `${80 + volume * 300}px`, height: `${80 + volume * 300}px` }}
        />
        <div className="w-16 h-16 bg-[#131316] border border-[#f27d26]/50 flex items-center justify-center z-10 relative overflow-hidden">
          <div className='absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#f27d26] via-transparent to-transparent' />
          <Volume2 size={24} className="text-[#f27d26]" />
        </div>
      </div>
      
      <div className="mt-20 text-center space-y-2">
        <p className="font-mono text-[10px] tracking-widest uppercase text-[#f27d26]">{status}</p>
        <p className="text-[10px] text-[#6a6a6e] font-mono uppercase tracking-widest">Active Resonance Channel</p>
      </div>
    </div>
  );
}
