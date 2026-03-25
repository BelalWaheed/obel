import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Zap, Sparkles, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useState, useEffect } from 'react';

export function InstallBanner() {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Delay showing the banner slightly for better UX
    if (isInstallable && !isInstalled && !dismissed) {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, dismissed]);

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-100"
        >
          <div className="bg-card/90 backdrop-blur-3xl border border-primary/30 rounded-3xl p-5 shadow-2xl shadow-primary/20 relative overflow-hidden group">
            {/* Ambient Background Glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors duration-500" />
            
            <button 
              onClick={() => { setShowBanner(false); setDismissed(true); }}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/5 text-muted-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0 shadow-inner">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 pr-6">
                <h3 className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
                  Install Obel Focus
                  <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                </h3>
                <p className="text-xs font-semibold text-muted-foreground mt-1 leading-relaxed">
                  Experience OBEL as a native app for maximum focus.
                </p>
                
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-foreground/70 uppercase tracking-widest">
                    <WifiOff className="w-3 h-3 text-primary/70" />
                    Offline Access
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-foreground/70 uppercase tracking-widest">
                    <Zap className="w-3 h-3 text-primary/70" />
                    Faster Startup
                  </div>
                </div>

                <Button 
                  onClick={install}
                  className="w-full mt-4 h-10 rounded-xl font-black text-xs uppercase tracking-widest gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Install Now
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
