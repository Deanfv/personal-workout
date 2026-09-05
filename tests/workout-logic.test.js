'use strict';
var assert = require('assert');
var L = require('../workout-logic.js');

var TEMPLATE_A = ['hang','goblet','hkpress','rdl','row','reverse_lunge','pallof'];
var TEMPLATE_B = ['hang','swing','floorpress','offset_squat','row','farmer','lift'];
var TEMPLATE_C = ['swing_1a','kb_clean','tgu_half','windmill','suitcase'];
var ALTS = {
  rdl: ['hipthrust','goblet'],
  slrdl: ['rdl','reverse_lunge','hipthrust'],
  swing: ['hipthrust','rdl','swing_1a','windmill','tgu_half'],
  swing_1a: ['swing','windmill','tgu_half'],
  hkpress: ['floorpress'],
  windmill: ['halo','swing','swing_1a','tgu_half'],
  tgu_half: ['deadbug','halo','swing','swing_1a','windmill'],
  kb_clean: ['suitcase'],
  row: ['pullup','hang'],
  pullup: ['row','hang'],
  hang: ['pullup','row'],
  bulgarian: ['reverse_lunge'],
  stepup: ['reverse_lunge'],
  lateral_lunge: ['reverse_lunge','stepup']
};
var ALL = ['goblet','offset_squat','rdl','slrdl','bulgarian','reverse_lunge','lateral_lunge','stepup','suitcase','farmer','rack_carry','row','floorpress','hkpress','chop','lift','pallof','deadbug','hipthrust','swing','swing_1a','kb_clean','halo','tgu_half','windmill','pullup','hang'];
var EX = ALL.map(function (id) { return {id:id, cat: id === 'swing' || id === 'swing_1a' || id === 'rdl' || id === 'hipthrust' ? 'hinge' : (id === 'windmill' || id === 'halo' ? 'mobility' : (id === 'tgu_half' ? 'full' : (id === 'kb_clean' ? 'clean' : 'other')))}; });

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
var skipC = resolve(TEMPLATE_C, {skipped:true});
assert.deepStrictEqual(skipC, TEMPLATE_C, 'Skip must not strip Workout C');

var failHinge = resolve(TEMPLATE_A, {balance:true, overhead:true, hinge:true});
assert.deepStrictEqual(failHinge, TEMPLATE_A);

failHinge = resolve(TEMPLATE_A, {balance:true, overhead:true, hinge:false});
assert.ok(failHinge.indexOf('rdl') === -1, 'Failed hinge locks RDL');
assert.ok(failHinge.indexOf('hipthrust') !== -1, 'Failed hinge swaps RDL to hip thrust');

var failOverhead = resolve(TEMPLATE_A, {balance:true, overhead:false, hinge:true});
assert.ok(failOverhead.indexOf('hkpress') === -1);
assert.ok(failOverhead.indexOf('floorpress') !== -1);
assert.ok(failOverhead.indexOf('hang') === -1);

var oldBugA = resolve(TEMPLATE_A, {balance:null, overhead:null, hinge:null});
assert.deepStrictEqual(oldBugA, TEMPLATE_A, 'Unanswered/null must not over-lock the way !screen.x did');

