import { Viewer } from './viewer.js';
import queryString from 'query-string';

window.VIEWER = {};

class App {
	/**
	 * @param  {Element} el
	 * @param  {Location} location
	 */
	constructor(el, location) {
		const hash = location.hash ? queryString.parse(location.hash) : {};
		this.options = {
			kiosk: true,
			model: hash.model || '',
			preset: hash.preset || '',
			cameraPosition: hash.cameraPosition ? hash.cameraPosition.split(',').map(Number) : null
		};

		this.el = el;
		this.viewer = null;
		this.viewerEl = null;
		this.spinnerEl = el.querySelector('.spinner');
		this.dropEl = el.querySelector('.dropzone');
		this.inputEl = el.querySelector('#file-input');

		const options = this.options;

		this.fetchAndLoadFilesFromExample();
	}

	/**
	 * Sets up the view manager.
	 * @return {Viewer}
	 */
	createViewer() {
		this.viewerEl = document.createElement('div');
		this.viewerEl.classList.add('viewer');
		this.dropEl.innerHTML = '';
		this.dropEl.appendChild(this.viewerEl);
		this.viewer = new Viewer(this.viewerEl, this.options);
		return this.viewer;
	}

	/**
	 * Loads a fileset provided by user action.
	 * @param  {Map<string, File>} fileMap
	 */
	load(fileMap) {
		let rootFile;
		let rootPath;
		console.log(fileMap)
		Array.from(fileMap).forEach(([path, file]) => {
			if (file.name.match(/\.(gltf|glb)$/)) {
				rootFile = file;
				rootPath = path.replace(file.name, '');
			}
		});

		this.view(rootFile, rootPath, fileMap);
	}

	/**
	 * Passes a model to the viewer, given file and resources.
	 * @param  {File|string} rootFile
	 * @param  {string} rootPath
	 * @param  {Map<string, File>} fileMap
	 */
	view(rootFile, rootPath, fileMap) {
		if (this.viewer) this.viewer.clear();

		const viewer = this.viewer || this.createViewer();

		console.log(rootFile, rootPath, fileMap)

		const fileURL = URL.createObjectURL(rootFile);

		viewer
			.load(fileURL, rootPath, fileMap)
			.catch((e) => console.log(e))
			.then((gltf) => {
			});
	}

	async fetchAndLoadFilesFromExample() {
		const urlParams = new URLSearchParams(window.location.search);
		const carParam = urlParams.get('car');
		const liveryId = urlParams.get('liveryId');

		const fileMap = new Map();

		// Fetch all files from the public directory related to the car
		const response = await fetch(`/car_models/modelInfo.json`);
		let carFiles = await response.json();
		carFiles = carFiles[carParam];

		const filePromises = carFiles.map(async filename => {
			const response = await fetch(`/car_models/${carParam}/${filename}`);
			const blob = await response.blob();
			const file = new File([blob], filename.split('/').pop());
			fileMap.set(filename.split('/').pop(), file);
		});

		await Promise.all(filePromises);

		/*// Fetch the specific file from MongoDB GridFS bucket
		const client = await MongoClient.connect('mongodb+srv://rw:we7NJSXwGwFbnxcC@rennwelten.cqnld9c.mongodb.net/?retryWrites=true&w=majority&appName=rennwelten');
		const db = client.db('rennwelten_livery');
		const bucket = new GridFSBucket(db);

		const gridFsFile = await new Promise((resolve, reject) => {
			bucket.openDownloadStreamByName(liveryId + "_decals")
				.on('data', chunk => resolve(chunk))
				.on('error', error => reject(error));
		});

		const gridFsBlob = new Blob([gridFsFile]);
		const gridFsFileObj = new File([gridFsBlob], "livery.png");
		fileMap.set(liveryId, gridFsFileObj);*/

		this.load(fileMap);
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const app = new App(document.body, location);
});
