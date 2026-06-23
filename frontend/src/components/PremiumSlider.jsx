import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useSpring, animate } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const MIN = 5;
const MAX = 60;
const STEP = 5;
const TRACK_WIDTH = 160;

export default function PremiumSlider({ value, onChange, isProcessing }) {
  const containerRef = useRef(null);
  
  const x = useMotionValue(0);
  
  useEffect(() => {
    const initialX = ((value - MIN) / (MAX - MIN)) * TRACK_WIDTH;
    x.set(initialX);
  }, [value, x]);

  const rawValue = useTransform(x, [0, TRACK_WIDTH], [MIN, MAX]);
  
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    const unsubscribe = rawValue.on("change", (v) => {
      setDisplayValue(Math.round(v));
    });
    return () => unsubscribe();
  }, [rawValue]);

  const trackWidth = useSpring(x, { stiffness: 400, damping: 40 });

  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = () => {
    setIsDragging(false);
    
    const currentRaw = rawValue.get();
    const snappedValue = Math.round(currentRaw / STEP) * STEP;
    const finalValue = Math.max(MIN, Math.min(MAX, snappedValue));
    
    const snappedX = ((finalValue - MIN) / (MAX - MIN)) * TRACK_WIDTH;
    
    animate(x, snappedX, {
      type: "spring",
      stiffness: 400,
      damping: 30,
      onComplete: () => {
        if (finalValue !== value) {
          onChange(finalValue);
        }
      }
    });
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        borderRadius: '99px',
        padding: '4px 16px',
        color: '#334155',
        fontSize: '13px',
        fontWeight: 600,
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        minWidth: '80px',
        transition: 'all 0.2s ease',
        ...(isDragging ? { 
          background: 'rgba(255,255,255,0.95)', 
          color: '#6d28d9', 
          boxShadow: '0 4px 12px rgba(109, 40, 217, 0.15)',
          transform: 'scale(1.05)'
        } : {})
      }}>
        {isProcessing ? (
          <Loader2 size={14} className="lucide-spin" style={{ marginRight: '6px' }} />
        ) : null}
        [ {displayValue} min ]
      </div>

      <div 
        ref={containerRef}
        style={{
          position: 'relative',
          width: TRACK_WIDTH,
          height: '6px',
          background: 'rgba(0, 0, 0, 0.08)',
          borderRadius: '99px',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <motion.div
          style={{
            position: 'absolute',
            left: 0,
            height: '100%',
            borderRadius: '99px',
            background: 'linear-gradient(90deg, #c4b5fd, #8b5cf6)',
            width: trackWidth,
          }}
        />

        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: TRACK_WIDTH }}
          dragElastic={0.05}
          dragMomentum={false}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          style={{
            position: 'absolute',
            x,
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
            cursor: 'grab',
            originX: 0.5,
            originY: 0.5,
            marginLeft: '-10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}
          whileHover={{ scale: 1.15, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
          whileDrag={{ scale: 1.3, cursor: 'grabbing', boxShadow: '0 8px 20px rgba(139, 92, 246, 0.3)' }}
        >
           <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.4)' }} />
        </motion.div>
      </div>
    </div>
  );
}
