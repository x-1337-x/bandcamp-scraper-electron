const fs = require('fs');
const path = require('path');
const glob = require('glob');
const https = require('https');
const entities = require('html-entities');
const cliProgress = require('cli-progress');

let destinationDir = '';

let ac = null;
const getAbortSignal = () => ac.signal;

const multibar = new cliProgress.MultiBar(
	{
		clearOnComplete: false,
		hideCursor: false,
		format: '{bar} {filename}, {percentage}%',
	},
	cliProgress.Presets.shades_grey
);

const downloadFile = (url, name, destination, bar, win) =>
	new Promise((resolve, reject) => {
		const unTmpedDestination = destination.substring(0, destination.length - 4);
		if (fs.existsSync(unTmpedDestination)) {
			console.log(`skipping ${unTmpedDestination}, it already exists`);
			resolve(`skipping ${unTmpedDestination}, it already exists`);
			return;
		}

		let receivedBytes = 0;

		const writable = fs.createWriteStream(destination, {
			encoding: 'binary',
		});

		const req = https.request(url, { signal: getAbortSignal() }, (res) => {
			ac.signal.addEventListener(
				'abort',
				(event) => {
					res.destroy();
				},
				{ once: true }
			);
			const totalBytes = res.headers['content-length'];
			res.on('data', function (chunk) {
				receivedBytes += chunk.byteLength;
				const progress = Math.round((receivedBytes / totalBytes) * 100);

				win.webContents.send('progress', { filename: `${name}`, progress });

				bar.update(progress, { filename: `${name}` });

				if (progress === 100) {
					multibar.stop();
				}
			});
			res.on('end', () => {
				resolve('file downloaded');
				fs.rename(destination, unTmpedDestination, (err) => {
					if (err) {
						console.log(err);
						throw err;
					}
				});
			});
			res.pipe(writable);
		});

		req.on('error', (error) => {
			reject(error);
		});

		req.end();
	});

const JSON_STRING_RE = /data-tralbum="([^"]*)"/;
const COVER_IMG_RE = /<a class="popupImage" href="([^"]*)"/;

const getPageSource = (url) =>
	new Promise((resolve, reject) => {
		let html = '';

		const req = https.request(url, { signal: getAbortSignal() }, (res) => {
			ac.signal.addEventListener(
				'abort',
				(event) => {
					res.destroy();
				},
				{ once: true }
			);
			res.on('data', (chunk) => {
				html += chunk;
			});
			res.on('end', () => {
				resolve(html);
			});
		});

		req.on('error', (error) => {
			reject(error);
		});

		req.end();
	});

const startDownload = (url, dest, win) => {
	ac = new AbortController();

	ac.signal.addEventListener(
		'abort',
		(event) => {
			console.log(event.type);
		},
		{ once: true }
	);

	return getPageSource(url).then((data) => {
		const result = JSON_STRING_RE.exec(data);
		const jsonString = entities.decode(result[1]);
		const json = JSON.parse(jsonString);

		const coverImgUrl = COVER_IMG_RE.exec(data)[1];

		const albumTitle = json.current['title'];
		const trackList = [];

		json.trackinfo.forEach((el) => {
			if (el.title && el.file) {
				trackList.push({
					trackName: el.title,
					url: el.file['mp3-128'],
				});
			}
		});

		destinationDir = path.join(dest[0], albumTitle);

		if (!fs.existsSync(destinationDir)) {
			fs.mkdirSync(destinationDir, { recursive: true }, (err) => {
				if (err) {
					throw err;
				}
			});
		}

		const promises = [];

		if (trackList.length > 0) {
			trackList.forEach((el) => {
				const bar = multibar.create(100, 0, { filename: `${el.trackName}` });
				promises.push(
					downloadFile(
						el.url,
						el.trackName,
						path.join(destinationDir, `${el.trackName}.mp3.tmp`),
						bar,
						win
					)
				);
			});
		}

		if (coverImgUrl) {
			const bar = multibar.create(100, 0, { filename: 'cover' });
			promises.push(
				downloadFile(
					coverImgUrl,
					'cover',
					path.join(destinationDir, 'cover.jpg.tmp'),
					bar,
					win
				)
			);
		}

		const fileList = [];

		trackList.forEach((el) => {
			fileList.push(el.trackName);
		});

		fileList.push('cover');

		win.webContents.send('downloadList', fileList);

		return Promise.allSettled(promises);
	});
};

const cancelDownload = () => {
	ac.abort();
	glob(`${destinationDir}/*.tmp`, (err, files) => {
		files.forEach((file) => {
			fs.rm(file, (err) => {
				if (err) {
					console.log(err);
					throw err;
				}
			});
		});
	});
};

module.exports = {
	startDownload,
	cancelDownload,
};
