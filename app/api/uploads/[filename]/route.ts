import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { join } from 'path'

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ filename: string }> }
) {
    const params = await props.params;

    // Security: Prevent directory traversal
    const filename = params.filename
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    try {
        // Look in project-root/uploads first
        // If not found, look in project-root/public/uploads (legacy fallback)
        const rootUploads = path.join(process.cwd(), 'uploads', filename)
        const publicUploads = path.join(process.cwd(), 'public', 'uploads', filename)

        let filePath = rootUploads
        let fileStat

        try {
            fileStat = await stat(rootUploads)
        } catch (e) {
            // Check legacy path
            try {
                fileStat = await stat(publicUploads)
                filePath = publicUploads
            } catch (e2) {
                return NextResponse.json({ error: 'File not found' }, { status: 404 })
            }
        }

        const buffer = await readFile(filePath)

        // Determine MIME type based on extension
        const ext = path.extname(filename).toLowerCase()
        let contentType = 'application/octet-stream'

        if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg'
        if (ext === '.png') contentType = 'image/png'
        if (ext === '.webp') contentType = 'image/webp'
        if (ext === '.gif') contentType = 'image/gif'
        if (ext === '.mp4') contentType = 'video/mp4'
        if (ext === '.mov') contentType = 'video/quicktime'
        if (ext === '.webm') contentType = 'video/webm'

        // Cache control for performance
        const headers = new Headers()
        headers.set('Content-Type', contentType)
        headers.set('Content-Length', fileStat.size.toString())
        headers.set('Cache-Control', 'public, max-age=31536000, immutable')

        return new NextResponse(buffer, { headers })

    } catch (error) {
        console.error('File serve error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
