import { frameAspect } from "./data.js";
import { halfFloatExtensions, createGLCanvas } from "./factory.js";
import createRenderPass from "./render-pass.js";
import createVoltPass from "./volt-pass.js";

const context = createGLCanvas({
	extensions: [...halfFloatExtensions],
	resize: () => {
		const width = document.body.clientWidth;
		const height = Math.ceil(width / frameAspect);
		return [width / 2, height / 2];
	},
});

const voltPass = createVoltPass(context);
const renderPass = createRenderPass(context, voltPass.renderTarget);

const frameSkip = 1;
let i = 0;

const update = (now) => {
	if (i === 0) {
		voltPass.update(now);
		renderPass.update(now);
	}
	i = (i + 1) % frameSkip;
	requestAnimationFrame(update);
};

update();
