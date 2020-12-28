import "./styles.css";

document.getElementById("app").innerHTML = `
<h1>Audio API</h1>
`;

// utils
const arrToHTML = (arr, cb) => arr.map((item, i) => cb(item)).join("");
const tag = (tag) => (propsOrInnerHTML) => ({
  mount: (parent) => {
    const el = document.createElement(tag);

    if (typeof propsOrInnerHTML === "string") {
      el.innerHTML = propsOrInnerHTML;
    }

    if (typeof propsOrInnerHTML === "object") {
      Object.keys(propsOrInnerHTML).map(
        (key) => (el[key] = propsOrInnerHTML[key])
      );
    }

    const parentEl = parent || document.body;
    parentEl.appendChild(el);
    return el;
  }
});

const getTemplate = (title, parent) =>
  tag("div")({
    style: "padding: 1em; border: 1px solid #ddd",
    innerHTML: `<h2>${title}</h2>`
  }).mount(parent);

// 1. 구버전 브라우저 호환성 체크
// https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

// Older browsers might not implement mediaDevices at all, so we set an empty object first
if (navigator.mediaDevices === undefined) {
  navigator.mediaDevices = {};
}

// Some browsers partially implement mediaDevices. We can't just assign an object
// with getUserMedia as it would overwrite existing properties.
// Here, we will just add the getUserMedia property if it's missing.
if (navigator.mediaDevices.getUserMedia === undefined) {
  navigator.mediaDevices.getUserMedia = function (constraints) {
    // First get ahold of the legacy getUserMedia, if present
    var getUserMedia =
      navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    // Some browsers just don't implement it - return a rejected promise with an error
    // to keep a consistent interface
    if (!getUserMedia) {
      return Promise.reject(
        new Error("getUserMedia is not implemented in this browser")
      );
    }

    // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
    return new Promise(function (resolve, reject) {
      getUserMedia.call(navigator, constraints, resolve, reject);
    });
  };
}

// 사용 가능한 장치 읽기
const availableDevices = getTemplate("사용 가능한 장치 읽기");
navigator.mediaDevices.enumerateDevices().then((devices) => {
  const deviceItems = arrToHTML(devices, (device) =>
    device.kind === "audioinput"
      ? `<li id=${device.id}>${device.label}</li>`
      : ""
  );
  tag("nav")(deviceItems).mount(availableDevices);
});

// 2. audio/video 미디어 타입 설정
var constraints = { audio: true };

// 3. audio recording setup

const recordedChunks = [];
const options = {
  mimeType: "audio/webm"
};

function handleDataAvailable(e) {
  console.log("recorder data available");
  if (e.data.size > 0) {
    recordedChunks.push(e.data);
    console.log(recordedChunks);
    download();
  } else {
    // ...
  }
}

function download() {
  const blob = new Blob(recordedChunks, {
    type: "audio/webm"
  });
  const url = URL.createObjectURL(blob);

  tag("a")({
    style: "display:none",
    href: "url",
    download: "test.webm"
  })
    .mount()
    .click();
  window.URL.revokeObjectURL(url);
}

// 4. getUserMedia & audioREcorder

// 녹음 후, 로컬에 저장하기
const getUserMediaAudioRecorder = getTemplate("getUserMedia & audioRecorder");

navigator.mediaDevices
  .getUserMedia(constraints)
  .then(function (mediaStream) {
    console.log(mediaStream);

    // 4.1 녹음 후 로컬에 저장하기
    const temp1 = getTemplate(
      "녹음 후, 로컬에 저장하기",
      getUserMediaAudioRecorder
    );
    const mediaRecorder = new MediaRecorder(mediaStream, options);
    mediaRecorder.ondataavailable = handleDataAvailable;

    tag("button")("record")
      .mount(temp1)
      .addEventListener("click", () => mediaRecorder.start());

    tag("button")("stop")
      .mount(temp1)
      .addEventListener("click", () => mediaRecorder.stop());

    // 4.2 audio에 stream 삽입 후 실시간 출력
    const temp2 = getTemplate(
      "audio에 stream 삽입 후 실시간 출력",
      getUserMediaAudioRecorder
    );

    const audio = tag("audio")({
      srcObject: mediaStream,
      onloadedmetadata: (e) => audio.play()
    }).mount(temp2);

    audio.onloadedmetadata = (e) => {
      console.log(e);
      tag("button")("마이크 audio로 출력")
        .mount(temp2)
        .addEventListener("click", () => audio.play());
      tag("button")("마이크 출력 중지")
        .mount(temp2)
        .addEventListener("click", () => audio.pause());
    };

    // audio visualizer
    const canvas = tag("canvas")({
      width: 200,
      height: 30
    }).mount(temp2);
    const canvasCtx = canvas.getContext("2d");
    visualize(mediaStream, canvas, canvasCtx);

    // 5. dictaphone tutorial
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API/Using_the_MediaStream_Recording_API
    const temp3 = getTemplate("Dictaphone tutorial");

    // controllers
    tag("button")("record")
      .mount(temp3)
      .addEventListener("click", () => {
        try {
          mediaRecorder.start();
        } catch (e) {
          return;
        }
        console.log(mediaRecorder.state);
        console.log("recorder started");
      });

    tag("button")("stop")
      .mount(temp3)
      .addEventListener("click", () => {
        try {
          mediaRecorder.stop();
        } catch (e) {
          return;
        }
        console.log(mediaRecorder.state);
        console.log("recorder stopped");
      });

    // mediaRecorder.stop() 실행 시 ondataavailable event 발생
    // event 객체는 data 속성으로 blob 데이터를 포함함.
    // 임의로 dataavailable 이벤트를 발생 시키는 메소드 : MediaRecorder.requestData()
    let chunks = [];
    mediaRecorder.ondataavailable = (e) => {
      console.log(chunks);
      chunks.push(e.data);
    };

    mediaRecorder.onstop = (e) => {
      console.log("recorder stopped");
      const clipName = prompt("Enter a name for your sound clip");
      const clipContainer = tag("article")({
        style: "background-color: #eee",
        id: "clip-container"
      }).mount(temp3);

      const audioBlob = new Blob(chunks, { type: "audio/ogg; codecs=onpaus" });
      const audioURL = window.URL.createObjectURL(audioBlob);
      tag("audio")({
        controls: true,
        src: audioURL,
        id: "audio" + clipName
      }).mount(clipContainer);

      tag("button")("delete").mount(clipContainer).onclick = (e) =>
        e.target.closest("#clip-container").remove();

      console.log(chunks);
      chunks = [];
    };
  })
  .catch(function (err) {
    console.log(err.name + ": " + err.message);
  });

// 6. audio visualizer
function visualize(stream, canvas, canvasCtx, audioCtx) {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  source.connect(analyser);

  draw();

  function draw() {
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = "rgb(200, 200, 200)";
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = "rgb(0, 0, 0)";

    canvasCtx.beginPath();

    let sliceWidth = (WIDTH * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      let v = dataArray[i] / 128.0;
      let y = (v * HEIGHT) / 2;

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  }
}
