import { halfFloatExtensions, createGLCanvas } from "./factory.js";
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
const displayMargin = 3 * 2;

const context = createGLCanvas({
	canvas: document.querySelector("canvas#main"),
	extensions: [...halfFloatExtensions],
	resize: () => {
		let [displayWidth, displayHeight] = displaySize;
		displayWidth += displayMargin;
		displayHeight += displayMargin;
		if (displayWidth > displayHeight) {
			return [document.body.clientWidth, Math.ceil((document.body.clientWidth * displayHeight) / displayWidth)];
		} else {
			return [Math.ceil((document.body.clientHeight * displayWidth) / displayHeight), document.body.clientHeight];
		}
	},
});

// context.gl.drawingBufferColorSpace = "display-p3"; // fun but maybe irrelevant

const changeDisplaySize = (size) => {
	displaySize = [...size];
	const [width, height] = displaySize;
	context.canvas.style.aspectRatio = `${width + displayMargin} / ${height + displayMargin}`;
	context.resize();
	voltPass.setSize(displaySize);
	renderPass.setSize(displaySize);
	demos[demoIndex].setSize(displaySize);
};

const voltPass = createVoltPass(context, displaySize);
const renderPass = createRenderPass(context, displaySize, displayMargin, voltPass.renderTarget);
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
		changeDisplaySize(demos[demoIndex].requiredSize);
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
	} else {
		renderPass.update(now);
	}
	requestAnimationFrame(update);
};

const render = (now) => {
	voltPass.update(now);
	renderPass.update(now);
};

setDemo(demoIndex);
changeDisplaySize(displaySize);
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
				changeDisplaySize([Math.floor(size / aspectRatio), Math.floor(size)]);
			} else {
				changeDisplaySize([Math.floor(size), Math.floor(size * aspectRatio)]);
			}
			break;
		}
	}
});
