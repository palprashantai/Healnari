import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as path from 'path';
import * as fs from 'fs';
const SVGtoPDF = require('svg-to-pdfkit');

import { SupabaseService } from '@/core/supabase/supabase.service';

export interface InvoiceData {
  id: string;
  txn_ref?: string | null;
  service: string;
  category?: string | null;
  amount: number | string;
  currency?: string | null;
  method?: string | null;
  status: string;
  created_at: string;
  patientName?: string | null;
  doctorName?: string | null;
}

/** Renders a `payments` row into a one-page PDF invoice. Pure PDFKit (no
 * headless-browser dependency) — cheap enough to generate on every request
 * instead of caching a rendered copy. */
@Injectable()
export class InvoiceService {
  constructor(private readonly supabase: SupabaseService) {}

  async generatePdf(payment: InvoiceData): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    );

    let invoiceNoNumber = 1;
    try {
      const { count } = await this.supabase.admin
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .lte('created_at', payment.created_at);
      invoiceNoNumber = count || 1;
    } catch (e) {
      console.error('Failed to get invoice count:', e);
    }
    const invoiceNo = `HEAL-${String(invoiceNoNumber).padStart(5, '0')}`;
    const date = new Date(payment.created_at);
    const amount = Number(payment.amount).toFixed(2);
    const curr = payment.currency || 'USD';
    const isPaid = payment.status === 'Paid';

    // --- Modern Medical Invoice Design ---
    doc.rect(0, 0, 595, 140).fill('#f8fafc'); // Soft top banner
    doc
      .moveTo(0, 140)
      .lineTo(595, 140)
      .strokeColor('#6B46C1')
      .lineWidth(4)
      .stroke(); // Purple Accent

    // --- Clinic Details (Left) ---
    const logoIconPath = path.join(process.cwd(), '../public/brand/logo-icon.png');
    let addressTop = 95;
    if (fs.existsSync(logoIconPath)) {
      doc.image(logoIconPath, 50, 30, { width: 45 });
      doc
        .fillColor('#6B46C1')
        .fontSize(28)
        .font('Times-Bold')
        .text('Heal', 105, 42, { continued: true })
        .fillColor('#E23E8C')
        .text('Nari');
      
      doc
        .fillColor('#475569')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Digital Health Clinic', 50, 95);
      addressTop = 110;
    } else {
      doc
        .fillColor('#6B46C1')
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('HealNari', 50, 45);
      doc
        .fillColor('#475569')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Digital Health Clinic', 50, 78);
    }
    doc
      .fillColor('#64748b')
      .fontSize(9)
      .font('Helvetica')
      .text('123 Wellness Avenue, Health City', 50, addressTop)
      .text('support@healnari.app  |  +1 (800) 000-0000', 50, addressTop + 15);

    // --- Invoice Info (Right) ---
    doc
      .fillColor('#0f172a')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('TAX INVOICE', 395, 45, { align: 'right', width: 150 });

    doc
      .fillColor('#64748b')
      .fontSize(10)
      .font('Helvetica')
      .text('Invoice No:', 320, 78, { width: 90, align: 'right' })
      .fillColor('#0f172a')
      .font('Helvetica-Bold')
      .text(invoiceNo, 420, 78, { width: 125, align: 'right' });

    doc
      .fillColor('#64748b')
      .font('Helvetica')
      .text('Date of Issue:', 320, 95, { width: 90, align: 'right' })
      .fillColor('#0f172a')
      .font('Helvetica-Bold')
      .text(
        date.toLocaleDateString('en-US', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        420,
        95,
        { width: 125, align: 'right' },
      );

    // --- Status Watermark ---
    if (isPaid) {
      doc.save().rotate(-20, { origin: [300, 400] });
      doc
        .fillColor('#22c55e')
        .fillOpacity(0.08)
        .fontSize(80)
        .font('Helvetica-Bold')
        .text('PAID', 150, 350, { align: 'center', width: 300 });
      doc.restore();
    } else if (payment.status === 'Failed' || payment.status === 'Cancelled') {
      doc.save().rotate(-20, { origin: [300, 400] });
      doc
        .fillColor('#ef4444')
        .fillOpacity(0.08)
        .fontSize(80)
        .font('Helvetica-Bold')
        .text('CANCELLED', 100, 350, { align: 'center', width: 400 });
      doc.restore();
    }

    // --- Billing Details Grid ---
    const detailTop = 180;

    // Patient Box
    doc
      .rect(50, detailTop, 235, 80)
      .fill('#ffffff')
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .stroke();
    doc
      .fillColor('#64748b')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('BILLED TO (PATIENT)', 65, detailTop + 15, { characterSpacing: 1 });
    doc
      .fillColor('#0f172a')
      .fontSize(13)
      .font('Helvetica-Bold')
      .text(payment.patientName || 'Patient', 65, detailTop + 35);
    doc
      .fillColor('#64748b')
      .fontSize(10)
      .font('Helvetica')
      .text('Telehealth Member', 65, detailTop + 55);

    // Doctor Box
    doc
      .rect(310, detailTop, 235, 80)
      .fill('#ffffff')
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .stroke();
    doc
      .fillColor('#64748b')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('TREATING DOCTOR', 325, detailTop + 15, { characterSpacing: 1 });
    doc
      .fillColor('#0f172a')
      .fontSize(13)
      .font('Helvetica-Bold')
      .text(
        payment.doctorName
          ? (payment.doctorName.startsWith('Dr. ')
              ? payment.doctorName
              : `Dr. ${payment.doctorName}`)
          : '—',
        325,
        detailTop + 35,
      );
    doc
      .fillColor('#64748b')
      .fontSize(10)
      .font('Helvetica')
      .text('HealNari Telehealth', 325, detailTop + 55);

    // --- Itemized Table ---
    const tableTop = 290;

    // Table Header
    doc.rect(50, tableTop, 495, 30).fill('#6B46C1');
    doc
      .fillColor('#ffffff')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('DESCRIPTION / SERVICE', 70, tableTop + 10, { characterSpacing: 1 })
      .text('PAYMENT MODE', 300, tableTop + 10, { characterSpacing: 1 })
      .text('STATUS', 410, tableTop + 10, { characterSpacing: 1 })
      .text('AMOUNT', 460, tableTop + 10, {
        width: 65,
        align: 'right',
        characterSpacing: 1,
      });

    // Table Row
    const rowTop = tableTop + 30;
    doc
      .rect(50, rowTop, 495, 50)
      .fill('#ffffff')
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .stroke();

    doc
      .fillColor('#0f172a')
      .fontSize(11)
      .font('Helvetica')
      .text(
        payment.category
          ? `${payment.service} — ${payment.category}`
          : payment.service,
        70,
        rowTop + 20,
        { width: 220 },
      )
      .text(payment.method || '—', 300, rowTop + 20, { width: 100 })
      .fillColor(isPaid ? '#16a34a' : '#ef4444')
      .font('Helvetica-Bold')
      .text(payment.status.toUpperCase(), 410, rowTop + 20, { width: 55 })
      .fillColor('#0f172a')
      .font('Helvetica')
      .text(`${curr} ${amount}`, 440, rowTop + 20, {
        width: 85,
        align: 'right',
      });

    // --- Totals Section ---
    const totalsTop = rowTop + 75;

    doc
      .rect(320, totalsTop - 15, 225, 110)
      .fill('#f8fafc')
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .stroke();

    doc
      .fillColor('#64748b')
      .fontSize(11)
      .font('Helvetica')
      .text('Subtotal', 340, totalsTop, { width: 100, align: 'left' });
    doc
      .fillColor('#0f172a')
      .fontSize(11)
      .font('Helvetica')
      .text(`${curr} ${amount}`, 440, totalsTop, { width: 85, align: 'right' });

    doc
      .fillColor('#64748b')
      .fontSize(11)
      .font('Helvetica')
      .text('Taxes (0%)', 340, totalsTop + 25, { width: 100, align: 'left' });
    doc
      .fillColor('#0f172a')
      .fontSize(11)
      .font('Helvetica')
      .text(`${curr} 0.00`, 440, totalsTop + 25, { width: 85, align: 'right' });

    doc
      .moveTo(340, totalsTop + 50)
      .lineTo(525, totalsTop + 50)
      .strokeColor('#cbd5e1')
      .lineWidth(1)
      .stroke();

    doc
      .fillColor('#0f172a')
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('Total Amount', 340, totalsTop + 65, { width: 100, align: 'left' });
    doc
      .fillColor('#6B46C1')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(`${curr} ${amount}`, 430, totalsTop + 63, {
        width: 95,
        align: 'right',
      });

    // --- Footer Notes ---
    const footerTop = 720;
    doc
      .moveTo(50, footerTop)
      .lineTo(545, footerTop)
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .stroke();

    doc
      .fillColor('#475569')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Terms & Conditions', 50, footerTop + 15);
    doc
      .fillColor('#94a3b8')
      .fontSize(9)
      .font('Helvetica')
      .text(
        '1. This is a system-generated invoice. No physical signature is required.',
        50,
        footerTop + 30,
      )
      .text(
        '2. For any discrepancies or queries, please contact support@healnari.app within 7 days.',
        50,
        footerTop + 45,
      );

    doc.end();
    return done;
  }
}
