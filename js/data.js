const [frameWidth, frameHeight] = [95, 32];
const frameAspect = frameWidth / frameHeight;

const loadImages = async () => {
	const imageSheet = new Image();
	imageSheet.src = "./assets/posy.bmp";
	await imageSheet.decode();
	const canvas = document.createElement("canvas");
	canvas.width = frameWidth;
	canvas.height = frameHeight;
	const imageData = [];
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	for (let i = 0; i < imageSheet.height; i += frameHeight) {
		for (let j = 0; j < imageSheet.width; j += frameWidth) {
			ctx.drawImage(imageSheet, -j, -i);
			imageData.push(ctx.getImageData(0, 0, frameWidth, frameHeight).data.map((n) => (n > 0x80 ? 0xff : 0x00)));
		}
	}
	return imageData;
};

const debugColors = [
	[0xb1 / 0xff, 0xb3 / 0xff, 0xae / 0xff],
	[0xc2 / 0xff, 0x55 / 0xff, 0x3c / 0xff],
	[0x00 / 0xff, 0x8b / 0xff, 0x60 / 0xff],
	[0x25 / 0xff, 0x52 / 0xff, 0xa5 / 0xff],
	[0xff / 0xff, 0x00 / 0xff, 0xff / 0xff],
].flat();

export { frameWidth, frameHeight, frameAspect, loadImages };
