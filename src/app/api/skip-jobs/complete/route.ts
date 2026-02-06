import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import nodemailer from 'nodemailer';
import { generateDocketPdf } from '@/lib/pdf';
import { CompleteJobRequest, SKIP_SIZES, SKIP_ACTIONS } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: CompleteJobRequest = await request.json();
    const { token, skip_size, action, pick_size, drop_size, customer_signature, lat, lng, accuracy_m, driver_notes } = body;
    const yardLat = Number(process.env.NEXT_PUBLIC_YARD_LAT);
    const yardLng = Number(process.env.NEXT_PUBLIC_YARD_LNG);

    if (!token || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Find job by token
    const { data: job, error: jobError } = await supabase
      .from('skip_jobs')
      .select(`
        *,
        customer:customers(id, name, address),
        driver:drivers(id, name, phone)
      `)
      .eq('job_token', token)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 404 }
      );
    }

    if (job.status === 'completed') {
      return NextResponse.json(
        { error: 'Job already completed' },
        { status: 400 }
      );
    }

    const completedTime = new Date().toISOString();

    // Create completion record
    const { data: completion, error: completionError } = await supabase
      .from('skip_job_completion')
      .insert({
        skip_job_id: job.id,
        skip_size: skip_size || drop_size || pick_size,
        action,
        pick_size,
        drop_size,
        customer_signature: customer_signature || null,
        site_company: job.customer?.name || null,
        pick_lat: action === "pick" || action === "pick_drop" ? yardLat : null,
        pick_lng: action === "pick" || action === "pick_drop" ? yardLng : null,
        drop_lat: action === "drop" || action === "pick_drop" ? lat : null,
        drop_lng: action === "drop" || action === "pick_drop" ? lng : null,
        lat,
        lng,
        accuracy_m,
        driver_notes,
        completed_time: completedTime,
      })
      .select()
      .single();

    if (completionError) {
      console.error('Completion creation error:', completionError);
      return NextResponse.json(
        { error: 'Failed to save completion' },
        { status: 500 }
      );
    }

    // Update job status
    const { error: updateError } = await supabase
      .from('skip_jobs')
      .update({
        status: 'completed',
        completed_at: completedTime,
      })
      .eq('id', job.id);

    if (updateError) {
      console.error('Job update error:', updateError);
    }

    // Generate PDF
    const pdfBytes = await generateDocketPdf({
      job,
      completion,
      customerName: job.customer?.name || 'Unknown Customer',
      driverName: job.driver?.name || 'Unknown Driver',
    });

    // Send email with Gmail SMTP (Nodemailer)
    const emailTo = process.env.EMAIL_TO || 'carlmurphy2332@gmail.com';
    const emailFrom = process.env.EMAIL_FROM || process.env.SMTP_USER || 'carlmurphy2332@gmail.com';
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpSecure = String(process.env.SMTP_SECURE || 'true') === 'true';
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    let emailSent = false;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        const skipSizeLabel = SKIP_SIZES.find((s) => s.value === (skip_size || drop_size || pick_size))?.label || (skip_size || drop_size || pick_size || "");
        const actionLabel = SKIP_ACTIONS.find((a) => a.value === action)?.label || action;
        const pickLabel = pick_size ? SKIP_SIZES.find((s) => s.value === pick_size)?.label : null;
        const dropLabel = drop_size ? SKIP_SIZES.find((s) => s.value === drop_size)?.label : null;
        const pickLocation = (action === 'pick' || action === 'pick_drop') && !Number.isNaN(yardLat) && !Number.isNaN(yardLng)
          ? `${yardLat.toFixed(6)}, ${yardLng.toFixed(6)} (Yard)`
          : "";
        const dropLocation = (action === 'drop' || action === 'pick_drop') && lat && lng
          ? `${lat.toFixed(6)}, ${lng.toFixed(6)} (Site)`
          : "";

        const dropMapLink = (action === 'drop' || action === 'pick_drop') && lat && lng 
          ? `https://www.google.com/maps?q=${lat},${lng}` 
          : null;
        const completionMapLink = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null;

        let locationSection = '';
        
        // Drop location with customer address
        if ((action === 'drop' || action === 'pick_drop') && lat && lng) {
          locationSection += '<h3 style="margin-top: 20px; margin-bottom: 10px;">Drop Location (Site)</h3>';
          if (job.customer?.address) {
            locationSection += `<p><strong>Address:</strong> ${job.customer.address}</p>`;
          }
          locationSection += `<p><strong>GPS:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>`;
        }

        // Job completion location
        if (lat && lng) {
          locationSection += '<h3 style="margin-top: 20px; margin-bottom: 10px;">Job Completion Location</h3>';
          locationSection += `<p><strong>Where driver finished:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>`;
          if (accuracy_m) {
            locationSection += `<p><strong>GPS Accuracy:</strong> ${accuracy_m}m</p>`;
          }
          if (completionMapLink) {
            locationSection += `<p><a href="${completionMapLink}" style="color: #2563eb;">View on Google Maps</a></p>`;
          }
        }

        const emailHtml = `
          <h2>Skip Job Completed</h2>
          <p><strong>Docket No:</strong> ${job.docket_no}</p>
          <p><strong>Customer:</strong> ${job.customer?.name || 'N/A'}</p>
          <p><strong>Driver:</strong> ${job.driver?.name || 'N/A'}</p>
          <p><strong>Truck Reg:</strong> ${job.truck_reg}</p>
          <p><strong>Skip Size:</strong> ${skipSizeLabel || "-"}</p>
          <p><strong>Action:</strong> ${actionLabel}</p>
          ${pickLabel ? `<p><strong>Removed Skip:</strong> ${pickLabel}</p>` : ""}
          ${dropLabel ? `<p><strong>Left on Site:</strong> ${dropLabel}</p>` : ""}
          <p><strong>Completed:</strong> ${new Date(completedTime).toLocaleString('en-IE')}</p>
          ${locationSection}
          ${driver_notes ? `<p style="margin-top: 20px;"><strong>Driver Notes:</strong> ${driver_notes}</p>` : ''}
          <hr>
          <p style="color: #666; font-size: 12px;">PDF docket attached. Generated by Irish Metals Dispatch System.</p>
        `;

        const sendResult = await transporter.sendMail({
          from: `Irish Metals <${emailFrom}>`,
          to: emailTo,
          subject: `Skip Docket Completed: ${job.docket_no}`,
          html: emailHtml,
          attachments: [
            {
              filename: `${job.docket_no}.pdf`,
              content: Buffer.from(pdfBytes),
            },
          ],
        });

        console.log('SMTP send result:', sendResult);
        emailSent = true;
      } catch (emailError) {
        console.error('SMTP email sending error:', emailError);
      }
    } else {
      console.error('SMTP config missing. Check SMTP_HOST/SMTP_USER/SMTP_PASS in .env.local');
    }

    return NextResponse.json({
      success: true,
      completion,
      email_sent: emailSent,
      docket_no: job.docket_no,
    });
  } catch (error) {
    console.error('Complete job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
