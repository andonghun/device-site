// 마우스 테스트: 버튼 5개의 눌림 횟수, 한 번 눌렀는데 두 번 들어오는 더블클릭(채터링) 의심, 휠 위·아래를 센다.
// 순수 함수(newMouseState, buttonDown)는 test/tools.test.ts가 그대로 불러 검사한다.
'use strict'

// 사람이 일부러 두 번 누르는 간격은 보통 이보다 길다. 이보다 짧은 두 번째 눌림을 더블클릭 의심으로 센다.
var DOUBLE_MS = 80
var BUTTON_NAMES = ['왼쪽', '가운데(휠)', '오른쪽', '뒤로', '앞으로']

function newMouseState() {
  return { counts: [0, 0, 0, 0, 0], doubles: [0, 0, 0, 0, 0], lastDown: [null, null, null, null, null], minGap: [null, null, null, null, null] }
}

// 버튼을 누를 때. 더블클릭 의심이면 간격(ms)을, 아니면 null을 돌려준다.
function buttonDown(state, b, t) {
  if (b < 0 || b > 4) return null
  var prev = state.lastDown[b]
  state.lastDown[b] = t
  state.counts[b] += 1
  if (prev === null) return null
  var gap = t - prev
  state.minGap[b] = state.minGap[b] === null ? gap : Math.min(state.minGap[b], gap)
  if (gap >= DOUBLE_MS) return null
  state.doubles[b] += 1
  return Math.round(gap)
}

function ready(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn)
  else fn()
}

function initMouse(pad) {
  var state = newMouseState()
  var wheel = { up: 0, down: 0 }
  var log = []
  var $ = function (id) { return document.getElementById(id) }
  var cells = pad.parentNode.querySelectorAll('[data-button]')

  function render() {
    cells.forEach(function (cell) {
      var b = Number(cell.getAttribute('data-button'))
      cell.querySelector('.n').textContent = state.counts[b]
      cell.querySelector('.d').textContent = state.doubles[b] ? '의심 ' + state.doubles[b] + '회' : ''
      cell.classList.toggle('warn', state.doubles[b] > 0)
    })
    $('ms-wheel').textContent = '위 ' + wheel.up + ' · 아래 ' + wheel.down
    $('ms-log').textContent = log.length ? log.join(', ') : '없음'
  }
  function press(e, on) {
    var cell = pad.parentNode.querySelector('[data-button="' + e.button + '"]')
    if (cell) cell.classList.toggle('down', on)
  }

  pad.addEventListener('mousedown', function (e) {
    e.preventDefault()
    var gap = buttonDown(state, e.button, e.timeStamp || performance.now())
    if (gap !== null) log.unshift(BUTTON_NAMES[e.button] + ' ' + gap + 'ms')
    if (log.length > 20) log.length = 20
    press(e, true)
    render()
  })
  pad.addEventListener('mouseup', function (e) { if (e.button > 2) e.preventDefault(); press(e, false) })
  pad.addEventListener('auxclick', function (e) { e.preventDefault() })
  pad.addEventListener('contextmenu', function (e) { e.preventDefault() })
  pad.addEventListener('wheel', function (e) {
    e.preventDefault()
    if (e.deltaY < 0) wheel.up += 1
    else if (e.deltaY > 0) wheel.down += 1
    render()
  }, { passive: false })
  $('ms-reset').addEventListener('click', function () {
    state = newMouseState(); wheel = { up: 0, down: 0 }; log = []
    render()
  })
  render()
}

if (typeof document !== 'undefined') {
  ready(function () {
    var pad = document.getElementById('mouse-pad')
    if (pad) initMouse(pad)
  })
}
