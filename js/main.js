import { frameAspect } from "./data.js";
import { halfFloatExtensions, createGLCanvas } from "./factory.js";
import createRenderPass from "./render-pass.js";
import createVoltPass from "./volt-pass.js";

const photosensitivityWarning = document.querySelector("dialog.photosensitivity-warning");

photosensitivityWarning.addEventListener("close", (event) => {
	console.log(photosensitivityWarning.returnValue);
	animating = true;
	interactive = true;
});

const context = createGLCanvas({
	canvas: document.querySelector("canvas"),
	extensions: [...halfFloatExtensions],
	resize: () => {
		const width = document.body.clientWidth;
		const height = Math.ceil(width / frameAspect);
		return [width / 2, height / 2];
	},
});

// context.gl.drawingBufferColorSpace = "display-p3"; // fun but maybe irrelevant

const voltPass = createVoltPass(context);
const renderPass = createRenderPass(context, voltPass.renderTarget);

const frameSkip = 1;
let i = 0;
let interactive = false;
let animating = false;
let animationStart;

const update = (now) => {
	if (animating) {
		if (animationStart == null) {
			animationStart = now;
		}
		if (i === 0) {
			render(now - animationStart);
		}
		i = (i + 1) % frameSkip;
	}
	requestAnimationFrame(update);
};

const render = (now) => {
	voltPass.update(now);
	renderPass.update(now);
};

render(0);
update();

document.addEventListener("keydown", ({ repeat, code }) => {
	if (repeat || !interactive) {
		return;
	}
	switch (code) {
		case "ArrowLeft":
		case "ArrowUp": {
			voltPass.changeFrame(-1);
			break;
		}
		case "ArrowRight":
		case "ArrowDown": {
			voltPass.changeFrame(1);
			break;
		}
	}
});
