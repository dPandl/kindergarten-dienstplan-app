import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles } from 'lucide-react';
import { compareVersions } from '../../utils/timeUtils';

const NewVersionPopup = ({ version, onClose, releaseNotes }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [isVisible, setIsVisible] = useState(false); // State für Fade-In/Out

  // Finde die Notizen für die aktuelle Version
  const currentVersionNotes = releaseNotes.find(note => note.version === version);
  // Filtert die Notizen, die nicht der aktuellen Version entsprechen, für den Verlauf
  const historicalNotes = releaseNotes.filter(note => note.version !== version);

  // Effekt für Fade-In beim Mounten
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Handler für das Schließen des Popups mit Fade-Out
  const handleClose = () => {
    setIsVisible(false);
    // Warte, bis die Transition abgeschlossen ist, bevor onClose aufgerufen wird
    setTimeout(() => {
      onClose();
    }, 300); // Muss der Dauer der Transition-Klasse entsprechen
  };

  return createPortal(
    <div
      style={{ zIndex: 110 }}
      className={`fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className={`bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out border border-gray-200/80 dark:border-gray-700/80 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        } relative`}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          aria-label="Schließen"
        >
          <X size={20} />
        </button>

        {!showHistory ? (
          // Ansicht für die aktuelle neue Version
          <>
            {/* Bedingte Anzeige für den Haupt-Update-Titel */}
            {currentVersionNotes?.optionalTitle ? (
              <>
                <h3 className="text-4xl font-bold text-gray-800 mb-2 text-center">
                  {currentVersionNotes.optionalTitle}
                </h3>
                <p className="text-xl text-gray-600 mb-4 text-center">
                  Version {version}
                </p>
              </>
            ) : (
              <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                Update: Version {version}
              </h3>
            )}

            <p className="text-gray-700 mb-4">
              Willkommen zurück! Diese Version enthält wichtige Verbesserungen und neue Funktionen, um deine Planung noch effizienter zu gestalten.
            </p>

            {currentVersionNotes && currentVersionNotes.whatsNew.length > 0 && (
              <div>
                <p className="font-semibold text-base text-gray-700">Was ist neu:</p>
                <ul className="list-disc list-outside pl-5 space-y-1">
                  {currentVersionNotes.whatsNew.map((item, index) => (
                    <li key={index} className="pl-1" dangerouslySetInnerHTML={{ __html: item }}></li>
                  ))}
                </ul>
              </div>
            )}

            {currentVersionNotes && currentVersionNotes.adjustments.length > 0 && (
              <div>
                <p className="font-semibold text-base text-gray-700 mt-4">Anpassungen:</p>
                <ul className="list-disc list-outside pl-5 space-y-1">
                  {currentVersionNotes.adjustments.map((item, index) => (
                    <li key={index} className="pl-1" dangerouslySetInnerHTML={{ __html: item }}></li>
                  ))}
                </ul>
              </div>
            )}

            {currentVersionNotes && currentVersionNotes.bugFixes.length > 0 && (
              <div>
                <p className="font-semibold text-base text-gray-700 mt-4">Fehlerbehebungen:</p>
                <ul className="list-disc list-outside pl-5 space-y-1">
                  {currentVersionNotes.bugFixes.map((item, index) => (
                    <li key={index} className="pl-1" dangerouslySetInnerHTML={{ __html: item }}></li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-center mt-6">
              <button
                onClick={handleClose} // Nutzt den neuen handleClose
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition hover:scale-105 duration-300 ease-in-out mr-4"
              >
                Verstanden!
              </button>
              {historicalNotes.length > 0 && (
                <button
                  onClick={() => setShowHistory(true)}
                  className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg shadow-md transition hover:scale-105 duration-300 ease-in-out"
                >
                  Updateverlauf
                </button>
              )}
            </div>
          </>
        ) : (
          // Ansicht für den Updateverlauf
          <>
            <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">Updateverlauf</h3>
            <div className="space-y-6">
              {releaseNotes.sort((a, b) => compareVersions(b.version, a.version)).map((note, index) => (
                <div key={index} className="p-3 rounded-lg bg-gray-50 border border-gray-200 shadow-sm">
                  <h4 className="font-semibold text-xl text-gray-800 mb-0">
                    Version {note.version}
                  </h4>
                  {note.optionalTitle && (
                    <p className="font-semibold text-base text-gray-600 mt-1">
                      ({note.optionalTitle})
                    </p>
                  )}
                  <div className="mt-2 text-base space-y-2">
                    {note.whatsNew.length > 0 && (
                      <div>
                        <p className="font-semibold text-base text-gray-700">Was ist neu:</p>
                        <ul className="list-disc list-outside pl-5 space-y-1">
                          {note.whatsNew.map((item, i) => (
                            <li key={i} className="pl-1" dangerouslySetInnerHTML={{ __html: item }}></li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {note.adjustments.length > 0 && (
                      <div>
                        <p className="font-semibold text-base text-gray-700 mt-4">Anpassungen:</p>
                        <ul className="list-disc list-outside pl-5 space-y-1">
                          {note.adjustments.map((item, i) => (
                            <li key={i} className="pl-1" dangerouslySetInnerHTML={{ __html: item }}></li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {note.bugFixes.length > 0 && (
                      <div>
                        <p className="font-semibold text-base text-gray-700 mt-4">Fehlerbehebungen:</p>
                        <ul className="list-disc list-outside pl-5 space-y-1">
                          {note.bugFixes.map((item, i) => (
                            <li key={i} className="pl-1" dangerouslySetInnerHTML={{ __html: item }}></li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setShowHistory(false)}
                className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2 px-6 rounded-xl shadow transition duration-200 mr-4"
              >
                Zurück
              </button>
              <button
                onClick={handleClose}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-xl shadow-md transition duration-200 active:scale-95"
              >
                Schließen
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};




export default NewVersionPopup;