var passB = resolve(TEMPLATE_B, {balance:true, overhead:true, hinge:true});
assert.deepStrictEqual(passB, TEMPLATE_B);
assert.strictEqual(TEMPLATE_B[1], 'swing', 'Workout B puts the two-hand swing second, while fresh');
assert.deepStrictEqual(resolve(TEMPLATE_C, {balance:true, overhead:true, hinge:true}), TEMPLATE_C);
assert.strictEqual(TEMPLATE_C.length, 5, 'Charlie is five lifts');
assert.deepStrictEqual(TEMPLATE_C, ['swing_1a','kb_clean','tgu_half','windmill','suitcase']);
assert.ok(TEMPLATE_A.indexOf('swing_1a') === -1);
assert.ok(TEMPLATE_B.indexOf('swing_1a') === -1);
assert.ok(TEMPLATE_A.indexOf('windmill') === -1);
assert.ok(TEMPLATE_B.indexOf('windmill') === -1);
assert.ok(TEMPLATE_A.indexOf('tgu_half') === -1);
assert.ok(TEMPLATE_B.indexOf('tgu_half') === -1);
assert.ok(TEMPLATE_A.indexOf('kb_clean') === -1);
assert.ok(TEMPLATE_B.indexOf('kb_clean') === -1);
assert.ok(TEMPLATE_A.indexOf('hkpress') !== -1);
assert.ok(TEMPLATE_C.indexOf('hkpress') === -1, 'No heavy overhead press on Charlie');

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
assert.ok(failBal.indexOf('kb_clean') !== -1, 'Clean uses the same balance lock as the swings');
assert.ok(failHingeIds.indexOf('kb_clean') !== -1, 'Clean uses the same hinge lock as the swings');
assert.ok(L.lockedIdsFromScreen({balance:true, overhead:false, hinge:true}).indexOf('windmill') !== -1);
assert.ok(L.lockedIdsFromScreen({balance:true, overhead:false, hinge:true}).indexOf('kb_clean') === -1, 'Clean is not an overhead lock');

var swingCycle = L.swapPoolIds('swing', 'swing', [], [], ALTS, EX);
assert.deepStrictEqual(swingCycle, ['swing','swing_1a','windmill','tgu_half'], 'B swing slot cycles the four KB options');
var fromWindmill = L.swapPoolIds('swing', 'windmill', [], [], ALTS, EX);
assert.deepStrictEqual(fromWindmill, ['swing','swing_1a','windmill','tgu_half']);
var lockedOverhead = L.swapPoolIds('swing', 'swing', L.lockedIdsFromScreen({balance:true, overhead:false, hinge:true}), [], ALTS, EX);
assert.ok(lockedOverhead.indexOf('windmill') === -1, 'Windmill stays locked if overhead fails');
assert.ok(lockedOverhead.indexOf('tgu_half') === -1);
assert.ok(lockedOverhead.indexOf('swing_1a') === -1);

var takenC = ['swing_1a','tgu_half','windmill'];
var cleanCycle = L.swapPoolIds('kb_clean', 'kb_clean', [], takenC, ALTS, EX);
assert.deepStrictEqual(cleanCycle, ['kb_clean','suitcase'], 'Charlie clean swaps to suitcase, not a full A/B list');
var cSwing = L.swapPoolIds('swing_1a', 'swing_1a', [], ['kb_clean','tgu_half','windmill'], ALTS, EX);
assert.ok(cSwing.indexOf('swing') !== -1);
assert.ok(cSwing.indexOf('goblet') === -1);
assert.ok(cSwing.indexOf('rdl') === -1);
assert.ok(cSwing.indexOf('hkpress') === -1);

assert.ok(!('shouldHangPrimer' in L));
assert.ok(!('HANG_PRIMER_SECS' in L));
assert.deepStrictEqual(TEMPLATE_A, ['hang','goblet','hkpress','rdl','row','reverse_lunge','pallof']);
assert.deepStrictEqual(TEMPLATE_B, ['hang','swing','floorpress','offset_squat','row','farmer','lift']);
assert.deepStrictEqual(TEMPLATE_C, ['swing_1a','kb_clean','tgu_half','windmill','suitcase']);
assert.strictEqual(TEMPLATE_A[0], 'hang');
assert.strictEqual(TEMPLATE_B[0], 'hang');
assert.strictEqual(TEMPLATE_B[1], 'swing');
assert.strictEqual(TEMPLATE_A.length, 7);
assert.strictEqual(TEMPLATE_B.length, 7);
assert.strictEqual(TEMPLATE_C.length, 5);

assert.strictEqual(L.suggestedWhich('', false), 'C', 'Empty history suggests Charlie');
assert.strictEqual(L.suggestedWhich('Workout A', true), 'A');
assert.strictEqual(L.suggestedWhich('Workout B', true), 'B');
assert.strictEqual(L.suggestedWhich('Workout C', true), 'C');
assert.strictEqual(L.suggestedWhich('Hips · Daily', true), 'C', 'Hips must not steal Suggested');
assert.strictEqual(L.suggestedWhich('Hips · Load', true), 'C');
assert.strictEqual(L.suggestedWhich('Hips · Pattern', true), 'C');
assert.strictEqual(L.suggestedWhich('Workout Hips', true), 'C');
assert.strictEqual(L.suggestedWhich('300', true), 'C', '300 must not steal Suggested');
assert.strictEqual(L.suggestedWhich('gutcheck', true), 'C');
assert.strictEqual(L.suggestedWhich('Workout 300', true), 'C');

