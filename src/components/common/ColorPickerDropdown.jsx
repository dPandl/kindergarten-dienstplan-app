import React, { useState, useEffect, useRef } from 'react';
import { getStrongGroupColor } from '../../utils/colorUtils';

const ColorPickerDropdown = ({ selectedColor, onColorChange, colors, placeholder, useStrongDisplay = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleColorSelect = (color) => {
    onColorChange(color);
    setIsOpen(false);
  };

  // Determine the color to display in the button and swatches
  const displayColor = useStrongDisplay ? getStrongGroupColor(selectedColor) : selectedColor;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="flex items-center justify-between w-full h-[42px] px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-sm text-gray-800 dark:text-gray-100"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          {selectedColor && (
            <span className={`inline-block w-4 h-4 rounded-full ${displayColor} border border-gray-300 dark:border-gray-500 shadow-xs flex-shrink-0`} />
          )}
          <span className="text-sm text-gray-700 dark:text-gray-200">{placeholder}</span>
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto grid grid-cols-4 gap-1 p-2">
          {colors.map((color) => (
            <div
              key={color}
              className={`w-full h-10 flex items-center justify-center rounded-md cursor-pointer border border-gray-200 dark:border-gray-600 hover:ring-2 hover:ring-blue-400 transition duration-150 ${useStrongDisplay ? getStrongGroupColor(color) : color} ${selectedColor === color ? 'border-4 border-blue-500' : ''}`}
              onClick={() => handleColorSelect(color)}
              title={color.replace('bg-', '').replace('-100', '')} // Keep title for hover tooltip, remove -100
            >
              {/* Removed the checkmark SVG here */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


export default ColorPickerDropdown;
