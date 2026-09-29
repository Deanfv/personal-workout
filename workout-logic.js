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

  var GUTCHECK_IDS = ['swing', 'goblet', 'row'];
  var GUTCHECK_TARGET = 100;
  var GUTCHECK_SETS = 5;
  var GUTCHECK_SET_REPS = 20;

  function isGutcheckKind(kind) {
    return kind === '300' || kind === 'gutcheck';
  }

  function isGutcheckRecord(h) {
    return !!(h && (isGutcheckKind(h.type) || h.id === '_300'));
  }

  var PREROUND_STEPS = [
    {
      id: 'plank_circles',
      name: 'Plank hip circles',
      reps: '8 per side',
      how: 'Plank position. One foot circles. Up, out, and around. Make a circle, not a triangle.',
      cues: 'One foot. Up, out, and around. Circle, not a triangle.'
    },
    {
      id: 'trail_reach',
      name: 'Trail-hip load + reach',
      reps: 'Light band or cable',
      how: 'Light band or cable. Load into the trail hip (right for a righty). Reach across.',
      cues: 'Big toe down. Push the foot into the ground. Rotate and reach. Light pattern, not a heavy set.'
    },
    {
      id: 'push_rotate',
      name: 'Push-and-rotate snaps',
      reps: '6-8 per side',
      how: 'Push into the ground and rotate. Fast. Chest turns. The arm stays connected.',
      cues: 'Push and rotate. Chest turns. Arm stays connected. Speed, not max load.'
    },
    {
      id: 'hips_pattern',
      name: 'Hips Pattern with club',
      reps: 'Optional',
      optional: true,
      hipsMode: 'pattern'
    }
  ];

  var HIPS_PATTERN = {
    title: 'Left hip clears first',
    meta: '8–10 slow reps · ~5 min',
    how: 'Stand tall. Set arm structure with a club. Hinge. LEFT hip clears FIRST, THEN the torso shifts toward the target. Trail sidebend is the result, not the start. Do not compress the spine from the top down.',
    cues: 'Left hip first. Then torso toward target. Trail sidebend follows. Spine long.'
  };

  function isPreroundRecord(h) {
    return !!(h && (h.type === 'preround' || h.id === '_preround'));
  }

  function preroundHistoryLabel() {
    return 'Pre-round';
  }

  function preroundSessionRecord(opts) {
    opts = opts || {};
    return {
      date: opts.date || '',
      id: '_preround',
      type: 'preround',
      name: preroundHistoryLabel(),
      pattern: !!opts.pattern,
      duration: opts.duration || 0,
      elapsed: opts.elapsed || ''
    };
  }

  function preroundAdvance(step, nSteps) {
    nSteps = nSteps || PREROUND_STEPS.length;
    var next = (step || 0) + 1;
    if (next >= nSteps) return {done: true, step: Math.max(0, nSteps - 1)};
    return {done: false, step: next};
  }

  function isLiftSession(h) {
    return !!(h && h.id === '_session' && !isHipsRecord(h) && !isGutcheckRecord(h) && !isPreroundRecord(h));
  }

  function suggestedWhich(lastLabel, hasLast) {
    if (hasLast && lastLabel === 'Workout A') return 'A';
    if (hasLast && lastLabel === 'Workout B') return 'B';
    return 'C';
  }

  function gutcheckHistoryLabel() {
    return '300';
  }

  function gutcheckSessionRecord(opts) {
    opts = opts || {};
    return {
      date: opts.date || '',
      id: '_300',
      type: '300',
      name: gutcheckHistoryLabel(),
      duration: opts.duration || 0,
      elapsed: opts.elapsed || ''
    };
  }

  function gutcheckRepsFromSets(sets, defaultReps) {
    defaultReps = defaultReps == null ? GUTCHECK_SET_REPS : defaultReps;
    var sum = 0;
    (sets || []).forEach(function (s) {
      if (!s || !s.done) return;
      var n = parseInt(s.reps, 10);
      sum += isNaN(n) ? defaultReps : n;
    });
    return sum;
  }

  function gutcheckProgress(logged, target) {
    logged = parseInt(logged, 10);
    if (isNaN(logged) || logged < 0) logged = 0;
    target = target == null ? GUTCHECK_TARGET : target;
    return {
      logged: logged,
      target: target,
      remain: Math.max(0, target - logged),
      label: logged + '/' + target
    };
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
    GUTCHECK_IDS: GUTCHECK_IDS,
    GUTCHECK_TARGET: GUTCHECK_TARGET,
    GUTCHECK_SETS: GUTCHECK_SETS,
    GUTCHECK_SET_REPS: GUTCHECK_SET_REPS,
    isGutcheckKind: isGutcheckKind,
    isGutcheckRecord: isGutcheckRecord,
    PREROUND_STEPS: PREROUND_STEPS,
    HIPS_PATTERN: HIPS_PATTERN,
    isPreroundRecord: isPreroundRecord,
    preroundHistoryLabel: preroundHistoryLabel,
    preroundSessionRecord: preroundSessionRecord,
    preroundAdvance: preroundAdvance,
    isLiftSession: isLiftSession,
    suggestedWhich: suggestedWhich,
    gutcheckHistoryLabel: gutcheckHistoryLabel,
    gutcheckSessionRecord: gutcheckSessionRecord,
    gutcheckRepsFromSets: gutcheckRepsFromSets,
    gutcheckProgress: gutcheckProgress,
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