assert.deepStrictEqual(L.HIPS_MODES, ['daily', 'load', 'pattern']);
assert.strictEqual(L.HIPS_STEP_SECS, 30);
assert.strictEqual(L.HIPS_DAILY_ROUNDS, 4);
assert.strictEqual(L.HIPS_DAILY_STEPS.length, 3);
assert.deepStrictEqual(L.HIPS_DAILY_STEPS.map(function (s) { return s.secs; }), [30, 30, 30]);
assert.strictEqual(L.HIPS_DAILY_STEPS[0].name, 'Activate hamstrings');
assert.strictEqual(L.HIPS_DAILY_STEPS[1].name, 'Activate left groin / IR');
assert.strictEqual(L.HIPS_DAILY_STEPS[2].name, 'Remove the right side');
assert.deepStrictEqual(L.HIPS_LOAD_IDS, ['hips_iso_hinge', 'hips_kickstand_rdl', 'hips_ir_hinge']);
L.HIPS_LOAD_IDS.forEach(function (id) {
  assert.ok(TEMPLATE_A.indexOf(id) === -1);
  assert.ok(TEMPLATE_B.indexOf(id) === -1);
  assert.ok(TEMPLATE_C.indexOf(id) === -1);
  assert.ok(ALL.indexOf(id) === -1, 'Hips load lifts stay out of the A/B/C pool');
});

assert.ok(L.isHipsMode('daily'));
assert.ok(L.isHipsMode('load'));
assert.ok(L.isHipsMode('pattern'));
assert.ok(!L.isHipsMode('D'));
assert.ok(!L.isHipsMode('A'));

assert.strictEqual(L.hipsHistoryLabel('daily'), 'Hips · Daily');
assert.strictEqual(L.hipsHistoryLabel('load'), 'Hips · Load');
assert.strictEqual(L.hipsHistoryLabel('pattern'), 'Hips · Pattern');

var hipsRec = L.hipsSessionRecord({date: '2026-09-02', mode: 'daily', duration: 480, elapsed: '8 min'});
assert.strictEqual(hipsRec.id, '_hips');
assert.strictEqual(hipsRec.type, 'hips');
assert.strictEqual(hipsRec.mode, 'daily');
assert.strictEqual(hipsRec.name, 'Hips · Daily');
assert.ok(!L.isLiftSession(hipsRec), 'Hips must not count as a finished A/B/C session');
assert.ok(L.isHipsRecord(hipsRec));
assert.ok(L.isLiftSession({id: '_session', name: 'Full-body session'}));
assert.ok(!L.isLiftSession({id: '_session', type: 'hips'}));

var TEMPLATE_300 = ['swing', 'goblet', 'row'];
assert.deepStrictEqual(L.GUTCHECK_IDS, TEMPLATE_300);
assert.strictEqual(L.GUTCHECK_TARGET, 100);
assert.strictEqual(L.GUTCHECK_SETS, 5);
assert.strictEqual(L.GUTCHECK_SET_REPS, 20);
assert.strictEqual(L.GUTCHECK_SETS * L.GUTCHECK_SET_REPS, 100);
assert.strictEqual(TEMPLATE_300.length, 3);
assert.strictEqual(TEMPLATE_300[0], 'swing');
assert.strictEqual(TEMPLATE_300[1], 'goblet');
assert.strictEqual(TEMPLATE_300[2], 'row');
assert.ok(TEMPLATE_300.indexOf('halo') === -1);
assert.ok(TEMPLATE_300.indexOf('swing_1a') === -1);
assert.ok(L.isGutcheckKind('300'));
assert.ok(L.isGutcheckKind('gutcheck'));
assert.ok(!L.isGutcheckKind('A'));
assert.ok(!L.isGutcheckKind('hips'));
assert.strictEqual(L.gutcheckHistoryLabel(), '300');
assert.strictEqual(L.gutcheckRepsFromSets([{done:true, reps:'10'}, {done:true, reps:'10'}, {done:false, reps:'10'}]), 20);
assert.strictEqual(L.gutcheckRepsFromSets([{done:true}]), 20, 'Done set with no reps counts as 20');
assert.deepStrictEqual(L.gutcheckProgress(40).label, '40/100');
assert.strictEqual(L.gutcheckProgress(40).remain, 60);
assert.strictEqual(L.gutcheckProgress(0).label, '0/100');

