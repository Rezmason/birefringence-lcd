import createDemo from "./demo.js";

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

const controlTemplate = `
<button id="prev" title="Previous">
	<svg preserveAspectRatio="none" viewBox="0 0 10 11" style="width: 1.5em; height: 1em;">
		<rect fill="currentColor" x="0" y="0" width="1.5" height="10"></rect>
		<path fill="currentColor" d="M 1.5 5.5 l 4.25 -5 0 10 z"></path>
		<path fill="currentColor" d="M 5.75 5.5 l 4.25 -5 0 10 z"></path>
	</svg>
</button>
<button id="play-pause" title="Play / Pause">
	<svg class="play" preserveAspectRatio="none" viewBox="0 0 10 11" style="width: 1em; height: 1em;">
		<path fill="currentColor" d="M 0 0.5 l 10 5 -10 5 z"></path>
	</svg>
	<svg class="pause" preserveAspectRatio="none" viewBox="0 0 10 11" style="width: 1em; height: 1em;">
		<rect fill="currentColor" x="0" y="0" width="3.5" height="10"></rect>
		<rect fill="currentColor" x="6.5" y="0" width="3.5" height="10"></rect>
	</svg>
</button>
<button id="next" title="Next">
	<svg preserveAspectRatio="none" viewBox="0 0 10 11" style="width: 1.5em; height: 1em;">
		<path fill="currentColor" d="M 0 0.5 l 4.25 5 -4.25 5 z"></path>
		<path fill="currentColor" d="M 4.25 0.5 l 4.25 5 -4.25 5 z"></path>
		<rect fill="currentColor" x="8.5" y="0" width="1.5" height="10"></rect>
	</svg>
</button>
<select name="scene-select" class="scene-select">
	${scenes.map((scene) => `<option value="${scene.id}">${scene.name}</option>`)}
</select>
`;

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
	let currentScene = scenes.find((scene) => scene.id === "drive");
	let currentFrame = 0;
	let totalFrames = 1;
	let postFrame = null;
	let timeout = null;
	let playing = false;
	const frameDurationMs = 1000;

	const start = (f) => {
		postFrame = f;
		changeSlide();
	};

	const stop = () => {
		postFrame = null;
		clearTimeout(timeout);
		timeout = null;
	};

	const update = () => {
		clearTimeout(timeout);
		timeout = null;
		if (playing) {
			changeSlide(1);
			timeout = setTimeout(update, frameDurationMs);
		}
	};

	const setSize = (size) => {
		if (postFrame != null) {
			postFrame(images[currentFrame]);
		}
	};

	const createUI = (element) => {
		element.innerHTML = controlTemplate;
		const prevButton = element.querySelector("button#prev");
		const nextButton = element.querySelector("button#next");
		const playPauseButton = element.querySelector("button#play-pause");
		const playIcon = playPauseButton.querySelector("svg.play");
		const pauseIcon = playPauseButton.querySelector("svg.pause");
		const sceneSelect = element.querySelector("select.scene-select");
		pauseIcon.style.display = "none";
		playIcon.style.display = "unset";
		prevButton.onclick = () => changeSlide(-1);
		nextButton.onclick = () => changeSlide(1);
		playPauseButton.onclick = () => {
			playing = !playing;
			if (playing) {
				timeout = setTimeout(update, frameDurationMs);
			} else {
				clearTimeout(timeout);
				timeout = null;
			}
			pauseIcon.style.display = playing ? "unset" : "none";
			playIcon.style.display = playing ? "none" : "unset";
		};
		sceneSelect.value = currentScene.id;
		sceneSelect.onchange = () => {
			currentScene = scenes.find((scene) => scene.id === sceneSelect.value);
			currentFrame = currentScene.first;
			changeSlide();
		};
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
		if (postFrame != null) {
			postFrame(images[currentFrame]);
		}
	};

	(async () => {
		images = await imageLoad;
		totalFrames = images.length - 5;
		currentFrame = currentScene.first;
		changeSlide();
	})();

	return { ...createDemo({ start, stop, setSize, requiredSize: [slideWidth, slideHeight], createUI }), changeSlide };
};
