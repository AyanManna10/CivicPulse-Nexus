package com.civicpulse.certificateservice.util;

import com.civicpulse.certificateservice.entity.Certificate;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.VerticalAlignment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.format.DateTimeFormatter;

@Service
public class CertificatePdfGenerator {

    private static final Logger log = LoggerFactory.getLogger(CertificatePdfGenerator.class);

    // Workaround for iText7 TextAlignment.CENTER resolution issue in some IDEs
    private static final TextAlignment ALIGN_CENTER = TextAlignment.CENTER;

    @Value("${certificate.pdf.output-path:C:/Project/uploads/certificates}")
    private String outputPath;

    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd MMM yyyy");

    public byte[] generateCertificatePdf(Certificate cert) throws Exception {
        log.info("Generating PDF for certificate: {}", cert.getCertificateNumber());

        new File(outputPath).mkdirs();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdfDoc = new PdfDocument(writer);
        pdfDoc.setDefaultPageSize(PageSize.A4);

        Document doc = new Document(pdfDoc);
        doc.setMargins(20, 20, 20, 20);

        switch (cert.getCertificateType()) {
            case INCOME:          buildIncomeCertificate(doc, cert);       break;
            case RESIDENCE:       buildResidenceCertificate(doc, cert);    break;
            case BIRTH:           buildBirthCertificate(doc, cert);        break;
            case DEATH:           buildDeathCertificate(doc, cert);        break;
            case MARRIAGE:        buildMarriageCertificate(doc, cert);     break;
            case TRADE_LICENSE:   buildTradeLicenseCertificate(doc, cert); break;
            case SHOP_LICENSE:    buildShopLicenseCertificate(doc, cert);  break;
            case BUILDING_PERMIT: buildBuildingPermitCertificate(doc, cert); break;
            case WATER_CONNECTION: buildWaterConnectionCertificate(doc, cert); break;
            default:              buildGenericCertificate(doc, cert);
        }

        doc.close();
        byte[] pdfBytes = baos.toByteArray();

        String filename = cert.getCertificateNumber() + ".pdf";
        Files.write(Paths.get(outputPath, filename), pdfBytes);
        log.info("Certificate PDF saved: {}", filename);

        return pdfBytes;
    }

    // ── Income Certificate ─────────────────────────────────────────────────────

    private void buildIncomeCertificate(Document doc, Certificate cert) throws Exception {
        addHeader(doc, "INCOME CERTIFICATE");
        addCertificateNumber(doc, cert);
        doc.add(new Paragraph("\n"));
        Table t = new Table(1).setWidth(500);
        t.addCell(createContentCell(
            "This is to certify that " + cert.getCitizenName() + ", " +
            "son/daughter of " + cert.getCitizenAddress() + ", " +
            "is a resident of our jurisdiction and his/her annual income is within the prescribed limits.\n\n" +
            "Aadhaar Number: " + maskAadhaar(cert.getAadhaarNumber()) + "\n" +
            "Date of Issue: " + cert.getIssuedAt().format(formatter)));
        doc.add(t);
        addFooter(doc, cert);
    }

    // ── Residence Certificate ──────────────────────────────────────────────────

    private void buildResidenceCertificate(Document doc, Certificate cert) throws Exception {
        addHeader(doc, "RESIDENCE CERTIFICATE");
        addCertificateNumber(doc, cert);
        doc.add(new Paragraph("\n"));
        Table t = new Table(1).setWidth(500);
        t.addCell(createContentCell(
            "This is to certify that " + cert.getCitizenName() +
            " resides at " + cert.getCitizenAddress() + " for the last 12 months.\n\n" +
            "Aadhaar Number: " + maskAadhaar(cert.getAadhaarNumber()) + "\n" +
            "Period of Residence: 12 months\n" +
            "Date of Issue: " + cert.getIssuedAt().format(formatter)));
        doc.add(t);
        addFooter(doc, cert);
    }

    // ── Birth Certificate ──────────────────────────────────────────────────────

    private void buildBirthCertificate(Document doc, Certificate cert) throws Exception {
        addHeader(doc, "BIRTH CERTIFICATE");
        addCertificateNumber(doc, cert);
        doc.add(new Paragraph("\n"));
        Table t = new Table(1).setWidth(500);
        t.addCell(createContentCell(
            "This is to certify that " + cert.getCitizenName() +
            " was born and registered in our jurisdiction.\n\n" +
            "Aadhaar Number: " + maskAadhaar(cert.getAadhaarNumber()) + "\n" +
            "Address: " + cert.getCitizenAddress() + "\n" +
            "Date of Issue: " + cert.getIssuedAt().format(formatter)));
        doc.add(t);
        addFooter(doc, cert);
    }

    // ── Death Certificate ──────────────────────────────────────────────────────

