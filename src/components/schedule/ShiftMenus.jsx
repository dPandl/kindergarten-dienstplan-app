import React, { useState, useRef, useEffect } from 'react';
import { PAUSE_CATEGORY } from '../../constants/scheduleConstants';
import { getStrongGroupColor } from '../../utils/colorUtils';

/**
 * Animierter Wrapper für Menüs:
 * - Animiert das Erscheinen (Fade In + Scale/Slide) und das Verschwinden (Fade Out + Scale).
 * - Schließt sich automatisch nach 1 Sekunde (closeDelay), wenn die Maus sich außerhalb befindet.
 * - Lässt das Menü offen, solange der Mauszeiger sich auf dem Menü befindet.
 * - Startet den 1-Sekunden-Timer auch sofort beim Öffnen, falls der Mauszeiger gar nicht erst auf das Menü bewegt wird.
 */
const AnimatedMenuWrapper = ({
  isOpen,
  onClose,
  position,
  className = '',
  closeDelay = 1000,
  children,
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animState, setAnimState] = useState('closed');
  const timerRef = useRef(null);
  const menuRef = useRef(null);
  const isMouseInsideRef = useRef(false);
  const lastChildrenRef = useRef(children);
  const lastPosRef = useRef(position);

  if (children) {
    lastChildrenRef.current = children;
  }
  if (position) {
    lastPosRef.current = position;
  }

  const clearCloseTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startCloseTimer = (delay = closeDelay) => {
    clearCloseTimer();
    timerRef.current = setTimeout(() => {
      // Prüfe, ob die Maus nicht doch auf dem Menü ruht (auch ohne vorherige Bewegung)
      if (menuRef.current && (menuRef.current.matches(':hover') || isMouseInsideRef.current)) {
        isMouseInsideRef.current = true;
        return;
      }
      if (onClose) {
        onClose();
      }
    }, delay);
  };

  useEffect(() => {
    let animTimer;
    let animFrame;

    if (isOpen) {
      setShouldRender(true);
      isMouseInsideRef.current = false;

      animFrame = requestAnimationFrame(() => {
        setAnimState('open');
        // Wenn das Menü direkt unter dem Cursor aufploppt, Cursor erfassen und nicht schließen
        if (menuRef.current?.matches(':hover')) {
          isMouseInsideRef.current = true;
          clearCloseTimer();
        } else {
          startCloseTimer(closeDelay);
        }
      });
    } else {
      clearCloseTimer();
      setAnimState('closed');
      animTimer = setTimeout(() => {
        setShouldRender(false);
      }, 200);
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      if (animTimer) clearTimeout(animTimer);
      clearCloseTimer();
    };
  }, [isOpen, closeDelay]);

  const handleMouseEnter = () => {
    isMouseInsideRef.current = true;
    clearCloseTimer();
  };

  const handleMouseMove = () => {
    if (!isMouseInsideRef.current) {
      isMouseInsideRef.current = true;
      clearCloseTimer();
    }
  };

  const handleMouseLeave = () => {
    isMouseInsideRef.current = false;
    startCloseTimer(closeDelay);
  };

  if (!shouldRender && !isOpen) return null;

  const currentPos = position || lastPosRef.current || { x: 0, y: 0 };
  const currentContent = children || lastChildrenRef.current;

  return (
    <div
      ref={menuRef}
      className={`absolute frosted-glass-menu border rounded-2xl shadow-2xl p-2.5 z-50 transition-all duration-200 ease-out origin-top-right dark:text-gray-100 ${
        animState === 'open'
          ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 scale-95 -translate-y-1.5 pointer-events-none'
      } ${className}`}
      style={{ right: currentPos.x, top: currentPos.y }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {currentContent}
    </div>
  );
};

const ShiftMenus = ({
  showAddShiftMenu,
  setShowAddShiftMenu,
  addShiftMenuPos,
  handleAddSegmentFromMenu,
  categories,
  subCategories,
  getTextColorForBg,
  showShiftOptionsMenu,
  setShowShiftOptionsMenu,
  shiftOptionsMenuPos,
  shiftOptionsContext,
  handleChangeShiftClick,
  handleChangeGroupClick,
  handleDeleteShift,
  showChangeGroupMenu,
  setShowChangeGroupMenu,
  changeGroupMenuPos,
  changeGroupContext,
  handleUpdateSegmentGroup,
  groups,
  employees,
  showChangeShiftMenu,
  setShowChangeShiftMenu,
  changeShiftMenuPos,
  changeShiftContext,
  handleUpdateSegmentCategory,
}) => {
  return (
    <>
      {/* Add Shift Type Menu (Kategorie wählen) */}
      <AnimatedMenuWrapper
        isOpen={showAddShiftMenu}
        onClose={() => setShowAddShiftMenu(false)}
        position={addShiftMenuPos}
        className="max-w-[13.5rem] p-3"
      >
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 px-1">Kategorie wählen</h4>
        <div className="flex flex-col gap-1 p-1">
          {/* PAUSE_CATEGORY button */}
          <button
            className={`flex items-center w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-transform duration-150 ease-out border border-gray-200/60 dark:border-slate-600/60 hover:scale-[1.03] ${PAUSE_CATEGORY.color} ${getTextColorForBg(PAUSE_CATEGORY.color)} shadow-xs hover:shadow-md`}
            onClick={() => handleAddSegmentFromMenu(PAUSE_CATEGORY.id)}
          >
            {PAUSE_CATEGORY.name}
          </button>
          {/* Subcategories under PAUSE_CATEGORY */}
          {subCategories.filter(subCat => subCat.parentCategoryId === PAUSE_CATEGORY.id).map(subCat => (
            <div key={subCat.id} className="w-full pl-3">
              <button
                className={`flex items-center w-full text-left px-3 py-1.5 text-xs font-medium rounded-md transition-transform duration-150 ease-out border border-gray-200/60 dark:border-slate-600/60 hover:scale-[1.03] ${subCat.color || PAUSE_CATEGORY.color} ${getTextColorForBg(subCat.color || PAUSE_CATEGORY.color)} shadow-xs hover:shadow-sm`}
                onClick={() => handleAddSegmentFromMenu(PAUSE_CATEGORY.id, subCat.id)}
              >
                {subCat.name}
              </button>
            </div>
          ))}

          {/* Main Categories and their subcategories */}
          {categories.map(category => (
            <React.Fragment key={category.id}>
              <button
                className={`flex items-center w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-transform duration-150 ease-out border border-gray-200/60 dark:border-slate-600/60 hover:scale-[1.03] ${category.color} ${getTextColorForBg(category.color)} shadow-xs hover:shadow-md`}
                onClick={() => handleAddSegmentFromMenu(category.id)}
              >
                {category.name}
              </button>
              {subCategories.filter(subCat => subCat.parentCategoryId === category.id).map(subCat => (
                <div key={subCat.id} className="w-full pl-3">
                  <button
                    className={`flex items-center w-full text-left px-3 py-1.5 text-xs font-medium rounded-md transition-transform duration-150 ease-out border border-gray-200/60 dark:border-slate-600/60 hover:scale-[1.03] ${subCat.color || category.color} ${getTextColorForBg(subCat.color || category.color)} shadow-xs hover:shadow-sm`}
                    onClick={() => handleAddSegmentFromMenu(category.id, subCat.id)}
                  >
                    {subCat.name}
                  </button>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </AnimatedMenuWrapper>

      {/* Shift Options Menu (Optionen beim Rechtsklick auf Schichtblock) */}
      <AnimatedMenuWrapper
        isOpen={showShiftOptionsMenu && Boolean(shiftOptionsContext)}
        onClose={() => setShowShiftOptionsMenu(false)}
        position={shiftOptionsMenuPos}
        className="max-w-[13.5rem] p-3"
      >
        <div className="flex flex-col gap-1.5 p-1">
          <button
            className="block w-full text-left px-3 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-transform duration-150 ease-out border border-indigo-200 dark:border-indigo-800/60 hover:scale-[1.03] shadow-xs hover:shadow-sm"
            onClick={handleChangeShiftClick}
          >
            Kategorie ändern
          </button>
          <button
            className="block w-full text-left px-3 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-transform duration-150 ease-out border border-indigo-200 dark:border-indigo-800/60 hover:scale-[1.03] shadow-xs hover:shadow-sm"
            onClick={handleChangeGroupClick}
          >
            Gruppe zuweisen
          </button>
          <button
            className="block w-full text-left px-3 py-2 text-sm font-medium text-rose-700 dark:text-rose-300 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg transition-transform duration-150 ease-out border border-rose-200 dark:border-rose-800/60 hover:scale-[1.03] shadow-xs hover:shadow-sm"
            onClick={handleDeleteShift}
          >
            Löschen
          </button>
        </div>
      </AnimatedMenuWrapper>

      {/* Change Group Menu (Gruppe zuweisen) */}
      <AnimatedMenuWrapper
        isOpen={showChangeGroupMenu && Boolean(changeGroupContext)}
        onClose={() => setShowChangeGroupMenu(false)}
        position={changeGroupMenuPos}
        className="max-w-[15.5rem] p-3"
      >
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 px-1">Gruppe zuweisen</h4>
        <div className="p-1">
          {/* Option to revert to employee's default group */}
          {changeGroupContext && (() => {
            const emp = employees.find(e => e.id === changeGroupContext.shift.employeeId);
            const empGroup = emp?.groupId ? groups.find(g => g.id === emp.groupId) : null;
            const badgeColor = empGroup ? getStrongGroupColor(empGroup.color) : 'bg-gray-400';
            return (
              <button
                className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-transform duration-150 ease-out border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:scale-[1.03] bg-gray-100 dark:bg-slate-700/80 text-gray-800 dark:text-gray-100 mb-2 shadow-xs hover:shadow-sm`}
                onClick={() => handleUpdateSegmentGroup(emp?.groupId || 'no-group')}
              >
                <span className={`w-3.5 h-3.5 rounded-full ${badgeColor} border border-white/80 dark:border-black/30 shadow-xs flex-shrink-0`}></span>
                <span className="truncate">Standardgruppe ({empGroup ? empGroup.name : 'Ohne Gruppe'})</span>
              </button>
            );
          })()}
          <hr className="my-2 border-gray-200 dark:border-slate-700" />

          {/* List all other groups */}
          <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto overflow-x-hidden p-1">
            {groups.map(group => {
              const strongBadgeColor = getStrongGroupColor(group.color);
              return (
                <button
                  key={group.id}
                  className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-transform duration-150 ease-out border border-black/10 dark:border-white/10 hover:scale-[1.03] ${group.color} ${getTextColorForBg(group.color)} shadow-xs hover:shadow-md`}
                  onClick={() => handleUpdateSegmentGroup(group.id)}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${strongBadgeColor} border border-white/80 dark:border-black/30 shadow-xs flex-shrink-0`}></span>
                  <span className="truncate">{group.name}</span>
                </button>
              );
            })}
            {/* Option for "Ohne Gruppe" explicitly if not already covered */}
            {!groups.some(g => g.id === 'no-group') && (
              <button
                className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-transform duration-150 ease-out border border-black/10 dark:border-white/10 hover:scale-[1.03] bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 shadow-xs hover:shadow-md`}
                onClick={() => handleUpdateSegmentGroup('no-group')}
              >
                <span className="w-3.5 h-3.5 rounded-full bg-gray-400 border border-white/80 dark:border-black/30 shadow-xs flex-shrink-0"></span>
                <span className="truncate">Ohne Gruppe</span>
              </button>
            )}
          </div>
        </div>
      </AnimatedMenuWrapper>

      {/* Change Shift Menu (Kategorie ändern) */}
      <AnimatedMenuWrapper
        isOpen={showChangeShiftMenu && Boolean(changeShiftContext)}
        onClose={() => setShowChangeShiftMenu(false)}
        position={changeShiftMenuPos}
        className="max-w-[13.5rem] p-3"
      >
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 px-1">Neue Kategorie wählen</h4>
        <div className="flex flex-col gap-1 p-1">
          {/* PAUSE_CATEGORY button */}
          <button
            className={`flex items-center w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-transform duration-150 ease-out border border-gray-200/60 dark:border-slate-600/60 hover:scale-[1.03] ${PAUSE_CATEGORY.color} ${getTextColorForBg(PAUSE_CATEGORY.color)} shadow-xs hover:shadow-md`}
            onClick={() => handleUpdateSegmentCategory(PAUSE_CATEGORY.id, '')}
          >
            {PAUSE_CATEGORY.name}
          </button>
          {/* Subcategories under PAUSE_CATEGORY */}
          {subCategories.filter(subCat => subCat.parentCategoryId === PAUSE_CATEGORY.id).map(subCat => (
            <div key={subCat.id} className="w-full pl-3">
              <button
                className={`flex items-center w-full text-left px-3 py-1.5 text-xs font-medium rounded-md transition-transform duration-150 ease-out border border-gray-200/60 dark:border-slate-600/60 hover:scale-[1.03] ${subCat.color || PAUSE_CATEGORY.color} ${getTextColorForBg(subCat.color || PAUSE_CATEGORY.color)} shadow-xs hover:shadow-sm`}
                onClick={() => handleUpdateSegmentCategory(PAUSE_CATEGORY.id, subCat.id)}
              >
                {subCat.name}
              </button>
            </div>
          ))}
          {/* Main Categories and their subcategories */}
          {categories.map(category => (
            <React.Fragment key={category.id}>
              <button
                className={`flex items-center w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-transform duration-150 ease-out border border-gray-200/60 dark:border-slate-600/60 hover:scale-[1.03] ${category.color} ${getTextColorForBg(category.color)} shadow-xs hover:shadow-md`}
                onClick={() => handleUpdateSegmentCategory(category.id, '')}
              >
                {category.name}
              </button>
              {subCategories.filter(subCat => subCat.parentCategoryId === category.id).map(subCat => (
                <div key={subCat.id} className="w-full pl-3">
                  <button
                    className={`flex items-center w-full text-left px-3 py-1.5 text-xs font-medium rounded-md transition-transform duration-150 ease-out border border-gray-200/60 dark:border-slate-600/60 hover:scale-[1.03] ${subCat.color || category.color} ${getTextColorForBg(subCat.color || category.color)} shadow-xs hover:shadow-sm`}
                    onClick={() => handleUpdateSegmentCategory(category.id, subCat.id)}
                  >
                    {subCat.name}
                  </button>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </AnimatedMenuWrapper>
    </>
  );
};

export default ShiftMenus;
