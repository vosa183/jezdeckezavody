import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    // Najdeme cestu k tvému nahranému prázdnému PDF v public složce
    const filePath = path.join(process.cwd(), 'public', 'pozvanka.pdf');
    const existingPdfBytes = fs.readFileSync(filePath);

    // Načteme PDF do paměti
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Vezmeme první stránku
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Zjistíme rozměry stránky (pomůže nám to s centrováním)
    const { width, height } = firstPage.getSize();

    // Načteme standardní tučný font
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // TESTOVACÍ TEXTY
    const testName = "JARNÍ CENA JK SOBOTKA";
    const testDate = "Datum konání: 15. 5. 2026";

    // 1. Tisk názvu závodu (Tady budeme ladit souřadnice X a Y)
    firstPage.drawText(testName, {
      x: 100, // Pozice zleva doprava
      y: height - 300, // Pozice odspodu nahoru (height je úplný vršek stránky)
      size: 24,
      font: font,
      color: rgb(0.36, 0.25, 0.22), // Barva v RGB (tmavě hnědá #5d4037)
    });

    // 2. Tisk data
    firstPage.drawText(testDate, {
      x: 150, 
      y: height - 350, 
      size: 18,
      font: font,
      color: rgb(0, 0, 0), // Černá barva
    });

    // Uložíme nové PDF
    const pdfBytes = await pdfDoc.save();

    // Odešleme ho rovnou tobě na obrazovku k prohlédnutí
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="test-pozvanky.pdf"');
    res.status(200).send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Chyba při generování PDF:', error);
    res.status(500).json({ chyba: error.message });
  }
}
