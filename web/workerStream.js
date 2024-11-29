onmessage = (e) => {
    setTimeout(2000)
    const chunk = e.data
    const processedData = chunk.split('\n').map(line => line.toUpperCase())

    postMessage(processedData)
}