import { useState } from 'react';
import { useUiStore } from '@/store/uiStore';
import { usePdfStore } from '@/store/pdfStore';
import { useDetectionStore } from '@/store/detectionStore';
import { detectQuestions } from '@/lib/detection/questionDetector';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Sparkles, AlertCircle, Loader2 } from 'lucide-react';

export function DetectionPanel() {
  const isOpen = useUiStore((s) => s.modalOpen === 'auto-detect');
  const closeModal = useUiStore((s) => s.closeModal);
  const pdfFile = usePdfStore((s) => s.pdfFile);
  const totalPages = usePdfStore((s) => s.totalPages);
  const addToast = useUiStore((s) => s.addToast);
  const setMode = useUiStore((s) => s.setMode);
  const setDetectionMode = useUiStore((s) => s.setDetectionMode);

  // Detection store state
  const {
    isDetecting,
    detectionProgress,
    detectionError,
    startDetection,
    setProgress,
    setDetectedQuestions,
    setError,
    setUsedOcr,
    finishDetection,
  } = useDetectionStore();

  const [paddingPercentage, setPaddingPercentage] = useState(1.5); // Default 1.5%

  const handleStart = async () => {
    if (!pdfFile || totalPages === 0) return;
    
    startDetection();

    try {
      const result = await detectQuestions(totalPages, {
        padding: paddingPercentage / 100,
        onProgress: (progress) => {
          setProgress(progress);
        },
      });

      setDetectedQuestions(result.questions);
      setUsedOcr(result.usedOcr);
      
      const count = result.questions.length;
      addToast(`Found ${count} questions across ${totalPages} pages`, 'success');

      // Smart Dots mode: keep detection mode set to 'dots' and activate auto-detect interaction mode
      setDetectionMode('dots');
      setMode('auto-detect');
      closeModal();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred during detection');
      addToast('Question detection failed', 'error');
    } finally {
      finishDetection();
    }
  };

  return (
    <Modal open={isOpen} onClose={closeModal} title="Auto Detect Questions (Beta)" maxWidth="max-w-lg">
      <div className="p-6 space-y-6">
        {/* Intro */}
        <div className="flex gap-4 p-4 rounded-xl bg-brand-500/10 border border-brand-500/20">
          <Sparkles className="w-6 h-6 text-brand-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-brand-300 flex items-center gap-1.5">
              Smart Crop Assist
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-brand-500 text-white leading-none">
                Beta
              </span>
            </h4>
            <p className="text-xs text-surface-300 leading-relaxed">
              Detect questions automatically using layout structure analysis. Pulse markers will be shown at question positions. Click markers to select, adjust crop sizes, and save.
            </p>
          </div>
        </div>

        {!isDetecting ? (
          <>
            {/* Bounding Box Padding Option */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  Margin Padding
                </label>
                <span className="text-xs font-mono text-brand-400 font-bold">
                  {paddingPercentage.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.5"
                value={paddingPercentage}
                onChange={(e) => setPaddingPercentage(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-surface-700 accent-brand-500"
              />
              <p className="text-[10px] text-surface-400">
                Adjust padding to prevent cutting off text, symbols, or images.
              </p>
            </div>

            {/* Error display */}
            {detectionError && (
              <div className="flex gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-400 leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{detectionError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button onClick={closeModal} variant="ghost">
                Cancel
              </Button>
              <Button onClick={handleStart} variant="primary">
                Run Auto Detect
              </Button>
            </div>
          </>
        ) : (
          /* Processing status layout */
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
              <Sparkles className="w-5 h-5 text-brand-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>

            <div className="space-y-2 text-center w-full max-w-sm">
              <h5 className="text-sm font-semibold text-surface-100">
                Running Question Detection
              </h5>
              <p className="text-xs text-surface-400 font-medium">
                {detectionProgress.phase}
              </p>
              
              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-surface-800 overflow-hidden mt-4">
                <div
                  className="h-full bg-brand-500 transition-all duration-300"
                  style={{
                    width: `${(detectionProgress.current / (detectionProgress.total || 1)) * 100}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-surface-500 font-mono mt-1">
                Page {detectionProgress.current} of {detectionProgress.total}
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
