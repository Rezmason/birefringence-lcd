import { frameAspect } from "./data.js";
import { halfFloatExtensions, createGLCanvas } from "./factory.js";
import createRenderPass from "./render-pass.js";
import createVoltPass from "./volt-pass.js";

const context = createGLCanvas({
	extensions: [...halfFloatExtensions],
	resize: () => {
		const width = document.body.clientWidth;
		const height = Math.ceil(width / frameAspect);
		return [width, height];
	},
});

const renderPass = createRenderPass(context);

const update = (now) => {
	// TODO: voltage pass
	renderPass.update(now);
	requestAnimationFrame(update);
};

update();
