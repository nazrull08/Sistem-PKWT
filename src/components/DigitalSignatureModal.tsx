import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, Check, Sparkles, Upload, Pen, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DigitalSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  title: string;
  signeeName: string;
  signeeRole: 'employee' | 'director';
}

export const DigitalSignatureModal: React.FC<DigitalSignatureModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  signeeName,
  signeeRole
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#0B2545'); // Deep formal navy blue ink
  const [strokeWidth, setStrokeWidth] = useState(2.5);
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedName, setTypedName] = useState(signeeName);
  const [selectedFont, setSelectedFont] = useState('font-serif italic');

  useEffect(() => {
    if (isOpen) {
      setHasDrawn(false);
      setTypedName(signeeName);
      setTimeout(initCanvas, 50);
    }
  }, [isOpen, signeeName]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = strokeWidth;

    // Clear
    ctx.clearRect(0, 0, rect.width, rect.height);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = penColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        
        // draw scaled image
        const hRatio = rect.width / img.width;
        const vRatio = rect.height / img.height;
        const ratio = Math.min(hRatio, vRatio, 1);
        const centerShiftX = (rect.width - img.width * ratio) / 2;
        const centerShiftY = (rect.height - img.height * ratio) / 2;

        ctx.drawImage(img, 0, 0, img.width, img.height,
          centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);
        setHasDrawn(true);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSignature = () => {
    if (activeTab === 'draw' || activeTab === 'upload') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
      onSave(dataUrl);
      onClose();
    } else {
      // Generate stylized text signature to canvas
      const canvas = document.createElement('canvas');
      canvas.width = 450;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'italic 38px "Brush Script MT", "Caveat", "Segoe Script", cursive';
        ctx.fillStyle = penColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName, canvas.width / 2, canvas.height / 2 - 10);

        // Add subtle flourish underline
        ctx.beginPath();
        ctx.moveTo(80, canvas.height / 2 + 25);
        ctx.bezierCurveTo(180, canvas.height / 2 + 35, 270, canvas.height / 2 + 15, 370, canvas.height / 2 + 25);
        ctx.strokeStyle = penColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        const dataUrl = canvas.toDataURL('image/png');
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
        onSave(dataUrl);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl ${signeeRole === 'director' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">{title}</h3>
              <p className="text-xs text-gray-500">
                Nama: <span className="font-semibold text-gray-800">{signeeName}</span> ({signeeRole === 'director' ? 'Direktur / Pihak Pertama' : 'Karyawan / Pihak Kedua'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-gray-100 text-xs font-semibold px-5 pt-3 space-x-4">
          <button
            onClick={() => setActiveTab('draw')}
            className={`pb-2.5 flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'draw'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <Pen className="w-3.5 h-3.5" />
            <span>Gores Tanda Tangan</span>
          </button>

          <button
            onClick={() => setActiveTab('type')}
            className={`pb-2.5 flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'type'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tanda Tangan Kaligrafi</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah Gambar / Scan</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 space-y-4">
          {activeTab === 'draw' && (
            <div>
              {/* Tool controls */}
              <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                <div className="flex items-center space-x-2">
                  <span>Warna Tinta:</span>
                  <button
                    onClick={() => setPenColor('#0B2545')}
                    className={`w-5 h-5 rounded-full bg-[#0B2545] border-2 ${penColor === '#0B2545' ? 'border-blue-500 scale-110' : 'border-transparent'}`}
                    title="Navy Blue Ink"
                  />
                  <button
                    onClick={() => setPenColor('#111827')}
                    className={`w-5 h-5 rounded-full bg-[#111827] border-2 ${penColor === '#111827' ? 'border-blue-500 scale-110' : 'border-transparent'}`}
                    title="Hitam Pekat"
                  />
                  <button
                    onClick={() => setPenColor('#1E40AF')}
                    className={`w-5 h-5 rounded-full bg-[#1E40AF] border-2 ${penColor === '#1E40AF' ? 'border-blue-500 scale-110' : 'border-transparent'}`}
                    title="Biru Formal"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <span>Tebal:</span>
                  <input
                    type="range"
                    min="1.5"
                    max="4.5"
                    step="0.5"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(parseFloat(e.target.value))}
                    className="w-16 h-1 bg-gray-200 rounded-lg cursor-pointer"
                  />
                  <button
                    onClick={clearCanvas}
                    className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium ml-2 px-2 py-1 rounded hover:bg-rose-50"
                  >
                    <RotateCcw className="w-3 h-3" /> Bersihkan
                  </button>
                </div>
              </div>

              {/* Drawing Canvas */}
              <div className="relative border-2 border-dashed border-gray-300 rounded-xl bg-slate-50/50 overflow-hidden cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-44 touch-none"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-gray-400 text-xs">
                    <Pen className="w-6 h-6 mb-1 text-gray-300" />
                    <span>Goreskan tanda tangan Anda di sini menggunakan mouse atau stylus / layar sentuh</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'type' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nama yang Tercantum di Tanda Tangan:
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Live Preview */}
              <div className="border border-gray-200 rounded-xl p-6 bg-slate-50/50 flex flex-col items-center justify-center min-h-[140px]">
                <p className="text-3xl font-serif italic text-blue-950 tracking-wider">
                  {typedName || 'Nama Anda'}
                </p>
                <div className="w-48 h-0.5 bg-blue-900/60 mt-2 rounded-full" />
                <span className="text-[10px] text-gray-400 mt-2">Pratinjau E-Sign Kaligrafi Terverifikasi</span>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Pilih file foto tanda tangan (PNG atau JPG transparan disarankan):
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              <div className="relative border-2 border-dashed border-gray-300 rounded-xl bg-slate-50/50 overflow-hidden min-h-[140px] flex items-center justify-center">
                <canvas ref={canvasRef} className="w-full h-36" />
                {!hasDrawn && (
                  <span className="text-xs text-gray-400">File tanda tangan akan ditampilkan di sini</span>
                )}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-[11px] text-blue-800 leading-tight">
            <span className="font-semibold">Keamanan Legalitas:</span> Tanda tangan elektronik ini akan disertai stempel enkripsi, kode QR verifikasi integritas dokumen, dan catatan audit waktu (timestamp).
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSaveSignature}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center space-x-2 transition-transform active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Bubuhkan Tanda Tangan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
