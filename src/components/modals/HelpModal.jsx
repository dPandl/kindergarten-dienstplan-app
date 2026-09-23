import React from 'react';
import { HelpCircle, AlertCircle } from 'lucide-react';
import BaseModal from '../common/BaseModal';

const HelpModal = ({ onClose }) => {
  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title="Anleitung & Hilfe"
      icon={HelpCircle}
      maxWidth="max-w-3xl"
      zIndex={110}
    >
      <div className="space-y-4 text-gray-700 dark:text-gray-200">
        <details className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 shadow-xs">
          <summary className="font-semibold text-lg text-gray-800 dark:text-gray-100 cursor-pointer">Kurzanleitung: Erster Dienstplan</summary>
          <div className="mt-2 text-base">
            <p className="mb-2">Hier eine schnelle Anleitung, um deinen ersten Dienstplan im neuen Menüband-Design zu erstellen:</p>
            <ol className="list-decimal list-outside pl-5 space-y-1">
              <li className="pl-1"><strong>Gruppe erstellen:</strong> Klicke im Menüband oben auf den Tab <strong>"Gruppen"</strong>. Erstelle eine neue Gruppe, z.&nbsp;B. "Regenbogenland", und wähle eine Gruppenfarbe.</li>
              <li className="pl-1"><strong>Mitarbeiter hinzufügen:</strong> Klicke im Menüband auf <strong>"Mitarbeiter"</strong>. Gib Name, Wochenstunden und Typ ein und weise die Gruppe zu. Optional kannst du hier auch erste Mitarbeiterwünsche hinterlegen.</li>
              <li className="pl-1"><strong>Kategorien prüfen:</strong> Unter <strong>"Schichtblöcke"</strong> findest du deine Basisblöcke (z.&nbsp;B. "Betreuung", "Verfügung") und kannst Unterkategorien mit eigenen Farben anlegen.</li>
              <li className="pl-1"><strong>Schichten im Wochenplan anlegen:</strong> Klicke im Wochenplan auf eine freie Stelle in der Zeitleiste eines Mitarbeiters. Wähle im Popover die gewünschte Kategorie. Der Schichtblock wird erstellt.</li>
              <li className="pl-1"><strong>Schichten anpassen:</strong> Ziehe den Block, um ihn zeitlich zu verschieben. Ziehe an den linken oder rechten Kanten, um die Dauer im 15-Minuten-Raster anzupassen.</li>
              <li className="pl-1"><strong>Speichern:</strong> Klicke oben auf <strong>"Speichern"</strong> oder nutze <strong>"Daten exportieren"</strong>, um deine Dienstplandatei lokal zu sichern.</li>
            </ol>
            <p className="mt-2 text-emerald-600 dark:text-emerald-400 font-medium">Fertig! Dein erster Dienstplan ist einsatzbereit.</p>
          </div>
        </details>

        <details className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 shadow-xs">
          <summary className="font-semibold text-lg text-gray-800 dark:text-gray-100 cursor-pointer">Menüband &amp; Navigation (Ribbon Bar)</summary>
          <div className="mt-2 text-base">
            <p>Das neue Menüband am oberen Bildschirmrand bietet schnellen Zugriff auf alle Werkzeuge im Stil moderner Office-Programme:</p>
            <ul className="list-disc list-outside pl-5 space-y-1">
              <li className="pl-1"><strong>Tabs:</strong> Wechsle zwischen <em>Mitarbeiter</em>, <em>Gruppen</em>, <em>Schichtblöcke</em>, <em>Verfügungszeiten</em>, <em>Ansicht</em> und <em>Drucken</em>.</li>
              <li className="pl-1"><strong>Einklappen / Erweitern:</strong> Über den Button <strong>"Einklappen"</strong> ganz rechts (oder erneuten Klick auf den aktiven Tab) klappst du das Menüband ein, um mehr vertikalen Platz für den Wochenplan zu gewinnen.</li>
              <li className="pl-1"><strong>Kopfleiste:</strong> Zeigt den Speichertyp (Lokal / Verbunden), die App-Version und bietet Schnellzugriff auf Dark Mode, Einstellungen, Hilfe und Feedback.</li>
            </ul>
          </div>
        </details>

        <details className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 shadow-xs">
          <summary className="font-semibold text-lg text-gray-800 dark:text-gray-100 cursor-pointer">Mitarbeiter verwalten &amp; Mitarbeiter-Wünsche</summary>
          <div className="mt-2 text-base">
            <p>Verwalte dein Personal und berücksichtige persönliche Wünsche bei der Planung:</p>
            <ul className="list-disc list-outside pl-5 space-y-1">
              <li className="pl-1"><strong>Grunddaten:</strong> Name, vertragliche Wochenstunden, Mitarbeitertyp (Normal, Zusatzkraft, Azubi, FSJ, Praktikant) und Anwesenheitstage (z.&nbsp;B. für Berufsschultage).</li>
              <li className="pl-1"><strong>Individuelle Verfügungszeit:</strong> Überschreibt auf Wunsch die allgemeine Berechnungsregel für diesen Mitarbeiter.</li>
              <li className="pl-1"><strong>Mitarbeiter-Wünsche erfassen:</strong> Klicke beim Mitarbeiter auf das Stern-Icon <strong>"Wünsche"</strong>. Du kannst für jeden Wochentag festlegen:
                <ul className="list-circle list-outside pl-5 mt-1 space-y-0.5 text-sm">
                  <li>🏖️ <em>Wunschfrei:</em> Bevorzugt kein Dienst an diesem Tag.</li>
                  <li>⏰ <em>Wunsch-Arbeitszeit:</em> Bevorzugte Start- und Endzeit.</li>
                  <li>☀️ / 🌙 <em>Verfügungszeit-Präferenz:</em> Vormittags oder nachmittags gewünscht.</li>
                  <li>💬 <em>Notiz:</em> Freitext für besondere Absprachen.</li>
                </ul>
              </li>
              <li className="pl-1"><strong>Anzeige im Wochenplan:</strong> Liegt ein Wunsch vor, erscheint neben dem Namen ein goldener Stern ⭐ (mit Tooltip) und auf der Zeitleiste wird der gewünschte Zeitraum dezent markiert – rein informativ und unverbindlich.</li>
            </ul>
          </div>
        </details>

        <details className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 shadow-xs">
          <summary className="font-semibold text-lg text-gray-800 dark:text-gray-100 cursor-pointer">Krankmeldungen &amp; Abwesenheitsfilter</summary>
          <div className="mt-2 text-base">
            <p>Reagiere schnell und übersichtlich auf Personalausfälle:</p>
            <ul className="list-disc list-outside pl-5 space-y-1">
              <li className="pl-1"><strong>Mitarbeiter krankmelden:</strong> Klicke im Menüband auf <strong>"Krankmelden"</strong> oder auf das rote Badge neben dem Wochentag. Setze einfach ein Häkchen bei den betroffenen Tagen des Mitarbeiters.</li>
              <li className="pl-1"><strong>Optische Hervorhebung:</strong> Kranke Mitarbeiter werden in der Zeitleiste durchgestrichen und dezent gedimmt dargestellt.</li>
              <li className="pl-1"><strong>Abwesende ausblenden:</strong> Aktiviere im Tab <em>Ansicht</em> oder in der Wochenplan-Leiste die Option <strong>"Abwesende ausblenden"</strong>. Kranke Mitarbeiter sowie Teilzeitkräfte an ihren Schultagen werden für diesen Tag komplett aus der Liste ausgeblendet, sodass nur das verfügbare Team sichtbar ist.</li>
            </ul>
          </div>
        </details>

        <details className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 shadow-xs">
          <summary className="font-semibold text-lg text-gray-800 dark:text-gray-100 cursor-pointer">Wochenplan &amp; Multi-Plan-Verwaltung</summary>
          <div className="mt-2 text-base">
            <p>Plane flexibel mit mehreren Plänen in einer einzigen Datei:</p>
            <ul className="list-disc list-outside pl-5 space-y-1">
              <li className="pl-1"><strong>Schnellwechsler-Tabs:</strong> Direkt über dem Plan kannst du über Tabs zwischen verschiedenen Wochenplänen (z.&nbsp;B. Standardwoche, Notbetreuung, Ferienplan) wechseln.</li>
              <li className="pl-1"><strong>Plan duplizieren:</strong> Kopiere den aktuellen Plan mit einem Klick, um z.&nbsp;B. auf Basis des Standardplans sofort Vertretungen für eine Krankheitswoche zu planen.</li>
              <li className="pl-1"><strong>Wochenplan-Verwaltung (Zahnrad):</strong> Verwalte alle Pläne übersichtlich, benenne sie um, exportiere einzelne Pläne oder lösche nicht mehr benötigte Varianten.</li>
              <li className="pl-1"><strong>Schichtblöcke bearbeiten:</strong> Klicke auf Schichten, um sie zu bearbeiten, einer anderen Gruppe zuzuweisen oder zu löschen. Pausenzeiten und Arbeitszeiten werden automatisch in Echtzeit berechnet.</li>
            </ul>
          </div>
        </details>

        <details className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 shadow-xs">
          <summary className="font-semibold text-lg text-gray-800 dark:text-gray-100 cursor-pointer">Wochenplan-Legende &amp; Drucken</summary>
          <div className="mt-2 text-base">
            <p>Für maximale Übersicht am Bildschirm und auf Papier:</p>
            <ul className="list-disc list-outside pl-5 space-y-1">
              <li className="pl-1"><strong>Neue Wochenplan-Legende:</strong> Am unteren Ende des Wochenplans schlüsselt eine kompakte Legende alle verwendeten Basisblöcke, Unterkategorien, Pausen und Verfügungszeiten mit ihren Farben auf.</li>
              <li className="pl-1"><strong>Druckoptimierung:</strong> Beim Drucken wird der Plan pixelgenau aufbereitet – störende Bedienelemente werden ausgeblendet, Gruppenbalken schließen nahtlos ab und die Legende wird für den Aushang sauber mitgedruckt.</li>
              <li className="pl-1"><strong>Druckfilter:</strong> Wähle im Druckdialog, ob du alle Gruppen oder nur bestimmte Gruppen/Mitarbeiter sowie die Wochenübersicht drucken möchtest.</li>
            </ul>
          </div>
        </details>

        <details className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 shadow-xs">
          <summary className="font-semibold text-lg text-gray-800 cursor-pointer">Design, Hintergründe &amp; Augenschonender Dark Mode</summary>
          <div className="mt-2 text-base">
            <p>Passe die Optik nach deinem Geschmack an:</p>
            <ul className="list-disc list-outside pl-5 space-y-1">
              <li className="pl-1"><strong>Lebendige Hintergründe:</strong> Öffne die Einstellungen (Zahnrad oben rechts). Wähle aus modernen animierten Hintergründen wie <em>Liquid Chrome</em>, <em>Gradient Mesh</em>, <em>Beams</em>, <em>Prismatic Burst</em> oder <em>Aurora</em>.</li>
              <li className="pl-1"><strong>Geschwindigkeit &amp; Farbpaletten:</strong> Passe das Tempo der Animationen an oder wähle individuelle Farbverläufe.</li>
              <li className="pl-1"><strong>Augenschonender Dark Mode:</strong> Ein komplett überarbeiteter Dunkelmodus mit angenehmen Slate-Kontrasten, blendfreien Farben und sauber abgestimmten Gruppenstreifen schont die Augen bei längeren Planungssitzungen.</li>
            </ul>
          </div>
        </details>

        <details className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 shadow-xs">
          <summary className="font-semibold text-lg text-gray-800 cursor-pointer">Gruppen verwalten &amp; Betreuungsregeln</summary>
          <div className="mt-2 text-base">
            <p>Organisiere Gruppen, Öffnungszeiten und Betreuungsvorgaben:</p>
            <ul className="list-disc list-outside pl-5 space-y-1">
              <li className="pl-1"><strong>Öffnungszeiten:</strong> Hinterlege die Betreuungszeiten deiner Gruppen pro Wochentag.</li>
              <li className="pl-1"><strong>Randzeiten:</strong> Definiere Übergangs- oder Randzeiten (z.&nbsp;B. Früh- oder Spätdienst), in denen Unterbesetzungen erlaubt sind und keine roten Warnungen erzeugt werden.</li>
              <li className="pl-1"><strong>Mindestpersonal:</strong> Lege fest, wie viele Mitarbeiter der Betreuungskategorie gleichzeitig anwesend sein müssen.</li>
            </ul>
          </div>
        </details>

        <details className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 shadow-xs">
          <summary className="font-semibold text-lg text-gray-800 cursor-pointer">Kategorien &amp; Unterkategorien</summary>
          <div className="mt-2 text-base">
            <p>Baue dein modulares Schichtsystem auf:</p>
            <ul className="list-disc list-outside pl-5 space-y-1">
              <li className="pl-1"><strong>Basisblöcke:</strong> Hauptkategorien wie "Betreuung" (für Besetzungsregeln), "Verfügung" (für VZ-Berechnung) oder eigene Zeiten.</li>
              <li className="pl-1"><strong>Unterkategorien:</strong> Spezifische Aktivitäten (z.&nbsp;B. "Waldgruppe", "Elterngespräch", "Sprachförderung") mit eigener Farbgebung auf der Zeitleiste.</li>
            </ul>
          </div>
        </details>

        <details className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 shadow-xs">
          <summary className="font-semibold text-lg text-gray-800 cursor-pointer">Warnungen &amp; Gesetzliche Vorgaben</summary>
          <div className="mt-2 text-base">
            <p>Die App wacht über gesetzliche und betriebliche Vorgaben:</p>
            <ul className="list-disc list-outside pl-5 space-y-1">
              <li className="pl-1"><strong>Arbeitszeitgesetz (<AlertCircle className="inline-block w-4 h-4 text-red-500" />):</strong> Warnt bei fehlenden gesetzlichen Ruhepausen oder Überschreitung der Höchstarbeitszeit.</li>
              <li className="pl-1"><strong>Betreuungswarnung:</strong> Rote transparente Bereiche markieren Unterbesetzungen während der Kernöffnungszeiten.</li>
              <li className="pl-1"><strong>Wochenübersicht:</strong> Zeigt Über-/Unterstunden, Verfügungszeit-Soll und Diskrepanzen auf einen Blick.</li>
            </ul>
          </div>
        </details>

        <details className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 shadow-xs">
          <summary className="font-semibold text-lg text-gray-800 cursor-pointer">Datenverwaltung &amp; Speichern</summary>
          <div className="mt-2 text-base">
            <p>Volle Datensicherheit ohne Cloud-Zwang:</p>
            <ul className="list-disc list-outside pl-5 space-y-1">
              <li className="pl-1"><strong>Lokale Dateien:</strong> Deine Daten bleiben zu 100 % lokal auf deinem Rechner in einer kompakten <span className="font-mono text-sm">.dienstplan</span>-Datei.</li>
              <li className="pl-1"><strong>Automatisches Speichern:</strong> Nach dem ersten Öffnen oder Speichern synchronisiert die App Änderungen direkt mit deiner Datei.</li>
              <li className="pl-1"><strong>Export &amp; Backup:</strong> Du kannst jederzeit Sicherheitskopien erstellen oder den Dienstplan auf andere Geräte übertragen.</li>
            </ul>
          </div>
        </details>

        <details className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 shadow-xs">
          <summary className="font-semibold text-lg text-gray-800 cursor-pointer">Feedback &amp; Support</summary>
          <div className="mt-2 text-base">
            <p>Deine Meinung und Wünsche gestalten die App aktiv mit:</p>
            <ul className="list-disc list-outside pl-5 space-y-1">
              <li className="pl-1"><strong>Direkte E-Mail:</strong> Klicke oben rechts auf <strong>"Feedback &amp; Support"</strong>.</li>
              <li className="pl-1"><strong>Keine Einrichtung nötig:</strong> Gib deine Nachricht ein – beim Klick auf "E-Mail senden" öffnet sich automatisch dein Standard-Mailprogramm mit vorausgefülltem Text und Betreff. Du musst nur noch auf Absenden klicken!</li>
            </ul>
          </div>
        </details>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Dienstplan App vBeta 2.0.0 – Entwickelt für Kitas und soziale Einrichtungen.
        </p>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-xl shadow-md transition hover:scale-105 duration-200 active:scale-95"
        >
          Schließen
        </button>
      </div>
    </BaseModal>
  );
};

