import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const ConfirmModal = ({ message, onConfirm, onCancel }) => {
  // State, der die Sichtbarkeit und damit die Animation des Modals steuert.
  const [isVisible, setIsVisible] = useState(false);

  // useEffect Hook, der beim Mounten der Komponente (einmalig) ausgeführt wird.
  // Er setzt isVisible auf true, um die Fade-In-Animation zu starten.
  // setTimeout(0) stellt sicher, dass der DOM zuerst gerendert wird,
  // bevor die CSS-Transition ausgelöst wird.
  useEffect(() => {
    const timerId = setTimeout(() => {
      setIsVisible(true); // Trigger für den Fade-In
    }, 0);
    // Cleanup-Funktion, um den Timer zu löschen, falls die Komponente unmounted wird,
    // bevor der Timeout abläuft.
    return () => clearTimeout(timerId);
  }, []); // Leeres Abhängigkeits-Array bedeutet, der Effekt läuft nur einmal nach dem initialen Rendern.

  // Handler-Funktion zum Schließen des Modals mit Fade-Out
  // Diese Funktion wird von den Buttons aufgerufen und kümmert sich um die Animation
  // und das anschließende Aufrufen der übergebenen Callback-Funktion.
  const handleActionClick = (actionCallback) => {
    setIsVisible(false); // Trigger für den Fade-Out
    // Warte, bis die CSS-Transition abgeschlossen ist (300ms), bevor die Callback-Funktion aufgerufen wird.
    setTimeout(() => {
      actionCallback(); // Rufe die übergebene Funktion auf
    }, 300); // Wichtig: Diese Dauer muss mit der CSS-Transition-Dauer übereinstimmen (z.B. duration-300).
  };

  return createPortal(
    <div
      style={{ zIndex: 120 }}
      className={`fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className={`bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl shadow-2xl p-6 max-w-sm w-full relative border border-gray-200/80 dark:border-gray-700/80 transform transition-all duration-300 ease-out ${
          isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-2'
        }`}
      >
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-xl font-bold">
            !
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
          Bestätigung erforderlich
        </h3>

        <p className="text-gray-600 dark:text-gray-300 text-center mb-6 text-sm">
          {message}
        </p>

        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => handleActionClick(onCancel)}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => handleActionClick(onConfirm)}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/20 transition active:scale-95"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};


export default ConfirmModal;
