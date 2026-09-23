import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const BaseModal = ({
  isOpen,
  onClose,
  title,
  icon: Icon,
  children,
  maxWidth = 'max-w-4xl',
  height = '',
  zIndex = 100,
  isDimmed = false, // Wenn true: Modal bleibt sichtbar im Hintergrund, wird aber leicht herunterskaliert und abgedunkelt (wie bei iOS / macOS Sheets)
  bodyClassName = 'p-6 overflow-y-auto flex-grow space-y-6'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen && !isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 250);
  };

  return createPortal(
    <div
      style={{ zIndex }}
      className={`fixed inset-0 flex items-center justify-center p-4 transition-all duration-300 ease-out ${
        isDimmed ? 'bg-black/30 backdrop-blur-[2px]' : 'bg-black/50 backdrop-blur-md'
      } ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={(e) => {
        if (!isDimmed && e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl shadow-2xl w-full ${maxWidth} ${height || 'max-h-[90vh]'} flex flex-col relative transform transition-all duration-300 ease-out border border-gray-200/80 dark:border-gray-700/80 ${
          isDimmed
            ? 'scale-[0.93] opacity-70 translate-y-[-10px] pointer-events-none select-none blur-[0.5px] brightness-95'
            : isVisible
            ? 'scale-100 opacity-100 translate-y-0'
            : 'scale-95 opacity-0 translate-y-2'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                <Icon size={22} />
              </div>
            )}
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            aria-label="Schließen"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content body */}
        <div className={bodyClassName}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BaseModal;
