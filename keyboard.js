// 키보드 테스트: 눌린 키 표시, 지금 눌린 키 수의 최댓값(동시 입력), 같은 키가 너무 빨리 두 번 눌린 경우(채터링 의심)를 센다.
// 순수 함수(newKeyState, keyDown, keyUp, keyUpEvent, downCount)는 test/tools.test.ts가 그대로 불러 검사한다.
'use strict'

// 같은 키를 사람이 두 번 누르는 간격은 보통 이보다 길다. 이보다 짧은 두 번째 입력을 채터링 의심으로 센다.
var CHATTER_MS = 50

// keyup이 오지 않거나 토글로 오는 키. 누르는 순간 뗀 것으로 친다.
var MOMENTARY = { Lang1: true, Lang2: true, CapsLock: true }

function newKeyState() {
  return { down: {}, hit: {}, lastDown: {}, maxDown: 0 }
}

function downCount(state) {
  return Object.keys(state.down).length
}

// 키를 누를 때. 길게 눌러 자동 반복되는 입력(repeat)은 세지 않는다. 채터링 의심이면 간격(ms)을, 아니면 null을 돌려준다.
function keyDown(state, code, t, repeat) {
  if (repeat || !code) return null
  var prev = state.lastDown[code]
  state.lastDown[code] = t
  state.down[code] = true
  state.hit[code] = true
  state.maxDown = Math.max(state.maxDown, downCount(state))
  var gap = prev === undefined ? null : t - prev
  return gap !== null && gap < CHATTER_MS ? Math.round(gap) : null
}

function keyUp(state, code) {
  delete state.down[code]
}

// Windows PrintScreen처럼 keyup만 오는 키도 누른 것으로 친다. 맥은 Cmd를 누른 동안 다른 키의 keyup을 빠뜨려서 Cmd를 뗄 때 모두 뗀 것으로 친다.
function keyUpEvent(state, code, t) {
  if (code && !state.hit[code]) keyDown(state, code, t, false)
  if (code.indexOf('Meta') === 0) state.down = {}
  keyUp(state, code)
}

function ready(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn)
  else fn()
}

function initKeyboard(root) {
  var state = newKeyState()
  var keys = {}
  root.querySelectorAll('[data-code]').forEach(function (el) { keys[el.getAttribute('data-code')] = el })
  var total = Object.keys(keys).length
  var unknown = {}
  var log = []
  var $ = function (id) { return document.getElementById(id) }

  function render(e) {
    Object.keys(keys).forEach(function (code) {
      keys[code].classList.toggle('down', !!state.down[code])
      keys[code].classList.toggle('hit', !!state.hit[code])
    })
    var hitKnown = Object.keys(state.hit).filter(function (c) { return keys[c] }).length
    $('kb-hit').textContent = hitKnown + ' / ' + total
    $('kb-max').textContent = state.maxDown + '개'
    $('kb-chatter').textContent = log.length ? log.join(', ') : '없음'
    $('kb-unknown').textContent = Object.keys(unknown).join(', ') || '없음'
    if (e) $('kb-last').textContent = 'key "' + e.key + '" · code ' + (e.code || '(빈 값)')
  }

  document.addEventListener('keydown', function (e) {
    if (!e.ctrlKey && !e.metaKey) e.preventDefault()
    var code = e.code
    if (code && !keys[code]) unknown[code] = true
    var gap = keyDown(state, code, e.timeStamp || performance.now(), e.repeat)
    if (MOMENTARY[code]) keyUp(state, code)
    if (gap !== null) log.unshift(code + ' ' + gap + 'ms')
    if (log.length > 20) log.length = 20
    render(e)
  })
  document.addEventListener('keyup', function (e) {
    if (!e.ctrlKey && !e.metaKey) e.preventDefault()
    keyUpEvent(state, e.code || '', e.timeStamp || performance.now())
    render(e)
  })
  window.addEventListener('blur', function () { state.down = {}; render() })
  $('kb-reset').addEventListener('click', function () {
    state = newKeyState(); unknown = {}; log = []
    $('kb-last').textContent = '아직 없음'
    render()
  })
  render()
}

if (typeof document !== 'undefined') {
  ready(function () {
    var root = document.getElementById('keyboard')
    if (root) initKeyboard(root)
  })
}
