const elements = {
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

// const worker = new Worker('./worker.js');
const API_URL = 'http://localhost:3000'
let abort = new AbortController()

async function getCsvFromServer() {
    const res = await fetch(API_URL, {
        method: 'GET',
        signal: abort.signal
    });
    const reader = res.body
        .pipeThrough(new TextDecoderStream())

    return reader;
}

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
    if (!elements.inputStream.checked) {
        const fr = new FileReader()
        fr.readAsText(file)
        
        fr.onload = () => {
            preview.innerText = fr.result;
        }
        return;
    }

    const reader = file.stream().getReader();
        
    const readable = new ReadableStream({
        start(controller) {
            function readNextChunk() {
                    reader.read().then(({ done, value }) => {
                        if (done) {
                            controller.close();
                            return;
                        }

                        const chunk = new Uint8Array(value)
                        const chunkString = new TextDecoder('utf-8').decode(chunk)
        
                        controller.enqueue(chunkString);
                        readNextChunk()
                }).catch(err => {
                    console.error('Erro ao ler, err', err)
                    controller.error(err)
                })
            } 

            readNextChunk()
    }}).pipeThrough(new TransformStream({
        transform(chunk, controller) {
            const data = JSON.stringify(chunk)

            controller.enqueue(data.concat('\n'))
        }
    })).pipeTo(new WritableStream({
        write(chunk) {
            elements.preview.innerText = chunk;
        }
    }))
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

    if (value == 'server') {
        streamDiv.style.display = 'none'
    }
}

async function handleFileSelect() {
    elements.preview.innerText = ''
    abort = new AbortController()
    
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
        const res = await getCsvFromServer();

        res.pipeTo(new WritableStream({
            write(chunk) {
                elements.preview.innerText += chunk
            }
        }))

        return;
    }
}

function handleFileChange(event) {
    const type = elements.inputFile.files[0]?.type;
    const streamDiv = elements.inputStream.parentElement;

    if (type === 'text/csv') {
        streamDiv.style.display = 'block';
    } else {
        streamDiv.style.display = 'none';
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
elements.stopButton.addEventListener('click', () => {
    abort.abort()
})