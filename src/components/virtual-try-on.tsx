"use client";
import { useState, useRef, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gem, Camera, Loader2, RefreshCw } from 'lucide-react';
import type { Product } from '@/lib/products';

interface VirtualTryOnProps { children: ReactNode; product: Product; }

export function VirtualTryOn({ children, product }: VirtualTryOnProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'capture' | 'loading' | 'result' | 'error'>('capture');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setStep('error');
      setErrorMessage('No se pudo acceder a la cámara. Verifique los permisos del navegador.');
    }
  };

  const stopCamera = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };

  const getJewelryType = () => {
    const cats = (product.categories || []).join(' ').toLowerCase();
    if (cats.includes('arete') || cats.includes('pendiente')) return 'earrings';
    if (cats.includes('anillo') || cats.includes('alianza')) return 'ring';
    return 'necklace';
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) { setStep('capture'); setResultImage(null); setErrorMessage(null); setTimeout(startCamera, 300); }
    else { stopCamera(); }
  };

  const captureAndSend = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0);
    const photoDataUri = canvas.toDataURL('image/jpeg', 0.85);
    stopCamera();
    setStep('loading');
    try {
      const res = await fetch('/api/virtual-tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoDataUri, jewelryType: getJewelryType(), jewelryStyle: product.name, productName: product.name, sessionId: `tryon_${Date.now()}` }),
      });
      const data = await res.json();
      if (data.success && data.generatedImageDataUri) { setResultImage(data.generatedImageDataUri); setStep('result'); }
      else { setErrorMessage(data.error || 'No se pudo generar la imagen.'); setStep('error'); }
    } catch { setErrorMessage('Error de conexión.'); setStep('error'); }
  };

  const retry = () => { setStep('capture'); setResultImage(null); setErrorMessage(null); setTimeout(startCamera, 300); };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px] bg-background border-primary/20">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-center flex items-center justify-center gap-2">
            <Gem className="h-5 w-5 text-primary" /> Prueba Virtual
          </DialogTitle>
        </DialogHeader>
        <canvas ref={canvasRef} className="hidden" />
        {step === 'capture' && (
          <div className="space-y-4">
            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg bg-black aspect-square object-cover" />
            <p className="text-xs text-muted-foreground text-center">Posicione su rostro o cuello en el centro.</p>
            <Button onClick={captureAndSend} className="w-full h-12 gap-2">
              <Camera className="h-4 w-4" /> Capturar y probar {product.name}
            </Button>
          </div>
        )}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground text-center">
              Generando imagen con IA...<br /><span className="text-xs opacity-60">Puede tardar hasta 30 segundos</span>
            </p>
          </div>
        )}
        {step === 'result' && resultImage && (
          <div className="space-y-4">
            <img src={resultImage} alt={`Prueba virtual: ${product.name}`} className="w-full rounded-lg" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={retry} className="flex-1 gap-2"><RefreshCw className="h-4 w-4" /> Otra foto</Button>
              <Button onClick={() => setOpen(false)} className="flex-1">Cerrar</Button>
            </div>
          </div>
        )}
        {step === 'error' && (
          <div className="space-y-4 text-center py-8">
            <p className="text-sm text-destructive">{errorMessage}</p>
            <Button onClick={retry} variant="outline" className="gap-2"><RefreshCw className="h-4 w-4" /> Intentar de nuevo</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
