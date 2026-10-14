import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import CustomSelect from '../common/CustomSelect';
import ConfirmModal from './ConfirmModal';
import {
  Building2,
  CalendarClock,
  ShieldCheck,
  ListChecks,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Check,
  Info,
  CalendarDays,
  Repeat,
  Users,
  Users2,
  Layers,
} from 'lucide-react';
import { WEEK_DAYS_PLAN } from '../../constants/scheduleConstants';
import { getStrongGroupColor, getTailwindColorValue } from '../../utils/colorUtils';

export const DEFAULT_FACILITY_SETTINGS = {
  teamMeetings: [],
  requireLeadershipUntilClose: false,
  generatorRules: [],
};

const MEETING_TYPE_OPTIONS = [
  { value: 'general', label: 'Gesamteinrichtung (Generell)' },
  { value: 'group_internal', label: 'Gruppenintern' },
];

const MEETING_INTERVAL_OPTIONS = [
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'biweekly', label: '2-wöchentlich (alle 2 Wochen)' },
];

const PARTICIPANT_SCOPE_OPTIONS = [
  { value: 'all', label: 'Alle Mitarbeiter (inkl. Teilzeitkräfte)' },
  { value: 'fulltime_only', label: 'Nur 100% Vollzeitkräfte' },
];

const uid = () => Math.random().toString(36).slice(2, 9);
const WEEK_DAYS_OPTIONS = ['Alle Tage', ...WEEK_DAYS_PLAN, 'Beliebiger Tag'];
const dayLabel = (val) => {
  if (val === 'all') return 'Alle Tage';
  if (val === 'any') return 'Beliebiger Tag';
  return val;
};
const dayValue = (label) => {
  if (label === 'Alle Tage') return 'all';
  if (label === 'Beliebiger Tag') return 'any';
  return label;
};

const TABS = [
  { id: 'meetings',   label: 'Teamsitzungen',     icon: CalendarClock },
  { id: 'leadership', label: 'Leitungsabdeckung', icon: ShieldCheck },
  { id: 'rules',      label: 'Generator-Regeln',  icon: ListChecks },
];

