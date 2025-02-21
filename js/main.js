import { halfFloatExtensions, derivativeExtension, createGLCanvas } from "./factory.js";
import createRenderPass from "./render-pass.js";
import createVoltPass from "./volt-pass.js";
import createLifeDemo from "./demos/conway-life.js";
import createGlobeDemo from "./demos/globe.js";
import createSlideshowDemo from "./demos/slideshow.js";

const photosensitivityWarning = document.querySelector("dialog.photosensitivity-warning");

photosensitivityWarning.addEventListener("close", (event) => {
	console.log(photosensitivityWarning.returnValue);
	animating = true;
	interactive = true;
});

let displaySize = [95, 32];

const context = createGLCanvas({
	canvas: document.querySelector("canvas#main"),
	extensions: [...halfFloatExtensions, derivativeExtension],
	resize: () => {
		const [displayWidth, displayHeight] = displaySize;
		if (displayWidth > displayHeight) {
			return [document.body.clientWidth, Math.ceil((document.body.clientWidth * displayHeight) / displayWidth)];
		} else {
			return [Math.ceil((document.body.clientHeight * displayWidth) / displayHeight), document.body.clientHeight];
		}
	},
});

// context.gl.drawingBufferColorSpace = "display-p3"; // fun but maybe irrelevant

const changeSize = (newSize) => {
	displaySize = [...newSize];
	const [width, height] = displaySize;
	context.resize();
	context.canvas.style.aspectRatio = `${displaySize[0]} / ${displaySize[1]}`;
	context.canvas.style.aspectRatio = `${width} / ${height}`;
	if (height > width) {
		context.canvas.style.removeProperty("width");
		context.canvas.style.height = "100vh";
	} else {
		context.canvas.style.width = "100vw";
		context.canvas.style.removeProperty("height");
	}
	voltPass.setSize(displaySize);
	renderPass.setSize(displaySize);
	demos[demoIndex].setSize(displaySize);
};

const voltPass = createVoltPass(context, displaySize);
const renderPass = createRenderPass(context, displaySize, voltPass.renderTarget);
const animFrameSkip = 1;
let i = 0;
let interactive = false;
let animating = false;
let animationStart;
let demoIndex = 0;
const slideshowDemo = createSlideshowDemo();
const demos = [slideshowDemo, createLifeDemo(), createGlobeDemo()];

const setDemo = (index) => {
	if (demos[demoIndex] != null) {
		demos[demoIndex].stop();
	}
	demoIndex = index;
	if (demos[demoIndex].requiredSize != null) {
		changeSize(demos[demoIndex].requiredSize);
	}
	demos[demoIndex].setSize(displaySize);
	demos[demoIndex].start();
};

const update = (now) => {
	if (animating) {
		if (animationStart == null) {
			animationStart = now;
		}
		const imageBytes = demos[demoIndex].getNextFrame();
		if (imageBytes != null) {
			voltPass.blit(imageBytes);
		}
		if (i === 0) {
			render(now - animationStart);
		}
		i = (i + 1) % animFrameSkip;
	}
	requestAnimationFrame(update);
};

const render = (now) => {
	voltPass.update(now);
	renderPass.update(now);
};

setDemo(demoIndex);
changeSize(displaySize);
render(0);
update();

document.addEventListener("keydown", ({ repeat, code }) => {
	if (repeat || !interactive) {
		return;
	}
	switch (code) {
		case "ArrowLeft":
		case "ArrowUp": {
			slideshowDemo.changeSlide(-1);
			break;
		}
		case "ArrowRight":
		case "ArrowDown": {
			slideshowDemo.changeSlide(1);
			break;
		}
		case "Space": {
			setDemo((demoIndex + 1) % demos.length);
			break;
		}
		case "Enter": {
			if (demos[demoIndex].requiredSize != null) {
				break;
			}
			const aspectRatio = Math.pow(Math.random() / 2 + 0.2, Math.random() < 0.5 ? 1 : -1);
			const size = Math.random() * 100 + 10;
			if (aspectRatio > 1) {
				changeSize([Math.floor(size / aspectRatio), Math.floor(size)]);
			} else {
				changeSize([Math.floor(size), Math.floor(size * aspectRatio)]);
			}
			break;
		}
	}
});
