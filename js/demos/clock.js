import createDemo from "./demo.js";
import VoltMap from "../volt-map.js";
import { font5x7 as font, font4x7 as thinFont } from "./font.js";
import { fetchImageSheet } from "../utils.js";

const dissectFormattedDate = /(\w{3}), (\w{3}) (\d+), (\d+), (\d+):(\d+):(\d+) ([AP]M)/;

const timeZonesByCityCode = {
	["Auto"]: null,
	["-11"]: "Etc/GMT+11",
	["HNL"]: "Pacific/Honolulu",
	["ANC"]: "America/Anchorage",
	["LAX"]: "America/Los_Angeles",
	["DEN"]: "America/Denver",
	["CHI"]: "America/Chicago",
	["NYC"]: "America/New_York",
	["CCS"]: "America/Caracas",
	["RIO"]: "America/Sao_Paulo",
	["-2H"]: "Etc/GMT+2",
	["-1H"]: "Etc/GMT+1",
	["LON"]: "Europe/London",
	["PAR"]: "Europe/Paris",
	["CAI"]: "Africa/Cairo",
	["JRS"]: "Asia/Jerusalem",
	["JED"]: "Asia/Riyadh",
	["THR"]: "Asia/Tehran",
	["DXB"]: "Asia/Dubai",
	["KBL"]: "Asia/Kabul",
	["KHI"]: "Asia/Karachi",
	["DEL"]: "Asia/Kolkata",
	["DAC"]: "Asia/Dhaka",
	["RGN"]: "Asia/Yangon",
	["BKK"]: "Asia/Bangkok",
	["HKG"]: "Asia/Hong_Kong",
	["TYO"]: "Asia/Tokyo",
	["ADL"]: "Australia/Adelaide",
	["SYD"]: "Australia/Sydney",
	["NOU"]: "Pacific/Noumea",
	["WLG"]: "Pacific/Auckland",
};

const guessCityCode = () => {
	// TODO: poll Intl if it's available
	const now = new Date();
	const theNowString = now.toLocaleString("en-US");
	for (const [name, timeZone] of Object.entries(timeZonesByCityCode)) {
		if (timeZone == null) {
			continue;
		}
		if (now.toLocaleString("en-US", { timeZone }) === theNowString) {
			return name;
		}
	}
	let fallback = (now.getTimezoneOffset() / -60).toString().substr(0, 3);
	if (fallback.length < 3) {
		fallback += "H";
	}
	return fallback;
};

const scenes = [
	{ name: "Drive", id: "drive", first: 29, last: 88, offset: 18 },
	{ name: "Seaside", id: "seaside", first: 89, last: 148, offset: 60 - 49 },
	// { name: "Safari", id: "safari", first: 158, last: 171, offset: 60 - 0 }, // TODO: complete
];

const controlTemplate = `
<select name="scene-select" class="scene-select">
	${scenes.map((scene) => `<option value="${scene.id}">${scene.name}</option>`)}
</select>
<select name="city-select" class="city-select">
	${Object.keys(timeZonesByCityCode).map((code) => `<option value="${code}">${code}</option>`)}
</select>
`;

const [width, height] = [95, 32];

export default () => {
	let currentScene = scenes.find((scene) => scene.id === "drive");
	let currentFrame = 0;
	let sceneFrames = [];

	let post = null;
	let timeout = null;

	const image = new VoltMap(width, height);
	image.fill(0);

	let dateString = Array(16).fill("D").join("");
	let lastLocalHour = null;
	let cityCode = guessCityCode();
	let overrideCityCode = false;
	let timeString = Array(11).fill("T").join("");
	let secondsString = Array(2).fill("S").join("");

	const start = (f) => {
		post = f;
		update();
	};

	const stop = () => {
		post = null;
		clearTimeout(timeout);
		timeout = null;
	};

	const update = () => {
		clearTimeout(timeout);
		const date = new Date();
		updateStrings(date);
		drawFrame();
		let milliseconds = date.getMilliseconds();
		timeout = setTimeout(update, 1000 - milliseconds);
	};

	const setSize = (size) => {
		if (post != null) {
			post(image);
		}
	};

	const updateStrings = (date) => {
		const localHour = date.getHours();
		if (lastLocalHour !== localHour) {
			lastLocalHour = localHour;
			if (!overrideCityCode) {
				cityCode = guessCityCode();
			}
		}

		currentFrame = Math.min(currentScene.last, currentScene.first + ((date.getSeconds() + currentScene.offset) % 60));
		const formattedDate = date
			.toLocaleString("en-US", {
				timeZone: timeZonesByCityCode[cityCode],
				weekday: "short",
				year: "numeric",
				month: "short",
				day: "2-digit",
				hour: "numeric",
				minute: "2-digit",
				second: "2-digit",
				hour12: true,
				calendar: "gregory",
			})
			.toUpperCase();
		const [_, dayName, month, day, year, hour, minute, second, amPm] = formattedDate.match(dissectFormattedDate);
		dateString = `${month}/${day}/${year}(${dayName})`;
		timeString = `${hour.toString().padStart(2, " ")}:${minute}   ${amPm}`;
		secondsString = second;
	};

	const drawFrame = () => {
		if (post == null || sceneFrames[currentFrame] == null) {
			return;
		}

		sceneFrames[currentFrame].blitTo(image, 0, 0, 0, 0, width, 16);

		const blue = (s) => (s ? 2 : 0);
		const green = (s) => (s ? 3 : 0);

		const horizAdvance = font.size[0] + 1;
		{
			let x = 0;
			for (const c of dateString) {
				font.glyphs[c].blitTo(image, 0, 0, x, 17, ...font.size, blue);
				x += horizAdvance;
			}
		}
		{
			let x = 0;
			for (const c of cityCode) {
				font.glyphs[c].blitTo(image, 0, 0, x, 25, ...font.size, green);
				x += horizAdvance;
			}
		}
		{
			let x = horizAdvance * 6;
			for (const c of timeString) {
				font.glyphs[c].blitTo(image, 0, 0, x, 25, ...font.size, blue);
				x += horizAdvance;
			}
		}

		const thinHorizAdvance = thinFont.size[0] + 1;
		{
			let x = thinHorizAdvance * 14;
			for (const c of secondsString) {
				thinFont.glyphs[c].blitTo(image, 0, 0, x, 25, ...thinFont.size, blue);
				x += thinHorizAdvance;
			}
		}

		if (post != null) {
			post(image);
		}
	};

	const createUI = (element) => {
		element.innerHTML = controlTemplate;
		const sceneSelect = element.querySelector("select.scene-select");
		sceneSelect.value = currentScene.id;
		sceneSelect.onchange = () => {
			currentScene = scenes.find((scene) => scene.id === sceneSelect.value);
			update();
		};

		const citySelect = element.querySelector("select.city-select");
		citySelect.value = "Auto";
		citySelect.onchange = () => {
			overrideCityCode = citySelect.value !== "Auto";
			if (overrideCityCode) {
				cityCode = citySelect.value;
			} else {
				cityCode = guessCityCode();
			}
			update();
		};
	};

	(async () => {
		sceneFrames = await fetchImageSheet("./assets/posy.bmp", [width, height]);
		currentFrame = 0;
		updateStrings(new Date());
		drawFrame();
	})();

	return createDemo({
		start,
		stop,
		setSize,
		requiredSize: [width, height],
		createUI,
	});
};
