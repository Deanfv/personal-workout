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

  var LAB_ALIASES = [
    { id: 'ferritin', names: ['ferritin'] },
    { id: 'hemoglobin', names: ['hemoglobin', 'haemoglobin', 'hgb', 'hb'] },
    { id: 'vitamin_d', names: ['vitamin d', '25 oh', '25ohd', '25 hydroxy', '25 hydroxyvitamin d', 'vit d'] },
    { id: 'hscrp', names: ['hs crp', 'hscrp', 'c reactive', 'crp'] },
    { id: 'testosterone', names: ['testosterone', 'total testosterone'] },
    { id: 'glucose', names: ['fasting glucose', 'glucose', 'fasting blood glucose'] },
    { id: 'a1c', names: ['hemoglobin a1c', 'hba1c', 'a1c', 'hb a1c'] },
    { id: 'tsh', names: ['tsh', 'thyroid stimulating'] }
  ];

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

  function parseNum(v) {
    if (typeof v === 'number' && isFinite(v)) return v;
    if (v == null) return null;
    var s = String(v).replace(/,/g, '').trim();
    var m = s.match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }

  function normName(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function looksLikeMarker(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    return !!(obj.name || obj.biomarker || obj.test || obj.analyte || obj.title);
  }

  function markerFrom(obj, fallbackName) {
    var name = fallbackName || obj.name || obj.biomarker || obj.test || obj.analyte || obj.title;
    var value = obj.value != null ? obj.value : (obj.result != null ? obj.result : (obj.numericValue != null ? obj.numericValue : obj.latest));
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (value.value != null) value = value.value;
      else if (value.result != null) value = value.result;
    }
    if (!name || value == null || typeof value === 'object') return null;
    return {
      name: String(name),
      value: parseNum(value),
      raw: value,
      unit: obj.unit || obj.units || '',
      status: obj.status || obj.rangeStatus || obj.flag || ''
    };
  }

  var NEST_KEYS = {
    biomarkers: 1, results: 1, labs: 1, markers: 1, data: 1, items: 1,
    healthResults: 1, latest: 1, report: 1, values: 1
  };

  function collectMarkers(input, out, seen) {
    if (input == null) return;
    if (Array.isArray(input)) {
      input.forEach(function (item) { collectMarkers(item, out, seen); });
      return;
    }
    if (typeof input !== 'object') return;
    if (looksLikeMarker(input)) {
      var m = markerFrom(input);
      if (m && m.value != null) {
        var key = normName(m.name);
        if (!seen[key]) { seen[key] = 1; out.push(m); }
      }
      return;
    }
    Object.keys(input).forEach(function (k) {
      if (k === 'meta' || k === 'profile' || k === 'notes') return;
      var v = input[k];
      if (NEST_KEYS[k] || k === 'health-results') {
        collectMarkers(v, out, seen);
        return;
      }
      if (typeof v === 'number' || (typeof v === 'string' && /-?\d/.test(v))) {
        var simple = markerFrom({ name: k, value: v });
        if (simple && simple.value != null && !seen[normName(k)]) {
          seen[normName(k)] = 1;
          out.push(simple);
        }
        return;
      }
      if (v && typeof v === 'object' && !Array.isArray(v) && (v.value != null || v.result != null || looksLikeMarker(v))) {
        var nested = markerFrom(Object.assign({ name: k }, v), k);
        if (nested && nested.value != null && !seen[normName(nested.name)]) {
          seen[normName(nested.name)] = 1;
          out.push(nested);
          return;
        }
      }
      if (Array.isArray(v) || (v && typeof v === 'object')) collectMarkers(v, out, seen);
    });
  }

  function parseLabLines(text) {
    var out = [];
    String(text).split(/\r?\n/).forEach(function (line) {
      line = line.trim();
      if (!line || line[0] === '#') return;
      if (/^category,/i.test(line) || /^biomarker,/i.test(line)) return;
      var csv = line.split(',');
      if (csv.length >= 5 && /in range|out of range|high|low|normal/i.test(csv[3] || '')) {
        var marker = markerFrom({ name: csv[1], value: csv[4], unit: csv[5] || '', status: csv[3] });
        if (marker && marker.value != null) out.push(marker);
        return;
      }
      var m = line.match(/^([^:,]+)\s*[:\-]\s*(.+)$/);
      if (!m) m = line.match(/^(.+?)\s+(-?\d+(?:\.\d+)?)\s*(.*)$/);
      if (!m) return;
      var parsed = markerFrom({ name: m[1], value: m[2], unit: (m[3] || '').trim() });
      if (parsed && parsed.value != null) out.push(parsed);
    });
    return out;
  }

  function parseLabImport(text) {
    var raw = String(text || '').trim();
    if (!raw) return { markers: [], error: 'Paste JSON or lines like Ferritin: 28 ng/mL' };
    if (raw[0] === '{' || raw[0] === '[') {
      try {
        var json = JSON.parse(raw);
        var markers = [];
        collectMarkers(json, markers, {});
        if (!markers.length) return { markers: [], error: 'JSON parsed but no numeric lab markers were found' };
        return { markers: markers, error: null };
      } catch (e) {
        return { markers: [], error: 'JSON could not be parsed' };
      }
    }
    var lines = parseLabLines(raw);
    if (!lines.length) return { markers: [], error: 'No markers found. Use JSON or Name: value lines.' };
    return { markers: lines, error: null };
  }

  function nameMatches(n, alias) {
    if (n === alias) return true;
    if (alias.length <= 3) return n.split(' ').indexOf(alias) !== -1;
    return n.indexOf(alias) !== -1;
  }

  function findMarker(markers, id) {
    var spec = null;
    LAB_ALIASES.forEach(function (a) { if (a.id === id) spec = a; });
    if (!spec) return null;
    for (var i = 0; i < (markers || []).length; i++) {
      var n = normName(markers[i].name);
      if (id === 'hemoglobin' && n.indexOf('a1c') !== -1) continue;
      for (var j = 0; j < spec.names.length; j++) {
        if (nameMatches(n, spec.names[j])) return markers[i];
      }
    }
    return null;
  }

  function labPlan(markers) {
    markers = markers || [];
    var notes = [];
    var extraLocks = [];
    var scale = 1;
    var flags = {};

    function tighten(next, note, lockSwing) {
      if (next < scale) scale = next;
      if (note) notes.push(note);
      if (lockSwing) extraLocks.push('swing');
    }

    var ferritin = findMarker(markers, 'ferritin');
    if (ferritin && ferritin.value != null && ferritin.value < 30) {
      flags.lowIron = true;
      tighten(0.85, 'Ferritin ' + ferritin.value + ' — keep load conservative and skip high-power swings until iron is reviewed.', true);
    }

    var hgb = findMarker(markers, 'hemoglobin');
    if (hgb && hgb.value != null && hgb.value < 13) {
      flags.lowHgb = true;
      tighten(0.8, 'Hemoglobin ' + hgb.value + ' — deload and skip explosive hinge work.', true);
    }

    var vitd = findMarker(markers, 'vitamin_d');
    if (vitd && vitd.value != null && vitd.value < 20) {
      flags.lowVitD = true;
      tighten(0.9, 'Vitamin D ' + vitd.value + ' — slightly lower volume.', false);
    } else if (vitd && vitd.value != null && vitd.value < 30) {
      notes.push('Vitamin D ' + vitd.value + ' is below a common 30 ng/mL training cutoff. No lock; keep RPE honest.');
    }

    var crp = findMarker(markers, 'hscrp');
    if (crp && crp.value != null && crp.value >= 3) {
      flags.inflammation = true;
      tighten(0.8, 'hs-CRP ' + crp.value + ' — deload and skip KB swings while inflammation is high.', true);
    }

    var t = findMarker(markers, 'testosterone');
    if (t && t.value != null && t.value < 300) {
      flags.lowT = true;
      tighten(0.9, 'Testosterone ' + t.value + ' — keep strength work, but do not chase load.', false);
    }

    var glu = findMarker(markers, 'glucose');
    if (glu && glu.value != null && glu.value >= 126) {
      flags.highGlucose = true;
      tighten(0.9, 'Fasting glucose ' + glu.value + ' — cap intensity, keep carries controlled.', false);
    }

    var a1c = findMarker(markers, 'a1c');
    if (a1c && a1c.value != null && a1c.value >= 6.5) {
      flags.highA1c = true;
      tighten(0.9, 'A1c ' + a1c.value + ' — conservative session, no extra sets.', false);
    }

    var tsh = findMarker(markers, 'tsh');
    if (tsh && tsh.value != null && tsh.value >= 4.5) {
      flags.highTsh = true;
      tighten(0.9, 'TSH ' + tsh.value + ' — recovery-biased loading.', false);
    }

    return {
      loadScale: scale,
      setCount: scale < 1 ? 2 : 3,
      extraLocks: uniq(extraLocks),
      notes: notes,
      flags: flags,
      markerCount: markers.length
    };
  }

  function applyLoadScale(weight, scale) {
    if (scale == null || scale >= 0.999) return weight;
    if (weight == null || weight === '' || String(weight).toUpperCase() === 'BW') return weight;
    var n = parseNum(weight);
    if (n == null) return weight;
    var next = Math.round(n * scale * 2) / 2;
    if (next < 0) next = 0;
    return (Math.round(next * 10) % 10 === 0) ? String(Math.round(next)) : String(next);
  }

  function lockedIdsWithLabs(screen, markers) {
    return uniq(lockedIdsFromScreen(screen).concat(labPlan(markers).extraLocks));
  }

  function formatSetsLabel(raw, n) {
    raw = raw || (n + ' sets');
    if (!n || n === 3) return raw;
    return String(raw).replace(/^\d+(-\d+)?x/, n + 'x');
  }

  return {
    SCREEN_KEYS: SCREEN_KEYS,
    isFailedScreen: isFailedScreen,
    isAnsweredScreen: isAnsweredScreen,
    screenComplete: screenComplete,
    lockedIdsFromScreen: lockedIdsFromScreen,
    resolveTemplateIds: resolveTemplateIds,
    parseLabImport: parseLabImport,
    labPlan: labPlan,
    applyLoadScale: applyLoadScale,
    lockedIdsWithLabs: lockedIdsWithLabs,
    findMarker: findMarker,
    formatSetsLabel: formatSetsLabel
  };
});
