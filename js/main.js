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

const voltPass = createVoltPass(context);
const renderPass = createRenderPass(context, voltPass.renderTarget);

const update = (now) => {
	voltPass.update(now);
	renderPass.update(now);
	requestAnimationFrame(update);
};

update();
