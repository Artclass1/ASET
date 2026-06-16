import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini SDK with User-Agent heading telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Endpoint for secure analytical generation
  app.post('/api/analyze', async (req, res) => {
    try {
      const { query, mode = 'thinking' } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query is required and must be a string.' });
      }

      if (!process.env.GEMINI_API_KEY) {
        console.error('Missing GEMINI_API_KEY on the server environment.');
        return res.status(500).json({ error: 'Server key configuration error. Please register GEMINI_API_KEY in Settings > Secrets.' });
      }

      console.log(`Analyzing: "${query}" using mode: ${mode}`);

      let modelName = 'gemini-3.1-pro-preview';
      let config: any = {
        systemInstruction: `You are an elite, highly analytical intelligence system (ASET v1.2). Create an extremely in-depth, expansive, and professional-grade analysis report based on the user's request.
          
CRITICAL INSTRUCTIONS:
1. You MUST use factual, precise, and authentic data. You can handle ANY topic (Finance, Technology, Global Markets, Science, etc.).
2. Prioritize data from authoritative sources relevant to the query (e.g., SEC filings for finance, institutional research, top-tier news, scientific journals).
3. Strictly EXCLUDE rumors and unverified sources. DO NOT hallucinate facts or figures. Explicitly state "N/A" if data is unavailable.
4. Format the output as a highly structured, comprehensive Markdown report with professional terminology and analytical rigor. The report must be extremely detailed and go deeply into the specifics of the query.
5. Provide specific metrics or KPIs relevant to the topic. If financial, include KPIs like ROE, P/E ratio, Market Cap, YoY growth, and cash flow yield metrics.
6. Include relevant institutional analytical sections (e.g., "Macroeconomic Context", "Fundamental Drivers", "Key Catalysts", "Risk Factors" or equivalent for non-financial topics).
7. Maintain an objective, highly analytical, and institutional tone.
8. SPECIAL DIRECTIVE FOR STOCK & FINANCIAL IN-DEPTH ANALYSIS:
   - If the query is about analyzing a corporate stock, public company, or financial asset, you MUST evaluate it using global financial and accounting standards (IFRS & US GAAP).
   - Perform a FORENSIC accounting audit. Do not accept reported Net Income or Book Value at face value.
   - Direct aggressive focus to the CASH FLOW STATEMENT: operating cash flows, Capex, changes in working capital, free cash flow (FCF), and debt service coverage.
   - Analyze the Quality of Earnings by comparing Operating Cash Flow to Net Income over time. Identify any aggressive accruals, capitalizations, or misleading non-cash accounting adjustments in the Balance Sheet.
   - Create a dedicated section named "Forensic Cash Flow & Accruals Analysis" with a detailed reported metrics table containing REAL numbers (rather than simulated assumptions) from recent years.
9. You MUST output your response in two parts:
   First, the comprehensive Markdown report. 
   - If the user asks for a specific number of items, attempt to list ALL of them.
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
      };

      // Set up sequential attempt configurations to overcome quota or permission limits
      const attempts: { model: string; config: any; description: string }[] = [];

      if (mode === 'thinking') {
        // High quality deep reasoning sequence
        attempts.push({
          model: 'gemini-2.5-pro',
          config: {
            systemInstruction: config.systemInstruction,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.HIGH
            }
          },
          description: 'Gemini 2.5 Pro (Thinking)'
        });

        attempts.push({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: config.systemInstruction,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.HIGH
            }
          },
          description: 'Gemini 2.5 Flash (Thinking)'
        });

        attempts.push({
          model: 'gemini-3.1-pro-preview',
          config: {
            systemInstruction: config.systemInstruction,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.HIGH
            }
          },
          description: 'Gemini 3.1 Pro Preview (Thinking)'
        });

        attempts.push({
          model: 'gemini-1.5-pro',
          config: {
            systemInstruction: config.systemInstruction,
            maxOutputTokens: 8192
          },
          description: 'Gemini 1.5 Pro (Standard)'
        });

        attempts.push({
          model: 'gemini-1.5-flash',
          config: {
            systemInstruction: config.systemInstruction,
            maxOutputTokens: 8192
          },
          description: 'Gemini 1.5 Flash (Standard)'
        });
      } else {
        // Real-time market search grounding sequence
        attempts.push({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: config.systemInstruction,
            tools: [{ googleSearch: {} }],
            maxOutputTokens: 8192
          },
          description: 'Gemini 2.5 Flash with Search Grounding'
        });

        attempts.push({
          model: 'gemini-3.5-flash',
          config: {
            systemInstruction: config.systemInstruction,
            tools: [{ googleSearch: {} }],
            maxOutputTokens: 8192
          },
          description: 'Gemini 3.5 Flash with Search Grounding'
        });

        attempts.push({
          model: 'gemini-1.5-flash',
          config: {
            systemInstruction: config.systemInstruction,
            tools: [{ googleSearch: {} }],
            maxOutputTokens: 8192
          },
          description: 'Gemini 1.5 Flash with Search Grounding'
        });

        attempts.push({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: config.systemInstruction,
            maxOutputTokens: 8192
          },
          description: 'Gemini 2.5 Flash (Standard fallback)'
        });

        attempts.push({
          model: 'gemini-1.5-flash',
          config: {
            systemInstruction: config.systemInstruction,
            maxOutputTokens: 8192
          },
          description: 'Gemini 1.5 Flash (Standard fallback)'
        });
      }

      let lastError: any = null;
      let finalResponseText: string | undefined = undefined;
      let selectedModelName: string = '';

      for (const attempt of attempts) {
        try {
          console.log(`[ASET API] Attempting generation with client module: ${attempt.description}...`);
          const response = await ai.models.generateContent({
            model: attempt.model,
            contents: query,
            config: attempt.config
          });
          
          if (response && response.text) {
            finalResponseText = response.text;
            selectedModelName = attempt.description;
            console.log(`[ASET API] Success! Response fetched using ${attempt.description}`);
            break;
          }
        } catch (err: any) {
          console.warn(`[ASET API] Attempt failed with ${attempt.description}:`, err.message || err);
          lastError = err;
          // If the error states that API key is invalid/unauthorized (as opposed to quota), we might want to propagate it
          if (err.status === 'UNAUTHENTICATED' || (err.message && err.message.includes('API key not valid'))) {
            throw err;
          }
        }
      }

      if (!finalResponseText) {
        throw lastError || new Error('All high-power model generation fallback structures were exhausted.');
      }

      res.json({ text: finalResponseText, modelUsed: selectedModelName });
    } catch (error: any) {
      console.error('Error invoking Gemini model:', error);
      res.status(500).json({ error: error.message || 'Failed to complete analysis request.' });
    }
  });

  // Vite development or production assets serving
  if (process.env.NODE_ENV !== "production") {
    console.log('Mounting development Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Serving production static build contents...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ASET Server running on http://localhost:${PORT}`);
  });
}

startServer();
