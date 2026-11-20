// 웹캠 테스트: 화면에 영상을 띄우고 해상도, 카메라가 알려 준 프레임, 실제로 들어온 프레임 수를 보여 준다. 영상은 이 브라우저 밖으로 나가지 않는다.
// 순수 함수(fpsFrom, camErrorText)는 test/tools.test.ts가 그대로 불러 검사한다.
'use strict'

function fpsFrom(frames, ms) {
  if (!(ms > 0)) return 0
  return Math.round((frames * 1000) / ms * 10) / 10
}

function camErrorText(name) {
  if (name === 'NotAllowedError' || name === 'SecurityError') return '카메라 권한이 막혀 있습니다. 주소창의 자물쇠(사이트 설정)에서 카메라를 허용한 뒤 새로고침하세요.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return '연결된 카메라를 찾지 못했습니다. USB 연결과 노트북의 카메라 차단 스위치·단축키를 확인하세요.'
  if (name === 'NotReadableError') return '카메라를 열 수 없습니다. 줌·팀즈 같은 다른 프로그램이 카메라를 쓰고 있는지 확인하세요.'
  return '카메라를 열지 못했습니다(' + name + ').'
}

function ready(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn)
  else fn()
}

function initWebcam() {
  var $ = function (id) { return document.getElementById(id) }
  var video = $('cam-video')
  var stream = null
  var counter = { frames: 0, since: 0, on: false }

  function countFrames() {
    if (!video.requestVideoFrameCallback) return void ($('cam-fps-real').textContent = '이 브라우저에서는 잴 수 없음')
    // 루프마다 자기 카운터를 잡는다. 장치를 바꿔 다시 켜도 이전 루프가 새 카운터를 같이 세지 않는다.
    var mine = { frames: 0, since: performance.now(), on: true }
    counter = mine
    var tick = function () {
      if (!mine.on) return
      mine.frames += 1
      var ms = performance.now() - mine.since
      if (ms >= 2000) {
        $('cam-fps-real').textContent = fpsFrom(mine.frames, ms) + 'fps'
        mine.frames = 0
        mine.since = performance.now()
      }
      video.requestVideoFrameCallback(tick)
    }
    video.requestVideoFrameCallback(tick)
  }
  function stop() {
    counter.on = false
    if (stream) stream.getTracks().forEach(function (t) { t.stop() })
    stream = null
    video.srcObject = null
    $('cam-start').hidden = false
    $('cam-stop').hidden = true
  }
  function showSettings(track) {
    var s = track.getSettings ? track.getSettings() : {}
    $('cam-name').textContent = track.label || '알 수 없음'
    $('cam-res').textContent = s.width && s.height ? s.width + ' × ' + s.height : '알 수 없음'
    $('cam-fps').textContent = s.frameRate ? Math.round(s.frameRate) + 'fps' : '알 수 없음'
    $('cam-fps-real').textContent = '재는 중…'
    listCameras($('cam-device'), s.deviceId)
  }
  function start(deviceId) {
    stop()
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return void ($('cam-msg').textContent = '이 브라우저는 카메라 입력을 지원하지 않습니다.')
    var video0 = { width: { ideal: 1920 }, height: { ideal: 1080 } }
    if (deviceId) video0.deviceId = { exact: deviceId }
    navigator.mediaDevices.getUserMedia({ video: video0, audio: false }).then(function (s) {
      stream = s
      video.srcObject = s
      var p = video.play()
      if (p && p.catch) p.catch(function () {})
      $('cam-msg').textContent = ''
      $('cam-start').hidden = true
      $('cam-stop').hidden = false
      showSettings(s.getVideoTracks()[0])
      countFrames()
    }).catch(function (e) { $('cam-msg').textContent = camErrorText(e && e.name) })
  }

  $('cam-start').addEventListener('click', function () { start('') })
  $('cam-stop').addEventListener('click', stop)
  $('cam-device').addEventListener('change', function (e) { start(e.target.value) })
  $('cam-mirror').addEventListener('change', function (e) { video.classList.toggle('mirror', e.target.checked) })
}

function listCameras(select, current) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return
  navigator.mediaDevices.enumerateDevices().then(function (devices) {
    var cams = devices.filter(function (d) { return d.kind === 'videoinput' })
    select.innerHTML = ''
    cams.forEach(function (d, i) {
      var opt = document.createElement('option')
      opt.value = d.deviceId
      opt.textContent = d.label || '카메라 ' + (i + 1)
      if (d.deviceId === current) opt.selected = true
      select.appendChild(opt)
    })
    select.hidden = cams.length < 2
  })
}

if (typeof document !== 'undefined') {
  ready(function () {
    if (document.getElementById('cam-start')) initWebcam()
  })
}
