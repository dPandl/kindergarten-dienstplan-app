// FeedbackModal.jsx
import React, { useState, useEffect } from 'react';

const FeedbackModal = ({ onClose }) => {
  // State, der die Sichtbarkeit und damit die Animation des Modals steuert.
  // Initial auf false, damit es beim ersten Rendern ausgeblendet ist.
  const [isVisible, setIsVisible] = useState(false);

  // useEffect Hook, der beim Mounten der Komponente (einmalig) ausgeführt wird.
  // Er setzt isVisible auf true, um die Fade-In-Animation zu starten.
  // setTimeout(0) stellt sicher, dass der DOM zuerst gerendert wird,
  // bevor die CSS-Transition ausgelöst wird.
  useEffect(() => {
    const timerId = setTimeout(() => {
      setIsVisible(true);
    }, 0);
    // Cleanup-Funktion, um den Timer zu löschen, falls die Komponente unmounted wird,
    // bevor der Timeout abläuft.
    return () => clearTimeout(timerId);
  }, []); // Leeres Abhängigkeits-Array bedeutet, der Effekt läuft nur einmal nach dem initialen Rendern.

  // Handler-Funktion zum Schließen des Modals.
  // Sie setzt isVisible auf false, um die Fade-Out-Animation zu starten.
  // Nach einer kurzen Verzögerung (entsprechend der CSS-Transition-Dauer)
  // wird die onClose-Funktion des Elternteils aufgerufen, um die Komponente zu entfernen.
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wichtig: Diese Dauer muss mit der CSS-Transition-Dauer übereinstimmen (z.B. duration-300).
  };

  // Die Google Forms Embed-URL.
  // Dies ist die URL, die du von Google Forms erhältst, wenn du die Option "Einbetten" wählst.
  // Die URL, die du mir gegeben hast, ist korrekt:
  const googleFormEmbedUrl = "https://docs.google.com/forms/d/e/1FAIpQLSehtSDB10AZE1aSGGvjeOeGneIhU8pWobYVWN9Ha3ob3AO8AQ/viewform?embedded=true";

  return (
    // Der äußere Container für das Modal-Overlay.
    // Die 'transition-opacity' Klasse sorgt für den Fade-In/Out-Effekt des Overlays.
    // 'opacity-100' oder 'opacity-0' wird basierend auf dem isVisible-State gesetzt.
    <div
      className={`fixed inset-0 bg-gray-300 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Der innere Container für den Modal-Inhalt. */}
      {/* Die 'transition-transform' Klasse sorgt für den Skalierungs-Effekt. */}
      {/* 'scale-100' oder 'scale-95' wird basierend auf dem isVisible-State gesetzt. */}
      <div
        className={`bg-white rounded-lg shadow-xl p-6
          max-w-3xl // Maximale Breite beibehalten
          w-full
          h-[90vh]
          overflow-hidden transform transition-transform duration-300 ${
          isVisible ? 'scale-100' : 'scale-95'
        } relative flex flex-col`} // flex-col ist wichtig, damit der iframe flexibel die Höhe füllt
      >
        {/* Schließen-Button oben rechts im Modal. */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 transition hover:scale-110 duration-300 w-8 h-8 rounded-full flex items-center justify-center p-0"
          aria-label="Schließen"
        >
          {/* SVG-Icon für das Schließen-Symbol. */}
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        {/* Titel des Feedback-Modals. */}
        <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">Dein Feedback ist mir wichtig!</h3>

        {/* Container für den iframe, der das Google Formular enthält. */}
        {/* 'flex-grow min-h-0' sorgt dafür, dass der iframe den verfügbaren Platz im Modal ausfüllt. */}
        <div className="flex-grow min-h-0">
          <iframe
            src={googleFormEmbedUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            marginHeight="0"
            marginWidth="0"
            className="rounded-lg" // Optionale abgerundete Ecken für den iframe
            title="Google Feedback Formular" // Wichtig für Barrierefreiheit
          >
            Wird geladen… {/* Fallback-Text, falls der iframe nicht geladen werden kann */}
          </iframe>
        </div>

        {/* Schließen-Button am unteren Rand des Modals. */}
        <div className="flex justify-center mt-4">
          <button
            onClick={handleClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition hover:scale-105 duration-300 ease-in-out"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
