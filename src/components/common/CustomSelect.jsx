import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

/**
 * CustomSelect Komponente
 * 
 * Hochperformantes Dropdown-Menü via React Portal direkt in document.body.
 * Verzichtet auf ressourcenhungrige Backdrop-Filter und künstliche Delays,
 * sodass Hover-Effekte und Menü-Öffnen ohne spürbare Latenz (0ms Input-Lag) reagieren.
 */
const CustomSelect = ({
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Bitte wählen...',
  disabled = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  icon: Icon,
  size = 'md', // 'sm' | 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  // Normalisiere options mit useMemo, um unnötige Re-Renders zu vermeiden
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          value: opt.value !== undefined ? opt.value : '',
          label: opt.label !== undefined ? opt.label : String(opt.value),
          icon: opt.icon,
          badge: opt.badge,
          disabled: !!opt.disabled,
        };
      }
      return {
        value: opt,
        label: String(opt),
        disabled: false,
      };
    });
  }, [options]);

  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => String(opt.value) === String(value));
  }, [normalizedOptions, value]);

  // Berechne die absolute Position auf dem Bildschirm synchron vor dem Öffnen
  const calculatePosition = useCallback(() => {
    if (!buttonRef.current) return null;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 240; // Max. Höhe des Menüs
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    return {
      top: openUpwards ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      openUpwards,
    };
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setDropdownPosition(null);
    if (buttonRef.current) {
      buttonRef.current.blur();
    }
  }, []);

  const openDropdown = useCallback(() => {
    if (disabled) return;
    const pos = calculatePosition();
    if (pos) {
      setDropdownPosition(pos);
      setIsOpen(true);
    }
  }, [disabled, calculatePosition]);

  const toggleDropdown = () => {
    if (disabled) return;
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  };

  // Bei Scrollen oder Resize schließen, um teures dauerhaftes Repositionieren zu verhindern
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = (e) => {
      // Wenn innerhalb des geöffneten Dropdown-Menüs gescrollt wird, nicht schließen
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      closeDropdown();
    };

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, closeDropdown]);

  // Klick außerhalb schließt das Dropdown
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen, closeDropdown]);

  // Tastaturbedienung (Escape zum Schließen)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeDropdown();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeDropdown]);

  const handleSelect = (optVal) => {
    if (typeof onChange === 'function') {
      onChange({ target: { name, value: optVal } });
    }
    closeDropdown();
  };

  const isSmall = size === 'sm';

  const menuDropdown = isOpen && dropdownPosition && createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: dropdownPosition.openUpwards ? 'auto' : `${dropdownPosition.top}px`,
        bottom: dropdownPosition.openUpwards ? `${window.innerHeight - dropdownPosition.top}px` : 'auto',
        left: `${dropdownPosition.left}px`,
        width: `${Math.max(dropdownPosition.width, 160)}px`,
        zIndex: 999999, // Liegt über allem (Modale, Ribbon etc.)
      }}
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto ${menuClassName}`}
    >
      {normalizedOptions.length === 0 ? (
        <div className="px-3 py-2 text-xs text-gray-400 text-center">Keine Optionen</div>
      ) : (
        normalizedOptions.map((opt) => {
          const isSelected = String(opt.value) === String(value);
          return (
            <button
              key={String(opt.value)}
              type="button"
              disabled={opt.disabled}
              onClick={() => !opt.disabled && handleSelect(opt.value)}
              className={`w-full flex items-center justify-between gap-2 text-left cursor-pointer select-none ${
                isSmall ? 'py-1.5 px-2.5 text-xs' : 'py-2 px-3 text-sm'
              } ${
                opt.disabled
                  ? 'opacity-40 cursor-not-allowed'
                  : isSelected
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-semibold'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/70 hover:text-blue-600 dark:hover:text-blue-300'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                <span className="truncate">{opt.label}</span>
                {opt.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {opt.badge}
                  </span>
                )}
              </span>
              {isSelected && (
                <Check size={isSmall ? 13 : 15} className="text-blue-600 dark:text-blue-400 shrink-0" />
              )}
            </button>
          );
        })
      )}
    </div>,
    document.body
  );

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 text-left bg-white dark:bg-gray-700/80 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:focus-visible:ring-blue-400/40 focus-visible:border-blue-500 dark:focus-visible:border-blue-400 shadow-2xs transition-colors duration-150 cursor-pointer select-none ${
          isSmall ? 'py-1.5 px-2.5 text-xs' : 'py-2 px-3 text-sm'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : 'hover:border-gray-400 dark:hover:border-gray-500'} ${
          isOpen ? 'ring-2 ring-blue-500/30 dark:ring-blue-400/30 border-blue-500 dark:border-blue-400' : ''
        } ${buttonClassName}`}
      >
        <span className="flex items-center gap-2 truncate">
          {Icon && <Icon size={isSmall ? 13 : 15} className="text-gray-400 shrink-0" />}
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <span className={`truncate ${selectedOption ? 'text-gray-800 dark:text-gray-100 font-medium' : 'text-gray-400 dark:text-gray-400'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>

        <ChevronDown
          size={isSmall ? 13 : 15}
          className={`text-gray-400 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''}`}
        />
      </button>

      {menuDropdown}
    </div>
  );
};

export default CustomSelect;
