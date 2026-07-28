package com.civicpulse.certificateservice.util;

import com.civicpulse.certificateservice.entity.Certificate;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;

@Component
public class CertificatePdfGenerator {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMMM yyyy");

    private byte[] generate_internal(Certificate cert) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDFont titleFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDFont bodyFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDFont labelFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);

            float pageWidth = page.getMediaBox().getWidth();
            float margin = 60;
            float y = page.getMediaBox().getHeight() - 80;

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                // Border
                cs.setLineWidth(2f);
                cs.addRect(margin - 20, 40, pageWidth - 2 * (margin - 20), page.getMediaBox().getHeight() - 80);
                cs.stroke();

                // Header
                cs.beginText();
                cs.setFont(titleFont, 20);
                String header = "GOVERNMENT OF CIVICPULSE";
                float headerWidth = titleFont.getStringWidth(header) / 1000 * 20;
                cs.newLineAtOffset((pageWidth - headerWidth) / 2, y);
                cs.showText(header);
                cs.endText();
                y -= 24;

                cs.beginText();
                cs.setFont(bodyFont, 12);
                String sub = "Municipal Citizen Services Department";
                float subWidth = bodyFont.getStringWidth(sub) / 1000 * 12;
                cs.newLineAtOffset((pageWidth - subWidth) / 2, y);
                cs.showText(sub);
                cs.endText();
                y -= 40;

                // Certificate title
                cs.beginText();
                cs.setFont(titleFont, 18);
                String title = formatType(cert.getCertificateType()) + " CERTIFICATE";
                float titleWidth = titleFont.getStringWidth(title) / 1000 * 18;
                cs.newLineAtOffset((pageWidth - titleWidth) / 2, y);
                cs.showText(title);
                cs.endText();
                y -= 20;

                cs.beginText();
                cs.setFont(bodyFont, 11);
                String certNo = "Certificate No: CERT-" + cert.getId();
                float certNoWidth = bodyFont.getStringWidth(certNo) / 1000 * 11;
                cs.newLineAtOffset((pageWidth - certNoWidth) / 2, y);
                cs.showText(certNo);
                cs.endText();
                y -= 60;

                // Body fields
                y = writeField(cs, labelFont, bodyFont, margin, y, "Name:", cert.getCitizenName());
                y = writeField(cs, labelFont, bodyFont, margin, y, "Address:", nullSafe(cert.getCitizenAddress()));
                y = writeField(cs, labelFont, bodyFont, margin, y, "Certificate Type:", formatType(cert.getCertificateType()));
                y = writeField(cs, labelFont, bodyFont, margin, y, "Applied On:", cert.getAppliedAt().format(DATE_FMT));
                y = writeField(cs, labelFont, bodyFont, margin, y, "Issued On:",
                        cert.getIssuedAt() != null ? cert.getIssuedAt().format(DATE_FMT) : "-");
                y = writeField(cs, labelFont, bodyFont, margin, y, "Status:", cert.getStatus().toString());

                y -= 40;
                cs.beginText();
                cs.setFont(bodyFont, 10);
                cs.newLineAtOffset(margin, y);
                cs.showText("This is a system-generated document from the CivicPulse Nexus citizen services platform.");
                cs.endText();

                y -= 60;
                cs.beginText();
                cs.setFont(labelFont, 11);
                cs.newLineAtOffset(pageWidth - margin - 150, y);
                cs.showText("Authorized Signatory");
                cs.endText();
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    private float writeField(PDPageContentStream cs, PDFont labelFont, PDFont bodyFont,
                              float margin, float y, String label, String value) throws IOException {
        cs.beginText();
        cs.setFont(labelFont, 12);
        cs.newLineAtOffset(margin, y);
        cs.showText(label);
        cs.endText();

        cs.beginText();
        cs.setFont(bodyFont, 12);
        cs.newLineAtOffset(margin + 150, y);
        cs.showText(value != null ? value : "-");
        cs.endText();

        return y - 26;
    }

    private String formatType(Object type) {
        return type.toString().replace("_", " ");
    }

    private String nullSafe(String s) {
        return (s == null || s.isBlank()) ? "-" : s;
    }
    /**
     * Saves the PDF to disk at the standard path and returns the bytes.
     * Called by CertificateServiceImpl.generate() — writes file for later download.
     */
    public void generate(Certificate cert) throws IOException {
        byte[] bytes = generateBytes(cert);
        // store to disk so downloadPdf can serve it later
        java.nio.file.Path dir = java.nio.file.Paths.get(System.getProperty("user.home"), "civicpulse-certs");
        java.nio.file.Files.createDirectories(dir);
        java.nio.file.Files.write(dir.resolve("cert-" + cert.getId() + ".pdf"), bytes);
    }

    public byte[] getPdfBytes(Certificate cert) throws IOException {
        java.nio.file.Path path = java.nio.file.Paths.get(
                System.getProperty("user.home"), "civicpulse-certs", "cert-" + cert.getId() + ".pdf");
        if (java.nio.file.Files.exists(path)) {
            return java.nio.file.Files.readAllBytes(path);
        }
        // If file not on disk, regenerate on the fly
        return generateBytes(cert);
    }

    /**
     * Core PDF generation — returns bytes without writing to disk.
     */
    public byte[] generateBytes(Certificate cert) throws IOException {
        return generate_internal(cert);
    }
}