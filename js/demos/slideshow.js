import createDemo from "./demo.js";

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
			imageData.push(ctx.getImageData(j, i, slideWidth, slideHeight).data.map((n) => (n > 0x80 ? 0xff : 0x00)));
		}
	}
	return imageData;
});

export default () => {
	let images = [];
	let currentFrame = 0;
	let totalFrames = 1;
	let postFrame = null;

	const start = (f) => {
		postFrame = f;
		postFrame(images[currentFrame]);
	};

	const stop = () => (postFrame = null);

	const changeSlide = (incr = 0) => {
		currentFrame = (((currentFrame + incr) % totalFrames) + totalFrames) % totalFrames;
		console.log("Current frame:", currentFrame);
		if (postFrame != null) {
			postFrame(images[currentFrame]);
		}
	};

	(async () => {
		images = await imageLoad;
		totalFrames = images.length - 5;
		currentFrame = 0;
		changeSlide();
	})();

	return { ...createDemo(start, stop), changeSlide };
};
