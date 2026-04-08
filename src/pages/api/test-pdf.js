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
    
    // Zjistíme rozměry stránky
    const { width, height } = firstPage.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const testName = "JARNÍ CENA JK SOBOTKA";
    const testDate = "Datum konání: 15. 5. 2026";

    // AUTOMATICKÉ CENTROVÁNÍ - změříme šířku konkrétního textu
    const nameWidth = font.widthOfTextAtSize(testName, 24);
    const dateWidth = font.widthOfTextAtSize(testDate, 16);

    // 1. NÁZEV ZÁVODU (do dřevěné cedule)
    firstPage.drawText(testName, {
      x: (width - nameWidth) / 2, // Perfektní střed!
      y: height - 245, // Posunuto výš (menší odečet = vyšší pozice na stránce)
      size: 24,
      font: font,
      color: rgb(0.36, 0.25, 0.22), 
    });

    // 2. DATUM ZÁVODU (do prázdné stuhy)
    firstPage.drawText(testDate, {
      x: (width - dateWidth) / 2, 
      y: height - 395, // Posunuto níž pod nápis Humprecht
      size: 16,
      font: font,
      color: rgb(0.2, 0.2, 0.2), 
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
