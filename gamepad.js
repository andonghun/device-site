// 게임패드 테스트: 버튼·트리거·스틱 값을 보여 주고, 손을 뗀 채 3초 동안 스틱이 중심에서 벗어난 최댓값으로 쏠림을 판정하고, 지원하는 브라우저에서 진동을 낸다.
// 순수 함수(stickMagnitude, maxMagnitude, driftVerdict, buttonLabel, percent)는 test/tools.test.ts가 그대로 불러 검사한다.
'use strict'

// 손을 뗐는데 스틱이 중심에서 이 비율 이상 벗어나 있으면 쏠림 의심으로 본다. 이 사이트가 정한 값이다.
var DRIFT_LIMIT = 0.1
var DRIFT_MS = 3000

// 표준 배치(mapping "standard")의 버튼 번호별 이름. 엑스박스 / 플레이스테이션 표기를 같이 쓴다.
var STANDARD_BUTTONS = ['A / ×', 'B / ○', 'X / □', 'Y / △', 'LB / L1', 'RB / R1', 'LT / L2', 'RT / R2', '보기 / Create', '메뉴 / Options', '왼쪽 스틱 누름', '오른쪽 스틱 누름', '↑', '↓', '←', '→', '홈 / PS', '터치패드']

function stickMagnitude(x, y) {
  return Math.min(1, Math.sqrt(x * x + y * y))
}

function maxMagnitude(samples) {
  var m = 0
  for (var i = 0; i < samples.length; i++) m = Math.max(m, stickMagnitude(samples[i][0], samples[i][1]))
  return m
}

function driftVerdict(max) {
  return max >= DRIFT_LIMIT ? 'suspect' : 'ok'
}

function buttonLabel(mapping, i) {
  return mapping === 'standard' && STANDARD_BUTTONS[i] ? STANDARD_BUTTONS[i] : '버튼 ' + i
}

function percent(v) {
  return Math.round(v * 100) + '%'
}

function ready(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn)
  else fn()
}

function firstPad() {
  var pads = navigator.getGamepads ? navigator.getGamepads() : []
  for (var i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected !== false) return pads[i]
  return null
}

function initGamepad() {
  var $ = function (id) { return document.getElementById(id) }
  var built = ''
  var drift = null

  function buildButtons(pad) {
    var key = pad.id + '|' + pad.buttons.length + '|' + pad.mapping
    if (key === built) return
    built = key
    var html = ''
    for (var i = 0; i < pad.buttons.length; i++) html += '<div class="mb" data-b="' + i + '"><span class="name">' + buttonLabel(pad.mapping, i) + '</span><span class="v sub"></span></div>'
    $('gp-buttons').innerHTML = html
    $('gp-name').textContent = pad.id + (pad.mapping === 'standard' ? '' : ' (표준 배치가 아니라 버튼 번호로 표시)')
    $('gp-vibrate').disabled = !(pad.vibrationActuator && pad.vibrationActuator.playEffect)
  }
  function drawStick(id, x, y) {
    $(id + '-dot').style.transform = 'translate(' + (x * 50) + 'px,' + (y * 50) + 'px)'
    $(id + '-val').textContent = 'x ' + x.toFixed(2) + ' · y ' + y.toFixed(2) + ' · 중심에서 ' + percent(stickMagnitude(x, y))
  }
  function sampleDrift(pad, now) {
    if (!drift) return
    drift.left.push([pad.axes[0] || 0, pad.axes[1] || 0])
    drift.right.push([pad.axes[2] || 0, pad.axes[3] || 0])
    if (now - drift.since < DRIFT_MS) return void ($('gp-drift').textContent = '재는 중… 스틱에서 손을 떼고 기다리세요')
    var l = maxMagnitude(drift.left)
    var r = maxMagnitude(drift.right)
    var word = function (m) { return percent(m) + (driftVerdict(m) === 'suspect' ? ' 쏠림 의심' : ' 정상 범위') }
    $('gp-drift').textContent = '왼쪽 ' + word(l) + ' · 오른쪽 ' + word(r)
    drift = null
  }
  function frame(now) {
    var pad = firstPad()
    $('gp-empty').hidden = !!pad
    $('gp-live').hidden = !pad
    if (pad) {
      buildButtons(pad)
      document.querySelectorAll('#gp-buttons .mb').forEach(function (el, i) {
        var b = pad.buttons[i]
        el.classList.toggle('down', !!(b && b.pressed))
        el.querySelector('.v').textContent = b && b.value > 0 && b.value < 1 ? percent(b.value) : ''
      })
      drawStick('gp-left', pad.axes[0] || 0, pad.axes[1] || 0)
      drawStick('gp-right', pad.axes[2] || 0, pad.axes[3] || 0)
      sampleDrift(pad, now)
    }
    requestAnimationFrame(frame)
  }

  $('gp-drift-start').addEventListener('click', function () {
    drift = { since: performance.now(), left: [], right: [] }
  })
  $('gp-vibrate').addEventListener('click', function () {
    var pad = firstPad()
    if (!pad || !pad.vibrationActuator || !pad.vibrationActuator.playEffect) return void ($('gp-vib-msg').textContent = '이 브라우저나 게임패드는 진동을 지원하지 않습니다.')
    pad.vibrationActuator.playEffect('dual-rumble', { startDelay: 0, duration: 800, weakMagnitude: 1, strongMagnitude: 1 }).then(function () {
      $('gp-vib-msg').textContent = '진동을 0.8초 보냈습니다. 양손에서 느껴지는지 확인하세요.'
    }).catch(function () { $('gp-vib-msg').textContent = '진동 명령이 거부됐습니다.' })
  })
  if (!navigator.getGamepads) $('gp-empty').textContent = '이 브라우저는 게임패드 입력을 지원하지 않습니다.'
  requestAnimationFrame(frame)
}

if (typeof document !== 'undefined') {
  ready(function () {
    if (document.getElementById('gp-buttons')) initGamepad()
  })
}
