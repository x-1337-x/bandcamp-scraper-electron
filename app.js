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
	console.log(arg[0]);
	pathSpan.innerText = `${arg[0]}`;
});

ipcRenderer.on('onUrlSelect', (event, arg) => {
	console.log(event);
	console.log(arg);
	urlSpan.innerText = `${arg}`;
});

ipcRenderer.on('downloadFInished', (event, arg) => {
	console.log(event);
	console.log(arg);
	downloading = false;
	downloadStatusSpan.innerText = arg;
	dowloadToggleBtn.innerText = 'Start Download';
});

ipcRenderer.on('downloadCancelled', (event, arg) => {
	console.log(event);
	console.log(arg);
	downloading = false;
	dowloadToggleBtn.innerText = 'Start Download';
	downloadStatusSpan.innerText = arg;
});

ipcRenderer.on('downloadList', (event, arg) => {
	console.log(arg);
	progressDiv.innerHTML = '';
	arg.forEach((el) => {
		const div = document.createElement('div');
		div.innerText = el;
		div.id = el;
		progressDiv.appendChild(div);
	});
});

ipcRenderer.on('progress', (event, arg) => {
	console.log('progress', arg);
	document.getElementById(
		arg.filename
	).innerText = `${arg.filename}, ${arg.progress}`;
});

selectPathBtn.addEventListener('click', () => {
	ipcRenderer.send('openFolderSelectDialog', 'select folder');
});

selectUrlBtn.addEventListener('click', () => {
	ipcRenderer.send('openUrlSelectPrompt', 'select url');
});

dowloadToggleBtn.addEventListener('click', () => {
	if (!downloading) {
		dowloadToggleBtn.innerText = 'Cancel';
		downloadStatusSpan.innerText = 'Downloading...';
		ipcRenderer.send('startDownload', 'start download');
		downloading = true;
	} else {
		ipcRenderer.send('cancelDownload', 'cancel download');
	}
});
