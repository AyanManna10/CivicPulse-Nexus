package com.civicpulse.certificateservice.util;

import com.civicpulse.certificateservice.entity.Certificate;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.Color;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Div;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.format.DateTimeFormatter;

@Service
public class CertificatePdfGenerator {

    private static final Logger log = LoggerFactory.getLogger(CertificatePdfGenerator.class);

    // ── Colors ─────────────────────────────────────────────────────────────────
    private static final Color NAVY       = new DeviceRgb(0,  32,  96);
    private static final Color GOLD       = new DeviceRgb(184,134,  11);
    private static final Color LIGHT_BLUE = new DeviceRgb(235,240,255);
    private static final Color LIGHT_GRAY = new DeviceRgb(248,248,248);
    private static final Color GRAY       = new DeviceRgb(100,100,100);

    // ── Alignment shortcuts ────────────────────────────────────────────────────
    private static final TextAlignment     C = TextAlignment.CENTER;
    @SuppressWarnings("unused")
    private static final TextAlignment     L = TextAlignment.LEFT;
    private static final TextAlignment     R = TextAlignment.RIGHT;
    private static final TextAlignment     J = TextAlignment.JUSTIFIED;
    private static final VerticalAlignment M = VerticalAlignment.MIDDLE;

    @Value("${certificate.pdf.output-path:C:/Project/uploads/certificates}")
    private String outputPath;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd MMMM yyyy");

    // ══════════════════════════════════════════════════════════════════════════
    // PUBLIC ENTRY POINT
    // ══════════════════════════════════════════════════════════════════════════