    private void buildDeathCertificate(Document doc, Certificate cert) throws Exception {
        addHeader(doc, "DEATH CERTIFICATE");
        addCertificateNumber(doc, cert);
        doc.add(new Paragraph("\n"));
        Table t = new Table(1).setWidth(500);
        t.addCell(createContentCell(
            "This is to certify that " + cert.getCitizenName() +
            " has been registered as deceased in our jurisdiction.\n\n" +
            "Aadhaar Number: " + maskAadhaar(cert.getAadhaarNumber()) + "\n" +
            "Address: " + cert.getCitizenAddress() + "\n" +
            "Date of Issue: " + cert.getIssuedAt().format(formatter)));
        doc.add(t);
        addFooter(doc, cert);
    }

    // ── Marriage Certificate ───────────────────────────────────────────────────

    private void buildMarriageCertificate(Document doc, Certificate cert) throws Exception {
        addHeader(doc, "MARRIAGE CERTIFICATE");
        addCertificateNumber(doc, cert);
        doc.add(new Paragraph("\n"));
        Table t = new Table(1).setWidth(500);
        t.addCell(createContentCell(
            "This is to certify that " + cert.getCitizenName() +
            " has been registered as married in our jurisdiction " +
            "as per the provisions of the Marriage Registration Act.\n\n" +
            "Aadhaar Number: " + maskAadhaar(cert.getAadhaarNumber()) + "\n" +
            "Address: " + cert.getCitizenAddress() + "\n" +
            "Date of Issue: " + cert.getIssuedAt().format(formatter)));
        doc.add(t);
        addFooter(doc, cert);
    }

    // ── Trade License ──────────────────────────────────────────────────────────

    private void buildTradeLicenseCertificate(Document doc, Certificate cert) throws Exception {
        addHeader(doc, "TRADE LICENSE");
        addCertificateNumber(doc, cert);
        doc.add(new Paragraph("\n"));
        Table t = new Table(1).setWidth(500);
        t.addCell(createContentCell(
            "This is to certify that a Trade License has been issued to " + cert.getCitizenName() +
            " to conduct business at " + cert.getCitizenAddress() + ".\n\n" +
            "License Number: " + cert.getCertificateNumber() + "\n" +
            "Aadhaar Number: " + maskAadhaar(cert.getAadhaarNumber()) + "\n" +
            "Validity: 1 Year from Date of Issue\n" +
            "Date of Issue: " + cert.getIssuedAt().format(formatter)));
        doc.add(t);
        addFooter(doc, cert);
    }

    // ── Shop License ───────────────────────────────────────────────────────────

    private void buildShopLicenseCertificate(Document doc, Certificate cert) throws Exception {
        addHeader(doc, "SHOP LICENSE");
        addCertificateNumber(doc, cert);
        doc.add(new Paragraph("\n"));
        Table t = new Table(1).setWidth(500);
        t.addCell(createContentCell(
            "This is to certify that a Shop License has been issued to " + cert.getCitizenName() +
            " for the shop located at " + cert.getCitizenAddress() + ".\n\n" +
            "License Number: " + cert.getCertificateNumber() + "\n" +
            "Aadhaar Number: " + maskAadhaar(cert.getAadhaarNumber()) + "\n" +
            "Validity: 1 Year from Date of Issue\n" +
            "Date of Issue: " + cert.getIssuedAt().format(formatter)));
        doc.add(t);
        addFooter(doc, cert);
    }

    // ── Building Permit ────────────────────────────────────────────────────────

    private void buildBuildingPermitCertificate(Document doc, Certificate cert) throws Exception {
        addHeader(doc, "BUILDING PERMIT");
        addCertificateNumber(doc, cert);
        doc.add(new Paragraph("\n"));
        Table t = new Table(1).setWidth(500);
        t.addCell(createContentCell(
            "This is to certify that a Building Permit has been issued to " + cert.getCitizenName() +
            " for the property at " + cert.getCitizenAddress() + ".\n\n" +
            "Permit Number: " + cert.getCertificateNumber() + "\n" +
            "Aadhaar Number: " + maskAadhaar(cert.getAadhaarNumber()) + "\n" +
            "Validity: As per Municipal Regulations\n" +
            "Date of Issue: " + cert.getIssuedAt().format(formatter)));
        doc.add(t);
        addFooter(doc, cert);
    }

    // ── Water Connection ───────────────────────────────────────────────────────

    private void buildWaterConnectionCertificate(Document doc, Certificate cert) throws Exception {
        addHeader(doc, "WATER CONNECTION CERTIFICATE");
        addCertificateNumber(doc, cert);
        doc.add(new Paragraph("\n"));
        Table t = new Table(1).setWidth(500);
        t.addCell(createContentCell(
            "This is to certify that a Water Connection has been approved for " + cert.getCitizenName() +
            " at the property located at " + cert.getCitizenAddress() + ".\n\n" +
            "Connection Number: " + cert.getCertificateNumber() + "\n" +
            "Aadhaar Number: " + maskAadhaar(cert.getAadhaarNumber()) + "\n" +
            "Status: Active\n" +
            "Date of Issue: " + cert.getIssuedAt().format(formatter)));
        doc.add(t);
        addFooter(doc, cert);
    }

    // ── Generic Certificate ────────────────────────────────────────────────────

