import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { Response } from "express";
import { env } from "../config/env.js";

export async function generatePassportPdf(listing: any, res: Response) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title: `Passport - ${listing.breed} (${listing.id})`,
      Author: "DakshinAgriHub",
      Subject: "Southern India Digital Livestock Passport",
    },
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="passport_${listing.breed.toLowerCase().replace(/\s+/g, "_")}_${listing.id.slice(0, 8)}.pdf"`
  );

  doc.pipe(res);

  // Colors
  const primaryColor = "#0f5132"; // Deep green
  const accentColor = "#198754";
  const grayText = "#4b5563";
  const warningColor = "#b45309";

  // Watermark if not officially verified
  const isVerified = Boolean(listing.earTagVerified);
  if (!isVerified) {
    doc.save();
    doc.rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] });
    doc.fontSize(48);
    doc.fillColor("#fee2e2");
    doc.opacity(0.35);
    doc.text("SELF-DECLARED LISTING", 30, doc.page.height / 2, {
      align: "center",
      width: doc.page.width,
    });
    doc.restore();
  }

  // Header Banner
  doc.rect(40, 40, doc.page.width - 80, 70).fill(primaryColor);
  doc.fillColor("#ffffff");
  doc.fontSize(16).font("Helvetica-Bold").text("DAKSHIN AGRI HUB", 55, 52);
  doc.fontSize(11).font("Helvetica").text("SOUTHERN INDIA INTEGRATED AGRI-LIVESTOCK DIGITAL PASSPORT", 55, 72);
  doc.fontSize(9).fillColor("#d1e7dd").text("TN | AP | TG | KA | KL | PY | AN | LD", 55, 87);

  // Status Badge
  const badgeX = doc.page.width - 220;
  doc.rect(badgeX, 55, 160, 40).fill(isVerified ? "#15803d" : "#c2410c");
  doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold");
  doc.text(
    isVerified ? "OFFICIALLY VERIFIED" : "SELF-DECLARED",
    badgeX + 10,
    65,
    { width: 140, align: "center" }
  );
  doc.fontSize(7.5).font("Helvetica").text(
    isVerified ? "Ear-Tag & Health Confirmed" : "Pending On-Site Vet Tag",
    badgeX + 10,
    78,
    { width: 140, align: "center" }
  );

  // Identification Bar
  doc.moveDown(3);
  doc.y = 125;
  doc.rect(40, doc.y, doc.page.width - 80, 26).fill("#f1f5f9");
  doc.fillColor("#0f172a").fontSize(9).font("Helvetica-Bold");
  doc.text(`PASSPORT ID: DAH-LS-${listing.id.toUpperCase().slice(0, 12)}`, 50, doc.y + 8);
  doc.text(`ISSUED: ${new Date().toLocaleDateString("en-IN")}`, doc.page.width - 200, doc.y + 8);

  // Main Animal Profile Grid
  doc.y = 165;
  doc.fillColor(primaryColor).fontSize(14).font("Helvetica-Bold").text("1. Specimen & Lineage Details", 40, doc.y);
  doc.moveTo(40, doc.y + 18).lineTo(doc.page.width - 40, doc.y + 18).strokeColor("#cbd5e1").stroke();

  doc.y = 195;
  const col1 = 50;
  const col2 = 200;
  const col3 = 330;
  const col4 = 440;

  const row = (label1: string, val1: any, label2: string, val2: any) => {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(grayText).text(label1, col1, doc.y);
    doc.font("Helvetica").fontSize(10).fillColor("#0f172a").text(String(val1 || "N/A"), col2, doc.y);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(grayText).text(label2, col3, doc.y);
    doc.font("Helvetica").fontSize(10).fillColor("#0f172a").text(String(val2 || "N/A"), col4, doc.y);
    doc.moveDown(0.9);
  };

  row("Category:", listing.category, "Breed:", listing.breed);
  row("Age:", `${listing.ageMonths} Months`, "Status:", listing.status);
  row("Ear Tag / ID:", listing.earTagId || "Not Tagged", "Weight:", listing.estimatedWeight ? `${listing.estimatedWeight} kg` : "Estimated");
  row("Milk Yield:", listing.dailyYield ? `${listing.dailyYield} Litres / Day` : "N/A", "Lactation No:", listing.lactation ? `Lactation ${listing.lactation}` : "N/A");
  row("Location:", `${listing.district}, ${listing.stateId}`, "Pregnancy:", listing.pregnancyStatus || "N/A");
  row("Price (INR):", `Rs. ${listing.price.toLocaleString("en-IN")}`, "Diet:", listing.diet || "Standard Fodder");

  // Seller Section
  doc.moveDown(1.5);
  doc.fillColor(primaryColor).fontSize(14).font("Helvetica-Bold").text("2. Origin & Ownership", 40, doc.y);
  doc.moveTo(40, doc.y + 18).lineTo(doc.page.width - 40, doc.y + 18).strokeColor("#cbd5e1").stroke();

  doc.y = doc.y + 25;
  const sellerName = listing.seller?.sellerProfile?.displayName || listing.seller?.name || "Registered Farmer";
  const sellerKyc = listing.seller?.sellerProfile?.status === "APPROVED" ? "KYC Verified" : "Basic Registration";
  row("Owner / Breeder:", sellerName, "KYC Status:", sellerKyc);
  row("Farm / Taluk:", listing.district, "Listed Since:", new Date(listing.createdAt).toLocaleDateString("en-IN"));

  // Vaccinations Section
  doc.moveDown(1.5);
  doc.fillColor(primaryColor).fontSize(14).font("Helvetica-Bold").text("3. Veterinary & Vaccination Schedule", 40, doc.y);
  doc.moveTo(40, doc.y + 18).lineTo(doc.page.width - 40, doc.y + 18).strokeColor("#cbd5e1").stroke();

  doc.y = doc.y + 25;

  const vaccinations = listing.vaccinations || [];
  if (vaccinations.length === 0) {
    doc.font("Helvetica-Oblique").fontSize(9).fillColor(warningColor).text(
      "No historical vaccination records logged on portal. Buyer inspection recommended prior to escrow release.",
      50,
      doc.y
    );
    doc.moveDown(1);
  } else {
    // Table Header
    doc.rect(40, doc.y, doc.page.width - 80, 20).fill("#e2e8f0");
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#1e293b");
    doc.text("VACCINE NAME", 50, doc.y + 5);
    doc.text("DATE GIVEN", 240, doc.y + 5);
    doc.text("CERTIFIED BY", 380, doc.y + 5);
    doc.moveDown(1.2);

    for (const v of vaccinations) {
      doc.rect(40, doc.y, doc.page.width - 80, 18).fill("#f8fafc");
      doc.font("Helvetica").fontSize(8).fillColor("#0f172a");
      doc.text(v.name, 50, doc.y + 4);
      doc.text(v.date, 240, doc.y + 4);
      doc.text(v.certifiedBy || "Govt Vet Dispensary", 380, doc.y + 4);
      doc.moveDown(1.1);
    }
  }

  // QR Code & Verification Block
  const qrUrl = `${env.WEB_ORIGIN}/#/bazaar?id=${listing.id}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 100 });
  const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

  const bottomY = doc.page.height - 150;
  doc.rect(40, bottomY, doc.page.width - 80, 100).fill("#f8fafc").strokeColor("#cbd5e1").stroke();

  doc.image(qrBuffer, 50, bottomY + 10, { width: 80, height: 80 });

  doc.font("Helvetica-Bold").fontSize(9).fillColor(primaryColor).text("SCAN TO VERIFY AUTHENTICITY ON-CHAIN", 145, bottomY + 18);
  doc.font("Helvetica").fontSize(7.5).fillColor(grayText).text(
    `Live Link: ${qrUrl}\nThis digital passport is cryptographically signed and stored in DakshinAgriHub registry.\nAll physical transfers must update ear-tag ownership in compliance with Prevention of Cruelty to Animals (Care and Maintenance of Case Property Animals) Rules.`,
    145,
    bottomY + 34,
    { width: 380, lineGap: 2 }
  );

  // Footer
  doc.fontSize(7).fillColor("#94a3b8").text(
    `DakshinAgriHub Escrow & Digital Passport Service | 24x7 Helpline: ${env.HELPLINE_NUMBER} | Document Ref: ${listing.id}`,
    40,
    doc.page.height - 30,
    { align: "center", width: doc.page.width - 80 }
  );

  doc.end();
}
