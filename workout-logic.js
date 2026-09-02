(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PWLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SCREEN_KEYS = ['balance', 'overhead', 'hinge'];

  var LOCKS = {
    balance: ['slrdl', 'stepup', 'swing', 'swing_1a', 'kb_clean', 'bulgarian', 'lateral_lunge'],
    overhead: ['hkpress', 'windmill', 'tgu_half', 'swing', 'swing_1a', 'pullup', 'hang'],
    hinge: ['rdl', 'slrdl', 'swing', 'swing_1a', 'kb_clean', 'windmill']
  };

  // Workout B swing slot: two-hand Russian, one-arm Russian, windmill, half get-up.
  var SWING_SWAP = ['swing', 'swing_1a', 'windmill', 'tgu_half'];
  var CLEAN_SWAP = ['kb_clean', 'suitcase'];

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

  var HIPS_MODES = ['daily', 'load', 'pattern'];
  var HIPS_STEP_SECS = 30;
  var HIPS_DAILY_ROUNDS = 4;
  var HIPS_DAILY_STEPS = [
    {id: 'hamstrings', name: 'Activate hamstrings', secs: HIPS_STEP_SECS},
    {id: 'left_groin', name: 'Activate left groin / IR', secs: HIPS_STEP_SECS},
    {id: 'left_owns', name: 'Remove the right side', secs: HIPS_STEP_SECS}
  ];
  var HIPS_LOAD_IDS = ['hips_iso_hinge', 'hips_kickstand_rdl', 'hips_ir_hinge'];
  var HIPS_LABELS = {daily: 'Daily', load: 'Load', pattern: 'Pattern'};

  function isHipsMode(mode) {
    return HIPS_MODES.indexOf(mode) !== -1;
  }

  function hipsHistoryLabel(mode) {
    return 'Hips · ' + (HIPS_LABELS[mode] || 'Daily');
  }

  function isHipsRecord(h) {
    return !!(h && (h.type === 'hips' || h.id === '_hips'));
  }

  function isLiftSession(h) {
    return !!(h && h.id === '_session' && !isHipsRecord(h));
  }

  function suggestedWhich(lastLabel, hasLast) {
    if (hasLast && lastLabel === 'Workout A') return 'A';
    if (hasLast && lastLabel === 'Workout B') return 'B';
    return 'C';
  }

  function hipsSessionRecord(opts) {
    opts = opts || {};
    var mode = isHipsMode(opts.mode) ? opts.mode : 'daily';
    return {
      date: opts.date || '',
      id: '_hips',
      type: 'hips',
      mode: mode,
      name: hipsHistoryLabel(mode),
      duration: opts.duration || 0,
      elapsed: opts.elapsed || ''
    };
  }

  function hipsFloorAdvance(round, step, rounds, nSteps) {
    rounds = rounds || HIPS_DAILY_ROUNDS;
    nSteps = nSteps || HIPS_DAILY_STEPS.length;
    var nextStep = step + 1;
    var nextRound = round;
    if (nextStep >= nSteps) {
      nextStep = 0;
      nextRound = round + 1;
    }
    if (nextRound > rounds) {
      return {phase: 'ql', round: rounds, step: nSteps - 1};
    }
    return {phase: 'floor', round: nextRound, step: nextStep};
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
      if (originId === 'windmill') tryAdd('halo');
      if (originId === 'tgu_half') {
        tryAdd('deadbug');
        tryAdd('halo');
      }
      return cycle;
    }
    if (originId === 'kb_clean') {
      CLEAN_SWAP.forEach(tryAdd);
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
    CLEAN_SWAP: CLEAN_SWAP,
    HIPS_MODES: HIPS_MODES,
    HIPS_STEP_SECS: HIPS_STEP_SECS,
    HIPS_DAILY_ROUNDS: HIPS_DAILY_ROUNDS,
    HIPS_DAILY_STEPS: HIPS_DAILY_STEPS,
    HIPS_LOAD_IDS: HIPS_LOAD_IDS,
    isHipsMode: isHipsMode,
    hipsHistoryLabel: hipsHistoryLabel,
    isHipsRecord: isHipsRecord,
    isLiftSession: isLiftSession,
    suggestedWhich: suggestedWhich,
    hipsSessionRecord: hipsSessionRecord,
    hipsFloorAdvance: hipsFloorAdvance,
    isFailedScreen: isFailedScreen,
    isAnsweredScreen: isAnsweredScreen,
    screenComplete: screenComplete,
    lockedIdsFromScreen: lockedIdsFromScreen,
    resolveTemplateIds: resolveTemplateIds,
    swapPoolIds: swapPoolIds
  };
});