var gutRec = L.gutcheckSessionRecord({date: '2026-09-03', duration: 1200, elapsed: '20 min'});
assert.strictEqual(gutRec.id, '_300');
assert.strictEqual(gutRec.type, '300');
assert.strictEqual(gutRec.name, '300');
assert.ok(L.isGutcheckRecord(gutRec));
assert.ok(!L.isLiftSession(gutRec), '300 must not count as a finished A/B/C session');
assert.ok(!L.isLiftSession({id: '_session', type: '300'}));
assert.ok(!L.isLiftSession({id: '_session', type: 'gutcheck'}));
assert.ok(!L.isHipsRecord(gutRec));
assert.ok(L.isGutcheckRecord({id: 'swing', type: '300'}));
assert.ok(!L.isGutcheckRecord({id: 'swing', type: 'lift'}));

var badMode = L.hipsSessionRecord({mode: 'workout-d'});
assert.strictEqual(badMode.mode, 'daily');
assert.strictEqual(badMode.id, '_hips');

var adv = L.hipsFloorAdvance(1, 0);
assert.deepStrictEqual(adv, {phase: 'floor', round: 1, step: 1});
assert.deepStrictEqual(L.hipsFloorAdvance(1, 2), {phase: 'floor', round: 2, step: 0});
assert.deepStrictEqual(L.hipsFloorAdvance(4, 2), {phase: 'ql', round: 4, step: 2});

