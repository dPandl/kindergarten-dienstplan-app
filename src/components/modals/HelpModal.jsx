import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  AlertCircle,
  Search,
  FileText,
  Users,
  Layers,
  Tag,
  Clock,
  Sparkles,
  ShieldCheck,
  Building2,
  Printer,
  Wand2,
  ChevronDown,
  CalendarClock,
  CheckCircle2,
  X,
  Lock,
  Star,
} from 'lucide-react';
import BaseModal from '../common/BaseModal';

const CATEGORIES = [
  { id: 'all', label: 'Alle Themen' },
  { id: 'start', label: '🚀 Erste Schritte' },
  { id: 'ribbon', label: '📁 Menüband & Datei' },
  { id: 'team', label: '👥 Team & Wünsche' },
  { id: 'facility', label: '🏢 Einrichtung & Teams' },
  { id: 'assistant', label: '🪄 Plan-Assistent' },
  { id: 'schedule', label: '📅 Wochenplan' },
  { id: 'rules', label: '⚖️ Gesetz & Warnungen' },
  { id: 'print', label: '🖨️ Drucken & Optik' },
];

const SECTIONS = [
    {
      id: 'quickstart',
      category: 'start',
      icon: Sparkles,
      iconColor: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
      badge: 'Empfohlen',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
      title: 'Kurzanleitung: In 6 Schritten zum ersten Dienstplan',
      content: (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Hier eine schnelle Schritt-für-Schritt-Anleitung, um deinen ersten Dienstplan im modernen Menüband-Design zu erstellen:
          </p>
          <div className="space-y-2.5">
            <div className="flex gap-3 p-2.5 rounded-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/80 dark:border-gray-700/80">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">1</span>
              <div className="text-sm">
                <strong className="text-gray-900 dark:text-gray-100">Gruppen anlegen:</strong> Klicke im Menüband auf den Tab <strong>„Gruppen“</strong> ➔ <em>Gruppe hinzufügen</em>. Lege Name (z.&nbsp;B. „Sonnenschein“), Gruppenfarbe, Öffnungszeiten und das Mindestpersonal fest.
              </div>
            </div>

            <div className="flex gap-3 p-2.5 rounded-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/80 dark:border-gray-700/80">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">2</span>
              <div className="text-sm">
                <strong className="text-gray-900 dark:text-gray-100">Mitarbeiter hinzufügen:</strong> Wechsle zum Tab <strong>„Mitarbeiter“</strong> ➔ <em>Mitarbeiter hinzufügen</em>. Trage Name, vertragliche Wochenstunden, Gruppe und den Mitarbeitertyp ein (z.&nbsp;B. <em>Normaler Mitarbeiter</em>, <em>Leitung</em>, <em>stellv. Leitung</em>, <em>Zusatzkraft</em> oder <em>Auszubildender</em> mit Schultagen).
              </div>
            </div>

            <div className="flex gap-3 p-2.5 rounded-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/80 dark:border-gray-700/80">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">3</span>
              <div className="text-sm">
                <strong className="text-gray-900 dark:text-gray-100">Leitungsfreistellung &amp; Wünsche:</strong> Bei Leitungskräften kann direkt eine prozentuale Leitungsfreistellung hinterlegt werden. Über <em>„Wünsche“</em> in der Mitarbeiter-Übersicht kannst du persönliche Wunschzeiten (⭐) oder feste Grenzen (🔒) für Wochentage erfassen.
              </div>
            </div>

            <div className="flex gap-3 p-2.5 rounded-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/80 dark:border-gray-700/80">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">4</span>
              <div className="text-sm">
                <strong className="text-gray-900 dark:text-gray-100">Schichtblöcke prüfen:</strong> Unter <strong>„Schichtblöcke“</strong> stehen deine Basisblöcke bereit (<em>Betreuung</em>, <em>Verfügungszeit</em>, <em>Leitungsfreistellung</em>). Hier kannst du auch eigene Unterkategorien mit individuellen Farben ergänzen (z.&nbsp;B. „Waldtag“, „Sprachförderung“).
              </div>
            </div>

            <div className="flex gap-3 p-2.5 rounded-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/80 dark:border-gray-700/80">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">5</span>
              <div className="text-sm">
                <strong className="text-gray-900 dark:text-gray-100">Schichten im Wochenplan anlegen:</strong> Klicke im Wochenplan auf eine freie Stelle in der Zeitleiste eines Mitarbeiters. Wähle im Farbauswahl-Popup die gewünschte Kategorie. Ziehe den Block zum Verschieben oder ziehe an den Kanten, um die Dauer im 15-Minuten-Raster flexibel anzupassen.
              </div>
            </div>

            <div className="flex gap-3 p-2.5 rounded-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/80 dark:border-gray-700/80">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">6</span>
              <div className="text-sm">
                <strong className="text-gray-900 dark:text-gray-100">Speichern &amp; Dateistatus:</strong> Achte auf das Status-Badge oben in der Titelleiste: Zeigt es <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300">⚠️ Keine Datei verknüpft</span>, liegen deine Änderungen nur im temporären Browser-Cache. Klicke im Tab <strong>„Datei“</strong> auf <strong>„Speichern unter...“</strong>, um eine feste <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">.dienstplan</span>-Datei auf deinem PC anzulegen. Sobald <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300">● Datei verknüpft</span> leuchtet, kannst du Änderungen jederzeit direkt mit <strong>„Speichern“</strong> (oder <kbd className="px-1 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">Strg + S</kbd>) in die Datei schreiben.
              </div>
            </div>
          </div>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span><strong>Fertig!</strong> Dein erster Dienstplan ist einsatzbereit und wird lokal geschützt auf deinem Computer gespeichert.</span>
          </div>
        </div>
      ),
    },
    {
      id: 'ribbon',
      category: 'ribbon',
      icon: FileText,
      iconColor: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60',
      badge: 'Office-Design',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
      title: 'Menüband & Navigation (Ribbon Bar)',
      content: (
        <div className="space-y-3 text-sm">
          <p className="text-gray-600 dark:text-gray-300">
            Das Menüband am oberen Bildschirmrand bietet schnellen Zugriff auf alle Werkzeuge im vertrauten Stil moderner Office-Programme. Es gliedert sich in 7 übersichtliche Farb-Tabs:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20">
              <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">1. Datei (Blau)</span>
              <span>Speichern, Speichern unter..., Datei öffnen, Wochenpläne verwalten &amp; Daten vergessen.</span>
            </div>
            <div className="p-2.5 rounded-xl border border-indigo-200/80 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20">
              <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">2. Mitarbeiter (Indigo)</span>
              <span>Neues Teammitglied anlegen, Mitarbeiter-Übersicht und wöchentliche Krankmeldungen.</span>
            </div>
            <div className="p-2.5 rounded-xl border border-violet-200/80 dark:border-violet-900/40 bg-violet-50/50 dark:bg-violet-950/20">
              <span className="font-bold text-violet-600 dark:text-violet-400 block mb-1">3. Gruppen (Violett)</span>
              <span>Gruppen anlegen &amp; verwalten sowie <strong>Einrichtungseinstellungen</strong> (Teamsitzungen &amp; Regeln).</span>
            </div>
            <div className="p-2.5 rounded-xl border border-purple-200/80 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20">
              <span className="font-bold text-purple-600 dark:text-purple-400 block mb-1">4. Schichtblöcke (Lila)</span>
              <span>Hauptblöcke (Betreuung, Verfügung, etc.) und individuelle Unterblöcke hinzufügen &amp; organisieren.</span>
            </div>
            <div className="p-2.5 rounded-xl border border-fuchsia-200/80 dark:border-fuchsia-900/40 bg-fuchsia-50/50 dark:bg-fuchsia-950/20">
              <span className="font-bold text-fuchsia-600 dark:text-fuchsia-400 block mb-1">5. Verfügungszeiten (Fuchsia)</span>
              <span>Berechnungsregeln für die Verfügungszeiten deiner Mitarbeiter anpassen und staffeln.</span>
            </div>
            <div className="p-2.5 rounded-xl border border-pink-200/80 dark:border-pink-900/40 bg-pink-50/50 dark:bg-pink-950/20">
              <span className="font-bold text-pink-600 dark:text-pink-400 block mb-1">6. Ansicht (Pink)</span>
              <span>Zeitleisten-Start/Endzeit anpassen, Gruppen/Mitarbeiter filtern, <em>Abwesende ausblenden</em>.</span>
            </div>
            <div className="p-2.5 rounded-xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 sm:col-span-2">
              <span className="font-bold text-rose-600 dark:text-rose-400 block mb-1">7. Drucken (Rose)</span>
              <span>Druckfilter für bestimmte Gruppen oder Mitarbeiter, Wochenübersicht und Druckvorschau.</span>
            </div>
          </div>
          <div className="p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 text-xs space-y-1">
            <div>💡 <strong>Einklappen / Erweitern:</strong> Klicke auf den Button <em>„Einklappen“</em> ganz rechts (oder erneut auf den aktuell aktiven Tab), um das Menüband einzuklappen und mehr vertikalen Platz für den Dienstplan zu gewinnen.</div>
            <div>🏢 <strong>Kopfleiste:</strong> Zeigt den Dateistatus (<em>Gespeichert</em> in Grün / <em>Lokal</em> in Grau), die App-Version und Buttons für Dark Mode, Einstellungen, Hilfe und Support.</div>
          </div>
        </div>
      ),
    },
    {
      id: 'team',
      category: 'team',
      icon: Users,
      iconColor: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60',
      badge: 'Aktualisiert',
      badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300',
      title: 'Mitarbeiter verwalten, Rollen & Wünsche',
      content: (
        <div className="space-y-3 text-sm">
          <p className="text-gray-600 dark:text-gray-300">
            Verwalte dein Personal flexibel mit differenzierten Rollen, Leitungsfreistellungen und persönlichen Wünschen:
          </p>
          <ul className="list-disc list-outside pl-5 space-y-1.5 text-xs">
            <li>
              <strong>Mitarbeitertypen &amp; Rollen:</strong>
              <div className="mt-1 space-y-1">
                <div>• <strong>Normaler Mitarbeiter:</strong> Reguläre pädagogische Fachkraft.</div>
                <div>• <strong>Leitung &amp; stellv. Leitung:</strong> Für Einrichtungsleitung und Stellvertretung. <em>Nur bei Auswahl dieser beiden Typen erscheint das Feld „Leitungsfreistellung (%)“!</em></div>
                <div>• <strong>Zusatzkraft:</strong> Ergänzende Unterstützungskräfte.</div>
                <div>• <strong>Auszubildender, FSJler, Praktikant:</strong> Ermöglicht die Auswahl fester <strong>Anwesenheitstage</strong> (z.&nbsp;B. für Berufsschultage). An Schultagen werden Mitarbeiter optisch gedimmt.</div>
              </div>
            </li>
            <li>
              <strong>Leitungsfreistellung in %:</strong> Hinterlege den prozentualen Freistellungsanteil der Leitungskraft. Der Schichtblock <em>„Leitungsfreistellung“</em> wird vom Plan-Generator automatisch auf Kosten der Betreuungszeit (nie der Verfügung) eingeplant und in der Wochenübersicht exakt gegengerechnet.
            </li>
            <li>
              <strong>Individuelle Verfügungszeit (VZ):</strong> Überschreibt auf Wunsch die allgemeine Berechnungsregel für diesen Mitarbeiter.
            </li>
            <li>
              <strong>Arbeitszeiten &amp; Wünsche erfassen:</strong> Klicke in der Mitarbeiter-Übersicht auf <strong>„Wünsche“</strong>. Hier kannst du pro Wochentag festlegen:
              <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                  <span className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                    <Lock size={12} /> Feste Vorgabe (Muss)
                  </span>
                  <span>Verbindliche Schranken (z.&nbsp;B. Kraft kann montags nur bis 14 Uhr). Wird vom Generator zwingend respektiert.</span>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <span className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <Star size={12} /> Unverbindlicher Wunsch (Kann)
                  </span>
                  <span>Persönliche Vorlieben wie Wunschfrei, Wunsch-Arbeitszeit, Früh-/Spätschicht oder VZ-Lage (vormittags/nachmittags).</span>
                </div>
              </div>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'facility',
      category: 'facility',
      icon: Building2,
      iconColor: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800/60',
      badge: 'Neu',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
      title: 'Einrichtungseinstellungen: Teamsitzungen & Leitungsabdeckung',
      content: (
        <div className="space-y-3 text-sm">
          <p className="text-gray-600 dark:text-gray-300">
            Im Tab <strong>„Gruppen“</strong> findest du den neuen Button <strong>„Einrichtungseinstellungen“</strong>. Hier konfigurierst du einrichtungsweite Rahmenbedingungen:
          </p>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl border border-violet-200 dark:border-violet-800/60 bg-violet-50/50 dark:bg-violet-950/20">
              <span className="font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1.5 mb-1">
                <CalendarClock size={14} /> Teamsitzungen konfigurieren
              </span>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Art der Besprechung:</strong> Gesamteinrichtung (Generell) oder gruppenintern.</li>
                <li><strong>Turnus:</strong> Wöchentlich oder 2-wöchentlich (alle 2 Wochen).</li>
                <li><strong>Teilnehmerkreis:</strong> Alle Mitarbeiter (inkl. Teilzeitkräfte) oder nur Vollzeitkräfte.</li>
                <li><strong>Automatische Berücksichtigung:</strong> Der Plan-Generator bindet Sitzungen automatisch als Schichtblöcke ein und plant Vollzeitkräfte an Tagen mit Abend-Teamsitzung nicht in den Frühdienst ein, um unzulässige Arbeitszeitspannen zu vermeiden.</li>
              </ul>
            </div>

            <div className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/20">
              <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 mb-1">
                <ShieldCheck size={14} /> Leitungsabdeckung bis Betreuungsende
              </span>
              <p>
                Aktiviere diese Option, wenn an jedem Tag bis zum Ende der Öffnungszeit mindestens eine Leitung oder stellvertretende Leitung im Haus anwesend sein muss. Der Plan-Generator bevorzugt Leitungskräfte dann automatisch für den Spätdienst.
              </p>
            </div>

            <div className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60">
              <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 mb-1">
                <Tag size={14} /> Generator-Regeln
              </span>
              <p>
                Definiere zusätzliche Schicht- und Zuteilungsregeln, die der automatische Dienstplan-Assistent bei der Berechnung berücksichtigen soll.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'assistant',
      category: 'assistant',
      icon: Wand2,
      iconColor: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
      badge: 'KI-Planung',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
      title: '🪄 Plan-Assistent: Automatische Dienstplanerstellung',
      content: (
        <div className="space-y-3 text-sm">
          <p className="text-gray-600 dark:text-gray-300">
            Der automatische Plan-Assistent berechnet lückenlose, bedarfsgerechte Dienstpläne in Sekunden unter Beachtung aller gesetzlichen und betrieblichen Vorgaben:
          </p>

          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs space-y-1 text-blue-900 dark:text-blue-200">
            <strong>So aktivierst und öffnest du den Plan-Assistenten:</strong>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Klicke oben rechts auf das <strong>Zahnrad (Einstellungen)</strong>.</li>
              <li>Scrolle nach unten zu <strong>„Experimentelle Features“</strong> und aktiviere <strong>„Experimenteller Plan-Assistent“</strong>.</li>
              <li>Gehe im Menüband auf den Tab <strong>„Datei“ ➔ „Wochenpläne“</strong>. Dort erscheint nun die Schaltfläche <strong>„Plan-Assistent öffnen“</strong>.</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
              <strong className="text-emerald-700 dark:text-emerald-300 block mb-1">Ersatzplan bei Ausfall / Krankheit</strong>
              <span>Minimal-invasiv: Schließt Lücken durch kranke Kollegen automatisch, wandelt bei Bedarf Verfügungszeiten temporär um oder verlängert Schichten gesunder Kollegen – ohne den restlichen Plan umzuwerfen.</span>
            </div>
            <div className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/20">
              <strong className="text-indigo-700 dark:text-indigo-300 block mb-1">Vollständiger Plan (Neuerstellung)</strong>
              <span>Erzeugt einen kompletten, optimierten Wochenplan von Grund auf unter Beachtung von Mindestpersonal, Öffnungszeiten, Arbeitsverträgen, Teamsitzungen und Mitarbeiterwünschen.</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            🛡️ <strong>100% Sicher:</strong> Bei jeder Generierung wird automatisch ein neuer Wochenplan angelegt. Dein vorheriger Stand bleibt unangetastet erhalten.
          </p>
        </div>
      ),
    },
    {
      id: 'schedule',
      category: 'schedule',
      icon: Clock,
      iconColor: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60',
      title: 'Wochenplan, Krankmeldungen & Multi-Pläne',
      content: (
        <div className="space-y-3 text-sm">
          <ul className="list-disc list-outside pl-5 space-y-2 text-xs text-gray-700 dark:text-gray-300">
            <li>
              <strong>Schichten anpassen:</strong> Klicke auf eine freie Stelle der Zeitleiste, um einen Block zu setzen. Ziehe den Block, um ihn horizontal zu verschieben. Ziehe an den linken oder rechten Kanten, um die Dauer im 15-Minuten-Raster zu verlängern oder zu verkürzen.
            </li>
            <li>
              <strong>Krankmeldungen &amp; Abwesende ausblenden:</strong> Über <em>Mitarbeiter ➔ Krankmeldungen</em> oder das rote Badge neben dem Wochentag können Kranke markiert werden. Sie werden auf der Zeitleiste durchgestrichen dargestellt. Mit der Option <strong>„Abwesende ausblenden“</strong> (Tab <em>Ansicht</em>) werden kranke Mitarbeiter sowie Teilzeitkräfte an ihren Schultagen ausgeblendet.
            </li>
            <li>
              <strong>Multi-Wochenplan-Verwaltung:</strong> Direkt über dem Wochenplan kannst du per Schnellwechsler-Tabs zwischen mehreren Plänen wechseln (z.&nbsp;B. Standardplan, Ferienplan, Notgruppe). In der Wochenplan-Verwaltung (Tab <em>Datei ➔ Wochenpläne</em>) kannst du Pläne duplizieren, umbenennen oder als <span className="font-mono">.wochenplan</span> exportieren.
            </li>
            <li>
              <strong>Automatische Pausen:</strong> Gesetzliche Ruhepausen nach ArbZG werden automatisch berechnet, visuell im Schichtblock markiert und von der Nettoarbeitszeit abgezogen.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'rules',
      category: 'rules',
      icon: AlertCircle,
      iconColor: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60',
      badge: 'Rechtssicherheit',
      badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
      title: 'Gesetzliche Vorgaben (ArbZG) & Warnungen',
      content: (
        <div className="space-y-3 text-sm">
          <p className="text-gray-600 dark:text-gray-300">
            Die App wacht in Echtzeit über gesetzliche Vorgaben und Personalunterbesetzungen:
          </p>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
              <strong className="text-red-700 dark:text-red-300 flex items-center gap-1.5 mb-1">
                <AlertCircle size={14} /> Arbeitszeitgesetz (ArbZG)
              </strong>
              <span>
                Warnt mit einem roten Dreieck ⚠️ am Mitarbeiternamen, falls gesetzliche Pausen (mind. 30 Min ab 6h, mind. 45 Min ab 9h) fehlen oder die Höchstarbeitszeit von 10 Stunden überschritten wird.
              </span>
            </div>

            <div className="p-2.5 rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20">
              <strong className="text-orange-700 dark:text-orange-300 flex items-center gap-1.5 mb-1">
                <ShieldCheck size={14} /> Betreuungswarnung (Unterbesetzung)
              </strong>
              <span>
                Rote transparente Balken im Dienstplan markieren Zeiten, in denen weniger Mitarbeiter anwesend sind als im Mindestpersonal der Gruppe definiert. Randzeiten (z.&nbsp;B. Früh-/Spätdienst) werden dabei auf Wunsch ignoriert.
              </span>
            </div>

            <div className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
              <strong className="text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-1">
                <Users size={14} /> Warnung bei Azubi-Alleinbetreuung
              </strong>
              <span>
                Die App warnt zusätzlich, falls sich während der Betreuungszeit ausschließlich Auszubildende oder Praktikanten ohne anwesende Fachkraft in einer Gruppe befinden.
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'print',
      category: 'print',
      icon: Printer,
      iconColor: 'text-pink-600 bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800/60',
      title: 'Drucken, Farblegende & Design',
      content: (
        <div className="space-y-3 text-sm">
          <ul className="list-disc list-outside pl-5 space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
            <li>
              <strong>Wochenplan-Legende:</strong> Am unteren Ende des Dienstplans schlüsselt eine kompakte Legende alle verwendeten Basisblöcke, Unterkategorien, Pausen und Verfügungszeiten mit ihren Farben auf.
            </li>
            <li>
              <strong>Druckoptimierung für den Aushang:</strong> Beim Drucken (`Strg + P` oder Tab *Drucken*) werden alle Bedienelemente und Menüs ausgeblendet. Gruppenstreifen schließen nahtlos ab und die Legende wird für das Team sauber mitgedruckt.
            </li>
            <li>
              <strong>Druckfilter:</strong> Im Druckdialog kannst du flexibel festlegen, ob alle Gruppen, einzelne Teams oder nur bestimmte Mitarbeiter ausgedruckt werden sollen.
            </li>
            <li>
              <strong>Lebendige Hintergründe:</strong> In den Einstellungen (Zahnrad oben rechts) stehen animierte Hintergründe wie <em>Liquid Chrome</em>, <em>Gradient Mesh</em>, <em>Beams</em>, <em>Prismatic Burst</em> oder <em>Aurora</em> zur Verfügung.
            </li>
            <li>
              <strong>Augenschonender Dark Mode:</strong> Ein moderner Dunkelmodus mit angenehmen Slate-Kontrasten und blendfreien Farben schont die Augen bei längeren Sitzungen.
            </li>
          </ul>
        </div>
      ),
    },
  ];

const HelpModal = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [openSections, setOpenSections] = useState({
    'quickstart': true,
  });

  const toggleSection = (id) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const allOpen = {};
    SECTIONS.forEach((s) => {
      allOpen[s.id] = true;
    });
    setOpenSections(allOpen);
  };

  const collapseAll = () => {
    setOpenSections({});
  };

  const filteredSections = useMemo(() => {
    return SECTIONS.filter((sec) => {
      const matchesCategory = selectedCategory === 'all' || sec.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const titleMatches = sec.title.toLowerCase().includes(q);
      const idMatches = sec.id.toLowerCase().includes(q);
      return titleMatches || idMatches;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title="Anleitung & Hilfe"
      icon={HelpCircle}
      maxWidth="max-w-4xl"
      zIndex={110}
    >
      <div className="space-y-4 text-gray-700 dark:text-gray-200">
        
        {/* Top-Bar: Search + Controls */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between pb-1 border-b border-gray-200/80 dark:border-gray-800">
          {/* Suchleiste */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="In der Anleitung suchen (z.B. Teamsitzung, Leitung, Speichern)..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                title="Suche zurücksetzen"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Aufklappen / Zuklappen Buttons */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={expandAll}
              className="text-[11px] px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition font-medium whitespace-nowrap cursor-pointer"
            >
              Alle aufklappen
            </button>
            <button
              onClick={collapseAll}
              className="text-[11px] px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition font-medium whitespace-nowrap cursor-pointer"
            >
              Alle einklappen
            </button>
          </div>
        </div>

        {/* Kategorie-Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar select-none text-xs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Accordion Cards Liste */}
        <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-1">
          {filteredSections.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 space-y-2">
              <Search size={32} className="mx-auto text-gray-400 dark:text-gray-500 opacity-60" />
              <p className="text-sm font-medium">Keine passenden Themen gefunden für „{searchQuery}“.</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
              >
                Suche &amp; Filter zurücksetzen
              </button>
            </div>
          ) : (
            filteredSections.map((sec) => {
              const Icon = sec.icon;
              const isOpen = openSections[sec.id] || Boolean(searchQuery.trim());
              return (
                <div
                  key={sec.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? 'bg-white/95 dark:bg-gray-800/95 border-gray-300 dark:border-gray-700 shadow-sm'
                      : 'bg-gray-50/80 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/80 hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
                  }`}
                >
                  <button
                    onClick={() => toggleSection(sec.id)}
                    className="w-full flex items-center justify-between p-3.5 text-left select-none cursor-pointer gap-3 group"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl border flex-shrink-0 transition-transform group-hover:scale-105 ${sec.iconColor}`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm sm:text-base text-gray-800 dark:text-gray-100 tracking-tight">
                            {sec.title}
                          </span>
                          {sec.badge && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sec.badgeColor}`}>
                              {sec.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`p-1 rounded-lg text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-transform duration-200 flex-shrink-0 ${
                      isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                    }`}>
                      <ChevronDown size={18} />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-700/60 animate-fadeIn">
                      {sec.content}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer / Status */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
              Dienstplan App vBeta 2.0.3
            </span>
            <span>Entwickelt für Kitas und soziale Einrichtungen.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-xl shadow-md transition hover:scale-105 duration-200 active:scale-95 text-xs sm:text-sm cursor-pointer"
            >
              Schließen
            </button>
          </div>
        </div>

      </div>
    </BaseModal>
  );
};

// --- Release Notes Data ---
export const RELEASE_NOTES = [
  {
    "version": "Beta 2.0.3",
    "optionalTitle": "Leitungsfreistellung & Speicherstatus",
    "whatsNew": [
      "<strong>Mitarbeiter-Typen Leitung & stellv. Leitung:</strong> <br />In den Mitarbeiter-Stammdaten kann nun gezielt zwischen „Normaler Mitarbeiter“, „Leitung“, „stellv. Leitung“, „Zusatzkraft“, „Auszubildender“, „FSJler“ und „Praktikant“ gewählt werden. Das Feld für die prozentuale Leitungsfreistellung wird passgenau nur bei Leitungskräften angezeigt.",
      "<strong>Dateiverknüpfung & Speicherwarnung:</strong> <br />Die Menüleiste warnt nun unübersehbar mit einem gelben Hinweis („Keine Datei verknüpft“), wenn der Plan noch nicht als Datei gesichert wurde. Bei verknüpfter Datei wird der Status transparent angezeigt."
    ],
    "bugFixes": [
      "<strong>Performance & flüssige Menüs:</strong> <br />Dropdowns und Dialoge reagieren nun ohne spürbare Eingabelatenz und öffnen sich absolut verzögerungsfrei.",
      "<strong>Updateverlauf-Sortierung:</strong> <br />Ein Problem behoben, durch das 2.x.x-Versionen im Updateverlauf unter älteren Versionen angezeigt wurden.",
      "<strong>Fixierte Navigationsleisten im Updateverlauf:</strong> <br />Schließen- und Zurück-Buttons bleiben nun dauerhaft fixiert und scrollen nicht mehr mit."
    ],
    "adjustments": [
      "<strong>Farbanpassungen im Ribbon-Menü:</strong> <br />Die Farben der Schaltflächen und Steuerelemente im Ribbon-Menü wurden an das Farbschema des jeweiligen Tabs angepasst und harmonisiert.",
      "<strong>Browser-Kontextmenü deaktiviert:</strong> <br />Das native Browser-Kontextmenü bei Rechtsklick wurde für ein reines App-Gefühl unterbunden (in Texteingabefeldern bleibt es für Kopieren/Einfügen aktiv).",
      "<strong>Interne Anleitung & Hilfe:</strong> <br />Vollständige Überarbeitung und Modernisierung der internen Anleitung & Hilfe mit Echtzeit-Suche und Themen-Kategorien."
    ]
  },
  {
    "version": "Beta 2.0.2",
    "optionalTitle": "Automatischer Dienstplan-Generator & Azubi-Warnung",
    "whatsNew": [
      "<strong>Experimenteller Plan-Assistent:</strong> <br />In den Einstellungen gibt es nun einen neuen Bereich für \"Experimentelle Features\". Dort kann der \"Automatische Dienstplan-Generator\" aktiviert werden, mit dem man einen Dienstplan automatisch erstellen lassen kann. Dieser lässt sich dann in der Wochenplanverwaltung abrufen.",
      "<strong>Warnung bei Azubi-Alleinbetreuung:</strong> <br />Die App warnt nun zusätzlich, falls sich während der Betreuungszeit ausschließlich Auszubildende in einer Gruppe befinden."
    ],
    "bugFixes": [],
    "adjustments": []
  },
  {
    "version": "Beta 2.0.1",
    "optionalTitle": "Blockmenü Optimierungen & Fehlerbehebungen",
    "whatsNew": [],
    "bugFixes": [
      "Ein Problem wurde behoben, durch das sich das Blockmenü beim Anklicken nach dem Herunterscrollen nicht korrekt an der Mausposition geöffnet hat."
    ],
    "adjustments": [
      "Das Design der Blockmenüs im Wochenplan wurde optimiert, sodass es sowohl im Dark Mode als auch im Bright Mode perfekt zur Geltung kommt und optimal lesbar ist."
    ]
  },
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
