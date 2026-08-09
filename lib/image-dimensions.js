// Bepaalt de breedte/hoogte van een afbeelding door alleen de eerste
// kilobytes op te halen (via een Range-request) en het bestandsformaat-
// specifieke headergedeelte te lezen — geen externe dependency nodig, en we
// downloaden niet de hele afbeelding alleen om de afmetingen te weten.
export async function getRemoteImageDimensions(url) {
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-65535" } });
    if (!res.ok && res.status !== 206) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return parseDimensions(buf);
  } catch {
    return null;
  }
}

function parseDimensions(buf) {
  // PNG: 8-byte signature, dan een IHDR-chunk met breedte/hoogte als
  // big-endian uint32 op byte 16-23.
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47 && buf.readUInt32BE(4) === 0x0d0a1a0a) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // GIF: "GIF87a"/"GIF89a"-signature, dan breedte/hoogte als
  // little-endian uint16 op byte 6-9.
  if (buf.length >= 10 && buf.toString("ascii", 0, 3) === "GIF") {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }

  // WebP (VP8/VP8L/VP8X): "RIFF"...."WEBP", daarna een chunk-specifiek
  // formaat per variant.
  if (buf.length >= 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunkType = buf.toString("ascii", 12, 16);
    if (chunkType === "VP8X") {
      const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
      return { width, height };
    }
    if (chunkType === "VP8 " && buf.length >= 30) {
      const width = buf.readUInt16LE(26) & 0x3fff;
      const height = buf.readUInt16LE(28) & 0x3fff;
      return { width, height };
    }
    // VP8L (lossless) heeft weer een ander bit-pakket-formaat — niet
    // ondersteund, geeft null terug (dan valt de aanroeper terug op de
    // stockfoto-zoekactie, wat altijd veilig is).
    return null;
  }

  // JPEG: reeks markers (0xFFxx). We zoeken de eerste SOF-marker (Start Of
  // Frame), die de afmetingen bevat.
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) break;
      const marker = buf[offset + 1];
      const isSOF = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
      if (isSOF) {
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      }
      const segmentLength = buf.readUInt16BE(offset + 2);
      offset += 2 + segmentLength;
    }
    return null; // SOF-marker zat niet binnen de opgehaalde eerste 64KB
  }

  return null;
}
