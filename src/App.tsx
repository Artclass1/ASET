import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ExternalLink, Loader2, FileText, Image as ImageIcon, Github, HelpCircle, ShieldAlert, Lock, Unlock, ShieldCheck, Key, Download, UploadCloud, Fingerprint, FolderOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import generatePDF from 'react-to-pdf';
import { toPng } from 'html-to-image';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import PricingModal from './components/PricingModal';
import { encryptPayload, decryptPayload } from './lib/encryption';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [analysisMode, setAnalysisMode] = useState<'thinking' | 'grounding'>('thinking');
  const [report, setReport] = useState('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartConfig, setChartConfig] = useState<any>(null);
  const [loadingText, setLoadingText] = useState('Initializing secure connection...');
  const targetRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  // Cryptographic Vault and payload state
  const [encryptPassphrase, setEncryptPassphrase] = useState('');
  const [decryptPassphrase, setDecryptPassphrase] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [showEncryptModal, setShowEncryptModal] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Pay and Use / GitHub Plan states
  const [plan, setPlan] = useState<'free' | 'pro' | 'enterprise'>(() => {
    return (localStorage.getItem('aset_plan') as any) || 'free';
  });
  const [remainingCredits, setRemainingCredits] = useState<number>(() => {
    const saved = localStorage.getItem('aset_credits');
    return saved !== null ? parseInt(saved, 10) : 3;
  });
  const [showPricing, setShowPricing] = useState(false);
  const [criticalError, setCriticalError] = useState<string | null>(null);
  const [resolvedModel, setResolvedModel] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const totalSlides = 1 + (chartData && chartData.length > 0 ? 1 : 0) + (chartConfig?.keyInsight ? 1 : 0);

  // Use IntersectionObserver to track the active slide reliably and without infinite update loops
  useEffect(() => {
    if (!carouselRef.current || status !== 'success') return;
    const container = carouselRef.current;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isExporting) {
            const slide = entry.target as HTMLElement;
            const slides = Array.from(container.querySelectorAll('.carousel-slide'));
            const index = slides.indexOf(slide);
            if (index !== -1) {
              setActiveSlide(index);
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.5,
      }
    );

    const slides = container.querySelectorAll('.carousel-slide');
    slides.forEach((slide) => observer.observe(slide));

    return () => {
      observer.disconnect();
    };
  }, [chartData, chartConfig, isExporting, status]);

  const scrollToSlide = (index: number) => {
    if (!carouselRef.current) return;
    const slides = carouselRef.current.querySelectorAll('.carousel-slide');
    if (slides[index]) {
      slides[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      setActiveSlide(index);
    }
  };

  const downloadCarousel = async () => {
    if (!carouselRef.current) return;
    try {
      setIsExporting(true);
      const originalSlide = activeSlide;
      const zip = new JSZip();
      const slides = carouselRef.current.querySelectorAll('.carousel-slide');
      
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i] as HTMLElement;
        // Scroll the slide into view so html-to-image is able to capture the correct rendered style and elements
        slide.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
        await new Promise(resolve => setTimeout(resolve, 250));
        
        const dataUrl = await toPng(slide, { 
          quality: 1, 
          pixelRatio: 3, 
          backgroundColor: '#030303',
          style: {
            margin: '0',
            padding: '48px',
            borderRadius: '0',
            transform: 'none'
          }
        });
        const base64Data = dataUrl.replace(/^data:image\/(png|jpg);base64,/, "");
        zip.file(`slide_${i + 1}.png`, base64Data, {base64: true});
      }

      // Restore scroll to the original slide
      if (slides[originalSlide]) {
        slides[originalSlide].scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
        setActiveSlide(originalSlide);
      }

      const content = await zip.generateAsync({type:"blob"});
      saveAs(content, `${query.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_carousel.zip`);
    } catch (err) {
      console.error('Failed to export carousel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const loadingMessages = [
    'Gathering data from authoritative sources...',
    'Analyzing and cross-referencing information...',
    'Structuring institutional-grade insights...',
    'Synthesizing data into key takeaways...',
    'Drafting final analysis report...'
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'loading') {
      let i = 0;
      setLoadingText(loadingMessages[0]);
      interval = setInterval(() => {
        i = (i + 1) % loadingMessages.length;
        setLoadingText(loadingMessages[i]);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || status === 'loading') return;

    if (plan === 'free' && remainingCredits <= 0) {
      setCriticalError('Starter free tier credits exhausted. Please upgrade to continue.');
      setShowPricing(true);
      return;
    }

    setCriticalError(null);
    setErrorDetails(null);
    setStatus('loading');
    setReport('');
    setChartData([]);
    setChartConfig(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, mode: analysisMode }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Request failed');
      }

      const data = await response.json();
      setResolvedModel(data.modelUsed || '');
      let resultText = data.text || '';
      let reportContent = resultText;
      let chartData: any[] = [];
      let chartConfig: any = null;

      // Extract JSON block from the end of the text
      const jsonMatch = resultText.match(/```(?:json)?\n([\s\S]*?"data"[\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          chartData = parsed.data || [];
          chartConfig = parsed;
          // Remove the JSON block from the report
          reportContent = resultText.replace(/```(?:json)?\n[\s\S]*?"data"[\s\S]*?\n```/, '').trim();
        } catch (e) {
          console.error("Failed to parse chart JSON:", e);
        }
      }

      setReport(reportContent || 'No report generated.');
      setChartData(chartData);
      setChartConfig(chartConfig);
      
      // Deduct account credit if Starter Plan
      if (plan === 'free') {
        const nextCredits = Math.max(0, remainingCredits - 1);
        setRemainingCredits(nextCredits);
        localStorage.setItem('aset_credits', nextCredits.toString());
      }

      setStatus('success');
    } catch (error: any) {
      console.error(error);
      setErrorDetails(error.message || 'An unexpected error occurred while generating the report.');
      setStatus('error');
    }
  };

  const handleEncryptAndDownload = async () => {
    if (!encryptPassphrase.trim()) return;
    setIsEncrypting(true);
    try {
      const payload = {
        query,
        report,
        chartData,
        chartConfig,
        resolvedModel,
        timestamp: new Date().toISOString(),
        version: 'ASET v1.2 Secure Audit'
      };
      const encrypted = await encryptPayload(payload, encryptPassphrase);
      const blob = new Blob([encrypted], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `${query.replace(/[^a-z0-0a-z]/gi, '_').toLowerCase()}_secured.aset`);
      setShowEncryptModal(false);
      setEncryptPassphrase('');
    } catch (err: any) {
      console.error(err);
      alert('Encryption download failed: ' + (err.message || err));
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleDecryptAndRestore = async () => {
    if (!selectedFile) {
      setVaultError('Please select an encrypted audit file (.aset).');
      return;
    }
    if (!decryptPassphrase) {
      setVaultError('Please provide a secure decryption passphrase.');
      return;
    }
    setIsDecrypting(true);
    setVaultError(null);
    try {
      const text = await selectedFile.text();
      const decrypted = await decryptPayload(text, decryptPassphrase);
      if (decrypted && decrypted.query && decrypted.report) {
        setQuery(decrypted.query);
        setReport(decrypted.report);
        setChartData(decrypted.chartData || []);
        setChartConfig(decrypted.chartConfig || null);
        setResolvedModel(decrypted.resolvedModel || 'ASET Local Vault Restoration');
        setStatus('success');
        setDecryptPassphrase('');
        setSelectedFile(null);
      } else {
        setVaultError('Invalid audit payload. Decrypted successfully, but required template structure (query/report) is missing.');
      }
    } catch (err: any) {
      console.error(err);
      setVaultError('Decryption failed. Please verify that the passphrase is correct for this file.');
    } finally {
      setIsDecrypting(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#111] border border-white/10 p-4 rounded-xl shadow-2xl">
          <p className="text-white/50 text-xs font-mono mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6 mb-1 last:mb-0">
              <span className="text-sm text-white/80 capitalize">{entry.name}</span>
              <span className="text-sm font-mono text-white">
                {entry.value} {chartConfig?.chartUnit || ''}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/30 selection:text-white overflow-x-hidden relative">
      
      {/* Premium Header */}
      <header className="w-full border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50 print:hidden select-none">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => {
            setStatus('idle');
            setQuery('');
            setReport('');
            setChartData([]);
            setChartConfig(null);
            setCriticalError(null);
          }}>
            <span className="text-sm font-mono font-bold tracking-widest text-white">ASET</span>
            <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded font-mono font-light">INTELLIGENCE</span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowPricing(true)}
              className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                plan === 'free' ? "bg-amber-400" : "bg-emerald-400"
              )} />
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/80">
                {plan === 'free' ? `Starter (${remainingCredits} left)` : `${plan} Mode`}
              </span>
            </button>

            <button
              onClick={() => setShowPricing(true)}
              className="hidden sm:flex items-center space-x-2 bg-transparent hover:bg-white/5 border border-white/5 hover:border-white/15 px-3.5 py-1.5 rounded-full transition-all cursor-pointer text-white/50 hover:text-white"
            >
              <Github className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono uppercase tracking-wider">GitHub Push</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 md:py-24 relative z-10 min-h-[calc(100vh-80px)]">
        
        {/* Search Input */}
        <motion.div 
          layout 
          className={cn(
            "w-full transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] print:hidden relative",
            status === 'idle' ? "mt-[25vh]" : "mt-4"
          )}
        >
          {criticalError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-4 max-w-2xl"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                <p className="text-xs font-mono text-amber-300 leading-relaxed">{criticalError}</p>
              </div>
              <button
                onClick={() => setShowPricing(true)}
                className="px-3 py-1.5 bg-amber-500 text-black hover:bg-amber-400 rounded-lg text-[10px] font-mono font-bold uppercase shrink-0 transition-colors cursor-pointer"
              >
                Upgrade Plan
              </button>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="relative group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Analyze a topic, company, asset, or global trend..."
              className="w-full bg-transparent border-b border-white/20 pb-4 text-3xl md:text-5xl font-light text-white focus:text-white placeholder:text-white/20 focus:outline-none focus:border-white/80 transition-colors pr-16 rounded-none relative z-10"
              disabled={status === 'loading'}
            />
            {/* Subtle active border effect */}
            <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-white group-focus-within:w-full transition-all duration-700 ease-out z-20"></div>

            <button 
              type="submit" 
              disabled={!query.trim() || status === 'loading'}
              className="absolute right-0 bottom-4 text-white/30 hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-white/30 z-30"
            >
              {status === 'loading' ? <Loader2 className="w-8 h-8 md:w-10 md:h-10 animate-spin" /> : <ArrowRight className="w-8 h-8 md:w-10 md:h-10" strokeWidth={1} />}
            </button>
          </form>

          {/* Mode Selector */}
          <div className="flex flex-wrap items-center gap-3 mt-6 pl-1 select-none">
            <button
              type="button"
              onClick={() => setAnalysisMode('thinking')}
              className={cn(
                "px-4 py-2 text-[10px] font-mono uppercase tracking-widest transition-all duration-300 border cursor-pointer",
                analysisMode === 'thinking' 
                  ? "bg-white text-black border-white font-medium" 
                  : "bg-transparent text-white/40 border-white/10 hover:text-white/70 hover:border-white/20"
              )}
              disabled={status === 'loading'}
            >
              Forensic Account Auditing (Thinking)
            </button>
            <button
              type="button"
              onClick={() => setAnalysisMode('grounding')}
              className={cn(
                "px-4 py-2 text-[10px] font-mono uppercase tracking-widest transition-all duration-300 border cursor-pointer",
                analysisMode === 'grounding' 
                  ? "bg-white text-black border-white font-medium" 
                  : "bg-transparent text-white/40 border-white/10 hover:text-white/70 hover:border-white/20"
              )}
              disabled={status === 'loading'}
            >
              Real-time Grounding (Search Index)
            </button>
          </div>

          {status === 'idle' && (
            <div className="mt-12 border border-white/10 bg-white/[0.02] rounded-2xl p-6 md:p-8 max-w-2xl">
              <div className="flex items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6 select-none">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold tracking-wide text-white uppercase font-mono">Cryptographic Local Vault</h3>
                    <p className="text-[10px] text-white/40 mt-0.5">Secure client-side AES-GCM decryption sandbox</p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded font-mono text-[9px] text-white/50 uppercase tracking-wider">
                  <Lock className="w-3 h-3 text-emerald-500" /> AES-256-GCM
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* File Drop Area / Input */}
                {!selectedFile ? (
                  <div className="group relative border border-dashed border-white/10 hover:border-white/30 hover:bg-white/[0.01] rounded-xl p-8 text-center transition-all duration-300">
                    <input
                      type="file"
                      accept=".aset"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                          setVaultError(null);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center gap-3 relative z-0 select-none">
                      <div className="p-3 bg-white/5 group-hover:bg-white/10 border border-white/10 rounded-full transition-colors">
                        <UploadCloud className="w-6 h-6 text-white/40 group-hover:text-white/80 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-xs text-white/80 font-medium">Drag & drop or click to select encrypted audit</p>
                        <p className="text-[10px] text-white/40 mt-1 font-mono">Accepts secured .aset files</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-white/10 bg-black/40 rounded-xl p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{selectedFile.name}</p>
                          <p className="text-[10px] text-white/40 font-mono mt-0.5">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setVaultError(null);
                        }}
                        className="text-[10px] font-mono text-white/30 hover:text-white transition-colors uppercase border border-white/5 hover:border-white/20 px-2.5 py-1 rounded cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-white/40 select-none">Audit Decryption Key</label>
                      <div className="relative">
                        <input
                          type="password"
                          value={decryptPassphrase}
                          onChange={(e) => setDecryptPassphrase(e.target.value)}
                          placeholder="Enter AES-GCM secure passphrase..."
                          className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-9 pr-4 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors font-mono tracking-widest text-center"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleDecryptAndRestore();
                            }
                          }}
                        />
                        <Key className="w-3.5 h-3.5 text-white/35 absolute left-3 top-3.5" />
                      </div>
                    </div>

                    {vaultError && (
                      <p className="text-[11px] text-red-500 font-mono flex items-center gap-2 bg-red-500/5 border border-red-500/10 p-2.5 rounded-lg select-none">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>{vaultError}</span>
                      </p>
                    )}

                    <button
                      onClick={handleDecryptAndRestore}
                      disabled={isDecrypting || !decryptPassphrase}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 font-mono text-[10px] tracking-wider uppercase font-bold text-black py-3 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isDecrypting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Decrypting & Authenticating Payload...
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5 animate-pulse" />
                          Decrypt & Read Archive (Offline Secure)
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="text-[10px] text-white/30 leading-relaxed font-sans mt-2 select-none">
                  <strong>Confidentiality Assurance:</strong> Processed entirely inside your device's web thread. Your audit documents and secret passphrases never navigate over the network, providing mathematically absolute privacy.
                </div>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {status === 'loading' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-8 text-white/50 font-mono text-sm flex items-center gap-4"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                {loadingText}
              </motion.div>
            )}
            
            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 text-red-400 font-mono text-sm flex flex-col gap-3 max-w-2xl bg-red-950/10 border border-red-500/20 p-5 rounded-xl select-none"
              >
                <div className="flex items-center gap-3 text-red-300">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-red-400 animate-pulse" />
                  <span className="font-bold uppercase tracking-wider text-xs">Analytical Auditing Error</span>
                </div>
                <p className="text-xs text-red-200/80 leading-relaxed font-sans select-text whitespace-pre-wrap max-h-40 overflow-y-auto pr-2">
                  {errorDetails || 'An unexpected error occurred while generating the report. Please verify connection and try again.'}
                </p>
                <div className="text-[10px] text-white/30 pt-2 border-t border-white/5 leading-relaxed font-sans">
                  <strong>Troubleshooting:</strong> If the error indicates a <strong>leaked key</strong> or <strong>quota exhausted (429)</strong>, please update your <strong>GEMINI_API_KEY</strong> under the <strong>Settings &gt; Secrets</strong> panel in the upper-right corner of AI Studio, or retry in a few seconds.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Report Content */}
        <AnimatePresence>
          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="mt-24 pb-32"
            >
              <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-16 border-b border-white/10 pb-8 gap-6 print:hidden">
                <div>
                  <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-3 flex flex-wrap items-center gap-2">
                    <span>Analysis Report</span>
                    {resolvedModel && (
                      <>
                        <span className="text-white/20">•</span>
                        <span className="text-emerald-400 font-semibold lowercase">processed via {resolvedModel}</span>
                      </>
                    )}
                  </h2>
                  <p className="text-2xl font-light text-white/90">{query}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      setStatus('idle');
                      setQuery('');
                      setReport('');
                      setChartData([]);
                      setChartConfig(null);
                      setActiveSlide(0);
                    }}
                    className="flex items-center gap-3 px-6 py-3 rounded-full border border-white/15 text-white/60 hover:text-white hover:border-white/40 transition-all duration-300 text-sm font-medium shrink-0"
                  >
                    New Analysis
                  </button>
                  {chartData && chartData.length > 0 && chartConfig && (
                    <button
                      onClick={downloadCarousel}
                      disabled={isExporting}
                      className="flex items-center gap-3 px-6 py-3 rounded-full border border-white/20 hover:bg-white hover:text-black transition-all duration-300 text-sm font-medium shrink-0 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-white"
                    >
                      <ImageIcon className="w-4 h-4" />
                      {isExporting ? 'Exporting ZIP...' : 'Export Carousel (ZIP)'}
                    </button>
                  )}
                  <button
                    onClick={() => generatePDF(targetRef, { filename: `${query.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_analysis.pdf` })}
                    className="flex items-center gap-3 px-6 py-3 rounded-full border border-white/20 hover:bg-white hover:text-black transition-all duration-300 text-sm font-medium shrink-0"
                  >
                    <FileText className="w-4 h-4" />
                    Download PDF
                  </button>
                  <button
                    onClick={() => setShowEncryptModal(true)}
                    className="flex items-center gap-3 px-6 py-3 rounded-full border border-emerald-500/30 bg-emerald-950/10 hover:bg-emerald-500 hover:text-black transition-all duration-300 text-sm font-medium text-emerald-400 shrink-0"
                  >
                    <Lock className="w-4 h-4 animate-pulse" />
                    Encrypt & Download (.aset)
                  </button>
                </div>
              </div>

              <div className="bg-[#020202] border border-white/5 p-8 -mx-8 rounded-2xl print:p-0 print:mx-0">
                <div className="hidden print:block mb-8">
                  <h1 className="text-3xl font-light text-white mb-2">ASET</h1>
                  <p className="text-white/60 font-mono text-sm">Analysis Report: {query}</p>
                </div>

                {chartData && chartData.length > 0 && chartConfig && (
                  <div className="mb-20 print:hidden mx-auto w-full max-w-xl relative group">
                    <div 
                      ref={carouselRef} 
                      className="flex overflow-x-auto snap-x snap-mandatory gap-6 w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] selection:bg-transparent"
                    >
                      
                      {/* Slide 1: Title & Highlights */}
                      <div className="carousel-slide w-full shrink-0 snap-center bg-[#030303] border border-white/10 p-8 sm:p-12 aspect-[4/5] flex flex-col relative overflow-hidden shadow-2xl">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
                        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-white/[0.04] rounded-full blur-[100px] pointer-events-none z-0" />
                        
                        <div className="flex items-center justify-between mb-auto pb-6 border-b border-white/10 relative z-10">
                          <div className="flex items-center space-x-3">
                            <h1 className="text-lg font-mono tracking-widest text-white uppercase font-bold">REPORT</h1>
                            <div className="w-px h-4 bg-white/20"></div>
                            <p className="text-[10px] sm:text-xs font-mono text-white/50 uppercase tracking-widest max-w-[140px] md:max-w-[200px] truncate">{query}</p>
                          </div>
                          <p className="text-[10px] sm:text-xs font-mono text-white/40">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}</p>
                        </div>
                        
                        <div className="my-auto relative z-10 w-full">
                          <h3 className="text-4xl sm:text-5xl font-light text-white tracking-tight mb-8 leading-[1.1]">{chartConfig.chartTitle || 'Market Analysis'}</h3>
                          <div className="w-12 h-1 bg-white/20 mb-12"></div>
                          
                          {chartConfig.highlights && chartConfig.highlights.length > 0 && (
                            <div className="grid grid-cols-2 gap-y-10 gap-x-6 w-full">
                              {chartConfig.highlights.map((h: any, i: number) => (
                                <div key={i} className="flex flex-col border-l-2 border-white/10 pl-4 py-1">
                                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">{h.label}</span>
                                  <span className="text-3xl font-light text-white tracking-tight">{h.value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-auto pt-6 flex justify-end relative z-10">
                          <span className="text-[9px] font-mono text-white/30 tracking-widest uppercase">SWIPE &rarr;</span>
                        </div>
                      </div>

                      {/* Slide 2: Chart */}
                      <div className="carousel-slide w-full shrink-0 snap-center bg-[#030303] border border-white/10 p-8 sm:p-12 aspect-[4/5] flex flex-col relative overflow-hidden shadow-2xl">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
                        <div className="absolute bottom-[-20%] left-[-20%] w-[70%] h-[70%] bg-white/[0.03] rounded-full blur-[120px] pointer-events-none z-0" />
                        
                        <div className="flex items-center justify-between mb-8 relative z-10">
                          <span className="inline-block text-[10px] sm:text-[11px] font-mono text-white/60 uppercase tracking-widest bg-white/[0.03] px-3 py-1.5 rounded border border-white/10">{chartConfig.chartUnit || 'METRIC'}</span>
                          <span className="text-[10px] font-mono text-white/30 tracking-widest uppercase">{query}</span>
                        </div>
                        
                        <div className="flex-1 w-full min-h-0 relative z-10 mb-6">
                          <ResponsiveContainer width="100%" height="100%">
                            {chartConfig.chartType === 'bar' ? (
                              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                <XAxis dataKey={chartConfig.xAxisKey || 'year'} stroke="#333" tick={{ fill: '#666', fontSize: 11, fontFamily: 'monospace' }} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#333" tick={{ fill: '#555', fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} tickFormatter={(value) => value.toLocaleString()} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1a1a1a' }} />
                                {chartConfig.series?.map((s: any, i: number) => (
                                  <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color || (i === 0 ? '#ffffff' : '#444444')} radius={[2, 2, 0, 0]} maxBarSize={48} />
                                ))}
                              </BarChart>
                            ) : (
                              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                <XAxis dataKey={chartConfig.xAxisKey || 'year'} stroke="#333" tick={{ fill: '#666', fontSize: 11, fontFamily: 'monospace' }} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#333" tick={{ fill: '#555', fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} tickFormatter={(value) => value.toLocaleString()} />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#333', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                {chartConfig.series?.map((s: any, i: number) => (
                                  <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color || (i === 0 ? '#ffffff' : '#444444')} strokeWidth={3} dot={{ fill: '#030303', stroke: s.color || (i === 0 ? '#ffffff' : '#444444'), strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#fff', stroke: '#000', strokeWidth: 2 }} />
                                ))}
                              </LineChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                        
                        <div className="mt-auto pt-6 flex justify-between items-center border-t border-white/10 relative z-10 w-full">
                          <span className="text-[9px] font-mono text-white/30 tracking-widest uppercase truncate max-w-[200px]">DATA OVERVIEW</span>
                          <span className="text-[9px] font-mono text-white/30 tracking-widest uppercase">SWIPE &rarr;</span>
                        </div>
                      </div>

                      {/* Slide 3: Insight */}
                      {chartConfig.keyInsight && (
                       <div className="carousel-slide w-full shrink-0 snap-center bg-[#030303] border border-white/10 p-8 sm:p-12 aspect-[4/5] flex flex-col relative overflow-hidden shadow-2xl">
                          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-white/[0.02] rounded-full blur-[100px] pointer-events-none z-0" />
                          
                          <div className="flex items-center justify-between mb-auto pb-6 border-b border-white/10 relative z-10">
                            <span className="text-white font-mono text-[10px] uppercase tracking-widest bg-white/10 px-3 py-1.5 rounded-sm">KEY INSIGHT</span>
                            <span className="text-[10px] sm:text-xs font-mono text-white/40">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}</span>
                          </div>
                          
                          <div className="my-auto relative z-10 w-full">
                            <div className="text-4xl text-white/20 mb-6 font-serif">"</div>
                            <p className="text-xl sm:text-2xl md:text-3xl font-light text-white/90 leading-relaxed tracking-wide">
                              {chartConfig.keyInsight}
                            </p>
                            <div className="text-4xl text-white/20 mt-6 font-serif text-right">"</div>
                          </div>
                          
                          <div className="mt-auto pt-6 flex justify-between items-center border-t border-white/10 relative z-10 w-full">
                            <span className="text-[9px] font-mono text-white/30 tracking-widest uppercase truncate max-w-[200px]">{query}</span>
                            <span className="text-[9px] font-mono text-white/30 tracking-widest uppercase">END / SHARE</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pagination indicators & controls */}
                    <div className="flex items-center justify-between mt-6 px-1">
                      <div className="flex items-center space-x-1.5">
                        {Array.from({ length: totalSlides }).map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => scrollToSlide(idx)}
                            className={cn(
                              "h-1 transition-all duration-300 rounded-full",
                              activeSlide === idx ? "bg-white w-6" : "bg-white/20 w-1.5 hover:bg-white/40"
                            )}
                            aria-label={`Go to slide ${idx + 1}`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center space-x-4">
                        <button
                          disabled={activeSlide === 0}
                          onClick={() => scrollToSlide(activeSlide - 1)}
                          className="text-xs font-mono tracking-widest text-white/40 hover:text-white disabled:opacity-20 disabled:hover:text-white/40 transition-colors uppercase"
                        >
                          Prev
                        </button>
                        <span className="text-[10px] font-mono text-white/20">/</span>
                        <button
                          disabled={activeSlide === totalSlides - 1}
                          onClick={() => scrollToSlide(activeSlide + 1)}
                          className="text-xs font-mono tracking-widest text-white/40 hover:text-white disabled:opacity-20 disabled:hover:text-white/40 transition-colors uppercase"
                        >
                          Next
                        </button>
                      </div>
                    </div>

                  </div>
                )}

                <div className="prose prose-invert prose-lg max-w-none 
                  prose-headings:font-light prose-headings:tracking-tight
                  prose-h1:text-4xl prose-h1:mb-8 prose-h1:font-medium
                  prose-h2:text-2xl prose-h2:mt-16 prose-h2:mb-6 prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-4 prose-h2:font-medium
                  prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4
                  prose-p:text-white/70 prose-p:leading-relaxed
                  prose-li:text-white/70 prose-li:marker:text-white/30
                  prose-strong:text-white prose-strong:font-semibold
                  prose-a:text-white hover:prose-a:text-white/80 prose-a:underline-offset-4 prose-a:decoration-white/30
                  prose-hr:border-white/10 prose-hr:my-12
                  prose-table:w-full prose-table:text-sm prose-th:bg-white/[0.02] prose-th:px-4 prose-th:py-3 prose-th:font-medium prose-th:text-left prose-td:px-4 prose-td:py-3 prose-td:border-b prose-td:border-white/5
                  prose-blockquote:border-l-white/20 prose-blockquote:bg-white/5 border-white/10 prose-blockquote:py-1 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:text-white/80 prose-blockquote:font-light">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {report}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Hidden div for PDF Generation (avoids html2canvas oklch errors by using standard CSS) */}
              <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                <div ref={targetRef} className="pdf-export">
                  <div style={{ marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '36px', fontWeight: 300, color: '#ffffff', marginBottom: '8px', border: 'none' }}>ASET</h1>
                    <p style={{ color: '#999999', fontSize: '14px', fontFamily: 'monospace' }}>Analysis Report: {query}</p>
                  </div>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {report}
                  </ReactMarkdown>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Footer */}
      <footer className="w-full text-center py-8 text-xs font-mono text-white/20 print:hidden relative z-10 flex flex-col items-center justify-center gap-2 select-none">
        <div>
          ASET Intelligence &copy; {new Date().getFullYear()}. For demonstration purposes only. Not financial advice.
        </div>
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => {
              setPlan('free');
              setRemainingCredits(3);
              localStorage.setItem('aset_plan', 'free');
              localStorage.setItem('aset_credits', '3');
              setCriticalError(null);
            }} 
            className="hover:text-white transition-colors cursor-pointer underline decoration-white/10"
          >
            Reset Session (Demo Mode)
          </button>
          <span>·</span>
          <button 
            onClick={() => setShowPricing(true)} 
            className="hover:text-white transition-colors cursor-pointer underline decoration-white/10"
          >
            Upgrade Membership
          </button>
        </div>
      </footer>

      {/* Pricing & checkout / GitHub instructions modal */}
      <AnimatePresence>
        {showPricing && (
          <PricingModal
            isOpen={showPricing}
            onClose={() => setShowPricing(false)}
            onSuccess={() => {
              setPlan('pro');
              localStorage.setItem('aset_plan', 'pro');
              setCriticalError(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Encrypt modal */}
      <AnimatePresence>
        {showEncryptModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0b0b] border border-white/10 w-full max-w-md rounded-2xl p-6 md:p-8 relative shadow-2xl overflow-hidden"
            >
              <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-emerald-500/[0.03] rounded-full blur-[80px] pointer-events-none" />

              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-wider text-white font-bold">Secure Local Encryption</h3>
                    <p className="text-[10px] text-white/40">Encrypt report JSON and downloaded graphs</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEncryptModal(false);
                    setEncryptPassphrase('');
                  }}
                  className="text-white/40 hover:text-white transition-colors p-1 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4 rotate-45" />
                </button>
              </div>

              <div className="space-y-5">
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Enter a secret passphrase to encrypt this financial audit report. Under the hood, this uses client-side SHA-256 key hashing, PBKDF2 iteration stretches, and symmetric AES-256-GCM encryption.
                </p>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-white/40">Passphrase</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={encryptPassphrase}
                      onChange={(e) => setEncryptPassphrase(e.target.value)}
                      placeholder="Choose a strong passphrase..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-9 pr-4 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors font-mono tracking-widest text-center"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleEncryptAndDownload();
                        }
                      }}
                    />
                    <Key className="w-3.5 h-3.5 text-white/35 absolute left-3 top-3.5" />
                  </div>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg text-[10px] text-emerald-400 font-mono leading-relaxed">
                  <strong>Private Vault Protocol:</strong> Keep this password secure. Since ASET does not store keys, passwords, or encrypted blocks on any server, there is no "password recovery" mechanism.
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowEncryptModal(false);
                      setEncryptPassphrase('');
                    }}
                    className="flex-1 bg-transparent hover:bg-white/5 border border-white/5 text-white/60 hover:text-white py-2.5 rounded-lg text-[10px] font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEncryptAndDownload}
                    disabled={isEncrypting || !encryptPassphrase.trim()}
                    className="flex-1 bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-30 font-mono text-[10px] uppercase tracking-wider font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isEncrypting ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Encrypting...
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3" />
                        Lock & Download
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
