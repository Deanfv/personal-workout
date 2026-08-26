(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PWLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SCREEN_KEYS = ['balance', 'overhead', 'hinge'];

  var LOCKS = {
    balance: ['slrdl', 'stepup', 'swing', 'bulgarian', 'lateral_lunge'],
    overhead: ['hkpress', 'windmill', 'tgu_half', 'swing', 'pullup', 'hang'],
    hinge: ['rdl', 'slrdl', 'swing', 'windmill']
  };

  function uniq(list) {
    var out = [];
    list.forEach(function (x) { if (out.indexOf(x) === -1) out.push(x); });
    return out;
  }

  function isFailedScreen(val) {
    return val === false;
  }

  function isAnsweredScreen(val) {
    return val === true || val === false;
  }

  function screenComplete(screen) {
    screen = screen || {};
    if (screen.skipped) return true;
    return SCREEN_KEYS.every(function (k) { return isAnsweredScreen(screen[k]); });
  }

  function lockedIdsFromScreen(screen) {
    screen = screen || {};
    var locked = [];
    SCREEN_KEYS.forEach(function (k) {
      if (isFailedScreen(screen[k])) locked = locked.concat(LOCKS[k]);
    });
    return uniq(locked);
  }

  function resolveTemplateIds(ids, locked, alts, exerciseIds) {
    locked = locked || [];
    alts = alts || {};
    exerciseIds = exerciseIds || [];
    var used = {};
    var out = [];
    (ids || []).forEach(function (id) {
      var pick = id;
      if (locked.indexOf(pick) !== -1 || used[pick]) {
        var pool = (alts[id] || []).concat(exerciseIds);
        pick = null;
        for (var i = 0; i < pool.length; i++) {
          if (locked.indexOf(pool[i]) === -1 && !used[pool[i]]) { pick = pool[i]; break; }
        }
        if (!pick) return;
      }
      if (locked.indexOf(pick) !== -1) return;
      used[pick] = true;
      out.push(pick);
    });
    return out;
  }

  return {
    SCREEN_KEYS: SCREEN_KEYS,
    isFailedScreen: isFailedScreen,
    isAnsweredScreen: isAnsweredScreen,
    screenComplete: screenComplete,
    lockedIdsFromScreen: lockedIdsFromScreen,
    resolveTemplateIds: resolveTemplateIds
  };
});