    private void buildGenericCertificate(Document doc, Certificate cert) throws Exception {
        addHeader(doc, "OFFICIAL CERTIFICATE");
        addCertificateNumber(doc, cert);
        doc.add(new Paragraph("\n"));
        Table t = new Table(1).setWidth(500);
        t.addCell(createContentCell(
            "This is to certify that " + cert.getCitizenName() +
            " has applied for and received this certificate.\n\n" +
            "Aadhaar Number: " + maskAadhaar(cert.getAadhaarNumber()) + "\n" +
            "Address: " + cert.getCitizenAddress() + "\n" +
            "Date of Issue: " + cert.getIssuedAt().format(formatter)));
        doc.add(t);
        addFooter(doc, cert);
    }

    // ── Common Helpers ─────────────────────────────────────────────────────────

    private void addHeader(Document doc, String title) throws Exception {
        Table headerTable = new Table(3).setWidth(550);

        Cell leftCell = new Cell().setBorder(Border.NO_BORDER)
                .add(new Paragraph("GOI").setFontSize(18))
                .setVerticalAlignment(VerticalAlignment.MIDDLE);
        headerTable.addCell(leftCell);

        PdfFont titleFont = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
        Cell centerCell = new Cell().setBorder(Border.NO_BORDER)
                .add(new Paragraph(title)
                        .setFont(titleFont)
                        .setFontSize(20)
                        .setTextAlignment(ALIGN_CENTER))
                .setVerticalAlignment(VerticalAlignment.MIDDLE);
        headerTable.addCell(centerCell);

        Cell rightCell = new Cell().setBorder(Border.NO_BORDER)
                .add(new Paragraph("SEAL").setFontSize(14))
                .setVerticalAlignment(VerticalAlignment.MIDDLE);
        headerTable.addCell(rightCell);

        doc.add(headerTable);
        doc.add(new Paragraph("Government of India")
                .setFontSize(10)
                .setTextAlignment(ALIGN_CENTER));
        doc.add(new Paragraph("\n"));
    }

    private void addCertificateNumber(Document doc, Certificate cert) throws Exception {
        PdfFont boldFont = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
        doc.add(new Paragraph("Certificate Number: " + cert.getCertificateNumber())
                .setFont(boldFont)
                .setFontSize(11)
                .setTextAlignment(ALIGN_CENTER));

        if (cert.getCertificateNumber() != null) {
            try {
                byte[] qrCode = generateQrCode(cert.getCertificateNumber());
                ImageData imageData = ImageDataFactory.create(qrCode);
                Image qrImage = new Image(imageData).setWidth(60).setHeight(60);
                doc.add(new Paragraph().add(qrImage).setTextAlignment(ALIGN_CENTER));
            } catch (Exception e) {
                log.warn("Failed to generate QR code: {}", e.getMessage());
            }
        }
    }

    private Cell createContentCell(String content) throws Exception {
        PdfFont contentFont = PdfFontFactory.createFont(StandardFonts.HELVETICA);
        return new Cell()
                .add(new Paragraph(content)
                        .setFont(contentFont)
                        .setFontSize(11)
                        .setMultipliedLeading(1.5f))
                .setBorder(Border.NO_BORDER)
                .setPadding(15);
    }

    private void addFooter(Document doc, Certificate cert) throws Exception {
        doc.add(new Paragraph("\n\n"));

        Table footerTable = new Table(2).setWidth(550);

        Cell signatureCell = new Cell().setBorder(Border.NO_BORDER)
                .add(new Paragraph("\n\n_________________\n").setTextAlignment(ALIGN_CENTER))
                .add(new Paragraph("Authorized Officer").setFontSize(9).setTextAlignment(ALIGN_CENTER));
        footerTable.addCell(signatureCell);

        Cell dateCell = new Cell().setBorder(Border.NO_BORDER)
                .add(new Paragraph("\n\n_________________\n").setTextAlignment(ALIGN_CENTER))
                .add(new Paragraph("Department Seal\n" + cert.getIssuedAt().format(formatter))
                        .setFontSize(9).setTextAlignment(ALIGN_CENTER));
        footerTable.addCell(dateCell);

        doc.add(footerTable);

        doc.add(new Paragraph(
                "\nThis certificate can be verified at " +
                "http://localhost:5173/verify-certificate?cert=" + cert.getCertificateNumber())
                .setFontSize(8)
                .setTextAlignment(ALIGN_CENTER)
                .setFontColor(ColorConstants.GRAY));
    }

    // ── QR Code Generator ──────────────────────────────────────────────────────

    private byte[] generateQrCode(String data) throws Exception {
        BitMatrix bitMatrix = new MultiFormatWriter().encode(
                data, BarcodeFormat.QR_CODE, 100, 100);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(bitMatrix, "PNG", baos);
        return baos.toByteArray();
    }

    // ── Utility ───────────────────────────────────────────────────────────────

    private String maskAadhaar(String aadhaar) {
        if (aadhaar == null || aadhaar.length() < 4) return "****";
        return "****-****-" + aadhaar.substring(aadhaar.length() - 4);
    }
}