import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Download, ExternalLink, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [report, setReport] = useState('');
  const [sources, setSources] = useState<Array<{uri: string, title: string}>>([]);
  const [loadingText, setLoadingText] = useState('Initializing secure connection...');

  const loadingMessages = [
    'Connecting to official exchanges...',
    'Scanning verified company filings...',
    'Analyzing top-tier financial news...',
    'Cross-referencing data sources...',
    'Compiling in-depth market report...'
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

    setStatus('loading');
    setReport('');
    setSources([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: query,
        config: {
          systemInstruction: `You are an elite financial analyst. Create an in-depth, highly professional market analysis report based on the user's request.
          
CRITICAL INSTRUCTIONS:
1. You MUST use the Google Search tool to gather the most up-to-date, official data.
2. Prioritize data from official stock exchanges (NYSE, NASDAQ, LSE, etc.), official company investor relations websites, official company social media accounts, and top-tier, genuine financial news organizations (Bloomberg, Reuters, CNBC, WSJ).
3. Strictly EXCLUDE rumors, unverified sources, and fake news. Rely ONLY on genuine source information.
4. Format the output as a comprehensive Markdown report.
5. Include the following sections where applicable:
   - Executive Summary
   - Current Market Data & Pricing
   - Fundamental Analysis
   - Technical Overview
   - Recent Catalysts & Official News
   - Outlook & Conclusion
6. Maintain an objective, highly analytical, and professional tone.`,
          tools: [{ googleSearch: {} }],
        }
      });

      setReport(response.text || 'No report generated.');
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        const extractedSources = chunks
          .map(chunk => chunk.web)
          .filter(web => web && web.uri && web.title);
        
        // Deduplicate sources by URI
        const uniqueSources = Array.from(new Map(extractedSources.map(item => [item.uri, item])).values());
        setSources(uniqueSources);
      }
      
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  const downloadReport = () => {
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${query.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_analysis.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/30 selection:text-white overflow-x-hidden">
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-24">
        
        {/* Header / Logo */}
        <motion.div 
          layout
          className="mb-16"
        >
          <h1 className="text-xl font-mono tracking-widest text-white/50 uppercase">Aura Market Intelligence</h1>
        </motion.div>

        {/* Search Input */}
        <motion.div 
          layout 
          className={cn(
            "w-full transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]",
            status === 'idle' ? "mt-[25vh]" : "mt-0"
          )}
        >
          <form onSubmit={handleSubmit} className="relative group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter a stock ticker, company, or market trend..."
              className="w-full bg-transparent border-b border-white/20 pb-4 text-3xl md:text-5xl font-light text-white placeholder:text-white/20 focus:outline-none focus:border-white/80 transition-colors pr-16 rounded-none"
              disabled={status === 'loading'}
            />
            <button 
              type="submit" 
              disabled={!query.trim() || status === 'loading'}
              className="absolute right-0 bottom-4 text-white/30 hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-white/30"
            >
              {status === 'loading' ? <Loader2 className="w-10 h-10 animate-spin" /> : <ArrowRight className="w-10 h-10" />}
            </button>
          </form>

          {/* Loading State */}
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
                className="mt-8 text-red-400 font-mono text-sm flex items-center gap-4"
              >
                An error occurred while generating the report. Please try again.
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
              <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-16 border-b border-white/10 pb-8 gap-6">
                <div>
                  <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-3">Analysis Report</h2>
                  <p className="text-2xl font-light text-white/90">{query}</p>
                </div>
                <button
                  onClick={downloadReport}
                  className="flex items-center gap-3 px-6 py-3 rounded-full border border-white/20 hover:bg-white hover:text-black transition-all duration-300 text-sm font-medium shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Download Report (.md)
                </button>
              </div>

              <div className="prose prose-invert prose-lg max-w-none 
                prose-headings:font-light prose-headings:tracking-tight
                prose-h1:text-4xl prose-h1:mb-8
                prose-h2:text-2xl prose-h2:mt-16 prose-h2:mb-6 prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-4 
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4
                prose-p:text-white/70 prose-p:leading-relaxed
                prose-li:text-white/70
                prose-strong:text-white prose-strong:font-medium
                prose-a:text-white hover:prose-a:text-white/80 prose-a:underline-offset-4 prose-a:decoration-white/30
                prose-hr:border-white/10 prose-hr:my-12
                prose-blockquote:border-l-white/20 prose-blockquote:text-white/60 prose-blockquote:font-light prose-blockquote:italic">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {report}
                </ReactMarkdown>
              </div>

              {sources.length > 0 && (
                <div className="mt-32 pt-12 border-t border-white/10">
                  <h3 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-8">Verified Sources</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-4 p-5 rounded-2xl border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all group"
                      >
                        <ExternalLink className="w-4 h-4 text-white/30 mt-0.5 group-hover:text-white/70 transition-colors shrink-0" />
                        <div className="overflow-hidden">
                          <p className="text-sm text-white/80 font-medium truncate mb-1">{source.title}</p>
                          <p className="text-xs text-white/40 truncate">{source.uri}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
