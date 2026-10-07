import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Initialize GoogleGenAI server-side with User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const VALID_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-pro-preview',
];

const DEFAULT_SYSTEM_INSTRUCTION = `You are the elite AI Digital Growth Advisor for Hina Soomro — a versatile Web Developer and UI/UX Designer with a Computer Science degree who specializes in building high-converting websites across WordPress, Webflow, Shopify, and Framer.

Core Directives & Boundaries:
- Tone: Professional, articulate, strategic, insightful, executive-level tone. No AI clichés, exaggerations, or generic filler.
- DO NOT invent, fabricate, or hallucinate any clients, certifications, employment dates, statistics, or qualifications.
- Hina's professional skills and services are STRICTLY limited to the following 9 areas:
  1. WordPress Website Development: Custom themes, ACF architecture, corporate hubs, and high-performance setups.
  2. Framer Website Development: Interactive landing pages, fluid typography, and micro-interactions.
  3. Webflow Website Development: Clean semantic builds, Client-First design systems, and CMS governance.
  4. Shopify Website Development: High-ticket e-commerce storefronts, custom Liquid, and checkout optimization.
  5. Search Engine Optimization (SEO): Technical SEO, semantic schema markup, and organic search hierarchy.
  6. Website Optimization & Speed: Sub-second Core Web Vitals, asset compression, and clean performance audits.
  7. High-Converting Web Design: Strategic UI/UX wireframes, Figma design systems, and conversion psychology.
  8. Personal Branding & LinkedIn Optimization: Strategic executive positioning, authority copy, and inbound client attraction.
  9. ATS-Friendly CV / Resume Optimization: Algorithmic formatting and keyword alignment for executive placement.

- STRICT NEGATIVE DIRECTIVE: NEVER claim, infer, or mention n8n, AI automation, automation engineering, or agentic AI workflows. Hina did NOT provide these as her skills.

- Exactly 13 Verified Real Projects you may reference:
  - WordPress: Duchess Enterprise (https://duchess-enterprise.com/), Edsan Marketing (https://edsanmarketing.com/), Harris Homes Realtor (https://harrishomesrealtor.com/)
  - Framer: Ldot (https://ldot.uk/), Six Plus One (https://www.sixplusone.com/), Yours SG Training (https://www.yourssg.com/training)
  - Shopify: Nutra Health Products (https://www.nutrahealthproducts.com/), Karaat Jewelry (https://www.karaatjewelry.com/), Vrai (https://vrai.com/), Jeulia (https://www.jeulia.com/)
  - Webflow: Dunk Agency (https://dunk.agency/), Hyperflow (https://www.hyperflow.co/), Gitwit (https://gitwit.com/)

- Contact Information:
  - Email: hina.soomro202@gmail.com
  - LinkedIn: https://www.linkedin.com/in/hina-soomro/
  - Portfolio Contact Form: Available on the website under the 'Contact' section.
- Encourage prospective clients to discuss their project requirements directly with Hina via email or the website contact section.`;

function generateIntelligentFallback(lastMessage: string): string {
  const query = (lastMessage || '').toLowerCase();

  if (query.includes('project') || query.includes('work') || query.includes('portfolio') || query.includes('case study') || query.includes('client')) {
    return `Hina's portfolio features 13 verified, commercial deployments across four primary platforms:\n\n• **Shopify**: Karaat Jewelry (karaatjewelry.com), Vrai (vrai.com), Nutra Health Products (nutrahealthproducts.com), and Jeulia (jeulia.com).\n• **Webflow**: Dunk Agency (dunk.agency), Hyperflow (hyperflow.co), and Gitwit (gitwit.com).\n• **WordPress**: Duchess Enterprise (duchess-enterprise.com), Edsan Marketing (edsanmarketing.com), and Harris Homes Realtor (harrishomesrealtor.com).\n• **Framer**: Ldot (ldot.uk), Six Plus One (sixplusone.com), and Yours SG Training (yourssg.com/training).\n\nEach build is engineered with bespoke architecture, sub-second Core Web Vitals, and conversion-focused user pathways. Would you like to review specific details for any of these builds?`;
  }

  if (query.includes('wordpress') || query.includes('webflow') || query.includes('shopify') || query.includes('framer') || query.includes('service') || query.includes('skill')) {
    return `Hina provides comprehensive, end-to-end web engineering and strategic digital services, specifically:\n\n1. **WordPress Website Development**: Custom ACF architecture and headless setups without plugin bloat.\n2. **Framer Website Development**: Interactive, kinetic showcases with fluid micro-interactions.\n3. **Webflow Website Development**: Semantic, Client-First CMS platforms for scaling brands.\n4. **Shopify Website Development**: Bespoke Liquid architecture and high-AOV checkout optimization.\n5. **SEO & Technical Schema**: Organic hierarchy and search visibility.\n6. **Website Optimization**: Sub-second TTFB and 95+ PageSpeed scores.\n7. **High-Converting Web Design**: Figma wireframes and conversion psychology.\n8. **Personal Branding / LinkedIn**: Executive authority positioning.\n9. **ATS-Friendly CV Optimization**: Algorithmic parsing and keyword targeting.`;
  }

  if (query.includes('contact') || query.includes('hire') || query.includes('email') || query.includes('reach') || query.includes('talk')) {
    return `You can connect directly with Hina through the following verified channels:\n\n• **Email**: [hina.soomro202@gmail.com](mailto:hina.soomro202@gmail.com)\n• **LinkedIn**: [linkedin.com/in/hina-soomro](https://www.linkedin.com/in/hina-soomro/)\n• **Advisory Brief**: Submit your goals and investment tier via the Contact section on this page.\n\nHina reviews project briefs within 24 business hours.`;
  }

  return `Welcome to Hina Soomro's executive advisory portal. Hina is a versatile Web Developer and UI/UX Designer with a Computer Science degree who specializes in high-converting web engineering across WordPress, Webflow, Shopify, and Framer.\n\nFeel free to ask about her 13 verified client projects, technical services, Core Web Vitals optimization, or reach out directly at **hina.soomro202@gmail.com**.`;
}

// Multi-turn Gemini Chat API route
app.post('/api/chat', async (req, res) => {
  const { messages, model = 'gemini-3.8-flash', customInstruction } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required.' });
  }

  const lastUserMsg = messages[messages.length - 1]?.content || messages[messages.length - 1]?.text || '';
  const selectedModel = VALID_MODELS.includes(model) ? model : 'gemini-3.8-flash';
  const systemInstruction = customInstruction || DEFAULT_SYSTEM_INSTRUCTION;

  if (!process.env.GEMINI_API_KEY) {
    const fallbackReply = generateIntelligentFallback(lastUserMsg);
    return res.json({ reply: fallbackReply, model: 'fallback' });
  }

  try {
    // Map conversation history to Gemini contents structure
    const contents = messages.map((msg: { role: string; content?: string; text?: string }) => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content || msg.text || '' }],
    }));

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || generateIntelligentFallback(lastUserMsg);
    return res.json({ reply, model: selectedModel });
  } catch (error: any) {
    console.warn('Gemini API call failed, deploying resilient fallback:', error?.message || error);
    const fallbackReply = generateIntelligentFallback(lastUserMsg);
    return res.json({ reply: fallbackReply, model: 'fallback' });
  }
});

// Setup Vite middlewares in dev or serve dist in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        if (vite && vite.ssrFixStacktrace) {
          vite.ssrFixStacktrace(e);
        }
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
