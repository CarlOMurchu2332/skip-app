import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { SkipJob, SkipJobCompletion, SKIP_SIZES, SKIP_ACTIONS } from './types';
import * as fs from 'fs';
import * as path from 'path';

interface PdfData {
  job: SkipJob;
  completion: SkipJobCompletion;
  customerName: string;
  driverName: string;
}

export async function generateDocketPdf(data: PdfData): Promise<Uint8Array> {
  const { job, completion, customerName, driverName } = data;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();

  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const margin = 50;
  let yPos = height - margin;

  // Try to load logo if it exists
  try {
    const logoPath = path.join(process.cwd(), 'public', 'imr-logo.png');
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedPng(logoBytes);
      const logoDims = logoImage.scale(0.5);
      page.drawImage(logoImage, {
        x: margin,
        y: height - margin - 60,
        width: Math.min(logoDims.width, 120),
        height: Math.min(logoDims.height, 60),
      });
    }
  } catch {
    // Logo not found, continue without it
  }

  // Company name and address (top right)
  const companyInfo = [
    'Irish Metals Recycling',
    'Unit 2, Duleek Business Park',
    'Co. Meath, A92 TK20',
  ];
  
  let companyY = height - margin;
  for (const line of companyInfo) {
    page.drawText(line, {
      x: width - margin - 200,
      y: companyY,
      size: 10,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    companyY -= 14;
  }

  // Title
  yPos = height - 120;
  page.drawText('SKIP DOCKET', {
    x: margin,
    y: yPos,
    size: 24,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Docket number
  yPos -= 35;
  page.drawText(`Docket No: ${job.docket_no}`, {
    x: margin,
    y: yPos,
    size: 14,
    font: helveticaBold,
    color: rgb(0.2, 0.4, 0.6),
  });

  // Horizontal line
  yPos -= 20;
  page.drawLine({
    start: { x: margin, y: yPos },
    end: { x: width - margin, y: yPos },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  // Job details
  yPos -= 40;
  const details = [
    { label: 'Customer', value: customerName },
    { label: 'Customer Address', value: job.customer?.address || '-' },
    { label: 'Customer Phone', value: job.customer?.contact_phone || '-' },
    { label: 'Driver', value: driverName },
    { label: 'Truck Reg', value: job.truck_reg },
    { label: 'Job Date', value: new Date(job.job_date).toLocaleDateString('en-IE') },
    { label: 'Skip Size', value: SKIP_SIZES.find(s => s.value === completion.skip_size)?.label || completion.skip_size },
    { label: 'Action', value: SKIP_ACTIONS.find(a => a.value === completion.action)?.label || completion.action },
    { label: 'Completed', value: new Date(completion.completed_time).toLocaleString('en-IE') },
  ];

  for (const detail of details) {
    page.drawText(`${detail.label}:`, {
      x: margin,
      y: yPos,
      size: 12,
      font: helveticaBold,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(detail.value, {
      x: margin + 120,
      y: yPos,
      size: 12,
      font: helvetica,
      color: rgb(0.1, 0.1, 0.1),
    });
    yPos -= 28;
  }

  // GPS Location (if captured)
  if (completion.pick_lat && completion.pick_lng) {
    yPos -= 10;
    page.drawText('Pick Location (Yard):', {
      x: margin,
      y: yPos,
      size: 12,
      font: helveticaBold,
      color: rgb(0.3, 0.3, 0.3),
    });
    const pickText = `${completion.pick_lat.toFixed(6)}, ${completion.pick_lng.toFixed(6)}`;
    page.drawText(pickText, {
      x: margin + 150,
      y: yPos,
      size: 12,
      font: helvetica,
      color: rgb(0.1, 0.1, 0.1),
    });
    yPos -= 20;
    const pickMap = `https://www.google.com/maps?q=${completion.pick_lat},${completion.pick_lng}`;
    page.drawText(`View on Maps: ${pickMap}`, {
      x: margin,
      y: yPos,
      size: 9,
      font: helvetica,
      color: rgb(0.2, 0.4, 0.8),
    });
  }

  if (completion.drop_lat && completion.drop_lng) {
    yPos -= 20;
    page.drawText('Drop Location (Site):', {
      x: margin,
      y: yPos,
      size: 12,
      font: helveticaBold,
      color: rgb(0.3, 0.3, 0.3),
    });
    yPos -= 18;
    if (job.customer?.address) {
      page.drawText(`Address: ${job.customer.address}`, {
        x: margin,
        y: yPos,
        size: 10,
        font: helvetica,
        color: rgb(0.2, 0.2, 0.2),
      });
      yPos -= 16;
    }
    const dropText = `GPS: ${completion.drop_lat.toFixed(6)}, ${completion.drop_lng.toFixed(6)}`;
    page.drawText(dropText, {
      x: margin,
      y: yPos,
      size: 10,
      font: helvetica,
      color: rgb(0.1, 0.1, 0.1),
    });
  }

  // Completion Location (where driver finished)
  if (completion.lat && completion.lng) {
    yPos -= 30;
    page.drawText('Job Completion Location:', {
      x: margin,
      y: yPos,
      size: 12,
      font: helveticaBold,
      color: rgb(0.3, 0.3, 0.3),
    });
    yPos -= 18;
    const completionText = `GPS: ${completion.lat.toFixed(6)}, ${completion.lng.toFixed(6)}`;
    page.drawText(completionText, {
      x: margin,
      y: yPos,
      size: 10,
      font: helvetica,
      color: rgb(0.1, 0.1, 0.1),
    });
    yPos -= 16;
    const completionMap = `https://www.google.com/maps?q=${completion.lat},${completion.lng}`;
    page.drawText(`View on Maps: ${completionMap}`, {
      x: margin,
      y: yPos,
      size: 9,
      font: helvetica,
      color: rgb(0.2, 0.4, 0.8),
    });
    if (completion.accuracy_m) {
      yPos -= 14;
      page.drawText(`Accuracy: ${completion.accuracy_m}m`, {
        x: margin,
        y: yPos,
        size: 9,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
  }

  // Driver notes (if any)
  if (completion.driver_notes) {
    yPos -= 35;
    page.drawText('Driver Notes:', {
      x: margin,
      y: yPos,
      size: 12,
      font: helveticaBold,
      color: rgb(0.3, 0.3, 0.3),
    });
    yPos -= 18;
    page.drawText(completion.driver_notes, {
      x: margin,
      y: yPos,
      size: 11,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });
  }

  // Signature line
  yPos -= 80;
  page.drawText('Driver Signature:', {
    x: margin,
    y: yPos,
    size: 10,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });
  page.drawText(driverName, {
    x: margin + 120,
    y: yPos,
    size: 10,
    font: helveticaBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  yPos -= 18;
  page.drawText('Customer Signature:', {
    x: margin,
    y: yPos,
    size: 10,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });
  page.drawText(completion.customer_signature || '', {
    x: margin + 120,
    y: yPos,
    size: 10,
    font: helveticaBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Footer
  page.drawLine({
    start: { x: margin, y: 60 },
    end: { x: width - margin, y: 60 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  page.drawText('Generated by Irish Metals Dispatch System', {
    x: margin,
    y: 45,
    size: 8,
    font: helvetica,
    color: rgb(0.6, 0.6, 0.6),
  });

  page.drawText('Address: Unit 2, Duleek Business Park, Co. Meath, A92 TK20', {
    x: margin,
    y: 32,
    size: 8,
    font: helvetica,
    color: rgb(0.6, 0.6, 0.6),
  });

  page.drawText('Page 1 of 1', {
    x: width - margin - 50,
    y: 45,
    size: 8,
    font: helvetica,
    color: rgb(0.6, 0.6, 0.6),
  });

  return await pdfDoc.save();
}

