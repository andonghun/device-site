// 마이크 테스트(입력 레벨, 5초 녹음 후 재생)와 스피커·이어폰 좌우 테스트. 소리는 이 브라우저 밖으로 나가지 않는다.
// 순수 함수(rmsOf, levelPercent, dbText, micErrorText)는 test/tools.test.ts가 그대로 불러 검사한다.
'use strict'

function rmsOf(samples) {
  if (!samples.length) return 0
  var sum = 0
  for (var i = 0; i < samples.length; i++) sum += samples[i] * samples[i]
  return Math.sqrt(sum / samples.length)
}

// -60dBFS 이하는 0%, 0dBFS는 100%로 펴서 막대 길이로 쓴다.
function levelPercent(rms) {
  if (!(rms > 0)) return 0
  var db = 20 * Math.log10(rms)
  return Math.max(0, Math.min(100, Math.round(((db + 60) / 60) * 100)))
}

function dbText(rms) {
  if (!(rms > 0)) return '-∞ dBFS'
  return (Math.round(20 * Math.log10(rms) * 10) / 10) + ' dBFS'
}

function micErrorText(name) {
  if (name === 'NotAllowedError' || name === 'SecurityError') return '마이크 권한이 막혀 있습니다. 주소창의 자물쇠(사이트 설정)에서 마이크를 허용한 뒤 새로고침하세요.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return '연결된 마이크를 찾지 못했습니다. 케이블·블루투스 연결과 운영체제의 입력 장치 설정을 확인하세요.'
  if (name === 'NotReadableError') return '마이크를 열 수 없습니다. 줌·디스코드 같은 다른 프로그램이 마이크를 쓰고 있는지 확인하세요.'
  return '마이크를 열지 못했습니다(' + name + ').'
}

function ready(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn)
  else fn()
}

function audioContext() {
  var Ctx = window.AudioContext || window.webkitAudioContext
  return Ctx ? new Ctx() : null
}

function listInputs(select, current) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return
  navigator.mediaDevices.enumerateDevices().then(function (devices) {
    var inputs = devices.filter(function (d) { return d.kind === 'audioinput' })
    select.innerHTML = ''
    inputs.forEach(function (d, i) {
      var opt = document.createElement('option')
      opt.value = d.deviceId
      opt.textContent = d.label || '마이크 ' + (i + 1)
      if (d.deviceId === current) opt.selected = true
      select.appendChild(opt)
    })
    select.hidden = inputs.length < 2
  })
}

