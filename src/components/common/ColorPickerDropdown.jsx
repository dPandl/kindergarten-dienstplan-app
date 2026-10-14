import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { getStrongGroupColor } from '../../utils/colorUtils';

/**
 * ColorPickerDropdown Komponente
 * 
 * Rendert das Farbauswahl-Dropdown via React Portal (direkt in document.body)
 * mit identischer sanfter Öffnen/Schließen-Animation (Scale & Opacity),
 * dynamischer Ausrichtung (nach oben/unten) und sauberer Dark-Mode-Unterstützung.
 */
const ColorPickerDropdown = ({
  selectedColor,
  onColorChange,
  colors = [],
  placeholder = 'Farbe wählen',
  useStrongDisplay = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  // Berechne die absolute Position synchron vor dem Öffnen
  const calculatePosition = useCallback(() => {
    if (!buttonRef.current) return null;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 220; // Geschätzte max. Höhe
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    return {
      top: openUpwards ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      openUpwards,
    };
  }, []);

  const openDropdown = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    const pos = calculatePosition();
    setDropdownPosition(pos);
    setIsRendered(true);
    requestAnimationFrame(() => {
      setIsOpen(true);
    });
  };

  const closeDropdown = () => {
    setIsOpen(false);
    if (buttonRef.current) {
      buttonRef.current.blur();
    }
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setIsRendered(false);
      setDropdownPosition(null);
    }, 150); // Gleiche Dauer wie CustomSelect
  };

  const toggleDropdown = () => {
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  };

  // Synchronisieren bei Scroll oder Resize
  useEffect(() => {
    if (!isRendered) return;

    const handleScrollOrResize = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      const pos = calculatePosition();
      if (pos) setDropdownPosition(pos);
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isRendered, calculatePosition]);

  // Klick außerhalb schließt das Dropdown
  useEffect(() => {
    if (!isRendered) return;

    const handleClickOutside = (event) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRendered]);

  // Escape-Taste schließt das Dropdown
  useEffect(() => {
    if (!isRendered) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeDropdown();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRendered]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const handleColorSelect = (color) => {
    onColorChange(color);
    closeDropdown();
  };

  const displayColor = useStrongDisplay ? getStrongGroupColor(selectedColor) : selectedColor;

  const menuDropdown = isRendered && dropdownPosition && createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: dropdownPosition.openUpwards ? 'auto' : `${dropdownPosition.top}px`,
        bottom: dropdownPosition.openUpwards ? `${window.innerHeight - dropdownPosition.top}px` : 'auto',
        left: `${dropdownPosition.left}px`,
        width: `${Math.max(dropdownPosition.width, 220)}px`,
        transformOrigin: dropdownPosition.openUpwards ? 'bottom center' : 'top center',
        zIndex: 999999,
      }}
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden p-2.5 max-h-64 overflow-y-auto backdrop-blur-md transition-all duration-150 ease-out grid grid-cols-4 gap-2 ${
        isOpen
          ? 'opacity-100 scale-100 translate-y-0'
          : dropdownPosition.openUpwards
          ? 'opacity-0 scale-95 translate-y-1.5 pointer-events-none'
          : 'opacity-0 scale-95 -translate-y-1.5 pointer-events-none'
      }`}
    >
      {colors.map((color) => {
        const isSelected = selectedColor === color;
        const swatchBg = useStrongDisplay ? getStrongGroupColor(color) : color;
        return (
          <button
            key={color}
            type="button"
            className={`w-full h-10 flex items-center justify-center rounded-lg cursor-pointer transition transform hover:scale-105 active:scale-95 border ${
              isSelected
                ? 'ring-2 ring-blue-500 border-white dark:border-gray-900 shadow-md scale-105'
                : 'border-gray-200 dark:border-gray-600/70 hover:shadow-xs'
            } ${swatchBg}`}
            onClick={() => handleColorSelect(color)}
            title={color.replace('bg-', '').replace('-100', '')}
          >
            {isSelected && (
              <Check size={16} className="text-gray-800 dark:text-gray-900 drop-shadow-xs" />
            )}
          </button>
        );
      })}
    </div>,
    document.body
  );

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        className={`flex items-center justify-between w-full h-[42px] px-3 py-2 bg-white dark:bg-gray-700/80 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:focus-visible:ring-blue-400/40 shadow-2xs transition-colors duration-150 text-sm text-gray-800 dark:text-gray-100 cursor-pointer select-none ${
          isOpen ? 'ring-2 ring-blue-500/30 dark:ring-blue-400/30 border-blue-500 dark:border-blue-400' : 'hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onClick={toggleDropdown}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedColor ? (
            <span className={`inline-block w-4 h-4 rounded-full ${displayColor} border border-gray-300 dark:border-gray-500 shadow-xs shrink-0`} />
          ) : (
            <span className="inline-block w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-600 border border-dashed border-gray-400 shrink-0" />
          )}
          <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
            {selectedColor ? 'Farbe gewählt' : placeholder}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-500 dark:text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''}`}
        />
      </button>

      {menuDropdown}
    </div>
  );
};

export default ColorPickerDropdown;
