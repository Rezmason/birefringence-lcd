import { halfFloatExtensions, createGLCanvas } from "./factory.js";
import createRenderPass from "./render-pass.js";
import createVoltPass from "./volt-pass.js";
import createLifeDemo from "./demos/conway-life.js";
import createGlobeDemo from "./demos/globe.js";
import createSlideshowDemo from "./demos/slideshow.js";
import createTestPatternDemo from "./demos/test-pattern.js";

const photosensitivityWarning = document.querySelector("dialog.photosensitivity-warning");
const shiftRateSlider = document.querySelector("input.shift-rate");
const colorSpaceSlider = document.querySelector("input.color-space");
const programSelector = document.querySelector("select.prog-select");
const demoUI = document.querySelector("widget.prog-options");

photosensitivityWarning.addEventListener("close", (event) => {
	console.log(photosensitivityWarning.returnValue);
	animating = true;
	interactive = true;
});

shiftRateSlider.addEventListener("input", (event) => {
	voltPass.setShiftRate(parseFloat(shiftRateSlider.value));
});

colorSpaceSlider.addEventListener("input", (event) => {
	context.gl.drawingBufferColorSpace = colorSpaceSlider.value === "1" ? "display-p3" : "srgb";
});

programSelector.addEventListener("change", (event) => {
	setDemo(programSelector.value);
});

let displaySize = [95, 32];
const displayMargin = 3 * 2;

const context = createGLCanvas({
	canvas: document.querySelector("canvas#main"),
	extensions: [...halfFloatExtensions],
	resize: () => {
		let [displayWidth, displayHeight] = displaySize;
		const [width, height] = [document.body.clientWidth / 2, document.body.clientHeight / 2];
		displayWidth += displayMargin;
		displayHeight += displayMargin;
		if (displayWidth > displayHeight) {
			return [width, Math.ceil((width * displayHeight) / displayWidth)];
		} else {
			return [Math.ceil((height * displayWidth) / displayHeight), height];
		}
	},
});

const changeDisplaySize = (size) => {
	displaySize = [...size];
	const [width, height] = displaySize;
	context.canvas.style.setProperty("--display-width", width + displayMargin);
	context.canvas.style.setProperty("--display-height", height + displayMargin);
	context.resize();
	voltPass.setSize(displaySize);
	renderPass.setSize(displaySize);
	demos[demoID].setSize(displaySize);
};

const voltPass = createVoltPass(context, displaySize);
const renderPass = createRenderPass(context, displaySize, displayMargin, voltPass.renderTarget);
const animFrameSkip = 1;
let i = 0;
let interactive = false;
let animating = false;
let animationStart;
let demoID = "slideshow";
const demos = {
	slideshow: createSlideshowDemo(),
	life: createLifeDemo(),
	globe: createGlobeDemo(false),
	["globe-analog"]: createGlobeDemo(true),
	["test-pattern"]: createTestPatternDemo(),
};

const setDemo = (id) => {
	if (demos[demoID] != null) {
		demos[demoID].stop();
	}
	demoID = id;
	const demo = demos[demoID];
	if (demo.requiredSize != null) {
		changeDisplaySize(demo.requiredSize);
	}
	if (demo.createUI != null) {
		demo.createUI(demoUI);
	} else {
		demoUI.innerHTML = "";
	}
	demo.setSize(displaySize);
	demo.start();
};

const update = (now) => {
	if (animating) {
		if (animationStart == null) {
			animationStart = now;
		}
		const imageBytes = demos[demoID].getNextFrame();
		if (imageBytes != null) {
			voltPass.blit(imageBytes, demos[demoID].analog);
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

setDemo(demoID);
changeDisplaySize(displaySize);
update();

document.addEventListener("keydown", ({ repeat, code }) => {
	if (repeat || !interactive) {
		return;
	}
	switch (code) {
		case "Enter": {
			if (demos[demoID].requiredSize != null) {
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
