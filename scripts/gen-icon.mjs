// 生成 OpenSublime 应用图标（512x512 PNG，无外部依赖）
import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SIZE = 512
const px = new Uint8Array(SIZE * SIZE * 4)

function setPx(x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return
  const i = (y * SIZE + x) * 4
  px[i] = r
  px[i + 1] = g
  px[i + 2] = b
  px[i + 3] = a
}

// 圆角矩形内判断
function inRoundedRect(x, y, w, h, radius) {
  const cx = Math.min(Math.max(x, radius), w - radius)
  const cy = Math.min(Math.max(y, radius), h - radius)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= radius * radius
}

// 绘制背景（圆角 + 垂直渐变 + 顶部高光）
const RADIUS = 96
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    if (!inRoundedRect(x, y, SIZE, SIZE, RADIUS)) continue
    const t = y / SIZE
    const r = Math.round(30 + (20 - 30) * t)
    const g = Math.round(32 + (24 - 32) * t)
    const b = Math.round(48 + (40 - 48) * t)
    setPx(x, y, r, g, b)
  }
}

// 前景 "S" 标签（6 宽 × 7 高 bitmap，放大绘制）
const S_BITMAP = [
  '011111',
  '100000',
  '100000',
  '011110',
  '000010',
  '000010',
  '011110'
]
const CW = 6
const CH = 7
const cell = 46
const glyphW = CW * cell
const glyphH = CH * cell
const ox = Math.round((SIZE - glyphW) / 2)
const oy = Math.round((SIZE - glyphH) / 2) - 4

function drawS(x0, y0, scale, color) {
  for (let gy = 0; gy < CH; gy++) {
    for (let gx = 0; gx < CW; gx++) {
      if (S_BITMAP[gy][gx] !== '1') continue
      const sx = x0 + gx * scale
      const sy = y0 + gy * scale
      for (let py = 0; py < scale; py++) {
        for (let px2 = 0; px2 < scale; px2++) {
          setPx(sx + px2, sy + py, color[0], color[1], color[2])
        }
      }
    }
  }
}

// 底部 accent 条纹
for (let y = SIZE - 118; y < SIZE - 92; y++) {
  for (let x = 0; x < SIZE; x++) {
    if (!inRoundedRect(x, y, SIZE, SIZE, RADIUS)) continue
    setPx(x, y, 78, 148, 255)
  }
}

// 在主色条上再画一次 S？不，S 用亮色画在深色区
drawS(ox, oy, cell, [240, 247, 255])

// ---- PNG 编码 ----
const crcTable = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // color type RGBA
ihdr[10] = 0
ihdr[11] = 0
ihdr[12] = 0

// 每行前加 filter byte 0
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0
  Buffer.from(px.buffer, y * SIZE * 4, SIZE * 4).copy(raw, y * (SIZE * 4 + 1) + 1)
}
const idat = deflateSync(raw, { level: 9 })

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0))
])

const outDir = join(__dirname, '..', 'build')
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'icon.png'), png)
console.log('icon.png written:', png.length, 'bytes')