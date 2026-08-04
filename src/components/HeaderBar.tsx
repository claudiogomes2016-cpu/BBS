import React from 'react';
import { ArrowLeft, X } from 'lucide-react';

interface HeaderBarProps {
  title: string;
  onBack?: () => void;
  onClose?: () => void;
  subtitle?: string;
  progressBarRatio?: number; // 0 to 1 for interview step
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title,
  onBack,
  onClose,
  subtitle,
  progressBarRatio,
}) => {
  return (
    <div className="relative bg-white border-b-2 border-black">
      {/* Optional Progress Bar Line */}
      {progressBarRatio !== undefined && (
        <div className="w-full bg-gray-200 h-1">
          <div 
            className="bg-[#FF3B00] h-1 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progressBarRatio * 100))}%` }}
          />
        </div>
      )}

      <div className="px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 -ml-1 text-black hover:bg-gray-100 rounded-none transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 -ml-1 text-black hover:bg-gray-100 rounded-none transition-colors"
              aria-label="Fechar"
            >
              <X className="w-6 h-6 stroke-[2.5]" />
            </button>
          )}

          <div>
            <h2 className="font-extrabold text-base uppercase tracking-wider text-black leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="font-mono text-xs text-gray-500">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
