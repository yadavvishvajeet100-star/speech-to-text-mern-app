import { useEffect, useRef } from 'react';

interface Props {
  isActive: boolean;
  audioLevel?: number;
  color?: string;
  barCount?: number;
}

export default function WaveformVisualizer({
  isActive,
  audioLevel = 0,
  color = '#818cf8',
  barCount = 40,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const barsRef = useRef<number[]>(Array(barCount).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const bars = barsRef.current;

      // Update bar heights based on audio level
      for (let i = 0; i < barCount; i++) {
        if (isActive) {
          const noise = Math.random() * audioLevel * 80;
          const wave = Math.sin(Date.now() / 200 + i * 0.5) * audioLevel * 20;
          bars[i] = Math.max(4, Math.min(H * 0.85, noise + wave + 4));
        } else {
          bars[i] = bars[i] * 0.85 + 4 * 0.15;
        }
      }

      const barWidth = W / barCount - 2;

      bars.forEach((height, i) => {
        const x = i * (barWidth + 2);
        const y = (H - height) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + height);
        gradient.addColorStop(0, color + 'aa');
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, color + 'aa');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, barWidth / 2);
        ctx.fill();
      });

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isActive, audioLevel, color, barCount]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={80}
      className="w-full h-20"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
