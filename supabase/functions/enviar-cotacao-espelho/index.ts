import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

async function sendEmail(to: string, subject: string, body: string, pdfBase64: string, filename: string) {
  if (!RESEND_API_KEY) {
    return { error: 'RESEND_API_KEY not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@obracontrol.com.br',
        to,
        subject,
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto;">
                ${body.split('\n').map((line: string) => `<p>${line}</p>`).join('')}
                <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
                  Enviado por ObraControl - Sistema de Gestão de Obras
                </p>
              </div>
            </body>
          </html>
        `,
        attachments: [
          {
            filename,
            content: pdfBase64,
            encoding: 'base64',
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: `Resend API error: ${error.message || 'Unknown error'}` };
    }

    return { success: true, message: 'Email sent successfully' };
  } catch (error: any) {
    return { error: `Failed to send email: ${error.message}` };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      email,
      fornecedor_nome,
      obra_nome,
      cotacao_numero,
      cotacao_link,
      espelho_pdf_base64,
    } = body;

    if (!email || !fornecedor_nome || !obra_nome || !espelho_pdf_base64) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const subject = `Solicitação de Orçamento ${cotacao_numero} - ${obra_nome}`;
    const messageBody = `Prezado(a) ${fornecedor_nome},\n\nEstamos realizando uma cotação referente à obra:\n\n${obra_nome}\n\nSolicitamos o envio da proposta através do link abaixo:\n\n${cotacao_link}\n\nSegue em anexo o espelho do orçamento para sua referência.\n\nAtenciosamente,\nObraControl`;
    const filename = `Espelho_Orcamento_${cotacao_numero.replace('#', '')}_${new Date().toISOString().split('T')[0]}.pdf`;

    const result = await sendEmail(
      email,
      subject,
      messageBody,
      espelho_pdf_base64,
      filename
    );

    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error, fallback: true }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email enviado com sucesso!' }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message, fallback: true }),
      { status: 200, headers: corsHeaders }
    );
  }
});
