const fs = require('fs');
let code = fs.readFileSync('c:/Users/pasca/Documents/Entwicklung/Dienstplan App/src/utils/scheduleGeneratorV2.js', 'utf8');

const p4c_start = code.indexOf('  // PHASE 4c: Teamsitzungen');
const p4c_end = code.indexOf('  // PHASE 4b: Verfügungszeiten (VZ) einplanen');
if (p4c_start !== -1 && p4c_end !== -1) {
    const phase4c = code.slice(p4c_start, p4c_end);
    code = code.slice(0, p4c_start) + code.slice(p4c_end);
    
    const p4a_start = code.indexOf('  // PHASE 4a: Leitungsfreistellung einplanen');
    if (p4a_start !== -1) {
        code = code.slice(0, p4a_start) + phase4c + code.slice(p4a_start);
    }
}

const p4b_loop_old = `    [1, 2, 3].forEach(mode => {
      let madeProgress = true;
      let failsafe = 0;
      while (madeProgress && failsafe < 50) {
        madeProgress = false;
        failsafe++;
        
        for (const day of DAYS) {
          employeePool.forEach(emp => {`;

const p4b_loop_new = `    const sortedGroups = [...groups].sort((a, b) => {
       const durA = DAYS.reduce((acc, day) => {
          const h = a.openingHours?.[day] || [];
          if(!h.length) return acc;
          return acc + (Math.max(...h.map(x=>timeToMinutes(x.end))) - Math.min(...h.map(x=>timeToMinutes(x.start))));
       }, 0);
       const durB = DAYS.reduce((acc, day) => {
          const h = b.openingHours?.[day] || [];
          if(!h.length) return acc;
          return acc + (Math.max(...h.map(x=>timeToMinutes(x.end))) - Math.min(...h.map(x=>timeToMinutes(x.start))));
       }, 0);
       return durB - durA;
    });

    [1, 2, 3].forEach(mode => {
      if (mode > 1) {
        for (const day of DAYS) {
          const lateGroups = sortedGroups.filter(g => {
            const h = g.openingHours?.[day] || [];
            if (!h.length) return false;
            return Math.max(...h.map(x => timeToMinutes(x.end))) >= 960;
          });
          lateGroups.forEach(g => {
            const jokerCands = employeePool.filter(e => (e.type === 'azubi' || e.type === 'zusatzkraft') && e.groupId !== g.id);
            jokerCands.forEach(joker => {
              const shift = newShifts.find(s => s.employeeId === joker.id && s.dayOfWeek === day);
              if (shift) {
                 shift.segments.forEach(seg => {
                   if (seg.categoryId === careCategory.id && timeToMinutes(seg.startTime) >= 780) {
                     seg.overriddenGroupId = g.id;
                   }
                 });
              }
            });
          });
        }
      }

      const allGroupsAndNull = [...sortedGroups, { id: null }];
      allGroupsAndNull.forEach(group => {
        let madeProgress = true;
        let failsafe = 0;
        while (madeProgress && failsafe < 50) {
          madeProgress = false;
          failsafe++;
          
          for (const day of DAYS) {
            employeePool.filter(e => e.groupId === group.id).forEach(emp => {`;

code = code.replace(p4b_loop_old, p4b_loop_new);

code = code.replace(/madeProgress = true;\r?\n            }\r?\n          }\);\r?\n        }\r?\n      }\r?\n    }\);/g, 'madeProgress = true;\\n            }\\n          });\\n        }\\n      }\\n      });\\n    });');
code = code.replace(/madeProgress = true;\n            }\n          }\);\n        }\n      }\n    }\);/g, 'madeProgress = true;\n            }\n          });\n        }\n      }\n      });\n    });');

fs.writeFileSync('c:/Users/pasca/Documents/Entwicklung/Dienstplan App/src/utils/scheduleGeneratorV2.js', code);
console.log('Done');
