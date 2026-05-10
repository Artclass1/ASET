import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ExternalLink, Loader2, FileText, Image as ImageIcon } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import generatePDF from 'react-to-pdf';
import { toPng } from 'html-to-image';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [report, setReport] = useState('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartConfig, setChartConfig] = useState<any>(null);
  const [loadingText, setLoadingText] = useState('Initializing secure connection...');
  const targetRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const downloadInfographic = async () => {
    if (!chartRef.current) return;
    try {
      setIsExporting(true);
      // Give React time to apply any conditional UI before capturing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dataUrl = await toPng(chartRef.current, { 
        quality: 1, 
        pixelRatio: 3, 
        backgroundColor: '#030303',
        style: {
          margin: '0',
          padding: '32px',
          borderRadius: '0'
        }
      });
      const link = document.createElement('a');
      link.download = `${query.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_infographic.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export infographic:', err);
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

    setStatus('loading');
    setReport('');
    setChartData([]);
    setChartConfig(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: {
          systemInstruction: `You are an elite, highly analytical intelligence system. Create an extremely in-depth, expansive, and professional-grade analysis report based on the user's request.
          
CRITICAL INSTRUCTIONS:
1. You MUST use the Google Search tool to gather the most up-to-date, official, and authoritative data. You can handle ANY topic (Finance, Technology, Global Markets, Science, etc.).
2. Prioritize data from authoritative sources relevant to the query (e.g., SEC filings for finance, institutional research, top-tier news).
3. Strictly EXCLUDE rumors and unverified sources. DO NOT hallucinate facts or figures. Explicitly state "N/A" if data is unavailable.
4. Format the output as a highly structured, comprehensive Markdown report with professional terminology and analytical rigor. The report must be extremely detailed and go deeply into the specifics of the query.
5. Provide specific metrics or KPIs relevant to the topic. If financial, include KPIs like ROE, P/E ratio, Market Cap, YoY growth.
6. Include relevant institutional analytical sections (e.g., "Macroeconomic Context", "Fundamental Drivers", "Key Catalysts", "Risk Factors" or equivalent for non-financial topics).
7. Maintain an objective, highly analytical, and institutional tone.
8. You MUST output your response in two parts:
   First, the comprehensive Markdown report. 
   - If the user asks for a specific number of items (e.g., "top 99"), attempt to list ALL of them.
   - For lists of more than 5 items, you MUST format the data as a beautifully styled Markdown table.
   - If you cannot accurately find all requested items, state the search limitations explicitly.
   
   Second, at the very end of your response, append a JSON block containing the ACTUAL data for a highly aesthetic, Instagram-ready infographic chart.
   
If the user queries a single entity/topic, provide a line chart showing a trend.
If the user queries a list or comparison, provide a comparison chart (Bar chart).

Use this exact JSON structure, replacing the sample data with REAL data:
\`\`\`json
{
  "chartTitle": "CATCHY BOLD INSTAGRAM-READY TITLE",
  "chartType": "line",
  "xAxisKey": "year",
  "chartUnit": "Value/Unit",
  "series": [
    { "key": "metric1", "name": "Metric 1", "color": "#ffffff" },
    { "key": "metric2", "name": "Metric 2", "color": "#888888" }
  ],
  "data": [
    { "year": "2019", "metric1": 100.5, "metric2": 20.1 },
    { "year": "2020", "metric1": 110.2, "metric2": 25.4 }
  ],
  "highlights": [
    { "label": "Key Metric 1", "value": "123" },
    { "label": "Key Metric 2", "value": "456" },
    { "label": "Key Metric 3", "value": "789" },
    { "label": "Key Metric 4", "value": "012" }
  ],
  "keyInsight": "Punchy, Instagram-caption style insight that summarizes the 'So What?' factor."
}
\`\`\`
If chart data is unavailable, provide an empty array for data.`,
          tools: [{ googleSearch: {} }],
        }
      });

      let resultText = response.text || '';
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
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-white/30 selection:text-white overflow-x-hidden relative">
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-24 relative z-10 min-h-[calc(100vh-80px)]">
        
        {/* Search Input */}
        <motion.div 
          layout 
          className={cn(
            "w-full transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] print:hidden relative",
            status === 'idle' ? "mt-[35vh]" : "mt-8"
          )}
        >
          <form onSubmit={handleSubmit} className="relative group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
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
                  {chartData && chartData.length > 0 && chartConfig && (
                    <button
                      onClick={downloadInfographic}
                      disabled={isExporting}
                      className="flex items-center gap-3 px-6 py-3 rounded-full border border-white/20 hover:bg-white hover:text-black transition-all duration-300 text-sm font-medium shrink-0 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-white"
                    >
                      <ImageIcon className="w-4 h-4" />
                      {isExporting ? 'Exporting...' : 'Export Infographic'}
                    </button>
                  )}
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

                {chartData && chartData.length > 0 && chartConfig && (
                  <div className="mb-20 print:hidden flex justify-center w-full">
                    <div ref={chartRef} className="w-full max-w-xl bg-[#030303] border border-white/10 p-8 sm:p-12 aspect-[4/5] flex flex-col relative overflow-hidden shadow-2xl">
                      
                      {/* Technical Grid Background */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
                      
                      {/* Subtle Background Glow */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[100px] pointer-events-none z-0" />
                      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/[0.03] rounded-full blur-[120px] pointer-events-none z-0" />

                      {/* Header */}
                      <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/10 flex-none shrink-0 relative z-10">
                        <div className="flex items-center space-x-3">
                          <h1 className="text-lg font-mono tracking-widest text-white uppercase font-bold">REPORT</h1>
                          <div className="w-px h-4 bg-white/20"></div>
                          <p className="text-[10px] sm:text-xs font-mono text-white/50 uppercase tracking-widest max-w-[140px] md:max-w-[200px] truncate">{query}</p>
                        </div>
                        <p className="text-[10px] sm:text-xs font-mono text-white/40 text-right shrink-0">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}</p>
                      </div>

                      {/* Main Title */}
                      <div className="mb-10 flex-none shrink-0 relative z-10 w-full">
                        <h3 className="text-3xl sm:text-4xl font-light text-white tracking-tight mb-4 leading-tight">{chartConfig.chartTitle || 'Market Analysis'}</h3>
                        <span className="inline-block text-[10px] sm:text-[11px] font-mono text-white/60 uppercase tracking-widest bg-white/[0.03] px-3 py-1.5 rounded border border-white/10">{chartConfig.chartUnit || 'METRIC'}</span>
                      </div>
                      
                      {/* Highlights Grid */}
                      {chartConfig.highlights && chartConfig.highlights.length > 0 && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10 flex-none shrink-0 relative z-10 w-full">
                          {chartConfig.highlights.map((h: any, i: number) => (
                            <div key={i} className="flex flex-col border-l-2 border-white/10 pl-4 py-1">
                              <span className="text-[9px] sm:text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1.5">{h.label}</span>
                              <span className="text-xl sm:text-2xl font-light text-white tracking-tight">{h.value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Chart */}
                      <div className="flex-1 w-full min-h-0 relative mb-8 z-10">
                        <ResponsiveContainer width="100%" height="100%">
                          {chartConfig.chartType === 'bar' ? (
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                              <XAxis 
                                dataKey={chartConfig.xAxisKey || 'year'} 
                                stroke="#333" 
                                tick={{ fill: '#666', fontSize: 11, fontFamily: 'monospace' }} 
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                              />
                              <YAxis 
                                stroke="#333" 
                                tick={{ fill: '#555', fontSize: 10, fontFamily: 'monospace' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => value.toLocaleString()}
                              />
                              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1a1a1a' }} />
                              {chartConfig.series?.map((s: any, i: number) => (
                                <Bar 
                                  key={s.key}
                                  dataKey={s.key} 
                                  name={s.name}
                                  fill={s.color || (i === 0 ? '#ffffff' : '#444444')} 
                                  radius={[2, 2, 0, 0]}
                                  maxBarSize={48}
                                />
                              ))}
                            </BarChart>
                          ) : (
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                              <XAxis 
                                dataKey={chartConfig.xAxisKey || 'year'} 
                                stroke="#333" 
                                tick={{ fill: '#666', fontSize: 11, fontFamily: 'monospace' }} 
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                              />
                              <YAxis 
                                stroke="#333" 
                                tick={{ fill: '#555', fontSize: 10, fontFamily: 'monospace' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => value.toLocaleString()}
                              />
                              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#333', strokeWidth: 1, strokeDasharray: '4 4' }} />
                              {chartConfig.series?.map((s: any, i: number) => (
                                <Line 
                                  key={s.key}
                                  type="monotone" 
                                  dataKey={s.key} 
                                  name={s.name}
                                  stroke={s.color || (i === 0 ? '#ffffff' : '#444444')} 
                                  strokeWidth={3} 
                                  dot={{ fill: '#030303', stroke: s.color || (i === 0 ? '#ffffff' : '#444444'), strokeWidth: 2, r: 4 }}
                                  activeDot={{ r: 6, fill: '#fff', stroke: '#000', strokeWidth: 2 }}
                                />
                              ))}
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      </div>

                      {/* Insight / Details at Bottom */}
                      {chartConfig.keyInsight && (
                        <div className="mt-auto pt-6 border-t border-white/10 flex-none shrink-0 relative z-10 w-full">
                          <p className="text-xs sm:text-[14px] font-light text-white/80 leading-relaxed max-w-[90%]">
                            <span className="inline-block text-white font-mono text-[9px] uppercase tracking-widest mr-3 bg-white/10 px-2 py-1 rounded-sm align-middle">Insight</span> 
                            {chartConfig.keyInsight}
                          </p>
                        </div>
                      )}
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
      <footer className="w-full text-center py-8 text-xs font-mono text-white/20 print:hidden relative z-10">
        ASET Intelligence &copy; {new Date().getFullYear()}. For demonstration purposes only. Not financial advice.
      </footer>
    </div>
  );
}
