const express = require('express');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
    
const PORT = process.env.PORT || 3000;



const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

// Ensure output directory exists
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

const testDefaults = {
    "HAEMOGLOBIN": { unit: "gm/dl", range: "12 – 16" },
    "TOTAL LEUCOCYTE": { unit: "/cmm", range: "4,000 – 11,000" },
    "NEUTROPHILS": { unit: "%", range: "70 – 70" },
    "LYMPHOCYTES": { unit: "%", range: "20 – 45" },
    "EOSINOPHILS": { unit: "%", range: "01 – 06" },
    "MONOCYTES": { unit: "%", range: "02 – 10" },
    "BASOPHILS": { unit: "%", range: "0 – 2" },
    "HAEMATOCRIT(PCV)": { unit: "%", range: "35 – 55" },
    "MCV": { unit: "Fl", range: "83 – 101" },
    "MCH": { unit: "Pg", range: "27 – 32" },
    "MCHC": { unit: "gm/dl", range: "31 – 35" },
    "RBC COUNT": { unit: "10^6/μl", range: "4.1 – 6.2" },
    "PLATELETS": { unit: "lack /cumm", range: "1,50000 – 4,50000" }
};

app.get('/', (req, res) => {
    res.render('form', { testDefaults });
});


app.post('/generate', (req, res) => {
    const data = req.body;
    const doc = new PDFDocument({ margin: 50 });
    const filePath = path.join(outputDir, 'report.pdf');
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text("GURU DIAGNOSTIC CENTRE", { align: "center" });
    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica').text(`Name: ${data.name || ''}   Age: ${data.age || ''}   Sex: ${data.sex || ''}`);
    doc.text(`Ref By: ${data.refby || ''}   Ref No: ${data.refno || ''}   Date: ${data.date || ''}`);
    doc.moveDown(1);
    doc.fontSize(14).font('Helvetica-Bold').text("COMPLETE BLOOD COUNT REPORT", { align: "center" });
    doc.moveDown();

    // Table headers
    const tableTop = doc.y + 10;
    const rowHeight = 20;

    const col1 = 50;   // Test Name
    const col2 = 250;  // Result
    const col3 = 350;  // Unit
    const col4 = 450;  // Normal Range

    doc.fontSize(10).font('Helvetica-Bold');

    // Draw header background
    doc.rect(col1, tableTop, 500, rowHeight).fill('#eee').stroke();

    doc.fillColor('#000')
        .text("TEST NAME", col1 + 5, tableTop + 5)
        .text("RESULT", col2 + 5, tableTop + 5)
        .text("UNITS", col3 + 5, tableTop + 5)
        .text("NORMAL RANGE", col4 + 5, tableTop + 5);

    // Table rows
    let y = tableTop + rowHeight;
    doc.font('Helvetica').fillColor('#000');

    Object.entries(testDefaults).forEach(([test, info], index) => {
        doc.rect(col1, y, 500, rowHeight).stroke();

        const result = data[test] || '-';

        doc.text(test, col1 + 5, y + 5);
        doc.text(result, col2 + 5, y + 5);
        doc.text(info.unit, col3 + 5, y + 5);
        doc.text(info.range, col4 + 5, y + 5);

        y += rowHeight;

        // Check for page break
        if (y > 750) {
            doc.addPage();
            y = 50;
        }
    });

    // Serology
    doc.moveDown(2);
    doc.fontSize(12).font('Helvetica-Bold').text("SEROLOGY", { underline: true });
    doc.font('Helvetica').fontSize(10).moveDown(0.5);
    doc.text(`Widal Test: ${data.widalTest || 'Not Available'}`);

    // Footer
    doc.moveDown(5);
    doc.font('Helvetica-Oblique').text("Technologist Signature", { align: "right" });

    doc.end();

    stream.on('finish', () => {
        res.download(filePath, "Blood_Report.pdf");
    });

    stream.on('error', (err) => {
        console.error("PDF generation error:", err);
        res.status(500).send("Failed to generate PDF");
    });
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });