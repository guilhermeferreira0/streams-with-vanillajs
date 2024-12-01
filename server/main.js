import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { Readable, Transform } from 'node:stream'
import { WritableStream, TransformStream } from 'node:stream/web'
import { setTimeout } from 'node:timers/promises'
import csvtojson from 'csvtojson'

const PORT = process.env.PORT

createServer(async (request, response) => {
    let abort = new AbortController();

    const header = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': '*',
    }
    if (request.method === 'OPTIONS') {
        response.writeHead(204, header)
        response.end()
        return;
    }
    
    let items = 0

    request.once('close', _ => {
        console.log(`connection was closed, items response: ${items}`)
        abort.abort()
        return;
    })
    
    response.writeHead(200, header);

    const readableStream = Readable.toWeb(createReadStream('../assets/customers-2000000.csv'))
    .pipeThrough(Transform.toWeb(csvtojson()))
    .pipeThrough(new TransformStream({ 
        transform(chunk, controller) {
            const data = JSON.parse(Buffer.from(chunk))

            if (abort.signal.aborted) {
                controller.terminate()
                return
            }

            controller.enqueue(JSON.stringify(data).concat('\n'))
        }}))
    readableStream.pipeTo(new WritableStream({
        async write(chunk) {
            await setTimeout(800)
            ++items

            response.write(chunk)
        },
        close() {
            response.end()
        },
        abort(err) {
            console.error('Stream aborted', err)
        }
    }))
})
.listen(PORT)
.on('listening', () => console.log(`Running at port ${PORT}`))