// --- Release Notes Data ---
export const RELEASE_NOTES = [
  {
    "version": "Beta 2.0.0",
    "optionalTitle": "Das große Update: Redesign, Wünsche & Hintergründe",
    "whatsNew": [
      "<strong>Komplettes Redesign der App:</strong> <br />Die gesamte Benutzeroberfläche wurde im modernen Office/Word-Stil mit einem übersichtlichen Menüband (Ribbon Bar) und edlem Frosted-Glass-Design überarbeitet, um die tägliche Arbeit schneller und intuitiver zu machen.",
      "<strong>Neue lebendige Hintergründe:</strong> <br />Wähle aus faszinierenden Hintergrund-Effekten wie Liquid Chrome, Gradient Mesh, Beams, Prismatic Burst oder Aurora. Geschwindigkeit und Farbpaletten lassen sich individuell in den Einstellungen anpassen.",
      "<strong>Neue interaktive Wochenplan-Legende:</strong> <br />Direkt unter dem Wochenplan und auf allen Ausdrucken zeigt eine neue, saubere Legende alle Basisblöcke, Unterkategorien, Pausen und Verfügungszeiten auf einen Blick.",
      "<strong>Krankmeldungen &amp; Abwesenheitsfilter:</strong> <br />Mitarbeiter können mit einem Klick für einzelne Wochentage als krank markiert werden. Mit der neuen Option <em>„Abwesende ausblenden“</em> werden kranke Mitarbeiter sowie Mitarbeiter an Schultagen für den jeweiligen Tag automatisch aus der Zeitleiste ausgeblendet.",
      "<strong>Mitarbeiter-Wünsche erfassen:</strong> <br />In der Mitarbeiterverwaltung können nun individuelle Wünsche (Wunschfrei, Wunsch-Arbeitszeiten, Vormittags/Nachmittags-Verfügungszeit, Notizen) hinterlegt werden. Im Wochenplan werden diese dezent mit einem Sternchen ⭐ und einer Markierung auf der Zeitleiste als unverbindliche Orientierungshilfe angezeigt.",
      "<strong>Multi-Wochenplan-Verwaltung:</strong> <br />Verwalte beliebig viele Wochenpläne in einer einzigen Datei, wechsle blitzschnell über Tabs, dupliziere bestehende Pläne (z.&nbsp;B. für Krankheits- oder Ferienwochen) und verwalte oder exportiere sie einzeln.",
      "<strong>Neuer augenschonender Dark Mode:</strong> <br />Komplett neu abgestimmter Dunkelmodus mit angenehmen Kontrasten, dezenten Slate-Tönen und optimierten Gruppenfarben für ermüdungsfreies Arbeiten.",
      "<strong>Direkte E-Mail-Feedback-Funktion:</strong> <br />Das Feedback-Fenster öffnet nun direkt dein Standard-E-Mail-Programm mit vorausgefülltem Text und Betreff, sodass Fehlermeldungen oder Ideen mit nur einem Klick verschickt werden können."
    ],
    "bugFixes": [
      "Subpixel-Fugen und Ausrichtungsunterschiede beim Drucken des Wochenplans behoben."
    ],
    "adjustments": [
      "Optimierte Druckdarstellung mit bündigen Gruppenstreifen.",
      "Verbesserte Tooltips und Statusanzeigen im Wochenplan und Menüband."
    ]
  },
  {
    "version": "Beta 1.9.2",
    "optionalTitle": "Wochenübersicht Korrektur",
    "whatsNew": [],
    "bugFixes": [
      "Zusammenfassungen aller Basisblöcke werden nun wieder angezeigt, nicht nur für Gesamt und Verfügung.",
      "Ein kleiner Schreibfehler in der Wochenübersicht wurde korrigiert."
    ],
    "adjustments": []
  },
  {
    "version": "Beta 1.9.1",
    "optionalTitle": "Kleines Bugfix Update",
    "whatsNew": [],
    "bugFixes": [
      "Arbeitszeitwarnungen erscheinen nun nicht mehr über dem geöffneten Wochenplan verwalten-Fenster."
    ],
    "adjustments": []
  },
  {
    "version": "Beta 1.9.0",
    "optionalTitle": "Ein Hauch von Eleganz",
    "whatsNew": [
      "<strong>Verbesserte Meldungen:</strong> <br>Meldungen werden nun konsistent am unteren Bildschirmrand angezeigt und sind von überall in der App sichtbar. Sie erscheinen jetzt auch in passenden Farben (<span class=\"text-green-600 font-semibold\" style=\"font-weight: normal;\">Grün</span> für Erfolg, <span class=\"text-red-600 font-semibold\" style=\"font-weight: normal;\">Rot</span> für Fehler, <span class=\"text-blue-600 font-semibold\" style=\"font-weight: normal;\">Blau</span> für Informationen), um ihre Bedeutung auf den ersten Blick zu verdeutlichen."
    ],
    "bugFixes": [
      "<strong>Export-Abbruch behoben:</strong> <br />Das Abbrechen des Wochenplan-Exports führt nun nicht mehr zu einem ungewollten Download der Datei.",
      "<strong>Anpassung einiger Texte:</strong> <br>Texte für Warnungen, Anleitungen und im Versionsverlauf wurden überarbeitet und korrigiert."
    ],
    "adjustments": [
      "<strong>Konsistentes Design:</strong> <br>Der visuelle Stil der App wurde durchgängig optimiert. Ein <span class=\"text-blue-600\">frosted glass</span> mit sanften <span class=\"text-blue-600\">Blur-Effekten</span> und einheitlichen <span class=\"text-blue-600\">Animationen</span> wurde in der gesamten Anwendung eingeführt. Dies sorgt für ein modernes, konsistentes Erscheinungsbild und ein noch aufgeräumteres Nutzererlebnis."
    ]
  },
  {
    "version": "Beta 1.8.0",
    "optionalTitle": "Am Rande der Zeit",
    "whatsNew": [
      "<strong>Randzeiten:</strong> <br />Unter <span class=\"text-blue-600\">Öffnungszeiten festlegen</span> in <span class=\"text-blue-600\">Gruppen verwalten</span> kannst du jetzt Randzeiten definieren. Für Randzeiten werden die Betreuungswarnungen unterdrückt."
    ],
    "bugFixes": [
      "<strong>Button-Anordnung:</strong> <br />Öffnungszeiten-Texte in <span class=\"text-blue-600\">Vorhandene Gruppen</span> verursachen keine fehlerhafte Anordnung der Buttons mehr.",
      "<strong>Druckansicht:</strong> <br />Das Warnsymbol für Arbeitszeitverletzungen in der Tagesübersicht wird in der Druckansicht nun korrekt ausgeblendet."
    ],
    "adjustments": [
      "<strong>Button-Größen:</strong> <br />Die Buttons in der Datenverwaltung werden nun konsistent in der selben Größe dargestellt.",
      "<strong>Export-Speicherort:</strong> <br />Beim Export des Wochenplans wird nun ein Fenster zum Auswählen des Speicherorts angezeigt.",
      "<strong>Schichtblock-Darstellung:</strong> <br />Kleine Schichtblöcke stellen nun die Zeit in Minuten und gedreht dar. Das sorgt für eine kompaktere und übersichtlichere Anzeige und macht kleine Blöcke auch beim Druck lesbar.",
      "<strong>Text-Lesbarkeit:</strong> <br />Generelle Anpassungen der Textdarstellung in Schichtblöcken, um diese lesbarer zu machen."
    ]
  },
  {
    "version": "Beta 1.7.0",
    "optionalTitle": "Erklärbär-Update",
    "whatsNew": [
      "<strong>Hilfe-Button:</strong> <br>Ein neuer <span class=\"text-blue-600\">Hilfe-Button</span> ist jetzt oben rechts neben dem <span class=\"text-blue-600\">Fehler melden</span>-Button verfügbar. Klicke darauf, um die neue <span class=\"text-blue-600\">Anleitung</span> zu öffnen."
    ],
    "bugFixes": [],
    "adjustments": [
      "<strong>Button-Animationen:</strong> <br />Button Animationen wurden leicht angepasst.",
      "<strong>Versionierung:</strong> <br />Versionierung wurde angepasst."
    ]
  },
  {
    "version": "Beta 1.6.1",
    "whatsNew": [],
    "bugFixes": [
      "<strong>Druckansicht-Buttons:</strong> <br />Die Buttons zum Bearbeiten des Wochenplan-Titels und zur Verwaltung des Wochenplans werden in der Druckansicht nicht mehr angezeigt."
    ],
    "adjustments": [
      "<strong>Druckaussehen:</strong> <br />Das Aussehen beim Drucken wurde leicht angepasst."
    ]
  },
  {
    "version": "Beta 1.6.0",
    "optionalTitle": "Speicher-Update",
    "whatsNew": [],
    "bugFixes": [],
    "adjustments": [
      "<strong>Daten-Speicherung:</strong> <br>Daten werden nun ausschließlich in Speicherdateien auf dem PC gespeichert. Damit diese automatisch geladen werden, wenn die App geöffnet wird, muss im Browser die Berechtigung <span class=\"text-blue-600\">Daten bearbeiten</span> erteilt und die Option <span class=\"text-blue-600\">Bei jedem Besuch erlauben </span>ausgewählt werden.",
      "<strong>Dateiformat (Gesamt):</strong> <br />Wenn alle Daten exportiert werden, wird nun eine <span class=\"text-blue-600\">.dienstplan</span> Datei statt einer .json Datei erstellt.",
      "<strong>Dateiformat (Wochenplan):</strong> <br />Wenn ein Wochenplan exportiert wird, wird nun eine <span class=\"text-blue-600\">.wochenplan</span> Datei statt einer .json Datei erstellt."
    ]
  },
  {
    "version": "Beta 1.5.0",
    "whatsNew": [
      "<strong>Mitarbeiterfilter:</strong> <br />Es kann nun nach einzelnen Mitarbeitern gefiltert werden.",
      "<strong>Druckoptionen-Filter:</strong> <br />Gruppen und Mitarbeiter können nun direkt in den <span class=\"text-blue-600\">Druckoptionen</span> gefiltert werden.",
      "<strong>Wochenplan-Verwaltung:</strong> <br />Wochenpläne können nun exportiert, importiert und gelöscht werden, ohne dass andere Daten davon betroffen sind (muss noch ausgiebig getestet werden)."
    ],
    "bugFixes": [
      "<strong>Arbeitszeitwarnungs-Icon:</strong> <br />Das Icon für die Arbeitszeitwarnung wird nun vertikal mittig in der Reihe dargestellt."
    ],
    "adjustments": [
      "<strong>Wochenplan-Titel-Button:</strong> <br />Der Bearbeiten-Button für den Wochenplan-Titel wurde grafisch angepasst."
    ]
  },
  {
    "version": "Beta 1.4.0",
    "optionalTitle": "Druck-Update",
    "whatsNew": [
      "<strong>Druckfunktion:</strong> <br />Die erste funktionierende Druckenfunktion wurde implementiert."
    ],
    "bugFixes": [
      "<strong>Arbeitszeitwarnungen:</strong> <br />Arbeitszeitwarnungen werden nun wieder angezeigt."
    ],
    "adjustments": []
  },
  {
    "version": "Beta 1.3.0",
    "whatsNew": [
      "<strong>Block-Zuordnung:</strong> <br />Blöcke können nun anderen Gruppen zugeordnet werden, und bei Betreuungswarnungen wird dies korrekt berücksichtigt."
    ],
    "bugFixes": [
      "<strong>Block-Überlappung:</strong> <br />Im Wochenplan können sich Blöcke nun wirklich nicht mehr überlappen.",
      "<strong>Import-Fehler:</strong> <br />Importierte JSON-Dateien sollten keine Probleme mehr hervorrufen, wenn eine Gruppe bearbeitet wird."
    ],
    "adjustments": []
  },
  {
    "version": "Beta 1.2.0",
    "optionalTitle": "Öffnungszeiten und Warnungen Update",
    "whatsNew": [
      "<strong>Zusatzkräfte:</strong> <br />Unter <span class=\"text-blue-600\">Mitarbeiter verwalten</span> können Mitarbeiter als Zusatzkräfte angegeben werden. Zusatzkräfte werden unter <span class=\"text-blue-600\">normale Mitarbeiter</span>, aber über <span class=\"text-blue-600\">Praktikanten</span>, <span class=\"text-blue-600\">FSJler</span> und <span class=\"text-blue-600\">Auszubildende</span> sortiert.",
      "<strong>Gruppen-Öffnungszeiten & Betreuungswarnungen:</strong> <br>In <span class=\"text-blue-600\">Gruppen verwalten</span> können nun <span class=\"text-blue-600\">Öffnungszeiten der Gruppen</span> angegeben werden. Außerdem kann dort angegeben werden, wie viele Mitarbeiter mindestens in der Betreuung sein sollen. Im Wochenplan wird dann eine Warnung angezeigt, wenn diese Regel nicht erfüllt ist. Die Anzeige von Warnungen ist nur möglich, wenn in <span class=\"text-blue-600\">Kategorien verwalten</span> ein Block mit der Checkbox 'Als Betreuungskategorie verwenden' markiert wurde.",
      "<strong>Feedback-Button:</strong> <br />Ein <span class=\"text-blue-600\">Feedback-Button</span> wurde oben rechts hinzugefügt."
    ],
    "bugFixes": [
      "<strong>Block-Überlappung:</strong> <br />Im Wochenplan können sich nun Blöcke nicht mehr überlappen."
    ],
    "adjustments": []
  },
  {
    "version": "Beta 1.1.0",
    "optionalTitle": "Erster Beta Release des Dienstplaners",
    "whatsNew": [
      "<strong>Individuelle Verfügungszeiten für deine Mitarbeiter:</strong><br />Im Bereich <span class=\"text-blue-600\">Mitarbeiter verwalten</span> kannst du jetzt spezifische Verfügungszeiten für einzelne Mitarbeiter festlegen. Diese individuellen Einstellungen überschreiben die allgemeingültige <span class=\"text-blue-600\">Verfügungszeit-Regel</span> und ermöglichen dir eine präzisere und bedarfsgerechtere Planung.",
      "<strong>Erweiterte Mitarbeiterrollen und intelligente Arbeitszeitprüfung:</strong> <br />Lege deine Mitarbeiter detailliert als normale Mitarbeiter, FSJler, Auszubildende oder Praktikanten fest. Für FSJler, Auszubildende und Praktikanten kannst du zudem die spezifischen Tage definieren, an denen sie in deiner Einrichtung anwesend sind. Im Wochenplan werden Schultage dieser Mitarbeiter visuell heller dargestellt, um deren Abwesenheit klar zu kennzeichnen. Zusätzlich siehst du in der Wochenübersicht eine Warnung, wenn die Anwesenheitstage von FSJlern, Auszubildenden oder Praktikanten zu viel oder zu wenig Arbeitszeit aufweisen.",
      "<strong>Neue Version Popup:</strong> <br />Wenn die App geupdatet wurde erscheint nun ein einmaliges Popup, das die letzten Änderungen anzeigt."
    ],
    "bugFixes": [
      "<strong>Präzise Blockplatzierung:</strong> <br />Ein Block wird nun präzise in das Feld platziert, in das geklickt wurde, wodurch die Bedienung noch zuverlässiger wird."
    ],
    "adjustments": [
      "<strong>Optimierte Farbdarstellung für Gruppen:</strong> <br />In <span class=\"text-blue-600\">Gruppen verwalten</span> erscheinen Farben nun kräftiger, um eine bessere Unterscheidbarkeit zu gewährleisten. Im Wochenplan und in der Mitarbeiterverwaltung bleiben sie zur besseren Lesbarkeit weiterhin dezent.",
      "<strong>Visuelle Zuordnung von Mitarbeitern zu Gruppen:</strong> <br />Im Bereich <span class=\"text-blue-600\">Mitarbeiter verwalten</span> werden vorhandene Mitarbeiter nun mit der jeweiligen Gruppenfarbe hinterlegt, was dir die visuelle Identifikation und Zuordnung erheblich vereinfacht.",
      "<strong>Verbessertes Popup im Wochenplan:</strong> <br />Das <span class=\"text-blue-600\">Kategorie wählen</span>-Popup im Wochenplan wird jetzt in den Farben der Blöcke dargestellt, was die Navigation und Auswahl intuitiver macht."
    ]
  }
];



export default HelpModal;
