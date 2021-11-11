const { app, BrowserWindow } = require('electron');
const { dialog } = require('electron');
const { ipcMain } = require('electron');
const path = require('path');
const prompt = require('electron-prompt');
const scraper = require('./scraper');

let url = '';
let destinationFolder = '';

let win = null;

function createWindow() {
	win = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	win.loadFile('index.html');
}

app.whenReady().then(() => {
	createWindow();

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

ipcMain.on('openFolderSelectDialog', (event, arg) => {
	dialog
		.showOpenDialog({ properties: ['openDirectory', 'multiSelections'] })
		.then((result) => {
			destinationFolder = result.filePaths;
			event.reply('onFolderSelect', result.filePaths);
		})
		.catch((err) => {
			console.log(err);
		});
});

ipcMain.on('openUrlSelectPrompt', (event, arg) => {
	console.log(arg);
	prompt({
		title: 'Paste the download url',
		label: 'URL:',
		value: 'https://theromps.bandcamp.com/track/-',
		inputAttrs: {
			type: 'url',
		},
		type: 'input',
	})
		.then((result) => {
			if (result === null) {
				console.log('user cancelled');
			} else {
				console.log('result', result);
				url = result;
			}
			event.reply('onUrlSelect', result);
		})
		.catch(console.error);
});

ipcMain.on('startDownload', (event, arg) => {
	if (typeof destinationFolder[0] !== 'string' || destinationFolder[0] === '') {
		event.reply('pathError', 'Select destination folder and try again.');
		return;
	}
	if (typeof url !== 'string' || url === '') {
		event.reply(
			'urlError',
			'Provide a valid bandcamp album url and try again.'
		);
		return;
	}
	event.reply('downloadStarted', 'download started');
	scraper.startDownload(url, destinationFolder, win).then((values) => {
		if (!values) {
			event.reply('downloadError', 'Unable to download.');
			return;
		}
		event.reply('downloadFInished', 'All done.');
	});
});

ipcMain.on('cancelDownload', (event, arg) => {
	scraper.cancelDownload();
	event.reply('downloadCancelled', 'Download Cancelled');
});
