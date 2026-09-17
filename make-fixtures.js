// Generates a minimal, valid one-page PDF fixture with text, and a minimal .docx
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// ---------- PDF ----------
function buildPdf(text) {
  const objects = [];
  const add = (body) => {
    const offset = Buffer.byteLength(objects.join(""));
    objects.push(`${objects.length + 1} 0 obj\n${body}\nendobj\n`);
    return offset;
  };
  const offsets = [];
  offsets.push(add("<< /Type /Catalog /Pages 2 0 R >>"));
  offsets.push(add("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
  const stream = `BT /F1 14 Tf 72 740 Td (${text}) Tj ET\n`;
  offsets.push(
    add(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>"
    )
  );
  offsets.push(add(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`));
  offsets.push(add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));

  let xrefOffset = Buffer.byteLength(objects.join(""));
  const xref =
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("") +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from("%PDF-1.4\n" + objects.join("") + xref);
}

// ---------- DOCX (minimal zip, all STORE + CRC32) ----------
const crcTable = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function zipFiles(entries) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version
    local.writeUInt16LE(0x800, 6); // UTF-8 flag
    local.writeUInt16LE(0, 8); // STORE
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    const crc = crc32(data);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(Buffer.byteLength(name), 26);
    local.writeUInt16LE(0, 28);
    const nameBuf = Buffer.from(name);
    parts.push(local, nameBuf, data);

    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(0, 6); // now
    c.writeUInt16LE(0x800, 8);
    c.writeUInt16LE(0, 10);
    c.writeUInt16LE(0, 12);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(data.length, 20);
    c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(Buffer.byteLength(name), 28);
    c.writeUInt16LE(0, 30);
    c.writeUInt16LE(0, 32);
    c.writeUInt16LE(0, 34);
    c.writeUInt16LE(0, 36);
    c.writeUInt32LE(offset, 42);
    central.push(c, Buffer.from(name));
    offset += 30 + Buffer.byteLength(name) + data.length;
  }
  const cdStart = Buffer.concat(parts).length;
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(cdStart, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...parts, centralBuf, end]);
}

const docxEntries = [
  {
    name: "[Content_Types].xml",
    data: Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
    ),
  },
  {
    name: "_rels/.rels",
    data: Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
    ),
  },
  {
    name: "word/document.xml",
    data: Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>هذه جلسة اختبار للمستند لتحويلها الي لاتكس</w:t></w:r></w:p></w:body></w:document>'
    ),
  },
];

const outDir = path.join(__dirname, "fixtures");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "sample.pdf"), buildPdf("This is a sample case note for LaTeX conversion."));
fs.writeFileSync(path.join(outDir, "sample.docx"), zipFiles(docxEntries));
console.log("fixtures written to", outDir);