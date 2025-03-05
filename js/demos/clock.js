import createDemo from "./demo.js";
import font from "./font.js"

const scenes = [
	{ name: "Built-in Demo", id: "built-in-demo", first: 0, last: 27 },
	{ name: "Drive", id: "drive", first: 29, last: 88 },
	{ name: "Seaside", id: "seaside", first: 89, last: 148 },
	{ name: "Safari", id: "safari", first: 158, last: 171 }, // TODO: complete
	{ name: "Posy's Tour", id: "posy-tour", first: 172, last: 265 },
	{ name: "Illustrations", id: "illustrations", first: 218, last: 233 },
	{ name: "Desktop Menu", id: "desktop-menu", first: 258, last: 264 },
	{ name: "All", id: "all", first: 0, last: 265 },
];

const [slideWidth, slideHeight] = [95, 32];
const imageSheet = new Image();
imageSheet.src = "./assets/posy.bmp";
const imageLoad = imageSheet.decode().then(() => {
  const canvas = document.createElement("canvas");
  canvas.width = imageSheet.width;
  canvas.height = imageSheet.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(imageSheet, 0, 0);
  const imageData = [];
  for (let i = 0; i < imageSheet.height; i += slideHeight) {
    for (let j = 0; j < imageSheet.width; j += slideWidth) {
      imageData.push(
        ctx
          .getImageData(j, i, slideWidth, slideHeight)
          .data.map((n) => (n > 0x80 ? 0xff : 0x00))
      );
    }
  }
  return imageData;
});

export default () => {
  let images = [];
  let currentFrame = 0;
  let totalFrames = 1;
  let postFrame = null;
  let currentScene = scenes.find((scene) => scene.id === "drive");
  let timeout = null;

  const start = (f) => {
    postFrame = f;
    postFrame(images[currentFrame]);
    update();
    setTimeout(update, 1000)
  };

  const stop = () => {
    postFrame = null;
    clearTimeout(timeout);
	  timeout = null;
  };

  const update = () => {
    changeSlide(1)
    setTimeout(update, 1000)
  };

  const setSize = (size) => {
    if (postFrame != null) {
      postFrame(images[currentFrame]);
    }
  };

  const changeSlide = (incr = 0) => {
		if (currentFrame + incr > currentScene.last) {
			currentFrame = currentScene.first;
		} else if (currentFrame + incr < currentScene.first) {
			currentFrame = currentScene.last;
		} else {
			currentFrame += incr;
		}
		console.log("Current frame:", currentScene.id, currentFrame);
		if (postFrame != null && images[currentFrame]) {
      let top = images[currentFrame]
      let date = new Date().toDateString().toUpperCase()
      let time = new Date().toLocaleTimeString().toUpperCase()
      let dateGlyphs = Array.from(date).map((char)=>font[char]?.map((row)=>Array.from(row).map((char) => char === '*' ? [0,0,0xff,0xff]:[0xff,0xff,0xff,0xff])))
      let timeGlyphs = Array.from(time).map((char)=>font[char]?.map((row)=>Array.from(row).map((char) => char === '*' ? [0,0,0xff,0xff]:[0xff,0xff,0xff,0xff])))
      for (let i = 0; i < slideWidth*4; i++) {
        for (let j = 0; j < slideHeight; j++) {
          if(j > slideHeight/2) {
            top[(j * slideWidth*4) + i] = 0xff
            top[((j * slideWidth*4) + i)+1] = 0xff
            top[((j * slideWidth*4) + i)+2] = 0xff
          }
        }
      }
      const offset = slideHeight/2+1
      for (let i = 0; i < time.length; i++) {
        for (let py = 0; py < 7; py ++) {
          for (let px = 0; px < 5; px ++) {
            for(const [index,channel] of timeGlyphs[i][py][px].entries()) {
              top[(((py+offset) * (slideWidth*4)) + ((i*6*4)+(px*4)))+index] = channel
            }
            //top[((py+(slideHeight/2+1)) * slideWidth*4) + (i*px)] = dateGlyphs[i][py][px]
          }
        }
      }
			postFrame(top);
		}
	};


  (async () => {
    images = await imageLoad;
    totalFrames = images.length - 5;
    currentFrame = 0;
    changeSlide();
  })();

  return {
    ...createDemo({
      start,
      stop,
      setSize,
      requiredSize: [slideWidth, slideHeight],
    }),
    changeSlide,
  };
};
