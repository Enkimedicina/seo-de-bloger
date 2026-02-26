import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  BookOpen, 
  ListOrdered, 
  FileText, 
  ChevronRight, 
  Loader2, 
  CheckCircle2, 
  Download, 
  RefreshCw,
  ArrowLeft,
  PenTool,
  Sparkles,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { generateTitles, generateOutline, generateSectionContent } from './services/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Step = 'topic' | 'titles' | 'outline' | 'writing' | 'finished';

interface OutlineItem {
  title: string;
  description: string;
  content?: string;
  status: 'pending' | 'writing' | 'completed';
}

export default function App() {
  const [step, setStep] = useState<Step>('topic');
  const [topic, setTopic] = useState('');
  const [titles, setTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(-1);
  const [copied, setCopied] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [outline]);

  const handleGenerateTitles = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const result = await generateTitles(topic);
      setTitles(result);
      setStep('titles');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTitle = async (title: string) => {
    setSelectedTitle(title);
    setLoading(true);
    try {
      const result = await generateOutline(title);
      setOutline(result.map(item => ({ ...item, status: 'pending' })));
      setStep('outline');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const startWriting = async () => {
    setStep('writing');
    setCurrentSectionIndex(0);
    
    let fullContent = "";
    const newOutline = [...outline];

    for (let i = 0; i < newOutline.length; i++) {
      setCurrentSectionIndex(i);
      newOutline[i].status = 'writing';
      setOutline([...newOutline]);

      try {
        const content = await generateSectionContent(selectedTitle, newOutline, i, fullContent);
        newOutline[i].content = content;
        newOutline[i].status = 'completed';
        fullContent += "\n\n" + content;
        setOutline([...newOutline]);
      } catch (error) {
        console.error(`Error in section ${i}:`, error);
        newOutline[i].status = 'pending';
        setOutline([...newOutline]);
        break;
      }
    }
    
    setStep('finished');
  };

  const downloadArticle = () => {
    const content = `# ${selectedTitle}\n\n` + outline.map(s => s.content).join('\n\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTitle.replace(/\s+/g, '_')}.md`;
    a.click();
  };

  const handleCopy = async () => {
    const content = `# ${selectedTitle}\n\n` + outline.map(s => s.content).join('\n\n');
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const reset = () => {
    setStep('topic');
    setTopic('');
    setTitles([]);
    setSelectedTitle('');
    setOutline([]);
    setCurrentSectionIndex(-1);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans selection:bg-[#5A5A40] selection:text-white">
      {/* Header */}
      <header className="border-b border-[#141414]/10 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="w-8 h-8 bg-[#141414] rounded-lg flex items-center justify-center text-white">
              <Sparkles size={18} />
            </div>
            <h1 className="font-serif italic text-xl font-bold tracking-tight">SEO Architect</h1>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-medium uppercase tracking-widest opacity-50">
            <span className={cn(step === 'topic' && "text-[#141414] opacity-100")}>01. Tema</span>
            <ChevronRight size={12} />
            <span className={cn(step === 'titles' && "text-[#141414] opacity-100")}>02. Títulos</span>
            <ChevronRight size={12} />
            <span className={cn(step === 'outline' && "text-[#141414] opacity-100")}>03. Esquema</span>
            <ChevronRight size={12} />
            <span className={cn((step === 'writing' || step === 'finished') && "text-[#141414] opacity-100")}>04. Redacción</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {step === 'topic' && (
            <motion.div 
              key="topic"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto text-center space-y-8"
            >
              <div className="space-y-4">
                <h2 className="text-5xl font-serif italic font-bold leading-tight">
                  Crea contenido SEO <br /> que realmente posicione.
                </h2>
                <p className="text-lg text-[#141414]/60 max-w-lg mx-auto">
                  Genera calendarios editoriales de 20 artículos y redacciones de 3,000 palabras optimizadas.
                </p>
              </div>

              <div className="relative group">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Escribe tu tema aquí (ej: Marketing Digital, Cocina Vegana...)"
                  className="w-full bg-white border-2 border-[#141414] rounded-2xl px-6 py-5 text-xl focus:outline-none focus:ring-4 focus:ring-[#5A5A40]/10 transition-all placeholder:text-[#141414]/30"
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateTitles()}
                />
                <button
                  onClick={handleGenerateTitles}
                  disabled={loading || !topic.trim()}
                  className="absolute right-3 top-3 bottom-3 bg-[#141414] text-white px-6 rounded-xl font-bold flex items-center gap-2 hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                  <span>Comenzar</span>
                </button>
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-4">
                {['Tecnología', 'Salud', 'Finanzas', 'Viajes', 'Moda'].map(tag => (
                  <button 
                    key={tag}
                    onClick={() => setTopic(tag)}
                    className="px-4 py-2 rounded-full border border-[#141414]/10 bg-white text-sm font-medium hover:border-[#141414] transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'titles' && (
            <motion.div 
              key="titles"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <button 
                    onClick={() => setStep('topic')}
                    className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider opacity-50 hover:opacity-100 transition-opacity mb-4"
                  >
                    <ArrowLeft size={14} /> Volver al tema
                  </button>
                  <h2 className="text-3xl font-serif italic font-bold">Calendario Editorial: {topic}</h2>
                  <p className="text-[#141414]/60">Selecciona un título para comenzar la redacción detallada.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {titles.map((title, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleSelectTitle(title)}
                    className="group text-left p-6 bg-white border border-[#141414]/10 rounded-2xl hover:border-[#141414] hover:shadow-xl hover:shadow-[#141414]/5 transition-all relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#141414] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-xs font-mono opacity-30 mb-2 block">ARTÍCULO {String(i + 1).padStart(2, '0')}</span>
                    <h3 className="text-lg font-bold leading-tight group-hover:text-[#5A5A40] transition-colors">{title}</h3>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                      Redactar <ChevronRight size={12} />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'outline' && (
            <motion.div 
              key="outline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <div className="space-y-4 text-center">
                <button 
                  onClick={() => setStep('titles')}
                  className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider opacity-50 hover:opacity-100 transition-opacity"
                >
                  <ArrowLeft size={14} /> Volver a los títulos
                </button>
                <h2 className="text-4xl font-serif italic font-bold leading-tight">{selectedTitle}</h2>
                <div className="inline-block px-4 py-1 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] text-xs font-bold uppercase tracking-widest">
                  Esquema Detallado (10+ Secciones)
                </div>
              </div>

              <div className="bg-white border border-[#141414]/10 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-8 space-y-6">
                  {outline.map((item, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full border-2 border-[#141414] flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </div>
                        {i < outline.length - 1 && <div className="w-px h-full bg-[#141414]/10 my-2" />}
                      </div>
                      <div className="pb-6">
                        <h4 className="font-bold text-lg mb-1">{item.title}</h4>
                        <p className="text-[#141414]/60 text-sm leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-8 bg-[#141414] flex items-center justify-between">
                  <div className="text-white/60 text-sm">
                    <span className="text-white font-bold">Objetivo:</span> ~3,000 palabras reales
                  </div>
                  <button
                    onClick={startWriting}
                    className="bg-white text-[#141414] px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-white/90 transition-all"
                  >
                    <PenTool size={18} />
                    Comenzar Redacción
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {(step === 'writing' || step === 'finished') && (
            <motion.div 
              key="writing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)]"
            >
              {/* Sidebar: Progress */}
              <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                <div className="bg-white border border-[#141414]/10 rounded-2xl p-6 sticky top-0">
                  <h3 className="font-bold uppercase tracking-widest text-xs opacity-50 mb-4">Progreso de Redacción</h3>
                  <div className="space-y-3">
                    {outline.map((item, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "p-3 rounded-xl border transition-all flex items-center justify-between gap-3",
                          item.status === 'writing' ? "bg-[#5A5A40]/5 border-[#5A5A40] text-[#5A5A40]" : 
                          item.status === 'completed' ? "bg-green-50 border-green-200 text-green-700" : 
                          "bg-white border-[#141414]/5 text-[#141414]/40"
                        )}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <span className="text-[10px] font-mono opacity-50">{String(i + 1).padStart(2, '0')}</span>
                          <span className="text-sm font-bold truncate">{item.title}</span>
                        </div>
                        {item.status === 'writing' && <Loader2 size={14} className="animate-spin shrink-0" />}
                        {item.status === 'completed' && <CheckCircle2 size={14} className="shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>
                
                {step === 'finished' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#141414] text-white rounded-2xl p-6 space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold">¡Artículo Completo!</h4>
                        <p className="text-white/60 text-xs">Listo para usar.</p>
                      </div>
                    </div>
                    
                    <div className="pt-2 space-y-2">
                      <button 
                        onClick={handleCopy}
                        className="w-full bg-white text-[#141414] py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/90 transition-all"
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 size={18} className="text-green-600" />
                            <span>¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={18} />
                            <span>Copiar Artículo</span>
                          </>
                        )}
                      </button>
                      <button 
                        onClick={downloadArticle}
                        className="w-full bg-white/10 border border-white/20 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-all"
                      >
                        <Download size={18} /> Descargar Markdown
                      </button>
                      <button 
                        onClick={reset}
                        className="w-full border border-white/5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-all opacity-50"
                      >
                        <RefreshCw size={14} /> Crear otro artículo
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Main: Content Viewer */}
              <div className="lg:col-span-2 bg-white border border-[#141414]/10 rounded-3xl overflow-hidden flex flex-col shadow-xl">
                <div className="p-6 border-b border-[#141414]/5 flex items-center justify-between bg-white/50 backdrop-blur-sm">
                  <h3 className="font-bold truncate max-w-[70%]">{selectedTitle}</h3>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", step === 'writing' ? "bg-yellow-500 animate-pulse" : "bg-green-500")} />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                      {step === 'writing' ? "Redactando..." : "Finalizado"}
                    </span>
                  </div>
                </div>
                
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-10 prose prose-stone max-w-none prose-headings:font-serif prose-headings:italic prose-headings:font-bold prose-h1:text-4xl prose-h2:text-2xl prose-h2:border-b prose-h2:pb-2 prose-p:text-lg prose-p:leading-relaxed"
                >
                  <h1 className="mb-8">{selectedTitle}</h1>
                  
                  {outline.map((item, i) => (
                    <div key={i} className="mb-12">
                      {item.content ? (
                        <Markdown>{item.content}</Markdown>
                      ) : item.status === 'writing' ? (
                        <div className="space-y-4 animate-pulse">
                          <div className="h-8 bg-[#141414]/5 rounded w-1/3" />
                          <div className="space-y-2">
                            <div className="h-4 bg-[#141414]/5 rounded w-full" />
                            <div className="h-4 bg-[#141414]/5 rounded w-full" />
                            <div className="h-4 bg-[#141414]/5 rounded w-4/5" />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  
                  {step === 'writing' && (
                    <div className="flex items-center justify-center py-12 text-[#141414]/30 gap-3">
                      <Loader2 className="animate-spin" size={20} />
                      <span className="font-medium italic">Redactando sección {currentSectionIndex + 1} de {outline.length}...</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-[#141414]/5 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-30">
          Desarrollado por SEO Architect & Gemini AI
        </p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(20, 20, 20, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(20, 20, 20, 0.2);
        }
      `}} />
    </div>
  );
}
