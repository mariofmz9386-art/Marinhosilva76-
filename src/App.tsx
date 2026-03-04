/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Play, Loader2, Video, Sparkles, AlertCircle, CheckCircle2, Image as ImageIcon } from 'lucide-react';

// Types for Veo operations
interface VeoOperation {
  name: string;
  done: boolean;
  response?: {
    generatedVideos?: Array<{
      video: {
        uri: string;
      };
    }>;
  };
}

export default function App() {
  const [apiKeySelected, setApiKeySelected] = useState<boolean>(false);
  const [prompt, setPrompt] = useState('Cenário de festa com vários casais dançando, em destaque um casal para para um leve diálogo, estilo 3D, cinematográfico, iluminação de festa, alta qualidade');
  const [image, setImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    // @ts-ignore - window.aistudio is injected
    const hasKey = await window.aistudio.hasSelectedApiKey();
    setApiKeySelected(hasKey);
  };

  const handleOpenKeyDialog = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    setApiKeySelected(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateVideo = async () => {
    if (!apiKeySelected) return;
    
    setIsGenerating(true);
    setError(null);
    setVideoUrl(null);
    setStatus('Iniciando geração do vídeo...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const config: any = {
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '9:16'
        }
      };

      if (image) {
        const base64Data = image.split(',')[1];
        config.image = {
          imageBytes: base64Data,
          mimeType: 'image/png'
        };
      }

      let operation = await ai.models.generateVideos(config) as unknown as VeoOperation;

      while (!operation.done) {
        setStatus('A mágica está acontecendo... Isso pode levar alguns minutos.');
        await new Promise(resolve => setTimeout(resolve, 10000));
        // @ts-ignore
        operation = await ai.operations.getVideosOperation({ operation: operation.name }) as unknown as VeoOperation;
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        setStatus('Finalizando...');
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': process.env.GEMINI_API_KEY || '',
          },
        });
        const blob = await response.blob();
        setVideoUrl(URL.createObjectURL(blob));
        setStatus('');
      } else {
        throw new Error('Falha ao obter o link do vídeo.');
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        setApiKeySelected(false);
        setError("Sessão expirada ou chave inválida. Por favor, selecione a chave novamente.");
      } else {
        setError(err.message || 'Ocorreu um erro durante a geração.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (!apiKeySelected) {
    return (
      <div className="min-h-screen bg-[#0a0502] text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="atmosphere fixed inset-0 pointer-events-none opacity-50" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10 text-center max-w-md"
        >
          <div className="mb-8 flex justify-center">
            <div className="p-4 rounded-full bg-orange-500/10 border border-orange-500/20">
              <Video className="w-12 h-12 text-orange-500" />
            </div>
          </div>
          <h1 className="text-4xl font-light mb-4 tracking-tight">Veo Studio</h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Para começar a criar vídeos cinematográficos com IA, você precisa selecionar uma chave de API paga do Google Cloud.
          </p>
          <button
            onClick={handleOpenKeyDialog}
            className="w-full py-4 bg-orange-600 hover:bg-orange-500 transition-colors rounded-2xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20"
          >
            Selecionar Chave de API
          </button>
          <p className="mt-4 text-xs text-gray-500">
            Consulte a <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline">documentação de faturamento</a> para mais detalhes.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0502] text-white font-sans selection:bg-orange-500/30">
      <div className="atmosphere fixed inset-0 pointer-events-none opacity-40" />
      
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-12 items-start">
        {/* Left Column: Controls */}
        <section className="space-y-8">
          <header>
            <div className="flex items-center gap-2 text-orange-500 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Veo 3.1 Fast</span>
            </div>
            <h1 className="text-5xl font-light tracking-tighter mb-4">Crie sua Cena</h1>
            <p className="text-gray-400 text-sm leading-relaxed max-w-md">
              Transforme suas ideias em vídeos 3D imersivos. Use uma imagem de referência para guiar o estilo ou comece apenas com texto.
            </p>
          </header>

          <div className="space-y-6">
            {/* Prompt Input */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Descrição da Cena</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-orange-500/50 transition-colors resize-none placeholder:text-gray-600"
                placeholder="Descreva o que acontece na cena..."
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Imagem de Referência (Opcional)</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`group relative h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                  image ? 'border-orange-500/50 bg-orange-500/5' : 'border-white/10 hover:border-white/20 bg-white/5'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                
                {image ? (
                  <>
                    <img src={image} className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-40" alt="Preview" />
                    <div className="relative z-10 flex flex-col items-center">
                      <CheckCircle2 className="w-8 h-8 text-orange-500 mb-2" />
                      <span className="text-xs font-medium">Imagem selecionada</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 rounded-full bg-white/5 mb-3 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                    <span className="text-sm text-gray-400">Clique para carregar</span>
                    <span className="text-[10px] text-gray-600 mt-1">PNG, JPG até 5MB</span>
                  </>
                )}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={generateVideo}
              disabled={isGenerating || !prompt}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${
                isGenerating 
                  ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
                  : 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20 active:scale-[0.98]'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Gerando Vídeo...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  Gerar Vídeo 9:16
                </>
              )}
            </button>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-400 leading-relaxed">{error}</p>
              </motion.div>
            )}
          </div>
        </section>

        {/* Right Column: Preview */}
        <section className="sticky top-12">
          <div className="aspect-[9/16] w-full max-w-[340px] mx-auto bg-white/5 rounded-[32px] border border-white/10 overflow-hidden relative shadow-2xl">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                >
                  <div className="relative mb-6">
                    <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                    <Video className="absolute inset-0 m-auto w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Criando sua obra</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {status}
                  </p>
                </motion.div>
              ) : videoUrl ? (
                <motion.div 
                  key="video"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0"
                >
                  <video 
                    src={videoUrl} 
                    controls 
                    autoPlay 
                    loop 
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <Play className="w-6 h-6 text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-600">O vídeo gerado aparecerá aqui</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Decorative elements */}
          <div className="mt-8 flex justify-center gap-4">
            <div className="h-1 w-8 rounded-full bg-orange-500/20" />
            <div className="h-1 w-8 rounded-full bg-white/5" />
            <div className="h-1 w-8 rounded-full bg-white/5" />
          </div>
        </section>
      </main>

      <style>{`
        .atmosphere {
          background: 
            radial-gradient(circle at 50% 30%, #3a1510 0%, transparent 60%),
            radial-gradient(circle at 10% 80%, #ff4e00 0%, transparent 50%);
          filter: blur(80px);
        }
      `}</style>
    </div>
  );
}
