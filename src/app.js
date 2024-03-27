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

		const fileURL = typeof rootFile === 'string' ? rootFile : URL.createObjectURL(rootFile);

		viewer
			.load(fileURL, rootPath, fileMap)
			.catch((e) => console.log(e))
			.then((gltf) => {});
	}

	async fetchAndLoadFilesFromExample() {
		const filenames = ['bmw_m4_gt3.bin', 'bmw_m4_gt3.gltf', 'EXT_Banner_Colour_tga.png', 'EXT_Details_Colour.png', 'EXT_Details_NM.png', 'EXT_Disc_Colour.png', 'EXT_Disc_NM.png', 'EXT_Grid_2_Colour.png', 'EXT_Grid_2_NM.png', 'EXT_Lights_Colour_tga.png', 'EXT_Lights_NM_tga.png', 'EXT_Mechanics_Colour_tga.png', 'EXT_Mechanics_NM_tga.png', 'EXT_Rim_Colour_tga.png', 'livery.png', 'Tyre_Dry_Colour_tga.png', 'Tyre_Dry_NM_tga.png']; // replace with your actual filenames
		const fileMap = new Map();

		const filePromises = filenames.map(async filename => {
			const response = await fetch(`/example/${filename}`);
			const blob = await response.blob();
			const file = new File([blob], filename);
			fileMap.set(filename, file);
		});

		await Promise.all(filePromises);

		this.load(fileMap);
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const app = new App(document.body, location);
});
