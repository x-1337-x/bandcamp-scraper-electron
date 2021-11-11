const { ipcRenderer } = require('electron');

const pathSpan = document.getElementById('path');
const urlSpan = document.getElementById('albumUrl');
const downloadStatusSpan = document.getElementById('downloadStatus');
const selectPathBtn = document.getElementById('selectPath');
const selectUrlBtn = document.getElementById('selectUrl');
const dowloadToggleBtn = document.getElementById('dowloadToggle');

const progressDiv = document.getElementById('progressDiv');

let downloading = false;

ipcRenderer.on('onFolderSelect', (event, arg) => {
	pathSpan.innerText = `${arg[0]}`;
});

ipcRenderer.on('pathError', (event, arg) => {
	downloadStatusSpan.innerText = arg;
});

ipcRenderer.on('onUrlSelect', (event, arg) => {
	urlSpan.innerText = `${arg}`;
});

ipcRenderer.on('urlError', (event, arg) => {
	downloadStatusSpan.innerText = arg;
});

ipcRenderer.on('downloadFInished', (event, arg) => {
	downloading = false;
	downloadStatusSpan.innerText = arg;
	dowloadToggleBtn.innerText = 'Start Download';
});

ipcRenderer.on('downloadCancelled', (event, arg) => {
	// progressDiv.innerHTML = '';
	downloading = false;
	dowloadToggleBtn.innerText = 'Start Download';
	downloadStatusSpan.innerText = arg;
});

ipcRenderer.on('downloadError', (event, arg) => {
	downloading = false;
	downloadStatusSpan.innerText = arg;
	dowloadToggleBtn.innerText = 'Start Download';
});

ipcRenderer.on('downloadList', (event, arg) => {
	progressDiv.innerHTML = '';
	arg.forEach((el) => {
		const div = document.createElement('div');
		div.innerText = el;
		div.id = el;
		progressDiv.appendChild(div);
	});
});

ipcRenderer.on('progress', (event, arg) => {
	document.getElementById(
		arg.filename
	).innerText = `${arg.filename}, ${arg.progress}%`;
});

ipcRenderer.on('downloadStarted', (event, arg) => {
	dowloadToggleBtn.innerText = 'Cancel';
	downloadStatusSpan.innerText = 'Downloading...';
	downloading = true;
});

selectPathBtn.addEventListener('click', () => {
	ipcRenderer.send('openFolderSelectDialog', 'select folder');
});

selectUrlBtn.addEventListener('click', () => {
	ipcRenderer.send('openUrlSelectPrompt', 'select url');
});

dowloadToggleBtn.addEventListener('click', () => {
	if (!downloading) {
		ipcRenderer.send('startDownload', 'start download');
	} else {
		ipcRenderer.send('cancelDownload', 'cancel download');
	}
});
