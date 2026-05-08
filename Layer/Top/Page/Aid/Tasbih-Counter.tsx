import React, { useState, useRef } from 'react';
import { Layout } from "@/Top/Component/Layout/Index";
import { Container } from "@/Top/Component/UI/Container";
import { Button } from "@/Top/Component/UI/Button";
import { RotateCcw, Fingerprint, Edit2, Check, Repeat } from "lucide-react";

const HoldTasbihPage = () => {
  const [count, setCount] = useState<number>(0);
  const [target, setTarget] = useState<number>(33);
  const [loops, setLoops] = useState<number>(0);
  const [isEditingTarget, setIsEditingTarget] = useState<boolean>(false);
  const [tempTarget, setTempTarget] = useState<string>("33");
  
  const [progress, setProgress] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false); 
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const HOLD_DURATION = 1000; 
  const INTERVAL_STEP = 10;

  const handleSuccess = () => {
    setCount((prevCount) => {
      const nextCount = prevCount + 1;
      if (nextCount > target) {
        setLoops((l) => l + 1);
        return 1; 
      }
      return nextCount === 0 ? 1 : nextCount;
    });
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsLocked(true); 
  };

  const startHolding = (e: React.MouseEvent | React.TouchEvent) => {
    if (isLocked || timerRef.current || isEditingTarget) return;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (100 / (HOLD_DURATION / INTERVAL_STEP));
        if (next >= 100) {
          handleSuccess();
          return 100; 
        }
        return next;
      });
    }, INTERVAL_STEP);
  };

  const stopHolding = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(0);
    setIsLocked(false);
  };

  const saveTarget = () => {
    const val = parseInt(tempTarget);
    if (!isNaN(val) && val > 0) {
      setTarget(val);
      setIsEditingTarget(false);
    }
  };

  const resetCounter = () => {
    if (window.confirm("Reset all progress and loops?")) {
      setCount(0);
      setLoops(0);
      setProgress(0);
      setIsLocked(false);
    }
  };

  const isValidTarget = parseInt(tempTarget) > 0;

  return (
    <Layout>
      <div className="container max-w-md mx-auto p-0 sm:py-12 sm:px-4 select-none">
        <Container className="flex flex-col items-center min-h-[550px] !p-0 sm:!p-8">
          
          {/* Top Navigation Row */}
          <div className="grid grid-cols-3 w-full items-center mb-12 px-4 sm:px-0 pt-4 sm:pt-0">
            <div className="flex justify-start">
              <Container className="!w-auto !px-3 !py-1 flex items-center gap-2">
                <Repeat size={14} className="text-current" />
                <span className="text-sm font-bold tabular-nums text-current">{loops}</span>
              </Container>
            </div>

            <div className="flex justify-center">
              <Container className="!w-auto !px-3 !py-1 flex items-center justify-center whitespace-nowrap">
                <span className="text-[10px] uppercase tracking-widest font-bold text-current">
                  Hold Fingerprint
                </span>
              </Container>
            </div>

            <div className="flex justify-end gap-2">
              {isEditingTarget ? (
                <Button 
                  onClick={saveTarget}
                  disabled={!isValidTarget}
                  size="icon"
                  className={!isValidTarget ? 'opacity-20' : ''}
                >
                  <Check size={18} strokeWidth={3} className="text-current" />
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    setTempTarget(target.toString());
                    setIsEditingTarget(true);
                  }}
                  size="icon"
                >
                  <Edit2 size={18} className="text-current" />
                </Button>
              )}

              <Button onClick={resetCounter} variant="secondary" size="icon">
                <RotateCcw className="h-4 w-4 text-current" />
              </Button>
            </div>
          </div>

          {/* Center Display Area - Dynamic Width Centering */}
          <div className="text-center w-full flex flex-col items-center justify-center flex-grow px-4">
            <div className="flex items-center justify-center text-7xl font-bold tracking-tighter tabular-nums text-black dark:text-white">
              <span>{count}</span>
              <span className="text-muted/20 mx-4">/</span>
              
              {isEditingTarget ? (
                <input 
                  type="text" 
                  value={tempTarget}
                  // Restricted to max 3 digits
                  onChange={(e) => setTempTarget(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  // Dynamic width based on character count (ch)
                  style={{ width: `${Math.max(tempTarget.length, 1)}ch` }}
                  className="bg-transparent outline-none text-7xl font-bold text-black dark:text-white transition-all"
                  autoFocus
                />
              ) : (
                <span>{target}</span>
              )}
            </div>
          </div>

          {/* Interaction Area */}
          <div className="relative mt-8 mb-16">
            <div 
              className={`relative cursor-pointer select-none touch-none transition-transform duration-200 
                ${progress > 0 ? 'scale-95' : 'scale-100'}
              `}
              onContextMenu={(e) => e.preventDefault()}
              onMouseDown={startHolding}
              onMouseUp={stopHolding}
              onMouseLeave={stopHolding}
              onTouchStart={startHolding}
              onTouchEnd={stopHolding}
            >
              <div style={{ color: 'rgb(128, 128, 128)' }} className={progress >= 100 ? 'opacity-0' : 'opacity-100'}>
                <Fingerprint size={160} />
              </div>

              <div 
                className="absolute inset-0 text-black dark:text-white overflow-hidden"
                style={{ 
                  clipPath: `inset(${100 - progress}% 0 0 0)`,
                  transition: progress === 0 ? 'none' : 'clip-path 10ms linear'
                }}
              >
                <Fingerprint size={160} />
              </div>
            </div>

            <svg className="absolute -inset-8 w-[224px] h-[224px] -rotate-90 pointer-events-none">
              <circle
                cx="112"
                cy="112"
                r="104"
                stroke="currentColor"
                strokeWidth="2"
                fill="transparent"
                className={`${progress > 0 ? 'text-muted/10' : 'text-transparent'}`}
              />
              <circle
                cx="112"
                cy="112"
                r="104"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={653}
                strokeDashoffset={progress === 0 ? 653 : 653 - (653 * progress) / 100}
                className="text-black dark:text-white"
                strokeLinecap="round"
                style={{ transition: progress === 0 ? 'none' : 'stroke-dashoffset 10ms linear' }}
              />
            </svg>
          </div>
        </Container>
      </div>
    </Layout>
  );
};

export default HoldTasbihPage;