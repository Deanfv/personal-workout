'use strict';
var assert = require('assert');
var L = require('../workout-logic.js');

var TEMPLATE_A = ['goblet','rdl','hkpress','row','pullup','hang','suitcase','reverse_lunge','chop','pallof'];
var TEMPLATE_B = ['offset_squat','slrdl','floorpress','row','pullup','hang','farmer','lateral_lunge','lift','swing'];
var ALTS = {
  rdl: ['hipthrust','goblet'],
  slrdl: ['rdl','reverse_lunge','hipthrust'],
  swing: ['hipthrust','rdl','swing_1a','windmill','tgu_half'],
  swing_1a: ['swing','windmill','tgu_half'],
  hkpress: ['floorpress'],
  windmill: ['halo','swing','swing_1a','tgu_half'],
  tgu_half: ['deadbug','halo','swing','swing_1a','windmill'],
  row: ['pullup','hang'],
  pullup: ['row','hang'],
  hang: ['pullup','row'],
  bulgarian: ['reverse_lunge'],
  stepup: ['reverse_lunge'],
  lateral_lunge: ['reverse_lunge','stepup']
};
var ALL = ['goblet','offset_squat','rdl','slrdl','bulgarian','reverse_lunge','lateral_lunge','stepup','suitcase','farmer','rack_carry','row','floorpress','hkpress','chop','lift','pallof','deadbug','hipthrust','swing','swing_1a','halo','tgu_half','windmill','pullup','hang'];
var EX = ALL.map(function (id) { return {id:id, cat: id === 'swing' || id === 'swing_1a' || id === 'rdl' || id === 'hipthrust' ? 'hinge' : (id === 'windmill' || id === 'halo' ? 'mobility' : (id === 'tgu_half' ? 'full' : 'other'))}; });

function resolve(ids, screen) {
  return L.resolveTemplateIds(ids, L.lockedIdsFromScreen(screen), ALTS, ALL);
}

assert.ok(!('parseLabImport' in L));
assert.ok(!('labPlan' in L));
assert.ok(!('applyLoadScale' in L));
assert.ok(!('lockedIdsWithLabs' in L));
assert.ok(!('findMarker' in L));
assert.ok(!('formatSetsLabel' in L));

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

var failHinge = resolve(TEMPLATE_A, {balance:true, overhead:true, hinge:true});
assert.deepStrictEqual(failHinge, TEMPLATE_A);

failHinge = resolve(TEMPLATE_A, {balance:true, overhead:true, hinge:false});
assert.ok(failHinge.indexOf('rdl') === -1, 'Failed hinge locks RDL');
assert.ok(failHinge.indexOf('hipthrust') !== -1, 'Failed hinge swaps RDL to hip thrust');

var failOverhead = resolve(TEMPLATE_A, {balance:true, overhead:false, hinge:true});
assert.ok(failOverhead.indexOf('hkpress') === -1);
assert.ok(failOverhead.indexOf('floorpress') !== -1);
assert.ok(failOverhead.indexOf('pullup') === -1);
assert.ok(failOverhead.indexOf('hang') === -1);

var oldBugA = resolve(TEMPLATE_A, {balance:null, overhead:null, hinge:null});
assert.deepStrictEqual(oldBugA, TEMPLATE_A, 'Unanswered/null must not over-lock the way !screen.x did');

var passB = resolve(TEMPLATE_B, {balance:true, overhead:true, hinge:true});
assert.deepStrictEqual(passB, TEMPLATE_B);
assert.strictEqual(TEMPLATE_B[TEMPLATE_B.length - 1], 'swing', 'Workout B still ends on the two-hand swing');
assert.ok(TEMPLATE_A.indexOf('swing_1a') === -1);
assert.ok(TEMPLATE_B.indexOf('swing_1a') === -1);
assert.ok(TEMPLATE_A.indexOf('windmill') === -1);
assert.ok(TEMPLATE_B.indexOf('windmill') === -1);
assert.ok(TEMPLATE_A.indexOf('tgu_half') === -1);
assert.ok(TEMPLATE_B.indexOf('tgu_half') === -1);

assert.ok(ALL.indexOf('renegade') === -1);
assert.ok(ALL.indexOf('renegade_row') === -1);
assert.ok(ALL.indexOf('clean_press') === -1);
assert.ok(ALL.indexOf('clean_and_press') === -1);
assert.ok(ALL.indexOf('cnp') === -1);

var failBal = L.lockedIdsFromScreen({balance:false, overhead:true, hinge:true});
assert.ok(failBal.indexOf('swing') !== -1);
assert.ok(failBal.indexOf('swing_1a') !== -1, 'One-arm swing uses the same balance lock as the two-hand swing');
var failHingeIds = L.lockedIdsFromScreen({balance:true, overhead:true, hinge:false});
assert.ok(failHingeIds.indexOf('swing') !== -1);
assert.ok(failHingeIds.indexOf('swing_1a') !== -1, 'One-arm swing uses the same hinge lock as the two-hand swing');
assert.ok(L.lockedIdsFromScreen({balance:true, overhead:false, hinge:true}).indexOf('windmill') !== -1);

var swingCycle = L.swapPoolIds('swing', 'swing', [], [], ALTS, EX);
assert.deepStrictEqual(swingCycle, ['swing','swing_1a','windmill','tgu_half'], 'B swing slot cycles the four KB options');
var fromWindmill = L.swapPoolIds('swing', 'windmill', [], [], ALTS, EX);
assert.deepStrictEqual(fromWindmill, ['swing','swing_1a','windmill','tgu_half']);
var lockedOverhead = L.swapPoolIds('swing', 'swing', L.lockedIdsFromScreen({balance:true, overhead:false, hinge:true}), [], ALTS, EX);
assert.ok(lockedOverhead.indexOf('windmill') === -1, 'Windmill stays locked if overhead fails');
assert.ok(lockedOverhead.indexOf('tgu_half') === -1);
assert.ok(lockedOverhead.indexOf('swing_1a') === -1);

console.log('workout-logic tests passed');
