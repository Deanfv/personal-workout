(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PWLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SCREEN_KEYS = ['balance', 'overhead', 'hinge'];

  var LOCKS = {
    balance: ['slrdl', 'stepup', 'swing', 'swing_1a', 'bulgarian', 'lateral_lunge'],
    overhead: ['hkpress', 'windmill', 'tgu_half', 'swing', 'swing_1a', 'pullup', 'hang'],
    hinge: ['rdl', 'slrdl', 'swing', 'swing_1a', 'windmill']
  };

  // Workout B swing slot: two-hand Russian, one-arm Russian, windmill, half get-up.
  var SWING_SWAP = ['swing', 'swing_1a', 'windmill', 'tgu_half'];

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

  function swapPoolIds(originId, currentId, locked, taken, alts, exercises) {
    locked = locked || [];
    taken = taken || [];
    alts = alts || {};
    exercises = exercises || [];
    var byId = {};
    exercises.forEach(function (e) { byId[e.id] = e; });
    var origin = byId[originId] || byId[currentId];
    var current = byId[currentId] || origin;
    var cycle = [];
    function tryAdd(id) {
      if (!id || taken.indexOf(id) !== -1 || locked.indexOf(id) !== -1) return;
      if (cycle.indexOf(id) !== -1) return;
      if (byId[id]) cycle.push(id);
    }
    tryAdd(originId);
    if (SWING_SWAP.indexOf(originId) !== -1) {
      SWING_SWAP.forEach(tryAdd);
      return cycle;
    }
    exercises.forEach(function (e) {
      if (origin && current && (e.cat === origin.cat || e.cat === current.cat)) tryAdd(e.id);
    });
    (alts[originId] || []).forEach(tryAdd);
    (alts[currentId] || []).forEach(tryAdd);
    return cycle;
  }

  return {
    SCREEN_KEYS: SCREEN_KEYS,
    SWING_SWAP: SWING_SWAP,
    isFailedScreen: isFailedScreen,
    isAnsweredScreen: isAnsweredScreen,
    screenComplete: screenComplete,
    lockedIdsFromScreen: lockedIdsFromScreen,
    resolveTemplateIds: resolveTemplateIds,
    swapPoolIds: swapPoolIds
  };
});
