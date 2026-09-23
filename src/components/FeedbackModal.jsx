// FeedbackModal.jsx
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, MessageSquare, Bug, Lightbulb, HelpCircle, ChevronRight, ChevronLeft, Check, Plus, Trash2 } from 'lucide-react';

export const CATEGORIES = [
  { id: 'feedback',   label: 'Allgemeines Feedback',  icon: MessageSquare },
  { id: 'bug',        label: 'Fehler melden',          icon: Bug           },
  { id: 'suggestion', label: 'Verbesserungsvorschlag', icon: Lightbulb     },
  { id: 'question',   label: 'Frage',                  icon: HelpCircle    },
];

// Schritte für den Bug-Report-Flow
// steps-Feld ist ein Array von Strings (step.id === 'stepsArray')
const BUG_STEPS = [
  {
    id: 'title',
    question: 'Was funktioniert nicht?',
    hint: 'Beschreibe das Problem kurz und prägnant.',
    placeholder: 'z. B. „Der Speichern-Button reagiert nicht"',
    type: 'input',
  },
  {
    id: 'stepsArray',
    question: 'Was hast du getan?',
    hint: 'Beschreibe Schritt für Schritt was du gemacht hast, bevor der Fehler auftrat.',
    type: 'steps',
  },
  {
    id: 'expected',
    question: 'Was hast du erwartet?',
    hint: 'Was sollte eigentlich passieren?',
    placeholder: 'z. B. „Die Änderungen werden gespeichert"',
    type: 'input',
  },
  {
    id: 'actual',
    question: 'Was ist stattdessen passiert?',
    hint: 'Beschreibe was wirklich passiert ist – auch Fehlermeldungen.',
    placeholder: 'z. B. „Eine leere Seite erscheint" oder „Nichts passiert"',
    type: 'textarea',
  },
];

// Gibt den Wert eines Bug-Schritts aus dem Draft zurück
function stepValue(draft, stepId) {
  return draft[stepId] ?? (stepId === 'stepsArray' ? ['', '', ''] : '');
}

// Prüft ob ein Bug-Schritt ausgefüllt ist
function isStepFilled(draft, stepIndex) {
  const { id } = BUG_STEPS[stepIndex];
  if (id === 'stepsArray') {
    const arr = stepValue(draft, 'stepsArray');
    return Array.isArray(arr) && arr.some(s => s.trim() !== '');
  }
  return String(stepValue(draft, id)).trim() !== '';
}

// Ein Schritt ist klickbar, wenn alle Schritte davor ausgefüllt sind
function isStepReachable(draft, stepIndex) {
  for (let i = 0; i < stepIndex; i++) {
    if (!isStepFilled(draft, i)) return false;
  }
  return true;
}

// Erstellt den mailto-Body
function buildMailtoUrl(draft) {
  const cat  = CATEGORIES.find(c => c.id === draft.category)?.label ?? draft.category;
  const subj = encodeURIComponent(`[${cat}] Dienstplan App`);

  let bodyLines = [];
  if (draft.category === 'bug') {
    const stepsArr = Array.isArray(draft.stepsArray) ? draft.stepsArray : [];
    const stepsText = stepsArr
      .filter(s => s.trim())
      .map((s, i) => `${i + 1}. ${s}`)
      .join('\n') || '–';

    bodyLines = [
      `Kategorie: ${cat}`,
      '',
      'Was funktioniert nicht?',
      draft.title || '–',
      '',
      'Was wurde getan?',
      stepsText,
      '',
      'Was wurde erwartet?',
      draft.expected || '–',
      '',
      'Was ist passiert?',
      draft.actual || '–',
      '',
      '---',
      `Browser: ${navigator.userAgent}`,
      `Datum: ${new Date().toLocaleString('de-DE')}`,
    ];
  } else {
    bodyLines = [
      `Kategorie: ${cat}`,
      '',
      draft.message || '',
      '',
      '---',
      `Browser: ${navigator.userAgent}`,
      `Datum: ${new Date().toLocaleString('de-DE')}`,
    ];
  }

  const body = encodeURIComponent(bodyLines.join('\n'));
  return `mailto:feedback@by-dp.de?subject=${subj}&body=${body}`;
}

