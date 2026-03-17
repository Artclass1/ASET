import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ExternalLink, Loader2, FileText } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import generatePDF from 'react-to-pdf';
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from 'recharts';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [report, setReport] = useState('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartUnit, setChartUnit] = useState('');
  const [sources, setSources] = useState<Array<{uri: string, title: string}>>([]);
  const [loadingText, setLoadingText] = useState('Initializing secure connection...');
  const targetRef = useRef(null);

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
    setChartData([]);
    setChartUnit('');
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
5. You MUST include detailed financial data, specifically:
   - Last 5 years of Net Profit
   - Current Market Capitalization
   - Total Debt and Debt-to-Equity ratios
   - Other relevant detailed financial metrics
6. Include the following sections where applicable:
   - Executive Summary
   - Current Market Data & Pricing
   - 5-Year Financial Overview (Profit, Cap, Debt)
   - Fundamental Analysis
   - Technical Overview
   - Recent Catalysts & Official News
   - Outlook & Conclusion
7. Maintain an objective, highly analytical, and professional tone.
8. You MUST output your response in two parts:
   First, the comprehensive Markdown report.
   Second, at the very end of your response, append a JSON block containing the ACTUAL 5-Year Financial Trend data for the specific company/asset queried.
   
Use this exact JSON structure, but replace the sample data with the REAL data you found for the queried asset:
\`\`\`json
{
  "chartData": [
    { "year": "2019", "revenue": 100.5, "netIncome": 20.1 },
    { "year": "2020", "revenue": 110.2, "netIncome": 25.4 },
    { "year": "2021", "revenue": 120.0, "netIncome": 30.0 },
    { "year": "2022", "revenue": 130.5, "netIncome": 35.2 },
    { "year": "2023", "revenue": 140.0, "netIncome": 40.1 }
  ],
  "chartUnit": "Billions USD"
}
\`\`\`
If chart data is unavailable, provide an empty array.`,
          tools: [{ googleSearch: {} }],
        }
      });

      let resultText = response.text || '';
      let reportContent = resultText;
      let chartData: any[] = [];
      let chartUnit = '';

      // Extract JSON block from the end of the text
      const jsonMatch = resultText.match(/```(?:json)?\n([\s\S]*?"chartData"[\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          chartData = parsed.chartData || [];
          chartUnit = parsed.chartUnit || '';
          // Remove the JSON block from the report
          reportContent = resultText.replace(/```(?:json)?\n[\s\S]*?"chartData"[\s\S]*?\n```/, '').trim();
        } catch (e) {
          console.error("Failed to parse chart JSON:", e);
        }
      }

      setReport(reportContent || 'No report generated.');
      setChartData(chartData);
      setChartUnit(chartUnit);
      
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#111] border border-white/10 p-4 rounded-xl shadow-2xl">
          <p className="text-white/50 text-xs font-mono mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6 mb-1 last:mb-0">
              <span className="text-sm text-white/80 capitalize">{entry.name}</span>
              <span className="text-sm font-mono text-white">
                {entry.value} {chartUnit}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-white/30 selection:text-white overflow-x-hidden relative">
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-24 relative z-10 min-h-[calc(100vh-80px)]">
        
        {/* Header / Logo */}
        <motion.div 
          layout
          className="mb-16 print:hidden"
        >
          <h1 className="text-xl font-mono tracking-widest text-white/50 uppercase">ASET</h1>
          <p className="text-sm font-light text-white/30 mt-2">Institutional-grade market analysis powered by real-time AI.</p>
        </motion.div>

        {/* Search Input */}
        <motion.div 
          layout 
          className={cn(
            "w-full transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] print:hidden",
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
              <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-16 border-b border-white/10 pb-8 gap-6 print:hidden">
                <div>
                  <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-3">Analysis Report</h2>
                  <p className="text-2xl font-light text-white/90">{query}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => generatePDF(targetRef, { filename: `${query.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_analysis.pdf` })}
                    className="flex items-center gap-3 px-6 py-3 rounded-full border border-white/20 hover:bg-white hover:text-black transition-all duration-300 text-sm font-medium shrink-0"
                  >
                    <FileText className="w-4 h-4" />
                    Download PDF
                  </button>
                </div>
              </div>

              <div className="bg-[#0a0a0a] p-8 -mx-8 rounded-2xl print:p-0 print:mx-0">
                <div className="hidden print:block mb-8">
                  <h1 className="text-3xl font-light text-white mb-2">ASET</h1>
                  <p className="text-white/60 font-mono text-sm">Analysis Report: {query}</p>
                </div>

                {chartData && chartData.length > 0 && (
                  <div className="mb-16 border border-white/10 rounded-2xl p-6 bg-[#0a0a0a] print:hidden">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xs font-mono text-white/40 uppercase tracking-widest">5-Year Financial Trend</h3>
                      <span className="text-xs font-mono text-white/30">{chartUnit}</span>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <XAxis 
                            dataKey="year" 
                            stroke="#333" 
                            tick={{ fill: '#666', fontSize: 12, fontFamily: 'monospace' }} 
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                          />
                          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#333', strokeWidth: 1, strokeDasharray: '4 4' }} />
                          <Line 
                            type="monotone" 
                            dataKey="revenue" 
                            name="Revenue"
                            stroke="#ffffff" 
                            strokeWidth={2} 
                            dot={false}
                            activeDot={{ r: 4, fill: '#fff', stroke: '#000', strokeWidth: 2 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="netIncome" 
                            name="Net Income"
                            stroke="#666666" 
                            strokeWidth={2} 
                            dot={false}
                            activeDot={{ r: 4, fill: '#666', stroke: '#000', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

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
                  {sources.length > 0 && (
                    <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #333333' }}>
                      <h3 style={{ fontSize: '12px', color: '#666666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px' }}>Verified Sources</h3>
                      {sources.map((source, idx) => (
                        <div key={idx} style={{ marginBottom: '12px' }}>
                          <p style={{ fontSize: '14px', color: '#cccccc', fontWeight: 500, margin: '0 0 4px 0' }}>{source.title}</p>
                          <a href={source.uri} style={{ fontSize: '12px', color: '#666666', textDecoration: 'none' }}>{source.uri}</a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Footer */}
      <footer className="w-full text-center py-8 text-xs font-mono text-white/20 print:hidden relative z-10">
        ASET Intelligence &copy; {new Date().getFullYear()}. For demonstration purposes only. Not financial advice.
      </footer>
    </div>
  );
}
