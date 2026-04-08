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

    // Změnili jsme na schválně dlouhý text, abychom otestovali zmenšování!
    const testName = "VELKÁ JARNÍ CENA JK SOBOTKA - WESTERNOVÝ SPECIÁL"; 
    const testDate = "Datum konání: 15. 5. 2026";

    // 1. NÁZEV ZÁVODU S CHYTROU ÚPRAVOU VELIKOSTI
    let nameSize = 24; // Výchozí velikost písma
    let nameWidth = font.widthOfTextAtSize(testName, nameSize);
    const maxWidth = width - 120; // Necháme z každé strany 60 bodů okraj

    // Pokud je text širší než náš limit, plynule ho zmenšujeme
    while (nameWidth > maxWidth && nameSize > 10) {
      nameSize -= 1;
      nameWidth = font.widthOfTextAtSize(testName, nameSize);
    }

    firstPage.drawText(testName, {
      x: (width - nameWidth) / 2, 
      y: height - 320, // Velký skok dolů přímo do středu cedule
      size: nameSize, // Zde se použije upravená velikost
      font: font,
      color: rgb(0.36, 0.25, 0.22), 
    });

    // 2. DATUM ZÁVODU (Tady jsme se minule trefili přesně, tak neměníme)
    const dateWidth = font.widthOfTextAtSize(testDate, 18);
    firstPage.drawText(testDate, {
      x: (width - dateWidth) / 2, 
      y: height - 410, 
      size: 18,
      font: font,
      color: rgb(0.36, 0.25, 0.22), 
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
