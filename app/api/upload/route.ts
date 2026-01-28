import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { prisma } from '@/lib/prisma'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
const MAX_SIZE = 100 * 1024 * 1024 // 100MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large' }, { status: 400 })
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type)

        let processedBuffer: Buffer
        let extension = ''
        let mime = file.type

        if (isVideo) {
            // Save video as is
            processedBuffer = buffer
            // Simple extension mapping
            extension = file.type.split('/')[1] || 'mp4'
            if (file.type === 'video/quicktime') extension = 'mov'
        } else {
            // Process Image
            processedBuffer = await sharp(buffer)
                .rotate()
                .webp({ quality: 80 })
                .toBuffer()
            extension = 'webp'
            mime = 'image/webp'
        }

        const id = crypto.randomUUID()
        const filename = `${id}.${extension}`
        const filepath = path.join(UPLOAD_DIR, filename)

        // Ensure dir exists
        await mkdir(UPLOAD_DIR, { recursive: true })

        // Save to disk
        await writeFile(filepath, processedBuffer)

        // Save metadata to DB (orphan attachment until linked to response)
        const attachment = await prisma.attachment.create({
            data: {
                id, // use the same UUID
                storage: 'local',
                pathOrKey: filename,
                mime: 'image/webp',
                sizeBytes: processedBuffer.length,
                hash: 'sha256-placeholder',
                exifStripped: !isVideo,
                mediaType: isVideo ? 'video' : 'photo'
            }
        })

        return NextResponse.json({ id: attachment.id, type: attachment.mediaType })
    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
