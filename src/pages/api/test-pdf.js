import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'pozvanka.pdf');
    const existingPdfBytes = fs.readFileSync(filePath);

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    
    const { width, height } = firstPage.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const testName = "JARNÍ CENA JK SOBOTKA";
    const testDate = "Datum konání: 15. 5. 2026";

    const nameWidth = font.widthOfTextAtSize(testName, 24);
    const dateWidth = font.widthOfTextAtSize(testDate, 18);

    // 1. NÁZEV ZÁVODU (Konečně do dřevěné cedule!)
    firstPage.drawText(testName, {
      x: (width - nameWidth) / 2, 
      y: height - 275, // Zvětšený odečet = posun dolů do cedule
      size: 24,
      font: font,
      color: rgb(0.36, 0.25, 0.22), // Westernová hnědá
    });

    // 2. DATUM ZÁVODU (Pod stuhu do oblohy)
    firstPage.drawText(testDate, {
      x: (width - dateWidth) / 2, 
      y: height - 410, // Kousek níž do volného prostoru
      size: 18, // Zvětšeno z 16 na 18
      font: font,
      color: rgb(0.36, 0.25, 0.22), // Sjednocená barva
    });

    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="test-pozvanky.pdf"');
    res.status(200).send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Chyba při generování PDF:', error);
    res.status(500).json({ chyba: error.message });
  }
}