const FacilitySettingsModal = ({
  isOpen,
  onClose,
  settings = DEFAULT_FACILITY_SETTINGS,
  onSave,
  categories = [],
  subCategories = [],
  groups = [],
}) => {
  const [activeTab, setActiveTab] = useState('meetings');
  const [local, setLocal] = useState({ ...DEFAULT_FACILITY_SETTINGS });
  const [confirm, setConfirm] = useState({ show: false, message: '', onConfirm: null });

  // Sub-Modale für Erstellen/Bearbeiten (wie in Mitarbeiter, Gruppen, Schichtblöcken)
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null); // null = neu anlegen, sonst Meeting-Objekt

  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null); // null = neu anlegen, sonst Rule-Objekt

  useEffect(() => {
    if (isOpen) {
      setLocal({ ...DEFAULT_FACILITY_SETTINGS, ...settings });
      setActiveTab('meetings');
      setShowMeetingModal(false);
      setEditingMeeting(null);
      setShowRuleModal(false);
      setEditingRule(null);
    }
  }, [isOpen, settings]);

  const update = (patch) => setLocal((prev) => ({ ...prev, ...patch }));

  // Teamsitzung Aktionen
  const handleOpenAddMeeting = () => {
    setEditingMeeting({
      id: uid(),
      day: 'Montag',
      startTime: '14:00',
      endTime: '16:00',
      interval: 'weekly', // 'weekly' | 'biweekly'
      participantScope: 'all', // 'all' | 'fulltime_only'
      meetingType: 'general', // 'general' | 'group_internal'
      targetGroupId: '', // Gruppe für gruppeninterne Sitzung
      subCategoryId: '', // Gewählter Unterblock (SubCategory ID)
    });
    setShowMeetingModal(true);
  };

  const handleOpenEditMeeting = (meeting) => {
    setEditingMeeting({
      interval: 'weekly',
      participantScope: 'all',
      meetingType: 'general',
      targetGroupId: '',
      subCategoryId: '',
      ...meeting,
    });
    setShowMeetingModal(true);
  };

  const handleSaveMeeting = (meetingToSave) => {
    const exists = (local.teamMeetings || []).some((m) => m.id === meetingToSave.id);
    if (exists) {
      update({
        teamMeetings: local.teamMeetings.map((m) => (m.id === meetingToSave.id ? meetingToSave : m)),
      });
    } else {
      update({
        teamMeetings: [...(local.teamMeetings || []), meetingToSave],
      });
    }
    setShowMeetingModal(false);
    setEditingMeeting(null);
  };

  const removeMeeting = (id) =>
    update({ teamMeetings: (local.teamMeetings || []).filter((m) => m.id !== id) });

  const confirmRemoveMeeting = (meeting) =>
    setConfirm({
      show: true,
      message: `Teamsitzung am ${meeting.day} (${meeting.startTime} – ${meeting.endTime} Uhr) wirklich entfernen?`,
      onConfirm: () => removeMeeting(meeting.id),
    });

  // Generator-Regeln Aktionen
  const handleOpenAddRule = () => {
    setEditingRule({
      id: uid(),
      label: 'Neue Regel',
      day: 'all',
      fromTime: '11:30',
      toTime: '13:00',
      sourceGroup: 'any',
      assignBlock: '',
      blockType: 'category',
    });
    setShowRuleModal(true);
  };

  const handleOpenEditRule = (rule) => {
    setEditingRule({ ...rule });
    setShowRuleModal(true);
  };

  const handleSaveRule = (ruleToSave) => {
    const exists = (local.generatorRules || []).some((r) => r.id === ruleToSave.id);
    if (exists) {
      update({
        generatorRules: local.generatorRules.map((r) => (r.id === ruleToSave.id ? ruleToSave : r)),
      });
    } else {
      update({
        generatorRules: [...(local.generatorRules || []), ruleToSave],
      });
    }
    setShowRuleModal(false);
    setEditingRule(null);
  };

  const removeRule = (id) =>
    update({ generatorRules: (local.generatorRules || []).filter((r) => r.id !== id) });

  const confirmRemoveRule = (rule) =>
    setConfirm({
      show: true,
      message: `Regel „${rule.label || 'Unbenannte Regel'}“ wirklich entfernen?`,
      onConfirm: () => removeRule(rule.id),
    });

  const closeConfirm = () => setConfirm({ show: false, message: '', onConfirm: null });

  const handleSave = () => {
    onSave?.(local);
    onClose();
  };

  const blockOptions = [
    ...categories
      .filter((c) => !c.isDisposalTimeCategory)
      .map((c) => ({ value: c.id, label: c.name, type: 'category' })),
    ...subCategories.map((s) => {
      const parent = categories.find((c) => c.id === s.parentCategoryId);
      return { value: s.id, label: `${s.name}${parent ? ` (${parent.name})` : ''}`, type: 'subcategory' };
    }),
  ];

  const disposalCategoryIds = new Set(
    (categories || []).filter((c) => c.isDisposalTimeCategory).map((c) => c.id)
  );

  const disposalSubCategoryOptions = (subCategories || [])
    .map((s) => {
      const parent = categories.find((c) => c.id === s.parentCategoryId);
      return {
        value: s.id,
        label: `${s.name}${parent ? ` (${parent.name})` : ''}`,
      };
    });

  const groupSelectOptions = (groups || []).map((g) => {
    const strongClass = getStrongGroupColor(g.color);
    const hexColor = getTailwindColorValue(strongClass);
    return {
      value: g.id,
      label: g.name,
      icon: (
        <span
          className="inline-block w-3.5 h-3.5 rounded-full shrink-0 border border-white/60 shadow-xs"
          style={{ backgroundColor: hexColor }}
        />
      ),
    };
  });

  const getSubCategoryName = (subId) => {
    if (!subId) return null;
    const sub = (subCategories || []).find((s) => s.id === subId);
    return sub ? sub.name : null;
  };

  const getGroupName = (groupId) => {
    if (!groupId) return null;
    const grp = (groups || []).find((g) => g.id === groupId);
    return grp ? grp.name : null;
  };

  const isAnySubModalOpen = showMeetingModal || showRuleModal;

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="Einrichtungseinstellungen"
        icon={Building2}
        maxWidth="max-w-4xl"
        height="h-[620px] max-h-[88vh]"
        zIndex={50}
        isDimmed={isAnySubModalOpen}
        bodyClassName="p-6 flex flex-col flex-1 min-h-0 overflow-hidden space-y-4"
      >
        <div className="flex flex-col flex-1 min-h-0 space-y-4">
          {/* Tab-Leiste im Standard-Stil der App */}
          <div className="shrink-0 flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 outline-none focus:outline-none select-none ${
                    isActive
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xs border border-gray-200/80 dark:border-gray-700'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 border border-transparent'
                  }`}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                  {tab.id === 'meetings' && (local.teamMeetings || []).length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                      {local.teamMeetings.length}
                    </span>
                  )}
                  {tab.id === 'rules' && (local.generatorRules || []).length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                      {local.generatorRules.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Inhaltsbereich mit fester Höhe und Scrollbar bei Bedarf */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {/* TAB 1: TEAMSITZUNGEN */}
            {activeTab === 'meetings' && (
            <div className="space-y-4">
              {/* Header inside Modal mit Hinzufügen-Button wie in EmployeeList/GroupList */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Definierte Teamsitzungen ({(local.teamMeetings || []).length})
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Feste Zeitfenster, an denen Mitarbeiter zur gemeinsamen Teamsitzung eingeplant werden.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddMeeting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs shadow-sm transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Teamsitzung hinzufügen</span>
                </button>
              </div>

              {/* Liste der Teamsitzungen */}
              {(local.teamMeetings || []).length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <CalendarClock size={36} className="mx-auto mb-2 opacity-40 text-blue-600" />
                  <p className="font-medium">Noch keine Teamsitzungen eingetragen.</p>
                  <p className="text-xs mt-1">Klicke oben auf "Teamsitzung hinzufügen", um eine neue Sitzungszeit festzulegen.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {local.teamMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-200 dark:border-blue-800">
                          <Clock size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                              {meeting.day}
                            </span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                              meeting.meetingType === 'group_internal'
                                ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}>
                              {meeting.meetingType === 'group_internal'
                                ? (meeting.targetGroupId && getGroupName(meeting.targetGroupId)
                                    ? `Gruppe: ${getGroupName(meeting.targetGroupId)}`
                                    : 'Gruppenintern')
                                : 'Generell'}
                            </span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                              meeting.interval === 'biweekly'
                                ? 'bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                                : 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                            }`}>
                              {meeting.interval === 'biweekly' ? '2-wöchentlich' : 'Wöchentlich'}
                            </span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                              meeting.participantScope === 'fulltime_only'
                                ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                                : 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                            }`}>
                              {meeting.participantScope === 'fulltime_only' ? 'Nur 100% Kräfte' : 'Alle (inkl. Teilzeit)'}
                            </span>
                            {meeting.subCategoryId && getSubCategoryName(meeting.subCategoryId) && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 flex items-center gap-1">
                                <Layers size={11} />
                                {getSubCategoryName(meeting.subCategoryId)}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium block mt-0.5">
                            {meeting.startTime} – {meeting.endTime} Uhr
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditMeeting(meeting)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition cursor-pointer"
                          title="Teamsitzung bearbeiten"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmRemoveMeeting(meeting)}
                          className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition cursor-pointer"
                          title="Teamsitzung entfernen"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LEITUNGSABDECKUNG */}
          {activeTab === 'leadership' && (
            <div className="space-y-4 pt-1">
              <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!local.requireLeadershipUntilClose}
                    onChange={(e) => update({ requireLeadershipUntilClose: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer focus:ring-blue-400 mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 block">
                      Leitungsabdeckung bis Kindergartenende verpflichtend
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1 leading-relaxed">
                      Jeden Tag muss mindestens eine Person mit der Rolle „Leitung“ oder „Stellvertretung“ bis zum Ende
                      der Öffnungszeit eingeplant sein. Der Dienstplan-Assistent berücksichtigt diese Anforderung strikt.
                    </span>
                  </div>
                </label>
              </div>

              {local.requireLeadershipUntilClose && (
                <div className="flex items-center gap-2.5 p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs text-blue-800 dark:text-blue-200">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>
                    <strong>Aktiviert:</strong> Der Plan-Generator stellt sicher, dass zu Dienstschluss stets eine
                    Leitungskraft anwesend ist.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: GENERATOR-REGELN */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              {/* Header inside Modal mit Hinzufügen-Button wie in CategoryList/EmployeeList */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Generator-Regeln ({(local.generatorRules || []).length})
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Eigene Regeln für den Plan-Generator (z.B. feste Schicht- oder Essensausgaben-Einteilungen).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddRule}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs shadow-sm transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Regel hinzufügen</span>
                </button>
              </div>

              {/* Liste der Regeln */}
              {(local.generatorRules || []).length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <ListChecks size={36} className="mx-auto mb-2 opacity-40 text-blue-600" />
                  <p className="font-medium">Noch keine Generator-Regeln definiert.</p>
                  <p className="text-xs mt-1">Klicke oben auf "Regel hinzufügen", um eine neue Vorgabe zu erstellen.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {local.generatorRules.map((rule) => {
                    const blockObj = blockOptions.find((o) => o.value === rule.assignBlock);
                    const groupObj = groups.find((g) => g.id === rule.sourceGroup);

                    return (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-200 dark:border-indigo-800">
                            <ListChecks size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                                {rule.label || 'Unbenannte Regel'}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                                {dayLabel(rule.day)}
                              </span>
                              {rule.sourceGroup !== 'any' && groupObj && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium border border-purple-200 dark:border-purple-800/60">
                                  {groupObj.name}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400 block mt-0.5">
                              {rule.fromTime}–{rule.toTime} Uhr • Block: {blockObj?.label || 'Nicht zugewiesen'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditRule(rule)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition cursor-pointer"
                            title="Regel bearbeiten"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmRemoveRule(rule)}
                            className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition cursor-pointer"
                            title="Regel entfernen"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          </div>

          {/* Standard Actions Footer wie in allen Modalen (Abbrechen grau / Speichern blau) */}
          <div className="shrink-0 flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-lg text-sm transition cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center gap-1.5"
            >
              <Check size={16} />
              <span>Einstellungen speichern</span>
            </button>
          </div>
        </div>
      </BaseModal>

      {/* ── Sub-Modal: Teamsitzung hinzufügen / bearbeiten ── */}
      {showMeetingModal && editingMeeting && (
        <BaseModal
          isOpen={showMeetingModal}
          onClose={() => {
            setShowMeetingModal(false);
            setEditingMeeting(null);
          }}
          title={
            (local.teamMeetings || []).some((m) => m.id === editingMeeting.id)
              ? 'Teamsitzung bearbeiten'
              : 'Teamsitzung hinzufügen'
          }
          icon={CalendarClock}
          maxWidth="max-w-2xl"
          zIndex={60}
          bodyClassName="p-6 flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <div className="flex flex-col flex-1 min-h-0">
            {/* Scrollbarer Inhaltsbereich mit aufgeteiltem 2-Spalten-Layout */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {/* Zeile 1: Wochentag & Zeiten */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Wochentag *
                  </label>
                  <CustomSelect
                    value={editingMeeting.day}
                    onChange={(e) => setEditingMeeting((prev) => ({ ...prev, day: e.target.value }))}
                    options={WEEK_DAYS_PLAN}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Startzeit (Von) *
                    </label>
                    <input
                      type="time"
                      value={editingMeeting.startTime}
                      onChange={(e) => setEditingMeeting((prev) => ({ ...prev, startTime: e.target.value }))}
                      className="w-full p-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Endzeit (Bis) *
                    </label>
                    <input
                      type="time"
                      value={editingMeeting.endTime}
                      onChange={(e) => setEditingMeeting((prev) => ({ ...prev, endTime: e.target.value }))}
                      className="w-full p-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm transition"
                    />
                  </div>
                </div>
              </div>

              {/* Zeile 2: Art der Teamsitzung & Betreffende Gruppe / Unterblock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Art der Teamsitzung
                  </label>
                  <CustomSelect
                    value={editingMeeting.meetingType || 'general'}
                    onChange={(e) => setEditingMeeting((prev) => ({ ...prev, meetingType: e.target.value }))}
                    options={MEETING_TYPE_OPTIONS}
                  />
                </div>

                {editingMeeting.meetingType === 'group_internal' ? (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Betreffende Gruppe *
                    </label>
                    <CustomSelect
                      value={editingMeeting.targetGroupId || ''}
                      placeholder="— Gruppe auswählen —"
                      onChange={(e) => setEditingMeeting((prev) => ({ ...prev, targetGroupId: e.target.value }))}
                      options={[
                        { value: '', label: '— Gruppe auswählen —' },
                        ...groupSelectOptions,
                      ]}
                      icon={Users2}
                    />
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      Gilt exklusiv für diese Gruppe.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Unterblock (Schichtblock)
                    </label>
                    <CustomSelect
                      value={editingMeeting.subCategoryId || ''}
                      placeholder="— Keinen Unterblock zuweisen —"
                      onChange={(e) => setEditingMeeting((prev) => ({ ...prev, subCategoryId: e.target.value }))}
                      options={[
                        { value: '', label: '— Keinen Unterblock zuweisen —' },
                        ...disposalSubCategoryOptions,
                      ]}
                      icon={Layers}
                    />
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      Optional: Zugewiesener Unterblock für diese Teamsitzung.
                    </p>
                  </div>
                )}
              </div>

              {/* Falls Gruppenintern aktiv ist, zeigen wir den Unterblock in einer separaten Zeile */}
              {editingMeeting.meetingType === 'group_internal' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Unterblock (Schichtblock)
                  </label>
                  <CustomSelect
                    value={editingMeeting.subCategoryId || ''}
                    placeholder="— Keinen Unterblock zuweisen —"
                    onChange={(e) => setEditingMeeting((prev) => ({ ...prev, subCategoryId: e.target.value }))}
                    options={[
                      { value: '', label: '— Keinen Unterblock zuweisen —' },
                      ...disposalSubCategoryOptions,
                    ]}
                    icon={Layers}
                  />
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    Optional: Zugewiesener Unterblock für diese Teamsitzung.
                  </p>
                </div>
              )}

              {/* Zeile 3: Rhythmus & Teilnehmerkreis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Rhythmus / Wiederholung
                  </label>
                  <CustomSelect
                    value={editingMeeting.interval || 'weekly'}
                    onChange={(e) => setEditingMeeting((prev) => ({ ...prev, interval: e.target.value }))}
                    options={MEETING_INTERVAL_OPTIONS}
                    icon={Repeat}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Teilnehmerkreis
                  </label>
                  <CustomSelect
                    value={editingMeeting.participantScope || 'all'}
                    onChange={(e) => setEditingMeeting((prev) => ({ ...prev, participantScope: e.target.value }))}
                    options={PARTICIPANT_SCOPE_OPTIONS}
                    icon={Users}
                  />
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    {editingMeeting.participantScope === 'fulltime_only'
                      ? 'Nur Mitarbeiter mit 100% Stellenumfang.'
                      : 'Alle Mitarbeiter (inkl. Teilzeit).'}
                  </p>
                </div>
              </div>
            </div>

            {/* Fester Footer */}
            <div className="shrink-0 flex justify-end gap-3 pt-4 mt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setShowMeetingModal(false);
                  setEditingMeeting(null);
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-lg text-sm transition cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => handleSaveMeeting(editingMeeting)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                {(local.teamMeetings || []).some((m) => m.id === editingMeeting.id)
                  ? 'Änderungen übernehmen'
                  : 'Teamsitzung speichern'}
              </button>
            </div>
          </div>
        </BaseModal>
      )}

      {/* ── Sub-Modal: Generator-Regel hinzufügen / bearbeiten ── */}
      {showRuleModal && editingRule && (
        <BaseModal
          isOpen={showRuleModal}
          onClose={() => {
            setShowRuleModal(false);
            setEditingRule(null);
          }}
          title={
            (local.generatorRules || []).some((r) => r.id === editingRule.id)
              ? 'Generator-Regel bearbeiten'
              : 'Generator-Regel hinzufügen'
          }
          icon={ListChecks}
          maxWidth="max-w-xl"
          zIndex={60}
          bodyClassName="p-6 flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <div className="flex flex-col flex-1 min-h-0">
            {/* Scrollbarer Inhaltsbereich */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Bezeichnung der Regel *
                </label>
                <input
                  type="text"
                  value={editingRule.label}
                  onChange={(e) => setEditingRule((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="z.B. Essensausgabe"
                  className="w-full p-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm transition"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Wochentag *
                  </label>
                  <CustomSelect
                    value={dayLabel(editingRule.day)}
                    onChange={(e) =>
                      setEditingRule((prev) => ({ ...prev, day: dayValue(e.target.value) }))
                    }
                    options={WEEK_DAYS_OPTIONS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Von *
                  </label>
                  <input
                    type="time"
                    value={editingRule.fromTime}
                    onChange={(e) => setEditingRule((prev) => ({ ...prev, fromTime: e.target.value }))}
                    className="w-full p-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Bis *
                  </label>
                  <input
                    type="time"
                    value={editingRule.toTime}
                    onChange={(e) => setEditingRule((prev) => ({ ...prev, toTime: e.target.value }))}
                    className="w-full p-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Person aus Gruppe
                  </label>
                  <CustomSelect
                    value={editingRule.sourceGroup || 'any'}
                    onChange={(e) => setEditingRule((prev) => ({ ...prev, sourceGroup: e.target.value }))}
                    options={[
                      { value: 'any', label: 'Beliebige Gruppe' },
                      ...groups.map((g) => ({ value: g.id, label: g.name })),
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Schichtblock zuweisen *
                  </label>
                  <CustomSelect
                    value={editingRule.assignBlock || ''}
                    placeholder="— Block wählen —"
                    onChange={(e) => {
                      const opt = blockOptions.find((o) => o.value === e.target.value);
                      setEditingRule((prev) => ({
                        ...prev,
                        assignBlock: e.target.value,
                        blockType: opt ? opt.type : 'category',
                      }));
                    }}
                    options={[
                      { value: '', label: '— Block wählen —' },
                      ...blockOptions,
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Fester Footer */}
            <div className="shrink-0 flex justify-end gap-3 pt-4 mt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setShowRuleModal(false);
                  setEditingRule(null);
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-lg text-sm transition cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => handleSaveRule(editingRule)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                {(local.generatorRules || []).some((r) => r.id === editingRule.id)
                  ? 'Änderungen übernehmen'
                  : 'Regel speichern'}
              </button>
            </div>
          </div>
        </BaseModal>
      )}

      {confirm.show && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={() => {
            confirm.onConfirm();
            closeConfirm();
          }}
          onCancel={closeConfirm}
        />
      )}
    </>
  );
};

export default FacilitySettingsModal;