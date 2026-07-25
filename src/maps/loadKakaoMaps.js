const SCRIPT_ID = "yeondang-kakao-maps-sdk";
const SDK_URL = "https://dapi.kakao.com/v2/maps/sdk.js";

let sdkPromise;

function createError(message) {
  return new Error(message);
}

function waitForMapsLoad() {
  return new Promise((resolve, reject) => {
    const maps = window.kakao?.maps;
    if (!maps?.load) {
      reject(createError("Kakao Maps SDK를 초기화할 수 없습니다."));
      return;
    }

    maps.load(() => {
      if (window.kakao?.maps?.Map) {
        resolve(window.kakao);
      } else {
        reject(createError("Kakao Maps SDK를 초기화할 수 없습니다."));
      }
    });
  });
}

function waitForScript(script) {
  return new Promise((resolve, reject) => {
    const finishLoad = () => waitForMapsLoad().then(resolve, reject);
    const finishError = () => reject(createError("Kakao Maps SDK를 불러오지 못했습니다."));

    if (script.dataset.kakaoMapsState === "loaded" || window.kakao?.maps) {
      finishLoad();
      return;
    }
    if (script.dataset.kakaoMapsState === "error") {
      finishError();
      return;
    }

    script.addEventListener("load", () => {
      script.dataset.kakaoMapsState = "loaded";
      finishLoad();
    }, { once: true });
    script.addEventListener("error", () => {
      script.dataset.kakaoMapsState = "error";
      finishError();
    }, { once: true });
  });
}

export function loadKakaoMaps() {
  if (sdkPromise) return sdkPromise;

  const appKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY?.trim();
  if (!appKey) {
    return Promise.reject(createError("Kakao 지도 공개 키가 설정되지 않았습니다."));
  }

  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      waitForScript(existing).then(resolve, reject);
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.dataset.kakaoMapsState = "loading";
    script.src = `${SDK_URL}?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    document.head.append(script);
    waitForScript(script).then(resolve, reject);
  });

  return sdkPromise;
}
