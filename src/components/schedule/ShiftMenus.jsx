import React, { useState, useRef, useEffect } from 'react';
import { PAUSE_CATEGORY } from '../../constants/scheduleConstants';

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

      // Sofort Schließtimer starten, falls der Nutzer gar nicht mit der Maus auf das Menü geht
      startCloseTimer(closeDelay);

      animFrame = requestAnimationFrame(() => {
        setAnimState('open');
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
      className={`absolute bg-white/85 backdrop-blur-md border border-gray-300 rounded-lg shadow-xl p-2 z-50 transition-all duration-200 ease-out origin-top-right ${
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
        className="max-w-[12rem]"
      >
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Kategorie wählen:</h4>
        {/* PAUSE_CATEGORY button */}
        <button
          className={`flex items-center w-full text-left px-3 py-2 text-sm rounded-md transition duration-150 ease-in-out border-2 border-gray-200/50 hover:border-gray-200/60 opacity-80 hover:opacity-100 hover:scale-105 ${PAUSE_CATEGORY.color} ${getTextColorForBg(PAUSE_CATEGORY.color)} mb-1`}
          onClick={() => handleAddSegmentFromMenu(PAUSE_CATEGORY.id)}
        >
          {PAUSE_CATEGORY.name}
        </button>
        {/* Subcategories under PAUSE_CATEGORY */}
        {subCategories.filter(subCat => subCat.parentCategoryId === PAUSE_CATEGORY.id).map(subCat => (
          <div key={subCat.id} className="w-full pl-4 mb-1">
            <button
              className={`flex items-center w-full text-left px-3 py-1 text-xs rounded-md transition duration-150 ease-in-out border-2 border-gray-200/50 hover:border-gray-200/60 opacity-80 hover:opacity-100 hover:scale-105 ${subCat.color || PAUSE_CATEGORY.color} ${getTextColorForBg(subCat.color || PAUSE_CATEGORY.color)}`}
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
              className={`flex items-center w-full text-left px-3 py-2 text-sm rounded-md transition duration-150 ease-in-out border-2 border-gray-200/50 hover:border-gray-200/60 opacity-80 hover:opacity-100 hover:scale-105 ${category.color} ${getTextColorForBg(category.color)} mb-1`}
              onClick={() => handleAddSegmentFromMenu(category.id)}
            >
              {category.name}
            </button>
            {subCategories.filter(subCat => subCat.parentCategoryId === category.id).map(subCat => (
              <div key={subCat.id} className="w-full pl-4 mb-1">
                <button
                  className={`flex items-center w-full text-left px-3 py-1 text-xs rounded-md transition duration-150 ease-in-out border-2 border-gray-200/50 hover:border-gray-200/60 opacity-80 hover:opacity-100 hover:scale-105 ${subCat.color || category.color} ${getTextColorForBg(subCat.color || category.color)}`}
                  onClick={() => handleAddSegmentFromMenu(category.id, subCat.id)}
                >
                  {subCat.name}
                </button>
              </div>
            ))}
          </React.Fragment>
        ))}
      </AnimatedMenuWrapper>

      {/* Shift Options Menu (Optionen beim Rechtsklick auf Schichtblock) */}
      <AnimatedMenuWrapper
        isOpen={showShiftOptionsMenu && Boolean(shiftOptionsContext)}
        onClose={() => setShowShiftOptionsMenu(false)}
        position={shiftOptionsMenuPos}
        className="max-w-[12rem]"
      >
        <button
          className="block w-full text-left px-3 py-2 text-sm text-indigo-700 rounded-md mb-1 transition duration-150 ease-in-out border-2 border-indigo-200 opacity-80 hover:opacity-100 hover:border-indigo-300 hover:scale-105"
          onClick={handleChangeShiftClick}
        >
          Kategorie ändern
        </button>
        <button
          className="block w-full text-left px-3 py-2 text-sm text-indigo-700 rounded-md mb-1 transition duration-150 ease-in-out border-2 border-indigo-200 opacity-80 hover:opacity-100 hover:border-indigo-300 hover:scale-105"
          onClick={handleChangeGroupClick}
        >
          Gruppe zuweisen
        </button>
        <button
          className="block bg-red-300 w-full text-left px-3 py-2 text-sm text-red-800 hover:bg-red-500 hover:text-white rounded-md mb-1 transition duration-150 ease-in-out border-2 border-red-400 opacity-80 hover:opacity-100 hover:border-red-600 hover:scale-105"
          onClick={handleDeleteShift}
        >
          Löschen
        </button>
      </AnimatedMenuWrapper>

      {/* Change Group Menu (Gruppe zuweisen) */}
      <AnimatedMenuWrapper
        isOpen={showChangeGroupMenu && Boolean(changeGroupContext)}
        onClose={() => setShowChangeGroupMenu(false)}
        position={changeGroupMenuPos}
        className="max-w-[15rem]"
      >
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Gruppe zuweisen:</h4>
        {/* Option to revert to employee's default group */}
        {changeGroupContext && (
          <button
            className={`flex items-center w-full text-left px-3 py-2 text-sm rounded-md transition duration-150 ease-in-out border-2 border-gray-200 opacity-80 hover:opacity-100 hover:border-gray-300 hover:scale-105 ${getTextColorForBg('bg-gray-100')} mb-1`}
            onClick={() => handleUpdateSegmentGroup(employees.find(emp => emp.id === changeGroupContext.shift.employeeId)?.groupId || 'no-group')}
          >
            Standardgruppe ({employees.find(emp => emp.id === changeGroupContext.shift.employeeId)?.groupId ? groups.find(g => g.id === employees.find(emp => emp.id === changeGroupContext.shift.employeeId)?.groupId)?.name : 'Ohne Gruppe'})
          </button>
        )}
        <hr className="my-2 border-gray-200" />

        {/* List all other groups */}
        {groups.map(group => (
          <button
            key={group.id}
            className={`flex items-center w-full text-left px-3 py-2 text-sm rounded-md transition duration-150 ease-in-out border-2 border-gray-200 opacity-80 hover:opacity-100 hover:border-gray-300 hover:scale-105 ${group.color} ${getTextColorForBg(group.color)} mb-1`}
            onClick={() => handleUpdateSegmentGroup(group.id)}
          >
            {group.name}
          </button>
        ))}
        {/* Option for "Ohne Gruppe" explicitly if not already covered */}
        {!groups.some(g => g.id === 'no-group') && (
          <button
            className={`flex items-center w-full text-left px-3 py-2 text-sm rounded-md transition duration-150 ease-in-out border-2 border-gray-200 opacity-80 hover:opacity-100 hover:border-gray-300 hover:scale-105 ${getTextColorForBg('bg-gray-200')} mb-1`}
            onClick={() => handleUpdateSegmentGroup('no-group')}
          >
            Ohne Gruppe
          </button>
        )}
      </AnimatedMenuWrapper>

      {/* Change Shift Menu (Kategorie ändern) */}
      <AnimatedMenuWrapper
        isOpen={showChangeShiftMenu && Boolean(changeShiftContext)}
        onClose={() => setShowChangeShiftMenu(false)}
        position={changeShiftMenuPos}
        className="max-w-[12rem]"
      >
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Neue Kategorie wählen:</h4>
        {/* PAUSE_CATEGORY button */}
        <button
          className={`flex items-center w-full text-left px-3 py-2 text-sm rounded-md transition duration-150 ease-in-out border-2 border-gray-200/50 hover:border-gray-200/60 opacity-80 hover:opacity-100 hover:scale-105 ${PAUSE_CATEGORY.color} ${getTextColorForBg(PAUSE_CATEGORY.color)} mb-1`}
          onClick={() => handleUpdateSegmentCategory(PAUSE_CATEGORY.id, '')}
        >
          {PAUSE_CATEGORY.name}
        </button>
        {/* Subcategories under PAUSE_CATEGORY */}
        {subCategories.filter(subCat => subCat.parentCategoryId === PAUSE_CATEGORY.id).map(subCat => (
          <div key={subCat.id} className="w-full pl-4 mb-1">
            <button
              className={`flex items-center w-full text-left px-3 py-1 text-xs rounded-md transition duration-150 ease-in-out border-2 border-gray-200/50 hover:border-gray-200/60 opacity-80 hover:opacity-100 hover:scale-105 ${subCat.color || PAUSE_CATEGORY.color} ${getTextColorForBg(subCat.color || PAUSE_CATEGORY.color)}`}
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
              className={`flex items-center w-full text-left px-3 py-2 text-sm rounded-md transition duration-150 ease-in-out border-2 border-gray-200/50 hover:border-gray-200/60 opacity-80 hover:opacity-100 hover:scale-105 ${category.color} ${getTextColorForBg(category.color)} mb-1`}
              onClick={() => handleUpdateSegmentCategory(category.id, '')}
            >
              {category.name}
            </button>
            {subCategories.filter(subCat => subCat.parentCategoryId === category.id).map(subCat => (
              <div key={subCat.id} className="w-full pl-4 mb-1">
                <button
                  className={`flex items-center w-full text-left px-3 py-1 text-xs rounded-md transition duration-150 ease-in-out border-2 border-gray-200/50 hover:border-gray-200/60 opacity-80 hover:opacity-100 hover:scale-105 ${subCat.color || category.color} ${getTextColorForBg(subCat.color || category.color)}`}
                  onClick={() => handleUpdateSegmentCategory(category.id, subCat.id)}
                >
                  {subCat.name}
                </button>
              </div>
            ))}
          </React.Fragment>
        ))}
      </AnimatedMenuWrapper>
    </>
  );
};

export default ShiftMenus;
