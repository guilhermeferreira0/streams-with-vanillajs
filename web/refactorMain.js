const elements = {
    inputWorker: document.getElementById('inputWorker'),
    inputFile: document.getElementById('inputFile'),
    startButton: document.getElementById('startButton'),
    stopButton: document.getElementById('stopButton'),
    preview: document.getElementById('preview'),
    previewVideo: document.getElementById('previewVideo'),
    canvas: document.getElementById('canvas'),
    selectService: document.getElementById('selectService'),
    divInputFile: document.getElementById('divInputFile'),
    inputStream: document.getElementById('inputStream'),
};

const worker = new Worker('./worker.js');

function displayImage(image) {
    const reader = new FileReader();
    reader.readAsDataURL(image);
    reader.onload = () => {
        const imgContent = new Image();
        imgContent.src = reader.result;
        elements.preview.appendChild(imgContent);
    };
}

function displayVideo(video) {
    const videoUrl = URL.createObjectURL(video);
    elements.previewVideo.src = videoUrl;
    elements.previewVideo.controls = true;
    elements.previewVideo.style.display = 'block';
    console.log(elements.previewVideo)
    
    elements.previewVideo.onended = () => {
        URL.revokeObjectURL(videoUrl);
    };
}

function processVideo() {
    elements.canvas.style.display = 'block';
    const ctx = elements.canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(elements.previewVideo, 0, 0, elements.canvas.width, elements.canvas.height);
    const imageData = ctx.getImageData(0, 0, elements.canvas.width, elements.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const gray = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = gray;
    }

    ctx.putImageData(imageData, 0, 0);
}

function processCsv(file) {
    const reader = file.stream().getReader();
    const worker = new Worker('./workerStream.js');

    worker.onmessage = (e) => {
        const processedData = e.data;
        elements.preview.innerText += processedData.join('\n') + '\n';
    };

    const readable = new ReadableStream({
        start(controller) {
            reader.read().then(({ done, value }) => {
                if (done) {
                    controller.close();
                    worker.terminate();
                    return;
                }
                controller.enqueue(value);
            });
        }
    }).pipeThrough(new TransformStream({
        transform(chunk, controller) {
            const decoder = new TextDecoder('utf-8');
            const csvText = decoder.decode(chunk);
            worker.postMessage(csvText);
        }
    }));

    readable.pipeTo(new WritableStream({
        write(chunk) {
            elements.preview.innerText = chunk;
        }
    }));
}

function readFile(file) {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
        elements.preview.innerText = reader.result;
    };
}

function handleServiceChange(event) {
    const value = event.target.value;
    elements.divInputFile.style.display = (value === 'web') ? 'block' : 'none';
    const streamDiv = elements.inputStream.parentElement;
    const workerDiv = elements.inputWorker.parentElement;

    if (value == 'server') {
        streamDiv.style.display = 'none'
        workerDiv.style.display = 'none'
    }
}

function handleFileSelect() {
    elements.preview.innerText = '';

    if (elements.selectService.value === 'web') {
        const file = elements.inputFile.files[0];

        switch (file.type) {
            case 'image/png':
            case 'image/jpg':
                displayImage(file);
                break;
            case 'video/mp4':
                displayVideo(file);
                break;
            case 'text/csv':
                processCsv(file);
                break;
            default:
                console.error('Unsupported file type:', file);
        }
    } else {
        console.log('Server Running!');
    }
}

function handleFileChange(event) {
    const type = elements.inputFile.files[0]?.type;
    const streamDiv = elements.inputStream.parentElement;
    const workerDiv = elements.inputWorker.parentElement;

    if (type === 'text/csv') {
        streamDiv.style.display = 'block';
        workerDiv.style.display = 'block';
    } else {
        streamDiv.style.display = 'none';
        workerDiv.style.display = 'none';
    }
}

function processVideoWhilePlaying() {
    if (!elements.previewVideo.paused && !elements.previewVideo.ended) {
        processVideo();
        requestAnimationFrame(processVideoWhilePlaying);
    }
}

// Event Listeners
elements.selectService.addEventListener('change', handleServiceChange);
elements.startButton.addEventListener('click', handleFileSelect);
elements.inputFile.addEventListener('change', handleFileChange);
elements.previewVideo.addEventListener('play', processVideoWhilePlaying);