// ── Schritt 2: Nummerierte Schritte ────────────────────────────────
function StepsField({ value, onChange }) {
  const arr = Array.isArray(value) ? value : ['', '', ''];
  const lastRef = useRef(null);

  const update = (i, v) => {
    const next = [...arr];
    next[i] = v;
    onChange(next);
  };

  const addStep = () => {
    onChange([...arr, '']);
    // Fokus auf neues Feld nach dem Rendern
    setTimeout(() => lastRef.current?.focus(), 50);
  };

  const removeStep = (i) => {
    if (arr.length <= 1) return;
    const next = arr.filter((_, idx) => idx !== i);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {arr.map((val, i) => (
        <div key={i} className="flex items-center gap-2">
          {/* Nummer */}
          <span className="w-6 h-6 flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300
            text-xs font-bold flex items-center justify-center select-none">
            {i + 1}
          </span>
          <input
            ref={i === arr.length - 1 ? lastRef : null}
            type="text"
            value={val}
            onChange={e => update(i, e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (i === arr.length - 1) addStep();
              }
            }}
            placeholder={`Schritt ${i + 1}…`}
            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50
              text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
              px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition"
          />
          {/* Löschen-Button (ab 4+ Feldern oder wenn mindestens 4 vorhanden) */}
          {arr.length > 3 && (
            <button
              onClick={() => removeStep(i)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
              title="Schritt entfernen"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}

      {/* + Button */}
      <button
        onClick={addStep}
        className="flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-xl border border-dashed
          border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400
          hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
      >
        <Plus size={14} /> Weiteren Schritt hinzufügen
      </button>
    </div>
  );
}

// ── Hauptkomponente ────────────────────────────────────────────────
const FeedbackModal = ({ onClose, onCancel, onSend, draft, onDraftChange }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setIsVisible(true), 0);
    return () => clearTimeout(id);
  }, []);

  const handleBackdropClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(onCancel, 300);
  };

  const handleSend = () => {
    window.location.href = buildMailtoUrl(draft);
    setSent(true);
  };

  const handleSentClose = () => {
    setIsVisible(false);
    setTimeout(onSend, 300);
  };

  const set = (key, value) => onDraftChange({ ...draft, [key]: value });

  const isBug    = draft.category === 'bug';
  const bugStep  = draft.bugStep ?? 0;
  const isLastBugStep = bugStep === BUG_STEPS.length - 1;

  const canNext  = isStepFilled(draft, bugStep);
  const canSend  = isBug
    ? BUG_STEPS.every((_, i) => isStepFilled(draft, i))
    : !!(draft.message?.trim());

  return createPortal(
    <div
      style={{ zIndex: 110 }}
      className={`fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4
        transition-all duration-300 ease-out ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={e => e.target === e.currentTarget && handleBackdropClose()}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg
          border border-gray-200/80 dark:border-gray-700/80
          transform transition-all duration-300 ease-out ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <MessageSquare size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Feedback senden</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">feedback@by-dp.de</p>
            </div>
          </div>
          <button
            onClick={handleBackdropClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg
              hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            aria-label="Schließen"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-6 space-y-5">
          {sent ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto">
                <Send size={24} className="text-green-600 dark:text-green-400" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">E-Mail-Programm geöffnet!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Dein Feedback wurde vorausgefüllt. Bitte sende die E-Mail ab, um sie zu übermitteln.
              </p>
              <button onClick={handleSentClose}
                className="mt-4 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition">
                Schließen
              </button>
            </div>
          ) : (
            <>
              {/* ── Kategorie-Auswahl ── */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                  Kategorie
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(({ id, label, icon: Icon }) => (
                    <button key={id}
                      onClick={() => onDraftChange({ ...draft, category: id, bugStep: 0 })}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        draft.category === id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <Icon size={15} /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Bug-Flow: Fortschrittsanzeige ── */}
              {isBug && (
                <div className="flex items-center gap-2">
                  {BUG_STEPS.map((step, i) => {
                    const filled    = isStepFilled(draft, i);
                    const reachable = isStepReachable(draft, i);
                    const current   = i === bugStep;

                    return (
                      <React.Fragment key={step.id}>
                        <button
                          // Nur klickbar wenn Schritt erreichbar ist
                          onClick={() => reachable && set('bugStep', i)}
                          disabled={!reachable}
                          title={reachable ? step.question : 'Bitte erst vorherige Schritte ausfüllen'}
                          className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                            ${!reachable
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                              : filled && !current
                              ? 'bg-blue-600 text-white cursor-pointer hover:bg-blue-700'
                              : current
                              ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500 cursor-pointer'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                          {/* Nummer immer anzeigen, Haken als kleines Badge */}
                          {i + 1}
                          {filled && !current && (
                            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center">
                              <Check size={9} strokeWidth={3} className="text-white" />
                            </span>
                          )}
                        </button>
                        {i < BUG_STEPS.length - 1 && (
                          <div className={`flex-1 h-0.5 rounded transition-colors ${
                            isStepFilled(draft, i) ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-600'
                          }`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {/* ── Schritt-Inhalt ── */}
              {isBug ? (
                <div key={BUG_STEPS[bugStep].id} className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {BUG_STEPS[bugStep].question}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 pb-1">{BUG_STEPS[bugStep].hint}</p>

                  {BUG_STEPS[bugStep].type === 'steps' ? (
                    <StepsField
                      value={stepValue(draft, 'stepsArray')}
                      onChange={v => set('stepsArray', v)}
                    />
                  ) : BUG_STEPS[bugStep].type === 'textarea' ? (
                    <textarea
                      autoFocus
                      rows={4}
                      value={stepValue(draft, BUG_STEPS[bugStep].id)}
                      onChange={e => set(BUG_STEPS[bugStep].id, e.target.value)}
                      placeholder={BUG_STEPS[bugStep].placeholder}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50
                        text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                        px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition"
                    />
                  ) : (
                    <input
                      autoFocus
                      type="text"
                      value={stepValue(draft, BUG_STEPS[bugStep].id)}
                      onChange={e => set(BUG_STEPS[bugStep].id, e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && canNext && !isLastBugStep)
                          set('bugStep', bugStep + 1);
                      }}
                      placeholder={BUG_STEPS[bugStep].placeholder}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50
                        text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                        px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition"
                    />
                  )}
                </div>
              ) : (
                /* ── Normales Textfeld ── */
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Nachricht
                  </label>
                  <textarea
                    autoFocus
                    value={draft.message ?? ''}
                    onChange={e => set('message', e.target.value)}
                    placeholder="Was möchtest du mir mitteilen?"
                    rows={5}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50
                      text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                      px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition"
                  />
                </div>
              )}

              {/* ── Footer ── */}
              <div className="flex items-center justify-between pt-1">
                <button onClick={handleCancel}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm
                    text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  Abbrechen
                </button>

                <div className="flex gap-2">
                  {isBug && bugStep > 0 && (
                    <button onClick={() => set('bugStep', bugStep - 1)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600
                        text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                      <ChevronLeft size={15} /> Zurück
                    </button>
                  )}

                  {isBug && !isLastBugStep ? (
                    <button
                      onClick={() => canNext && set('bugStep', bugStep + 1)}
                      disabled={!canNext}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        canNext
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                      }`}>
                      Weiter <ChevronRight size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={handleSend}
                      disabled={!canSend}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        canSend
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                      }`}>
                      <Send size={14} /> Senden
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FeedbackModal;