var fs = require('fs');
var html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
assert.ok(html.indexOf('id="cardA"') !== -1);
assert.ok(html.indexOf('id="cardB"') !== -1);
assert.ok(html.indexOf('id="cardC"') !== -1);
assert.ok(html.indexOf('id="cardHips"') !== -1);
assert.ok(html.indexOf('id="card300"') !== -1);
assert.ok(html.indexOf('class="card suggested" id="cardC"') !== -1, 'Charlie stays the gold Suggested default');
assert.ok(html.indexOf('id="cardHips"') !== -1 && !/id="cardHips"[^>]*suggested/.test(html));
assert.ok(!/id="card300"[^>]*suggested/.test(html), '300 must not take Charlie gold Suggested');
assert.ok(html.indexOf('Start Hips') !== -1);
assert.ok(html.indexOf('Start 300') !== -1);
assert.ok(html.indexOf('tag-gut') !== -1);
assert.ok(html.indexOf('Gut check') !== -1);
assert.ok(html.indexOf('Golf gut check. 100 swings, 100 goblets, 100 rows.') !== -1);
assert.ok(html.indexOf('Not the day before you play. RPE 6–7. Sets of 20.') !== -1);
assert.ok(html.indexOf('Sets of 10.') === -1, '300 copy must not still say sets of 10');
assert.ok(html.indexOf('Sets of 20.') !== -1);
assert.ok(html.indexOf('id="cardA"') < html.indexOf('id="cardB"'));
assert.ok(html.indexOf('id="cardB"') < html.indexOf('id="cardC"'));
assert.ok(html.indexOf('id="cardC"') < html.indexOf('id="cardHips"'));
assert.ok(html.indexOf('id="cardHips"') < html.indexOf('id="card300"'));
assert.ok(html.indexOf('id="card300"') < html.indexOf('>Stretch<'));
assert.ok(html.indexOf("onclick=\"start300()\"") !== -1);
assert.ok(html.indexOf('function start300(') !== -1);
var start300Fn = html.slice(html.indexOf('function start300('), html.indexOf('function start300(') + 900);
assert.ok(start300Fn.indexOf('startWarmup') === -1, 'Do not glue a 5-min pulse onto 300');
assert.ok(start300Fn.indexOf('pw_last_label') === -1, '300 must not become last Suggested workout');
assert.ok(start300Fn.indexOf('beginWorkout') === -1);
assert.ok(html.indexOf("const TEMPLATE_300 = ['swing','goblet','row']") !== -1);
assert.ok(html.indexOf('pw_last_label') !== -1);
assert.ok(html.indexOf('sessionKind = \'300\'') !== -1 || html.indexOf('sessionKind = "300"') !== -1);
assert.ok(html.indexOf('halo') !== -1, 'Halo stays in the lift pool');
assert.ok(!/high pull/i.test(html));
assert.ok(!/tricep/i.test(html));
assert.ok(!/side swing/i.test(html));
var startHipsFn = html.slice(html.indexOf('function startHips('), html.indexOf('function startHips(') + 400);
assert.ok(startHipsFn.indexOf('start300') === -1, 'Hips must not start 300');
assert.ok(html.indexOf("onclick=\"startWarmup('short')\"") !== -1);
assert.ok(html.indexOf('startWarmup(\'short\')') !== -1 && html.indexOf('onclick="start300()"') !== -1);
assert.ok(html.indexOf('Start Workout Hips') === -1);
assert.ok(html.indexOf('Workout D') === -1);
assert.ok(html.indexOf('Start Workout A') !== -1);
assert.ok(html.indexOf('Start Workout B') !== -1);
assert.ok(html.indexOf('Start Workout C') !== -1);
assert.ok(html.indexOf("onclick=\"startWarmup('short')\"") !== -1);
assert.ok(html.indexOf("onclick=\"startWarmup('full')\"") !== -1);
assert.ok(html.indexOf("onclick=\"startWarmup('long')\"") !== -1);
assert.ok(html.indexOf('>5 min<') !== -1);
assert.ok(html.indexOf('>12 min<') !== -1);
assert.ok(html.indexOf('>18 min<') !== -1);
assert.ok(html.indexOf('Stretch only. None of these start lifts.') !== -1);
assert.ok(html.indexOf("if(which === 'A' || which === 'B')") !== -1, '5-min pulse stays glued to A/B');
assert.ok(html.indexOf('pendingAfterWarmup') !== -1);
assert.ok(html.indexOf('wok-home') !== -1);
assert.ok(html.indexOf('abandonSession()') !== -1);
assert.ok(html.indexOf('What is a Pavel day?') !== -1);
assert.ok(html.indexOf('tag-pavel') !== -1);
assert.ok(html.indexOf('#0d1c38') !== -1);
assert.ok(html.indexOf('#dcc684') !== -1);
assert.ok(!/Function Health/i.test(html));
assert.ok(!/frailty/i.test(html));
assert.ok(!/wildman/i.test(html));
assert.ok(!/\bvoice\b/i.test(html));
assert.ok(html.indexOf('instagram.com') === -1);
assert.ok(!/cdninstagram|scontent\.cdninstagram|youtube\.com\/embed/i.test(html));
assert.ok(html.indexOf("startHips()") !== -1);
assert.ok(html.indexOf('setHipsMode') !== -1);
assert.ok(html.indexOf('Your photo or self-video goes here') === -1);
assert.ok(html.indexOf('No Instagram or YouTube rip') === -1);
assert.ok(html.indexOf('assets/hips-daily-setup.png') !== -1);
assert.ok(html.indexOf('toggleHipsCam') !== -1);
assert.ok(fs.existsSync(__dirname + '/../assets/hips-daily-setup.png'), 'Daily setup still must be in the repo');
assert.ok(html.indexOf('Activate hamstrings') !== -1);
assert.ok(html.indexOf('Activate left groin / IR') !== -1);
assert.ok(html.indexOf('Remove the right side') !== -1);
assert.ok(html.indexOf('Gently squeeze the roller') !== -1);
assert.ok(html.indexOf('Pull the LEFT hip and knee down') !== -1);

console.log('workout-logic tests passed');
