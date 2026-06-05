import { Resend } from 'resend';

const FROM = 'onboarding@resend.dev';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #d0c8bc;">
        <!-- Header -->
        <tr>
          <td style="background:#1a1208;padding:28px 40px;">
            <p style="margin:0;color:#c9a84c;font-size:13px;letter-spacing:0.45em;font-family:Georgia,serif;">A P I T U R N</p>
          </td>
        </tr>
        <!-- Content -->
        <tr>
          <td style="padding:40px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #d0c8bc;">
            <p style="margin:0;color:#8a7a6a;font-size:10px;letter-spacing:0.2em;">APITURN · GESTIÓN DE EXTRACCIONES APÍCOLAS</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendConfirmedEmail(
  to: string,
  clientName: string,
  date: string,
  loteNumber?: string
) {
  if (!process.env.RESEND_API_KEY) return;
  const loteRow = loteNumber
    ? `<p style="margin:0 0 24px;color:#3a3028;font-size:14px;line-height:1.6;">Número de lote asignado: <strong style="color:#c9a84c;">${loteNumber}</strong></p>`
    : '';
  const html = baseTemplate(`
    <p style="margin:0 0 8px;color:#8a7a6a;font-size:10px;letter-spacing:0.35em;">CONFIRMACIÓN DE EXTRACCIÓN</p>
    <h1 style="margin:0 0 24px;color:#1a1208;font-size:28px;font-weight:300;letter-spacing:0.04em;">Solicitud Confirmada</h1>
    <p style="margin:0 0 16px;color:#3a3028;font-size:15px;line-height:1.6;">Estimado/a <strong>${clientName}</strong>,</p>
    <p style="margin:0 0 24px;color:#3a3028;font-size:15px;line-height:1.6;">Tu solicitud de extracción ha sido <strong style="color:#2e7d4f;">confirmada</strong> para el <strong>${date}</strong>.</p>
    ${loteRow}
    <p style="margin:0 0 24px;color:#3a3028;font-size:15px;line-height:1.6;">Puedes revisar el estado de tu solicitud en el portal.</p>
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #d0c8bc;">
      <p style="margin:0;color:#8a7a6a;font-size:11px;font-style:italic;">El Equipo de Apiturn</p>
    </div>
  `);
  await getResend().emails.send({ from: FROM, to, subject: `Extracción confirmada — ${date}`, html });
}

export async function sendRescheduledEmail(to: string, clientName: string, newDate: string) {
  if (!process.env.RESEND_API_KEY) return;
  const html = baseTemplate(`
    <p style="margin:0 0 8px;color:#8a7a6a;font-size:10px;letter-spacing:0.35em;">REPROGRAMACIÓN DE EXTRACCIÓN</p>
    <h1 style="margin:0 0 24px;color:#1a1208;font-size:28px;font-weight:300;letter-spacing:0.04em;">Extracción Reprogramada</h1>
    <p style="margin:0 0 16px;color:#3a3028;font-size:15px;line-height:1.6;">Estimado/a <strong>${clientName}</strong>,</p>
    <p style="margin:0 0 24px;color:#3a3028;font-size:15px;line-height:1.6;">Tu extracción ha sido <strong style="color:#c9a84c;">reprogramada</strong> para el <strong>${newDate}</strong>.</p>
    <p style="margin:0 0 24px;color:#3a3028;font-size:15px;line-height:1.6;">Si tienes alguna consulta, comunícate con nosotros a través del portal.</p>
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #d0c8bc;">
      <p style="margin:0;color:#8a7a6a;font-size:11px;font-style:italic;">El Equipo de Apiturn</p>
    </div>
  `);
  await getResend().emails.send({ from: FROM, to, subject: `Extracción reprogramada — ${newDate}`, html });
}

export async function sendCancelledEmail(to: string, clientName: string, reason?: string) {
  if (!process.env.RESEND_API_KEY) return;
  const html = baseTemplate(`
    <p style="margin:0 0 8px;color:#8a7a6a;font-size:10px;letter-spacing:0.35em;">CANCELACIÓN DE EXTRACCIÓN</p>
    <h1 style="margin:0 0 24px;color:#1a1208;font-size:28px;font-weight:300;letter-spacing:0.04em;">Solicitud Cancelada</h1>
    <p style="margin:0 0 16px;color:#3a3028;font-size:15px;line-height:1.6;">Estimado/a <strong>${clientName}</strong>,</p>
    <p style="margin:0 0 24px;color:#3a3028;font-size:15px;line-height:1.6;">Tu solicitud de extracción ha sido <strong style="color:#c0392b;">cancelada</strong>.${reason ? `<br><br><em>Motivo: ${reason}</em>` : ''}</p>
    <p style="margin:0 0 24px;color:#3a3028;font-size:15px;line-height:1.6;">Puedes realizar una nueva solicitud cuando lo desees desde el portal.</p>
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #d0c8bc;">
      <p style="margin:0;color:#8a7a6a;font-size:11px;font-style:italic;">El Equipo de Apiturn</p>
    </div>
  `);
  await getResend().emails.send({ from: FROM, to, subject: 'Solicitud de extracción cancelada', html });
}
