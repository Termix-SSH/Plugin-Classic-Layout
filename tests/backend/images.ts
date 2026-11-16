import jpeg from "jpeg-js";
import { PNG } from "pngjs";

/** RGBA pixels of one color, or random noise that won't compress. */
function pixels(width: number, height: number, noise = false): Buffer {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = noise ? Math.floor(Math.random() * 256) : 0x33;
    data[i + 1] = noise ? Math.floor(Math.random() * 256) : 0x66;
    data[i + 2] = noise ? Math.floor(Math.random() * 256) : 0x99;
    data[i + 3] = 255;
  }
  return data;
}

export function pngImage(width = 4, height = 4, noise = false): Buffer {
  const png = new PNG({ width, height });
  pixels(width, height, noise).copy(png.data);
  return PNG.sync.write(png);
}

export function jpegImage(width = 4, height = 4): Buffer {
  return jpeg.encode({ width, height, data: pixels(width, height) }, 90).data;
}

/** A PNG with a text chunk spliced in after IHDR. */
export function pngWithText(text: string): Buffer {
  const base = pngImage();
  const body = Buffer.from(`Comment\0${text}`, "latin1");
  const chunk = Buffer.alloc(12 + body.length);
  chunk.writeUInt32BE(body.length, 0);
  chunk.write("tEXt", 4, "latin1");
  body.copy(chunk, 8);
  chunk.writeUInt32BE(
    crc32(chunk.subarray(4, 8 + body.length)),
    8 + body.length,
  );
  const ihdrEnd = 8 + 25;
  return Buffer.concat([
    base.subarray(0, ihdrEnd),
    chunk,
    base.subarray(ihdrEnd),
  ]);
}

/** A PNG whose header claims a size, with no real pixels behind it. */
export function pngClaiming(width: number, height: number): Buffer {
  const base = Buffer.from(pngImage());
  base.writeUInt32BE(width, 16);
  base.writeUInt32BE(height, 20);
  base.writeUInt32BE(crc32(base.subarray(12, 29)), 29);
  return base;
}

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let k = 0; k < 8; k++)
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
