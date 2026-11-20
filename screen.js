// 모니터 테스트: 단색 전체 화면으로 불량화소·빛샘·번인을 보고, 화면 정보와 주사율을 잰다.
// 순수 함수(stepIndex, medianOf, estimateHz)는 test/tools.test.ts가 그대로 불러 검사한다.
'use strict'

var SCREEN_COLORS = [
  { name: '흰색', hex: '#ffffff', look: '어두운 점(암점)과 얼룩' },
  { name: '검정', hex: '#000000', look: '밝은 점(휘점)과 가장자리 빛샘' },
  { name: '빨강', hex: '#ff0000', look: '빨강 하위 픽셀이 꺼지거나 켜진 점' },
  { name: '초록', hex: '#00ff00', look: '초록 하위 픽셀이 꺼지거나 켜진 점' },
  { name: '파랑', hex: '#0000ff', look: '파랑 하위 픽셀이 꺼지거나 켜진 점' },
  { name: '회색 50%', hex: '#808080', look: '번인 자국과 밝기 얼룩' },
]

// 다음 색 번호. 마지막 색에서 앞으로 가면 -1(끝내기), 첫 색에서 뒤로 가면 0에 머문다.
function stepIndex(i, n, dir) {
  var j = i + dir
  if (j >= n) return -1
  return j < 0 ? 0 : j
}

function medianOf(xs) {
  var s = xs.slice().sort(function (a, b) { return a - b })
  var mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

// 프레임 간격(ms) 목록으로 화면 갱신 빈도(Hz)를 낸다. 중앙값을 써서 한두 번 늦은 프레임에 흔들리지 않게 한다.
function estimateHz(intervals) {
  if (!intervals.length) return 0
  var m = medianOf(intervals)
  return m > 0 ? Math.round(1000 / m) : 0
}

function measureHz(frames, done) {
  var times = []
  function tick(t) {
    times.push(t)
    if (times.length <= frames) return requestAnimationFrame(tick)
    var gaps = []
    for (var i = 1; i < times.length; i++) gaps.push(times[i] - times[i - 1])
    done(estimateHz(gaps))
  }
  requestAnimationFrame(tick)
}

function setText(id, text) {
  var el = document.getElementById(id)
  if (el) el.textContent = text
}

function fillScreenInfo() {
  var dpr = window.devicePixelRatio || 1
  var w = screen.width
  var h = screen.height
  setText('si-css', w + ' × ' + h)
  setText('si-dpr', String(Math.round(dpr * 100) / 100))
  setText('si-px', Math.round(w * dpr) + ' × ' + Math.round(h * dpr))
  setText('si-depth', screen.colorDepth + '비트')
  var hdr = window.matchMedia && matchMedia('(dynamic-range: high)').matches
  var p3 = window.matchMedia && matchMedia('(color-gamut: p3)').matches
  setText('si-hdr', hdr ? '켜짐' : '꺼짐 또는 미지원')
  setText('si-gamut', p3 ? 'Display P3 이상' : 'sRGB')
}

function startHz() {
  setText('si-hz', '재는 중…')
  measureHz(120, function (hz) { setText('si-hz', hz + 'Hz') })
}

function requestFull(el) {
  var fn = el.requestFullscreen || el.webkitRequestFullscreen
  if (!fn) return
  try {
    var p = fn.call(el)
    if (p && p.catch) p.catch(function () {})
  } catch (e) { /* 전체 화면을 못 쓰면 창 크기로 덮는다 */ }
}

function fullElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null
}

function exitFull() {
  var fn = document.exitFullscreen || document.webkitExitFullscreen
  if (fn && fullElement()) {
    try { var p = fn.call(document); if (p && p.catch) p.catch(function () {}) } catch (e) { /* 이미 나감 */ }
  }
}

function openOverlay(start) {
  var index = start
  var overlay = document.createElement('div')
  overlay.className = 'screen-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-label', '단색 화면')
  var hint = document.createElement('p')
  hint.className = 'screen-hint'
  overlay.appendChild(hint)
  document.body.appendChild(overlay)

  function paint() {
    var c = SCREEN_COLORS[index]
    overlay.style.background = c.hex
    hint.textContent = (index + 1) + '/' + SCREEN_COLORS.length + ' ' + c.name + ': ' + c.look + ' · 클릭·탭이나 → 키로 다음, Esc로 끝'
    hint.classList.remove('gone')
    clearTimeout(paint.timer)
    paint.timer = setTimeout(function () { hint.classList.add('gone') }, 2500)
  }
  function close() {
    clearTimeout(paint.timer)
    document.removeEventListener('keydown', onKey)
    document.removeEventListener('fullscreenchange', onFull)
    document.removeEventListener('webkitfullscreenchange', onFull)
    overlay.remove()
    exitFull()
  }
  function go(dir) {
    var next = stepIndex(index, SCREEN_COLORS.length, dir)
    if (next < 0) return close()
    index = next
    paint()
  }
  function onKey(e) {
    if (e.key === 'Escape') return close()
    if (e.key === 'ArrowLeft' || e.key === 'Backspace') { e.preventDefault(); go(-1) }
    else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); go(1) }
  }
  function onFull() { if (!fullElement() && overlay.isConnected) close() }

  overlay.addEventListener('click', function () { go(1) })
  document.addEventListener('keydown', onKey)
  document.addEventListener('fullscreenchange', onFull)
  document.addEventListener('webkitfullscreenchange', onFull)
  requestFull(overlay)
  paint()
}

function ready(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn)
  else fn()
}

if (typeof document !== 'undefined') {
  ready(function () {
    fillScreenInfo()
    startHz()
    var again = document.getElementById('si-hz-again')
    if (again) again.addEventListener('click', startHz)
    document.querySelectorAll('[data-screen-start]').forEach(function (btn) {
      btn.addEventListener('click', function () { openOverlay(Number(btn.getAttribute('data-screen-start')) || 0) })
    })
  })
}
