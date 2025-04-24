'use client';

import { useEffect, useRef } from 'react';

interface AnalyticsChartProps {
  className?: string;
}

export default function AnalyticsChart({ className = '' }: AnalyticsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    // Mock data points
    const data = [15, 25, 40, 30, 50, 60, 45, 55, 65, 70, 80, 75];
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Set chart dimensions
    const chartWidth = rect.width - 40;
    const chartHeight = rect.height - 60;
    const barWidth = chartWidth / data.length * 0.6;
    const barSpacing = chartWidth / data.length * 0.4;
    const maxValue = Math.max(...data);
    
    // Draw chart
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Draw bars
    for (let i = 0; i < data.length; i++) {
      const x = 20 + i * (barWidth + barSpacing);
      const barHeight = (data[i] / maxValue) * chartHeight;
      const y = rect.height - 40 - barHeight;
      
      // Create gradient
      const gradient = ctx.createLinearGradient(0, y, 0, rect.height - 40);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
      ctx.fill();
      
      // Draw labels
      ctx.fillStyle = '#71717a';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + barWidth / 2, rect.height - 20);
    }
    
    // Draw horizontal grid lines
    ctx.strokeStyle = '#27272a';
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const y = rect.height - 40 - (i / 4) * chartHeight;
      ctx.moveTo(20, y);
      ctx.lineTo(rect.width - 20, y);
    }
    ctx.stroke();
  }, []);
  
  return (
    <div className={`${className} bg-gray-900 p-8 rounded-xl shadow-xl border border-gray-800`}>
      <div className="mb-8 grid grid-cols-3 gap-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-white">5.2K</div>
          <div className="text-sm text-gray-400">Total Clicks</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-white">256</div>
          <div className="text-sm text-gray-400">Links</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-white">18.5%</div>
          <div className="text-sm text-gray-400">CTR</div>
        </div>
      </div>
      
      <div className="h-64 w-full rounded-lg">
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
    </div>
  );
} 