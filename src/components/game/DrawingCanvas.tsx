'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from "@/components/ui/slider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Eraser, Palette, Minus, Plus, Trash2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawingCanvasProps {
  width: number;
  height: number;
  onDrawEnd: (dataUrl: string) => void;
  initialDataUrl?: string;
  isDrawingEnabled: boolean;
  className?: string;
}

const PREDEFINED_COLORS = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FFA500', '#800080', '#A52A2A', '#FFFFFF', '#808080'
];

export function DrawingCanvas({ width, height, onDrawEnd, initialDataUrl, isDrawingEnabled, className }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const getContext = useCallback(() => canvasRef.current?.getContext('2d'), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = getContext();
    if (!ctx) return;

    // Set canvas background to white
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    if (initialDataUrl && initialDataUrl !== 'data:,') {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, width, height); // Clear before drawing initial image
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = initialDataUrl;
    }
  }, [width, height, initialDataUrl, getContext]);

  const getMousePosition = (event: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in event) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    return {
      x: (clientX - rect.left) * (width / rect.width),
      y: (clientY - rect.top) * (height / rect.height),
    };
  };
  
  const startDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingEnabled) return;
    const pos = getMousePosition(event);
    setIsDrawing(true);
    lastPosRef.current = pos;
    // Draw a dot for single clicks
    const ctx = getContext();
    if (ctx) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = isEraser ? '#FFFFFF' : color;
        ctx.fill();
    }

  }, [isDrawingEnabled, getContext, brushSize, isEraser, color]);

  const draw = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawingEnabled || !lastPosRef.current) return;
    const ctx = getContext();
    if (!ctx) return;

    const currentPos = getMousePosition(event);
    
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.strokeStyle = isEraser ? '#FFFFFF' : color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    lastPosRef.current = currentPos;
  }, [isDrawing, isDrawingEnabled, getContext, color, brushSize, isEraser]);

  const endDrawing = useCallback(() => {
    if (!isDrawingEnabled) return;
    setIsDrawing(false);
    lastPosRef.current = null;
    if (canvasRef.current) {
      onDrawEnd(canvasRef.current.toDataURL('image/png'));
    }
  }, [isDrawingEnabled, onDrawEnd]);

  const clearCanvas = () => {
    const ctx = getContext();
    if (ctx) {
      ctx.fillStyle = '#FFFFFF'; // Ensure background is white
      ctx.fillRect(0, 0, width, height);
      if (isDrawingEnabled) { // Only call onDrawEnd if drawing is enabled (i.e., it's the active player)
         onDrawEnd(canvasRef.current!.toDataURL('image/png'));
      }
    }
  };

  const toggleEraser = () => setIsEraser(!isEraser);

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing} // Stop drawing if mouse leaves canvas
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
        className={cn(
          "border border-input rounded-md shadow-inner bg-white",
          !isDrawingEnabled && "cursor-not-allowed opacity-70"
        )}
        style={{ touchAction: 'none' }} // prevent page scroll on touch
      />
      {isDrawingEnabled && (
        <div className="flex flex-wrap justify-center items-center gap-2 p-2 bg-card rounded-md shadow-sm border">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" title="Color Picker">
                <Palette style={{ color }} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-4 gap-1">
                {PREDEFINED_COLORS.map((c) => (
                  <Button
                    key={c}
                    variant="outline"
                    size="icon"
                    style={{ backgroundColor: c }}
                    className="w-8 h-8 rounded-full border-2"
                    onClick={() => { setColor(c); setIsEraser(false); }}
                    aria-label={`Select color ${c}`}
                  />
                ))}
                <input
                    type="color"
                    value={color}
                    onChange={(e) => { setColor(e.target.value); setIsEraser(false); }}
                    className="w-8 h-8 rounded-full border-2 p-0 cursor-pointer appearance-none"
                    aria-label="Custom color picker"
                />
              </div>
            </PopoverContent>
          </Popover>
          
          <div className="flex items-center space-x-1">
            <Button variant="outline" size="icon" onClick={() => setBrushSize(Math.max(1, brushSize - 1))} title="Decrease Brush Size">
              <Minus className="w-4 h-4" />
            </Button>
            <Slider
                defaultValue={[brushSize]}
                value={[brushSize]}
                max={50}
                min={1}
                step={1}
                onValueChange={(value) => setBrushSize(value[0])}
                className="w-24"
                aria-label="Brush size"
            />
            <Button variant="outline" size="icon" onClick={() => setBrushSize(Math.min(50, brushSize + 1))} title="Increase Brush Size">
              <Plus className="w-4 h-4" />
            </Button>
            <span className="text-sm w-6 text-center">{brushSize}</span>
          </div>

          <Button variant={isEraser ? "secondary" : "outline"} size="icon" onClick={toggleEraser} title={isEraser ? "Switch to Pen" : "Switch to Eraser"}>
            <Eraser />
          </Button>
          <Button variant="destructive" size="icon" onClick={clearCanvas} title="Clear Canvas">
            <Trash2 />
          </Button>
        </div>
      )}
    </div>
  );
}
