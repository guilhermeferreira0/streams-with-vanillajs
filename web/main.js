const [
    inputWorker,
    inputFile,
    startButton,
    stopButton,
    preview,
    previewVideo,
    canvas,
    selectService,
    divInputFile,
    inputStream
] = [
    'inputWorker', 
    'inputFile', 
    'startButton', 
    'stopButton',
    'preview',
    'previewVideo',
    'canvas',
    'selectService',
    'divInputFile',
    'inputStream'
].map(id => document.getElementById(id))
const worker = new Worker('./worker.js')

function readImage(image) {
    const fr = new FileReader()

    fr.readAsDataURL(image)

    fr.onload = (e) => {
        console.log(e)

        const url = fr.result
        
        const imgContent = new Image()
        imgContent.src = url
        preview.appendChild(imgContent)
    }
}

function readVideo(video) {
    const videoUrl = URL.createObjectURL(video)
    previewVideo.src = videoUrl;
    previewVideo.controls = true
    previewVideo.style.display = 'block'
    
    previewVideo.onended = function() {
        URL.revokeObjectURL(videoUrl);
    };
}

function processVideo() {
    canvas.style.display = 'block'
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    ctx.drawImage(previewVideo, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        
        const gray = 0.3 * r + 0.59 * g + 0.11 * b
        
        data[i] = gray
        data[i + 1] = gray
        data[i + 2] = gray
    }
    
    ctx.putImageData(imageData, 0, 0)
}


function readCsv(file) {
    if (inputStream.checked && inputWorker.checked) {
        const reader = file.stream().getReader()
        const worker = new Worker('./workerStream.js')

        worker.onmessage = (e) => {
            const processedData = e.data;
            preview.innerText += processedData.join('\n') + '\n'
        }
    
        const readable = new ReadableStream({
            start(controller) {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        console.log('done', done)
                        controller.close()
                        worker.terminate()
                        return
                    }
    
                    controller.enqueue(value)
                })
            }
        }).pipeThrough(new TransformStream({
            transform(chunk, controller) {
                const decoder = new TextDecoder('utf-8')
                const csvText = decoder.decode(chunk)

                worker.postMessage(csvText)
            }
        }))
        readable.pipeTo(new WritableStream({
            async write(chunk) {
                console.log('CHUNK', chunk)
            },
            close() {
                console.log('CLOSE STREAM')
            }
        }))
    }

    if (inputStream.checked) {
        const reader = file.stream().getReader()
    
        const readable = new ReadableStream({
            start(controller) {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        console.log('done', done)
                        controller.close()
                        return
                    }
    
                    controller.enqueue(value)
                })
            }
        }).pipeThrough(new TransformStream({
            transform(chunk, controller) {
                const decoder = new TextDecoder('utf-8')
                const csvText = decoder.decode(chunk)
                controller.enqueue(csvText.concat('\n'))
            }
        }))
        readable.pipeTo(new WritableStream({
            async write(chunk) {
                setTimeout(1000)
                preview.innerText = chunk;
            }
        }))
    }

    if (inputWorker.checked) {
        const worker = new Worker('./worker.js')

        worker.onmessage = (e) => {
            const processedData = e.data
            preview.innerText = processedData.join('\n')
        }

        worker.postMessage(file)
    }

    const fr = new FileReader()
    fr.readAsText(file)
    
    fr.onload = () => {
        preview.innerText = fr.result;
    }
}

selectService.addEventListener('change', (e) => {
    const value = e.target.value;

    if (value == 'web') {
        divInputFile.style.display = 'block'
        return;
    }

    divInputFile.style.display = 'none'
    

    if (value == 'server') {
        const streamDiv = inputStream.parentElement;
        const workerDiv = inputWorker.parentElement
        streamDiv.style.display = 'none'
        workerDiv.style.display = 'none'
    }
})

previewVideo.addEventListener('play', () => {
    function process() {
        if (!previewVideo.paused && !previewVideo.ended) {
            processVideo()
            requestAnimationFrame(process)
        }
    }

    process()
})

startButton.addEventListener('click', () => {
    preview.innerText = ''

    if (selectService.value === 'web') {
        const file = inputFile.files[0];

        switch (file.type) {
            case 'image/png':
                readImage(file)
                break;
            case 'image/jpg':
                readImage(file)
                break;
            case 'video/mp4':
                readVideo(file)
                break;
            case 'text/csv':
                readCsv(file);
                break;
            default:
                console.log(file)
        }
    } else {
        console.log('Server Running!')
    }
})

inputFile.addEventListener('change', (e) => {
    preview.innerText = ''

    const type = inputFile.files[0].type
    const streamDiv = inputStream.parentElement;
    const workerDiv = inputWorker.parentElement


    if (type == 'text/csv') {
        streamDiv.style.display = 'block'
        workerDiv.style.display = 'block'
    } else {
        streamDiv.style.display = 'none'
        workerDiv.style.display = 'none'
    }
})