function initMic() {
  var $ = function (id) { return document.getElementById(id) }
  var live = null

  function stop() {
    if (!live) return
    cancelAnimationFrame(live.raf)
    live.stream.getTracks().forEach(function (t) { t.stop() })
    if (live.ctx.close) live.ctx.close()
    live = null
    $('mic-bar').style.width = '0%'
    $('mic-db').textContent = '꺼짐'
    $('mic-start').hidden = false
    $('mic-stop').hidden = true
    $('mic-rec').disabled = true
  }
  function meter() {
    var buf = new Float32Array(live.analyser.fftSize)
    live.analyser.getFloatTimeDomainData(buf)
    var rms = rmsOf(buf)
    live.peak = Math.max(live.peak * 0.97, levelPercent(rms))
    $('mic-bar').style.width = levelPercent(rms) + '%'
    $('mic-peak').style.left = live.peak + '%'
    $('mic-db').textContent = dbText(rms)
    live.raf = requestAnimationFrame(meter)
  }
  function start(deviceId) {
    stop()
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return void ($('mic-msg').textContent = '이 브라우저는 마이크 입력을 지원하지 않습니다.')
    var audio = deviceId ? { deviceId: { exact: deviceId } } : true
    // 사파리는 클릭 처리 밖에서 만든 AudioContext를 멈춘 채로 두므로 클릭 시점에 만든다.
    var ctx = audioContext()
    if (!ctx) return void ($('mic-msg').textContent = '이 브라우저는 소리 분석을 지원하지 않습니다.')
    if (ctx.resume) ctx.resume()
    navigator.mediaDevices.getUserMedia({ audio: audio }).then(function (stream) {
      var analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      ctx.createMediaStreamSource(stream).connect(analyser)
      live = { stream: stream, ctx: ctx, analyser: analyser, peak: 0, raf: 0 }
      var track = stream.getAudioTracks()[0]
      $('mic-msg').textContent = '입력 장치: ' + (track && track.label ? track.label : '알 수 없음') + '. 말을 하면 막대가 움직입니다.'
      $('mic-start').hidden = true
      $('mic-stop').hidden = false
      $('mic-rec').disabled = typeof MediaRecorder === 'undefined'
      listInputs($('mic-device'), track && track.getSettings ? track.getSettings().deviceId : '')
      meter()
    }).catch(function (e) {
      if (ctx.close) ctx.close()
      $('mic-msg').textContent = micErrorText(e && e.name)
    })
  }
  function record() {
    if (!live || typeof MediaRecorder === 'undefined') return
    var chunks = []
    var rec = new MediaRecorder(live.stream)
    rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data) }
    rec.onstop = function () {
      var player = $('mic-play')
      player.src = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }))
      player.hidden = false
      $('mic-rec').disabled = false
      $('mic-rec').textContent = '5초 녹음'
    }
    rec.start()
    $('mic-rec').disabled = true
    $('mic-rec').textContent = '녹음 중…'
    setTimeout(function () { if (rec.state !== 'inactive') rec.stop() }, 5000)
  }

  $('mic-start').addEventListener('click', function () { start('') })
  $('mic-stop').addEventListener('click', stop)
  $('mic-rec').addEventListener('click', record)
  $('mic-device').addEventListener('change', function (e) { start(e.target.value) })
}

// 스피커 좌우: pan -1은 왼쪽, 1은 오른쪽, 0은 가운데. StereoPanner가 없으면 채널 합치기로 한쪽에만 보낸다.
function playSide(ctx, pan) {
  var osc = ctx.createOscillator()
  var gain = ctx.createGain()
  var now = ctx.currentTime
  osc.frequency.value = pan < 0 ? 440 : pan > 0 ? 660 : 550
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.3, now + 0.05)
  gain.gain.setValueAtTime(0.3, now + 0.7)
  gain.gain.linearRampToValueAtTime(0, now + 0.8)
  osc.connect(gain)
  if (ctx.createStereoPanner) {
    var panner = ctx.createStereoPanner()
    panner.pan.value = pan
    gain.connect(panner)
    panner.connect(ctx.destination)
  } else {
    var merger = ctx.createChannelMerger(2)
    if (pan <= 0) gain.connect(merger, 0, 0)
    if (pan >= 0) gain.connect(merger, 0, 1)
    merger.connect(ctx.destination)
  }
  osc.start(now)
  osc.stop(now + 0.85)
}

function initSpeaker() {
  var ctx = null
  var names = { '-1': '왼쪽', '0': '가운데', '1': '오른쪽' }
  document.querySelectorAll('[data-pan]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      ctx = ctx || audioContext()
      if (!ctx) return void (document.getElementById('sp-msg').textContent = '이 브라우저는 소리 생성을 지원하지 않습니다.')
      if (ctx.resume) ctx.resume()
      var pan = Number(btn.getAttribute('data-pan'))
      playSide(ctx, pan)
      document.getElementById('sp-msg').textContent = names[String(pan)] + ' 소리를 냈습니다. 같은 쪽에서 들리는지 확인하세요.'
    })
  })
}

if (typeof document !== 'undefined') {
  ready(function () {
    if (document.getElementById('mic-start')) initMic()
    if (document.querySelector('[data-pan]')) initSpeaker()
  })
}
