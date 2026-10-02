'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Copy, Printer, X, Check } from 'lucide-react';
import { toastSuccess } from '@/lib/notification';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  formTitle: string;
  shareableCode: string;
  batchName?: string;
  shareUrl: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  formTitle,
  shareableCode,
  batchName,
  shareUrl,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a', // Slate 900
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code:', err));
    }
  }, [isOpen, shareUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toastSuccess(`Feedback link copied (${shareableCode})`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QRCode_${shareableCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toastSuccess('QR Code downloaded');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto mb-3">
          <QrCode className="w-5 h-5" />
        </div>

        <h3 className="font-bold text-slate-900 text-base">{formTitle}</h3>
        {batchName && (
          <span className="inline-block mt-1 text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
            Batch: {batchName}
          </span>
        )}

        {/* QR Canvas */}
        <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-xl inline-block shadow-inner">
          {qrDataUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={qrDataUrl}
              alt="Evaluation QR Code"
              className="w-48 h-48 mx-auto rounded-lg"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
              Generating QR Code...
            </div>
          )}
        </div>

        <div className="text-xs font-mono text-slate-500 mb-4">
          Code: <strong className="text-slate-800">{shareableCode}</strong>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleCopy}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600 mb-1" /> : <Copy className="w-4 h-4 mb-1 text-slate-600" />}
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
          >
            <Download className="w-4 h-4 mb-1 text-slate-600" />
            <span>Download</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium transition-colors"
          >
            <Printer className="w-4 h-4 mb-1" />
            <span>Print Flyer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
