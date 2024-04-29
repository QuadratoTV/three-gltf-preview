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
        console.log(fileMap);
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

        console.log(rootFile, rootPath, fileMap);

        const fileURL = URL.createObjectURL(rootFile);

        const cleanup = () => {
            this.hideSpinner();
            if (typeof rootFile === 'object') URL.revokeObjectURL(fileURL);
        };

        viewer
            .load(fileURL, rootPath, fileMap)
            .catch((e) => console.log(e))
            .then((gltf) => {
                cleanup();
            });
    }

    async fetchAndLoadFilesFromExample() {
        const urlParams = new URLSearchParams(window.location.search);
        const carParam = urlParams.get('car');
        const liveryId = urlParams.get('liveryId');

        const fileMap = new Map();

        // Fetch all files from the public directory related to the car
        let response = await fetch(`/preview/car_models/modelInfo.json`);
        let carFiles = await response.json();
        carFiles = carFiles[carParam];

        const filePromises = carFiles.map(async filename => {
            let response = await fetch(`/preview/car_models/${carParam}/${filename}`);
            // response = await modifyGltfFile(response, filename.split('/').pop());
            const blob = await response.blob();
            const file = new File([blob], filename.split('/').pop());
            fileMap.set(filename.split('/').pop(), file);
        });

        await Promise.all(filePromises);

        response = await fetch(`/liveryTexture/${liveryId}`);
        const blob = await response.blob();
        const file = new File([blob], 'livery.png');
        fileMap.set('livery.png', file);

        this.load(fileMap);
    }

    hideSpinner() {
        this.spinnerEl.style.display = 'none';
    }
}

const urlParams = new URLSearchParams(window.location.search);
const clearCoat = urlParams.get('clearCoat');
const clearCoatRoughness = urlParams.get('clearCoatRoughness');
const baseRoughness = urlParams.get('baseRoughness');
const metallic = urlParams.get('metallic');

const decalsObject = {
    clearCoat: parseFloat(clearCoat),
    clearCoatRoughness: parseFloat(clearCoatRoughness),
    baseRoughness: parseFloat(baseRoughness),
    metallic: parseFloat(metallic)
};

async function modifyGltfFile(file, name) {
    if (name.endsWith('.gltf')) {
        // Read the file as text
        const fileText = await file.text();

        // Parse the text as JSON
        let gltfObject = JSON.parse(fileText);

        // Modify the properties
        let material = gltfObject.materials[0];
        let clearCoatExtension = material.extensions.KHR_materials_clearcoat;
        let pbrMetallicRoughness = material.pbrMetallicRoughness;

        if (decalsObject.clearCoat !== undefined) {
            clearCoatExtension.clearcoatFactor = decalsObject.clearCoat;
        }
        if (decalsObject.clearCoatRoughness !== undefined) {
            clearCoatExtension.clearCoatRoughnessFactor = decalsObject.clearCoatRoughness;
        }
        if (decalsObject.baseRoughness !== undefined) {
            pbrMetallicRoughness.roughnessFactor = decalsObject.baseRoughness;
        }
        if (decalsObject.metallic !== undefined) {
            pbrMetallicRoughness.metallicFactor = decalsObject.metallic;
        }

        // Convert the modified JSON back to a string
        const modifiedGltfText = JSON.stringify(gltfObject);

        // Convert the string back to a File
        const modifiedGltfFile = new File([modifiedGltfText], name, { type: 'application/json' });

        // Create a new Response object with the modified GLTF file
        const response = new Response(modifiedGltfFile);

        return response;
    }

    // If the file is not a GLTF file, return it as is
    return file;
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App(document.body, location);
});
