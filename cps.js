// CPS(초당 클릭 수) 테스트: 첫 클릭부터 정한 시간 동안 누른 횟수를 세어 초당 클릭 수를 낸다.
// 순수 함수(newRun, tap, isOver, cpsOf)는 test/tools.test.ts가 그대로 불러 검사한다. 최고 기록은 이 브라우저에만 남긴다.
'use strict'

// 시간이 끝난 직후 손이 계속 눌러 다음 판이 바로 시작되지 않게 잠깐 막는다.
var COOLDOWN_MS = 1000

function newRun(ms) {
  return { ms: ms, startedAt: null, clicks: 0, endedAt: null }
}

function isOver(run, now) {
  return run.startedAt !== null && now - run.startedAt >= run.ms
}

// 클릭 하나. 첫 클릭이 시작이고 시간이 지난 뒤의 클릭은 세지 않는다. 센 클릭이면 true를 돌려준다.
function tap(run, now) {
  if (run.endedAt !== null) return false
  if (run.startedAt === null) run.startedAt = now
  if (isOver(run, now)) { run.endedAt = run.startedAt + run.ms; return false }
  run.clicks += 1
  return true
}

function cpsOf(clicks, ms) {
  if (!(ms > 0)) return 0
  return Math.round((clicks / (ms / 1000)) * 100) / 100
}

function ready(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn)
  else fn()
}

function bestKey(ms) { return 'cps-best-' + ms }

function readBest(ms) {
  try { return Number(localStorage.getItem(bestKey(ms))) || 0 } catch (e) { return 0 }
}

function saveBest(ms, cps) {
  try { if (cps > readBest(ms)) localStorage.setItem(bestKey(ms), String(cps)) } catch (e) { /* 저장 못 해도 결과는 보여 준다 */ }
}

function initCps(pad) {
  var $ = function (id) { return document.getElementById(id) }
  var run = newRun(5000)
  var lockedUntil = 0

  function show(now) {
    var left = run.startedAt === null ? run.ms : Math.max(0, run.ms - (now - run.startedAt))
    var elapsed = run.startedAt === null ? 0 : Math.min(run.ms, now - run.startedAt)
    $('cps-left').textContent = (left / 1000).toFixed(1) + '초'
    $('cps-count').textContent = run.clicks + '번'
    $('cps-now').textContent = elapsed > 0 ? cpsOf(run.clicks, elapsed).toFixed(2) : '0.00'
    $('cps-best').textContent = readBest(run.ms) ? readBest(run.ms).toFixed(2) : '기록 없음'
  }
  function finish() {
    run.endedAt = run.startedAt + run.ms
    var cps = cpsOf(run.clicks, run.ms)
    saveBest(run.ms, cps)
    lockedUntil = performance.now() + COOLDOWN_MS
    $('cps-result').textContent = (run.ms / 1000) + '초 동안 ' + run.clicks + '번, 초당 ' + cps.toFixed(2) + '번'
    pad.textContent = '다시 하려면 잠시 뒤 이 상자를 누르세요'
    show(performance.now())
  }
  function loop(now) {
    if (run.startedAt === null || run.endedAt !== null) return
    if (isOver(run, now)) return finish()
    show(now)
    requestAnimationFrame(loop)
  }
  function reset(ms) {
    run = newRun(ms)
    $('cps-result').textContent = ''
    pad.textContent = '여기를 누르면 시작합니다'
    show(performance.now())
  }

  pad.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    var now = performance.now()
    if (now < lockedUntil) return
    if (run.endedAt !== null) reset(run.ms)
    else if (isOver(run, now)) return finish()
    var first = run.startedAt === null
    tap(run, now)
    if (first) { pad.textContent = '계속 누르세요'; requestAnimationFrame(loop) }
    show(now)
  })
  pad.addEventListener('contextmenu', function (e) { e.preventDefault() })
  document.querySelectorAll('[data-cps-ms]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('[data-cps-ms]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)) })
      reset(Number(btn.getAttribute('data-cps-ms')))
    })
  })
  reset(5000)
}

if (typeof document !== 'undefined') {
  ready(function () {
    var pad = document.getElementById('cps-pad')
    if (pad) initCps(pad)
  })
}