    public byte[] generateCertificatePdf(Certificate cert) throws Exception {
        log.info("Generating PDF for certificate: {}", cert.getCertificateNumber());
        new File(outputPath).mkdirs();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfDocument pdfDoc = new PdfDocument(new PdfWriter(baos));
        pdfDoc.setDefaultPageSize(PageSize.A4);
        Document doc = new Document(pdfDoc);
        doc.setMargins(70, 55, 70, 55);

        // Draw border BEFORE adding content
        PdfPage page = pdfDoc.addNewPage();
        drawPageBorder(page);

        switch (cert.getCertificateType()) {
            case INCOME:           buildIncomeCert(doc, cert);          break;
            case RESIDENCE:        buildResidenceCert(doc, cert);       break;
            case BIRTH:            buildBirthCert(doc, cert);           break;
            case DEATH:            buildDeathCert(doc, cert);           break;
            case MARRIAGE:         buildMarriageCert(doc, cert);        break;
            case TRADE_LICENSE:    buildTradeLicense(doc, cert);        break;
            case SHOP_LICENSE:     buildShopLicense(doc, cert);         break;
            case BUILDING_PERMIT:  buildBuildingPermit(doc, cert);      break;
            case WATER_CONNECTION: buildWaterConnection(doc, cert);     break;
            default:               buildGenericCert(doc, cert);
        }

        doc.close();
        byte[] pdf = baos.toByteArray();
        Files.write(Paths.get(outputPath, cert.getCertificateNumber() + ".pdf"), pdf);
        log.info("Saved: {}.pdf", cert.getCertificateNumber());
        return pdf;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE BORDER
    // ══════════════════════════════════════════════════════════════════════════

    private void drawPageBorder(PdfPage page) {
        PdfCanvas cv = new PdfCanvas(page);
        float w = page.getPageSize().getWidth();
        float h = page.getPageSize().getHeight();

        // Outer thick navy border
        cv.setStrokeColor(NAVY).setLineWidth(5)
          .rectangle(18, 18, w - 36, h - 36).stroke();

        // Inner thin gold border
        cv.setStrokeColor(GOLD).setLineWidth(1.5f)
          .rectangle(25, 25, w - 50, h - 50).stroke();

        // Corner squares (navy filled)
        float s = 8;
        cv.setFillColor(NAVY);
        cv.rectangle(18, 18, s, s).fill();
        cv.rectangle(w - 18 - s, 18, s, s).fill();
        cv.rectangle(18, h - 18 - s, s, s).fill();
        cv.rectangle(w - 18 - s, h - 18 - s, s, s).fill();

        cv.release();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SHARED HEADER
    // ══════════════════════════════════════════════════════════════════════════

    private void addGovHeader(Document doc, String ministry, String office,
                              String certTitle, Certificate cert) throws Exception {
        PdfFont bold  = font(StandardFonts.TIMES_BOLD);
        PdfFont roman = font(StandardFonts.TIMES_ROMAN);
        PdfFont helvB = font(StandardFonts.HELVETICA_BOLD);
        PdfFont helv  = font(StandardFonts.HELVETICA);

        // === Row 1: Emblem + Ministry + Emblem ===
        Table topRow = new Table(UnitValue.createPercentArray(new float[]{20, 60, 20}))
                .setWidth(UnitValue.createPercentValue(100))
                .setMarginBottom(4);

        // Left emblem box
        topRow.addCell(emblemCell("INDIA", bold));

        // Center: ministry stack
        Cell center = new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(M);
        center.add(new Paragraph("GOVERNMENT OF INDIA")
                .setFont(bold).setFontSize(13).setFontColor(NAVY).setTextAlignment(C).setMarginBottom(1));
        center.add(new Paragraph(ministry)
                .setFont(roman).setFontSize(10).setFontColor(NAVY).setTextAlignment(C).setMarginBottom(1));
        center.add(new Paragraph(office)
                .setFont(roman).setFontSize(9).setFontColor(GRAY).setTextAlignment(C));
        topRow.addCell(center);

        // Right emblem box
        topRow.addCell(emblemCell("GOI", bold));

        doc.add(topRow);

        // === Double divider ===
        addDoubleDivider(doc);

        // === Certificate title banner ===
        Div banner = new Div().setBackgroundColor(NAVY)
                .setPaddingTop(8).setPaddingBottom(8).setMarginTop(5).setMarginBottom(5);
        banner.add(new Paragraph(certTitle)
                .setFont(bold).setFontSize(17).setFontColor(ColorConstants.WHITE)
                .setTextAlignment(C).setMarginBottom(0));
        doc.add(banner);

        // === Cert No + Date row ===
        Table metaRow = new Table(UnitValue.createPercentArray(new float[]{1, 1}))
                .setWidth(UnitValue.createPercentValue(100)).setMarginTop(4);
        metaRow.addCell(new Cell().setBorder(Border.NO_BORDER)
                .add(new Paragraph("Certificate No.:  " + cert.getCertificateNumber())
                        .setFont(helvB).setFontSize(9).setFontColor(NAVY)));
        metaRow.addCell(new Cell().setBorder(Border.NO_BORDER)
                .add(new Paragraph("Date of Issue:  " + cert.getIssuedAt().format(FMT))
                        .setFont(helv).setFontSize(9).setTextAlignment(R).setFontColor(NAVY)));
        doc.add(metaRow);

        addDoubleDivider(doc);
        doc.add(spacer(6));
    }

    private Cell emblemCell(String label, PdfFont bold) {
        Cell c = new Cell().setBorder(Border.NO_BORDER)
                .setVerticalAlignment(M)
                .setPadding(4);
        Div box = new Div().setBackgroundColor(LIGHT_BLUE)
                .setBorder(new SolidBorder(NAVY, 1))
                .setPadding(6);
        box.add(new Paragraph(label).setFont(bold).setFontSize(10)
                .setFontColor(NAVY).setTextAlignment(C).setMarginBottom(0));
        box.add(new Paragraph("SEAL").setFont(bold).setFontSize(7)
                .setFontColor(GOLD).setTextAlignment(C).setMarginBottom(0));
        c.add(box);
        return c;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SHARED INFO TABLE
    // ══════════════════════════════════════════════════════════════════════════

    private Table infoTable(String[][] rows) throws Exception {
        PdfFont bold  = font(StandardFonts.HELVETICA_BOLD);
        PdfFont helv  = font(StandardFonts.HELVETICA);
        Table t = new Table(UnitValue.createPercentArray(new float[]{38, 62}))
                .setWidth(UnitValue.createPercentValue(100))
                .setMarginBottom(14);
        for (int i = 0; i < rows.length; i++) {
            Color bg = (i % 2 == 0) ? LIGHT_BLUE : LIGHT_GRAY;
            t.addCell(new Cell().setBackgroundColor(bg)
                    .setBorderRight(new SolidBorder(NAVY, 0.5f))
                    .setBorderBottom(new SolidBorder(GOLD, 0.3f))
                    .setBorderTop(Border.NO_BORDER).setBorderLeft(Border.NO_BORDER)
                    .setPaddingLeft(8).setPaddingTop(5).setPaddingBottom(5)
                    .add(new Paragraph(rows[i][0]).setFont(bold).setFontSize(9.5f).setFontColor(NAVY)));
            t.addCell(new Cell().setBackgroundColor(ColorConstants.WHITE)
                    .setBorderBottom(new SolidBorder(GOLD, 0.3f))
                    .setBorderTop(Border.NO_BORDER).setBorderLeft(Border.NO_BORDER).setBorderRight(Border.NO_BORDER)
                    .setPaddingLeft(8).setPaddingTop(5).setPaddingBottom(5)
                    .add(new Paragraph(rows[i][1]).setFont(helv).setFontSize(9.5f)));
        }
        return t;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // BODY PARAGRAPH
    // ══════════════════════════════════════════════════════════════════════════

    private Paragraph body(String text) throws Exception {
        return new Paragraph(text)
                .setFont(font(StandardFonts.TIMES_ROMAN)).setFontSize(11.5f)
                .setTextAlignment(J).setMultipliedLeading(1.7f).setMarginBottom(10);
    }

    private Paragraph conditions(String text) throws Exception {
        PdfFont bold  = font(StandardFonts.TIMES_BOLD);
        PdfFont roman = font(StandardFonts.TIMES_ROMAN);
        Paragraph p = new Paragraph().setMultipliedLeading(1.5f).setMarginTop(4);
        p.add(new Text("CONDITIONS:  ").setFont(bold).setFontSize(10).setFontColor(NAVY));
        p.add(new Text(text).setFont(roman).setFontSize(10));
        return p;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FOOTER: QR + SEAL + SIGNATURE
    // ══════════════════════════════════════════════════════════════════════════

    private void addFooter(Document doc, Certificate cert,
                           String officerTitle, String sealText) throws Exception {
        PdfFont bold  = font(StandardFonts.TIMES_BOLD);
        PdfFont roman = font(StandardFonts.TIMES_ROMAN);
        PdfFont helv  = font(StandardFonts.HELVETICA);

        doc.add(spacer(8));
        addDoubleDivider(doc);
        doc.add(spacer(8));

        Table footer = new Table(UnitValue.createPercentArray(new float[]{28, 44, 28}))
                .setWidth(UnitValue.createPercentValue(100));

        // ── QR code cell ──────────────────────────────────────────────────────
        Cell qrCell = new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(M);
        try {
            String qrData = "CIVICPULSE|CERT:" + cert.getCertificateNumber()
                    + "|NAME:" + cert.getCitizenName() + "|ISSUED:" + cert.getIssuedAt().format(FMT);
            byte[] qrBytes = qrCode(qrData);
            Image qr = new Image(ImageDataFactory.create(qrBytes)).setWidth(70).setHeight(70);
            qrCell.add(qr);
        } catch (Exception e) {
            qrCell.add(new Paragraph("[QR]").setFont(helv).setFontSize(8));
        }
        qrCell.add(new Paragraph("Scan to Verify").setFont(helv).setFontSize(7)
                .setFontColor(GRAY).setTextAlignment(C));
        footer.addCell(qrCell);

        // ── Seal cell ─────────────────────────────────────────────────────────
        Cell sealCell = new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(M);
        Div sealBox = new Div().setBackgroundColor(LIGHT_BLUE)
                .setBorder(new SolidBorder(NAVY, 1.5f))
                .setPadding(10).setMarginLeft(10).setMarginRight(10);
        sealBox.add(new Paragraph(sealText).setFont(bold).setFontSize(8.5f)
                .setFontColor(NAVY).setTextAlignment(C).setMarginBottom(2));
        sealBox.add(new Paragraph("GOVERNMENT OF INDIA").setFont(bold).setFontSize(7)
                .setFontColor(GOLD).setTextAlignment(C));
        sealCell.add(sealBox);
        footer.addCell(sealCell);

        // ── Signature cell ────────────────────────────────────────────────────
        Cell sigCell = new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(M);
        sigCell.add(new Paragraph("\n").setFont(roman).setFontSize(10));
        sigCell.add(new Paragraph("_________________________")
                .setFont(roman).setFontSize(10).setTextAlignment(C));
        sigCell.add(new Paragraph(officerTitle)
                .setFont(bold).setFontSize(9).setFontColor(NAVY).setTextAlignment(C));
        if (cert.getDecidedBy() != null && !cert.getDecidedBy().isBlank()) {
            sigCell.add(new Paragraph("(" + cert.getDecidedBy() + ")")
                    .setFont(roman).setFontSize(8).setFontColor(GRAY).setTextAlignment(C));
        }
        footer.addCell(sigCell);

        doc.add(footer);

        // Verification line
        doc.add(new Paragraph(
                "This is a computer-generated certificate. Verify authenticity at: " +
                "civicpulse.gov.in/verify?cert=" + cert.getCertificateNumber())
                .setFont(helv).setFontSize(7).setFontColor(GRAY)
                .setTextAlignment(C).setMarginTop(8));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CERTIFICATE BUILDERS
    // ══════════════════════════════════════════════════════════════════════════

    private void buildIncomeCert(Document doc, Certificate cert) throws Exception {
        addGovHeader(doc, "Ministry of Finance — Revenue Division",
                "Office of the Tehsildar / Revenue Officer", "INCOME CERTIFICATE", cert);

        doc.add(body("This is to certify that Shri/Smt./Km. " + cert.getCitizenName()
                + ", residing at the address stated herein, is known to this office and has been "
                + "verified to belong to a family whose total annual income from all sources does "
                + "not exceed the limit prescribed under the relevant government scheme/notification."));

        doc.add(infoTable(new String[][]{
                {"Full Name",         cert.getCitizenName()},
                {"Residential Address", cert.getCitizenAddress()},
                {"Aadhaar No.",       maskAadhaar(cert.getAadhaarNumber())},
                {"Income Category",   "Below Prescribed Limit (BPL/EWS)"},
                {"Purpose",           "As required by the applicant"},
                {"Valid Until",       cert.getIssuedAt().plusYears(1).format(FMT)},
        }));

        doc.add(body("This certificate is issued on the basis of the application and documents "
                + "submitted by the applicant and the field enquiry conducted by the concerned "
                + "authority. Any misrepresentation of facts shall render this certificate null "
                + "and void, and the holder shall be liable for action under applicable laws."));

        addFooter(doc, cert, "Tehsildar / Revenue Officer", "OFFICE SEAL\nRevenue Department");
    }

    private void buildResidenceCert(Document doc, Certificate cert) throws Exception {
        addGovHeader(doc, "Ministry of Home Affairs — Local Administration",
                "Office of the Municipal Commissioner", "RESIDENCE / DOMICILE CERTIFICATE", cert);

        doc.add(body("This is to certify that Shri/Smt./Km. " + cert.getCitizenName()
                + " is a permanent resident of the address stated herein and has been "
                + "continuously residing thereat for a period of not less than 12 (twelve) "
                + "months preceding the date of issue of this certificate, as verified by "
                + "this office through available records and field enquiry."));

        doc.add(infoTable(new String[][]{
                {"Full Name",             cert.getCitizenName()},
                {"Permanent Address",     cert.getCitizenAddress()},
                {"Aadhaar No.",           maskAadhaar(cert.getAadhaarNumber())},
                {"Duration of Residence", "More than 12 (twelve) months"},
                {"Purpose",               "As required by the applicant"},
                {"Valid Until",           cert.getIssuedAt().plusYears(1).format(FMT)},
        }));

        doc.add(body("This certificate is issued in good faith on the basis of records available "
                + "with this office. The applicant is personally responsible for the accuracy of "
                + "the information furnished. Any false declaration is punishable under relevant "
                + "provisions of the Indian Penal Code."));

        addFooter(doc, cert, "Municipal Commissioner", "OFFICE SEAL\nMunicipal Administration");
    }

    private void buildBirthCert(Document doc, Certificate cert) throws Exception {
        addGovHeader(doc, "Ministry of Health and Family Welfare",
                "Office of the Registrar of Births and Deaths", "BIRTH CERTIFICATE", cert);

        doc.add(body("This is to certify that the birth of " + cert.getCitizenName()
                + " has been duly registered in the Birth Register maintained by this office "
                + "under the Registration of Births and Deaths Act, 1969 (Central Act 18 of 1969). "
                + "This certificate constitutes official proof of birth as recorded by the Registrar."));

        doc.add(infoTable(new String[][]{
                {"Name of Child",          cert.getCitizenName()},
                {"Address",                cert.getCitizenAddress()},
                {"Aadhaar No.",            maskAadhaar(cert.getAadhaarNumber())},
                {"Registration No.",       cert.getCertificateNumber()},
                {"Date of Registration",   cert.getIssuedAt().format(FMT)},
                {"Registering Authority",  "Registrar of Births and Deaths"},
                {"Issuing Authority",      "Municipal Corporation Health Department"},
        }));

        doc.add(body("This certificate is issued under the Registration of Births and Deaths Act, "
                + "1969, and shall be accepted as legal proof of birth by all government authorities, "
                + "educational institutions, financial institutions, courts of law, and other bodies."));

        addFooter(doc, cert, "Registrar of Births and Deaths", "OFFICE SEAL\nHealth Department");
    }

    private void buildDeathCert(Document doc, Certificate cert) throws Exception {
        addGovHeader(doc, "Ministry of Health and Family Welfare",
                "Office of the Registrar of Births and Deaths", "DEATH CERTIFICATE", cert);

        doc.add(body("This is to certify that the death of " + cert.getCitizenName()
                + " has been duly registered in the Death Register maintained by this office "
                + "under the Registration of Births and Deaths Act, 1969 (Central Act 18 of 1969). "
                + "This certificate constitutes official proof of death as recorded by the Registrar."));

        doc.add(infoTable(new String[][]{
                {"Name of Deceased",      cert.getCitizenName()},
                {"Last Known Address",    cert.getCitizenAddress()},
                {"Aadhaar No.",           maskAadhaar(cert.getAadhaarNumber())},
                {"Registration No.",      cert.getCertificateNumber()},
                {"Date of Registration",  cert.getIssuedAt().format(FMT)},
                {"Registering Authority", "Registrar of Births and Deaths"},
                {"Issuing Authority",     "Municipal Corporation Health Department"},
        }));

        doc.add(body("This certificate is issued under the Registration of Births and Deaths Act, "
                + "1969, and shall be treated as conclusive proof of death for all legal, "
                + "administrative, pension, insurance, and financial purposes by all concerned authorities."));

        addFooter(doc, cert, "Registrar of Births and Deaths", "OFFICE SEAL\nHealth Department");
    }

    private void buildMarriageCert(Document doc, Certificate cert) throws Exception {
        addGovHeader(doc, "Ministry of Law and Justice",
                "Office of the Sub-Registrar of Marriages", "MARRIAGE CERTIFICATE", cert);

        doc.add(body("This is to certify that the marriage of " + cert.getCitizenName()
                + " has been duly solemnized and registered under the Special Marriage Act, 1954 "
                + "/ Hindu Marriage Act, 1955 (as applicable), and has been entered in the Marriage "
                + "Register maintained by this office in accordance with prescribed procedures."));

        doc.add(infoTable(new String[][]{
                {"Name",                  cert.getCitizenName()},
                {"Address",               cert.getCitizenAddress()},
                {"Aadhaar No.",           maskAadhaar(cert.getAadhaarNumber())},
                {"Registration No.",      cert.getCertificateNumber()},
                {"Date of Registration",  cert.getIssuedAt().format(FMT)},
                {"Registering Office",    "Sub-Registrar of Marriages"},
                {"Act under which Registered", "Special Marriage Act, 1954"},
        }));

        doc.add(body("This certificate constitutes conclusive evidence of the fact of marriage "
                + "and shall be recognized by all government departments, financial institutions, "
                + "courts of law, embassies, and consular offices as proof of matrimony."));

        addFooter(doc, cert, "Sub-Registrar of Marriages", "OFFICE SEAL\nMunicipal Administration");
    }

    private void buildTradeLicense(Document doc, Certificate cert) throws Exception {
        addGovHeader(doc, "Ministry of Commerce and Industry",
                "Office of the Municipal Corporation — Trade Licensing Division", "TRADE LICENSE", cert);

        doc.add(body("This Trade License is hereby granted to " + cert.getCitizenName()
                + " authorizing the conduct of trade and business at the premises specified herein, "
                + "subject to the conditions stated below and in full compliance with the Municipal "
                + "Corporation Trade License Act, the Shops and Establishments Act, and all other "
                + "applicable laws and regulations in force."));

        doc.add(infoTable(new String[][]{
                {"License Holder",     cert.getCitizenName()},
                {"Business Address",   cert.getCitizenAddress()},
                {"Aadhaar No.",        maskAadhaar(cert.getAadhaarNumber())},
                {"License Number",     cert.getCertificateNumber()},
                {"Date of Issue",      cert.getIssuedAt().format(FMT)},
                {"Valid Until",        cert.getIssuedAt().plusYears(1).format(FMT)},
                {"License Category",   "General Trade / Retail Business"},
                {"Renewal Due By",     cert.getIssuedAt().plusYears(1).minusDays(30).format(FMT)},
        }));

        doc.add(conditions("(1) This license is non-transferable and non-assignable. "
                + "(2) The licensee shall comply with all fire safety, public health, and sanitation regulations. "
                + "(3) This license must be displayed prominently at the premises at all times. "
                + "(4) Renewal must be completed at least 30 days prior to expiry to avoid late fees. "
                + "(5) Any change in nature of business, ownership, or premises must be intimated "
                + "to this office within 30 days of such change."));

        addFooter(doc, cert, "Municipal Commissioner — Trade Division", "OFFICE SEAL\nMunicipal Administration");
    }

    private void buildShopLicense(Document doc, Certificate cert) throws Exception {
        addGovHeader(doc, "Ministry of Labour and Employment",
                "Office of the Inspector — Shops and Establishments", "SHOP AND ESTABLISHMENT LICENSE", cert);

        doc.add(body("This is to certify that the shop/establishment owned/operated by "
                + cert.getCitizenName() + " at the address stated herein has been duly "
                + "registered under the Shops and Commercial Establishments Act and is hereby "
                + "licensed to operate in accordance with the provisions of the said Act."));

        doc.add(infoTable(new String[][]{
                {"Proprietor/Manager",    cert.getCitizenName()},
                {"Establishment Address", cert.getCitizenAddress()},
                {"Aadhaar No.",           maskAadhaar(cert.getAadhaarNumber())},
                {"Registration Number",   cert.getCertificateNumber()},
                {"Date of Registration",  cert.getIssuedAt().format(FMT)},
                {"Valid Until",           cert.getIssuedAt().plusYears(1).format(FMT)},
                {"Category",              "Retail Shop / Commercial Establishment"},
                {"No. of Employees",      "As declared in application"},
        }));

        doc.add(conditions("This license is subject to compliance with the Shops and Commercial "
                + "Establishments Act including provisions relating to working hours, wages, "
                + "leave, and safety of employees. The licensee must display this certificate "
                + "conspicuously at the premises. Failure to renew within 30 days of expiry "
                + "will attract penalties as prescribed under the Act."));

        addFooter(doc, cert, "Inspector of Shops and Establishments", "OFFICE SEAL\nMunicipal Administration");
    }

    private void buildBuildingPermit(Document doc, Certificate cert) throws Exception {
        addGovHeader(doc, "Ministry of Urban Development and Housing",
                "Town Planning and Engineering Department", "BUILDING CONSTRUCTION PERMIT", cert);

        doc.add(body("Permission is hereby granted to " + cert.getCitizenName()
                + " for construction/renovation/extension of the building/structure at the site "
                + "described herein, subject to strict compliance with the approved building plan, "
                + "National Building Code of India (NBC), all applicable municipal bye-laws, "
                + "zoning regulations, structural safety norms, and fire safety requirements."));

        doc.add(infoTable(new String[][]{
                {"Permit Holder",    cert.getCitizenName()},
                {"Site Address",     cert.getCitizenAddress()},
                {"Aadhaar No.",      maskAadhaar(cert.getAadhaarNumber())},
                {"Permit Number",    cert.getCertificateNumber()},
                {"Date of Issue",    cert.getIssuedAt().format(FMT)},
                {"Valid Until",      cert.getIssuedAt().plusYears(2).format(FMT)},
                {"Permitted Use",    "Residential / Commercial (as per approved plan)"},
                {"Issuing Authority","Chief Town Planner, Engineering Department"},
        }));

        doc.add(conditions("(1) Construction must commence within 6 months from date of issue of this permit. "
                + "(2) A Completion Certificate must be obtained upon completion of construction before "
                + "occupancy. (3) Any deviation from the sanctioned plan requires prior written approval "
                + "from this office. (4) The permit holder is solely responsible for structural safety and "
                + "compliance with NBC. (5) This permit shall stand cancelled if any material misrepresentation "
                + "is discovered."));

        addFooter(doc, cert, "Chief Town Planner / City Engineer", "OFFICE SEAL\nEngineering Department");
    }

    private void buildWaterConnection(Document doc, Certificate cert) throws Exception {
        addGovHeader(doc, "Ministry of Jal Shakti — National Water Mission",
                "Municipal Water Supply and Sewerage Department", "WATER CONNECTION CERTIFICATE", cert);

        doc.add(body("This is to certify that a new municipal water supply connection has been "
                + "sanctioned and provided to the premises of " + cert.getCitizenName()
                + " at the address stated herein, in accordance with the Municipal Water Supply "
                + "and Sewerage Act and the approved application submitted to this department."));

        doc.add(infoTable(new String[][]{
                {"Consumer Name",     cert.getCitizenName()},
                {"Property Address",  cert.getCitizenAddress()},
                {"Aadhaar No.",       maskAadhaar(cert.getAadhaarNumber())},
                {"Connection No.",    cert.getCertificateNumber()},
                {"Date of Issue",     cert.getIssuedAt().format(FMT)},
                {"Connection Type",   "Domestic Potable Water Supply"},
                {"Meter No.",         "MET-" + cert.getCertificateNumber().replace("WC-", "")},
                {"Status",            "Active"},
        }));

        doc.add(conditions("(1) Water shall be used only for the domestic purpose as stated. "
                + "(2) Water shall not be wasted, misused, or supplied to an unauthorized party. "
                + "(3) The consumer shall pay water tariff as per the prevailing Municipal schedule "
                + "of charges by the due date each month. (4) Leakage in the internal distribution "
                + "system shall be rectified by the consumer at their own cost within 7 days of "
                + "notice. (5) This connection may be terminated in case of non-payment of dues "
                + "or repeated violation of conditions."));

        addFooter(doc, cert, "Executive Engineer — Water Supply", "OFFICE SEAL\nWater Department");
    }

    private void buildGenericCert(Document doc, Certificate cert) throws Exception {
        addGovHeader(doc, "Government of India — Municipal Services",
                "Office of the Municipal Commissioner", "OFFICIAL CERTIFICATE", cert);

        doc.add(body("This is to certify that " + cert.getCitizenName()
                + " residing at " + cert.getCitizenAddress()
                + " has applied for and fulfilled the requisite conditions for issuance "
                + "of this certificate by this office. This certificate is valid for the "
                + "purpose stated in the application."));

        doc.add(infoTable(new String[][]{
                {"Full Name",       cert.getCitizenName()},
                {"Address",         cert.getCitizenAddress()},
                {"Aadhaar No.",     maskAadhaar(cert.getAadhaarNumber())},
                {"Certificate No.", cert.getCertificateNumber()},
                {"Date of Issue",   cert.getIssuedAt().format(FMT)},
        }));

        addFooter(doc, cert, "Authorized Signatory", "OFFICE SEAL\nMunicipal Administration");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // UTILITIES
    // ══════════════════════════════════════════════════════════════════════════

    private void addDoubleDivider(Document doc) throws Exception {
        Table t1 = new Table(1).setWidth(UnitValue.createPercentValue(100)).setMarginBottom(1);
        t1.addCell(new Cell().setHeight(2.5f).setBackgroundColor(NAVY).setBorder(Border.NO_BORDER));
        doc.add(t1);
        Table t2 = new Table(1).setWidth(UnitValue.createPercentValue(100)).setMarginTop(1).setMarginBottom(3);
        t2.addCell(new Cell().setHeight(1).setBackgroundColor(GOLD).setBorder(Border.NO_BORDER));
        doc.add(t2);
    }

    private Paragraph spacer(float size) {
        return new Paragraph(" ").setFontSize(size).setMarginBottom(0).setMarginTop(0);
    }

    private PdfFont font(String name) throws Exception {
        return PdfFontFactory.createFont(name);
    }

    private byte[] qrCode(String data) throws Exception {
        BitMatrix matrix = new MultiFormatWriter().encode(data, BarcodeFormat.QR_CODE, 120, 120);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(matrix, "PNG", baos);
        return baos.toByteArray();
    }

    private String maskAadhaar(String a) {
        if (a == null || a.length() < 4) return "XXXX-XXXX-****";
        return "XXXX-XXXX-" + a.substring(a.length() - 4);
    }
}