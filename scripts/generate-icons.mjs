import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const crcTable = makeCrcTable();
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generateGymIconPNG(size) {
  // Generate RGBA buffer
  const scanlineWidth = 1 + size * 4;
  const rawData = Buffer.alloc(scanlineWidth * size);

  const center = size / 2;
  const rBg = size * 0.44;

  for (let y = 0; y < size; y++) {
    const rowOffset = y * scanlineWidth;
    rawData[rowOffset] = 0; // Filter byte 0 (None)

    for (let x = 0; x < size; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default background: deep slate #090d16
      let r = 9, g = 13, b = 22, a = 255;

      // Outer ring
      if (dist >= rBg - 4 && dist <= rBg + 2) {
        // Gold accent #f59e0b
        r = 245; g = 158; b = 11;
      } else if (dist < rBg - 4) {
        // Dark metallic gradient
        const grad = y / size;
        r = Math.floor(15 + grad * 15);
        g = Math.floor(23 + grad * 15);
        b = Math.floor(42 + grad * 20);

        // Center barbell bar
        if (Math.abs(dy) <= size * 0.035 && Math.abs(dx) <= size * 0.32) {
          r = 226; g = 232; b = 240; // Silver metal #e2e8f0
        }

        // Left & right weight plates
        if ((dx >= -size * 0.38 && dx <= -size * 0.32) || (dx >= size * 0.32 && dx <= size * 0.38)) {
          if (Math.abs(dy) <= size * 0.18) {
            r = 245; g = 158; b = 11; // Gold plates
          }
        }

        // Center Hexagon / Shield
        const inHex = (Math.abs(dx) * 0.866 + Math.abs(dy) * 0.5 <= size * 0.18) && (Math.abs(dy) <= size * 0.18);
        if (inHex) {
          r = 2; g = 6; b = 23; // Deep black
          // Golden lightning bolt center
          if ((Math.abs(dx - dy * 0.4) <= size * 0.04) && Math.abs(dy) <= size * 0.12) {
            r = 251; g = 191; b = 36;
          }
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // width
  ihdrData.writeUInt32BE(size, 4); // height
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = createChunk('IDAT', deflated);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'logo.png'), generateGymIconPNG(192));
fs.writeFileSync(path.join(publicDir, 'logo.png'), generateGymIconPNG(512));
fs.writeFileSync(path.join(publicDir, 'logo.png'), generateGymIconPNG(512));
fs.writeFileSync(path.join(publicDir, 'logo.png'), generateGymIconPNG(180));
console.log('All PWA PNG icons generated successfully!');
