'use strict';
var assert = require('assert');
var L = require('../workout-logic.js');

var TEMPLATE_A = ['goblet','rdl','hkpress','row','pullup','hang','suitcase','reverse_lunge','chop','pallof'];
var TEMPLATE_B = ['offset_squat','slrdl','floorpress','row','pullup','hang','farmer','lateral_lunge','lift','swing'];
var ALTS = {
  rdl: ['hipthrust','goblet'],
  slrdl: ['rdl','reverse_lunge','hipthrust'],
  swing: ['hipthrust','rdl'],
  hkpress: ['floorpress'],
  windmill: ['halo'],
  tgu_half: ['deadbug','halo'],
  row: ['pullup','hang'],
  pullup: ['row','hang'],
  hang: ['pullup','row'],
  bulgarian: ['reverse_lunge'],
  stepup: ['reverse_lunge'],
  lateral_lunge: ['reverse_lunge','stepup']
};
var ALL = ['goblet','offset_squat','rdl','slrdl','bulgarian','reverse_lunge','lateral_lunge','stepup','suitcase','farmer','rack_carry','row','floorpress','hkpress','chop','lift','pallof','deadbug','hipthrust','swing','halo','tgu_half','windmill','pullup','hang'];

function resolve(ids, screen, markers) {
  var locked = L.lockedIdsWithLabs(screen, markers || []);
  return L.resolveTemplateIds(ids, locked, ALTS, ALL);
}

assert.deepStrictEqual(L.lockedIdsFromScreen({balance:null, overhead:null, hinge:null}), []);
assert.deepStrictEqual(L.lockedIdsFromScreen({skipped:true, balance:null, overhead:null, hinge:null}), []);
assert.deepStrictEqual(L.lockedIdsFromScreen({balance:true, overhead:true, hinge:true}), []);
assert.ok(L.lockedIdsFromScreen({balance:false, overhead:true, hinge:true}).indexOf('slrdl') !== -1);
assert.ok(L.lockedIdsFromScreen({balance:true, overhead:false, hinge:true}).indexOf('hkpress') !== -1);
assert.ok(L.lockedIdsFromScreen({balance:true, overhead:true, hinge:false}).indexOf('rdl') !== -1);
assert.ok(L.screenComplete({skipped:true}));
assert.ok(L.screenComplete({balance:false, overhead:true, hinge:true}));
assert.ok(!L.screenComplete({balance:true, overhead:null, hinge:true}));

var skipA = resolve(TEMPLATE_A, {balance:null, overhead:null, hinge:null, skipped:true});
assert.deepStrictEqual(skipA, TEMPLATE_A, 'Skip must not strip Workout A');
var skipB = resolve(TEMPLATE_B, {skipped:true});
assert.deepStrictEqual(skipB, TEMPLATE_B, 'Skip must not strip Workout B');

var failHinge = resolve(TEMPLATE_A, {balance:true, overhead:true, hinge:false});
assert.ok(failHinge.indexOf('rdl') === -1, 'Failed hinge locks RDL');
assert.ok(failHinge.indexOf('hipthrust') !== -1, 'Failed hinge swaps RDL to hip thrust');

var failOverhead = resolve(TEMPLATE_A, {balance:true, overhead:false, hinge:true});
assert.ok(failOverhead.indexOf('hkpress') === -1);
assert.ok(failOverhead.indexOf('floorpress') !== -1);
assert.ok(failOverhead.indexOf('pullup') === -1);
assert.ok(failOverhead.indexOf('hang') === -1);

var oldBugA = resolve(TEMPLATE_A, {balance:null, overhead:null, hinge:null});
assert.deepStrictEqual(oldBugA, TEMPLATE_A, 'Unanswered/null must not over-lock the way !screen.x did');

var json = L.parseLabImport(JSON.stringify({
  biomarkers: [
    {name:'Ferritin', value:22, unit:'ng/mL'},
    {name:'Vitamin D, 25-OH', value:18, unit:'ng/mL'},
    {name:'hs-CRP', value:4.1, unit:'mg/L'}
  ]
}));
assert.strictEqual(json.error, null);
assert.strictEqual(json.markers.length, 3);

var lines = L.parseLabImport('Ferritin: 22 ng/mL\nHemoglobin 12.1 g/dL\n# comment\nTSH: 5.1');
assert.strictEqual(lines.error, null);
assert.strictEqual(lines.markers.length, 3);

var map = L.parseLabImport('{"Ferritin":28,"Glucose":140}');
assert.strictEqual(map.markers.length, 2);

var csv = L.parseLabImport('Category,Biomarker,Quest ID,Status,Value,Unit\nBlood,Ferritin,1,Out of Range,18,ng/mL');
assert.strictEqual(csv.markers[0].name, 'Ferritin');
assert.strictEqual(csv.markers[0].value, 18);

var empty = L.parseLabImport('');
assert.ok(empty.error);

var plan = L.labPlan(json.markers);
assert.ok(plan.loadScale <= 0.8);
assert.strictEqual(plan.setCount, 2);
assert.ok(plan.extraLocks.indexOf('swing') !== -1);
assert.ok(plan.notes.length >= 2);

var labB = resolve(TEMPLATE_B, {balance:true, overhead:true, hinge:true}, json.markers);
assert.ok(labB.indexOf('swing') === -1, 'High CRP / low ferritin must drop the swing');
assert.ok(labB.indexOf('hipthrust') !== -1);

assert.strictEqual(L.applyLoadScale(50, 0.8), '40');
assert.strictEqual(L.applyLoadScale('BW', 0.8), 'BW');
assert.strictEqual(L.applyLoadScale('', 0.8), '');
assert.strictEqual(L.applyLoadScale(50, 1), 50);

var open = L.parseLabImport('{not json');
assert.ok(open.error);

var a1cOnly = L.parseLabImport('Hemoglobin A1c: 5.2');
assert.ok(!L.findMarker(a1cOnly.markers, 'hemoglobin'), 'A1c must not count as hemoglobin');
assert.ok(L.findMarker(a1cOnly.markers, 'a1c'));
assert.strictEqual(L.labPlan(a1cOnly.markers).loadScale, 1);

assert.strictEqual(L.formatSetsLabel('3x6-8/side', 2), '2x6-8/side');
assert.strictEqual(L.formatSetsLabel('2-3x3-5/side', 2), '2x3-5/side');
assert.strictEqual(L.formatSetsLabel('3x8-12', 3), '3x8-12');

console.log('workout-logic tests passed');
