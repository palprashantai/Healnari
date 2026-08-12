import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface InvoiceData {
  id: string;
  txn_ref?: string | null;
  service: string;
  category?: string | null;
  amount: number | string;
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
  async generatePdf(payment: InvoiceData): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    const invoiceNo = payment.txn_ref || payment.id.slice(0, 8).toUpperCase();
    const date = new Date(payment.created_at);
    const amount = Number(payment.amount).toFixed(2);

    doc.fillColor('#6B46C1').fontSize(22).font('Helvetica-Bold').text('HealNari', 50, 50);
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Telehealth & Women\'s Care', 50, 76);

    doc.fillColor('#0f172a').fontSize(18).font('Helvetica-Bold').text('INVOICE', 400, 50, { align: 'right' });
    doc.fillColor('#64748b').fontSize(9).font('Helvetica')
      .text(`Invoice #: ${invoiceNo}`, 400, 76, { align: 'right' })
      .text(`Date: ${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 400, 90, { align: 'right' });

    doc.moveTo(50, 115).lineTo(545, 115).strokeColor('#e2e8f0').stroke();

    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text('BILLED TO', 50, 135);
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica').text(payment.patientName || 'Patient', 50, 150);

    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text('CONSULTING DOCTOR', 300, 135);
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica').text(payment.doctorName ? `Dr. ${payment.doctorName}` : '—', 300, 150);

    const tableTop = 200;
    doc.rect(50, tableTop, 495, 26).fill('#f8fafc');
    doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold')
      .text('DESCRIPTION', 60, tableTop + 8)
      .text('PAYMENT METHOD', 300, tableTop + 8)
      .text('STATUS', 410, tableTop + 8)
      .text('AMOUNT', 470, tableTop + 8, { width: 65, align: 'right' });

    const rowTop = tableTop + 26;
    doc.fillColor('#0f172a').fontSize(10).font('Helvetica')
      .text(payment.category ? `${payment.service} — ${payment.category}` : payment.service, 60, rowTop + 12, { width: 230 })
      .text(payment.method || '—', 300, rowTop + 12, { width: 100 })
      .text(payment.status, 410, rowTop + 12, { width: 55 })
      .text(`INR ${amount}`, 470, rowTop + 12, { width: 65, align: 'right' });

    doc.moveTo(50, rowTop + 45).lineTo(545, rowTop + 45).strokeColor('#e2e8f0').stroke();

    doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('Total Paid', 350, rowTop + 60, { width: 120, align: 'right' });
    doc.fillColor('#6B46C1').fontSize(16).font('Helvetica-Bold').text(`INR ${amount}`, 350, rowTop + 75, { width: 195, align: 'right' });

    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
      .text('This is a system-generated invoice and does not require a signature.', 50, 760, { align: 'center', width: 495 })
      .text('HealNari — support@healnari.app', 50, 774, { align: 'center', width: 495 });

    doc.end();
    return done;
  }
}
