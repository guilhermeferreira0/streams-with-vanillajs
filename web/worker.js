onmessage = (e) => {
    const file = e.data
    const reader = new FileReader()
    
    reader.onload = () => {
        const csvText = reader.result
        const processedData = csvText.split('\n').map(line => line.trim())

        postMessage(processedData)
    }

    reader.readAsText(file)
}