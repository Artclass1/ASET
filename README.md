# ASET - AI-Powered Financial Intelligence

![ASET Banner](https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=2070&auto=format&fit=crop)

ASET is an institutional-grade, AI-driven market analysis platform designed to democratize access to deep financial intelligence. By leveraging Google's Gemini 3.1 Pro and real-time Search Grounding, ASET synthesizes complex market data, 5-year financial overviews, and verified news into comprehensive, actionable reports in seconds.

## 🚀 Vision (For Investors)

The financial research industry is dominated by expensive, legacy terminals (e.g., Bloomberg, Refinitiv) that cost tens of thousands of dollars per seat annually. ASET disrupts this model by providing **instant, verifiable, and highly accurate financial analysis** at a fraction of the cost, powered by state-of-the-art LLMs with real-time web grounding.

**Why ASET?**
* **Speed to Insight:** Reduces hours of manual 10-K/10-Q reading and news scraping into a 10-second query.
* **Verifiable Truth:** Every data point is grounded in official, cited sources (SEC filings, official exchanges, top-tier financial media), eliminating AI hallucinations.
* **Exportable Intelligence:** Native, one-click PDF generation for seamless sharing with stakeholders and clients.
* **Minimalist UX:** Designed for focus. No cluttered dashboards—just pure signal.

## ✨ Features

* **Real-Time Market Data:** Powered by Gemini's Google Search tool to fetch the latest market caps, stock prices, and breaking news.
* **Deep Financial Overviews:** Automatically extracts 5-year net profit trends, debt-to-equity ratios, and fundamental metrics.
* **Source Verification:** Transparently lists all URLs and sources used to generate the report.
* **One-Click PDF Export:** Generates beautifully formatted, professional PDF reports instantly.
* **Institutional Dark Mode:** A sleek, distraction-free interface built with Tailwind CSS and Framer Motion.

## 🛠 Tech Stack

* **Frontend:** React 19, TypeScript, Vite
* **Styling:** Tailwind CSS v4, Framer Motion
* **AI Engine:** `@google/genai` (Gemini 3.1 Pro Preview)
* **Markdown & PDF:** `react-markdown`, `remark-gfm`, `react-to-pdf`

## 💻 Getting Started

### Prerequisites
* Node.js (v18 or higher)
* A Google Gemini API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/aset-intelligence.git
   cd aset-intelligence
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy the `.env.example` file to `.env` and add your Gemini API key.
   ```bash
   cp .env.example .env
   ```
   Open `.env` and set:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---
*ASET Intelligence © 2026. Built for the future of finance.*
