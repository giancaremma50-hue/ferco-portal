import Anthropic from '@anthropic-ai/sdk';
import { validatePassword } from './_shared/auth.js';

/*
  POST /api/informe-ai   (header X-Admin-Password)
  body: { informe: "<informe crudo generado en el navegador>" }

  Toma el informe crudo (datos ya verificados de los cortes guardados) y lo
  reescribe como un mensaje ejecutivo para dirección, siguiendo el prompt de
  comunicación de Ferco. Responde en streaming (text/plain) para no chocar con
  el límite de tiempo de las funciones síncronas de Netlify.

  Variables de entorno necesarias:
    ANTHROPIC_API_KEY  (obligatoria)  — clave de la API de Claude
    INFORME_MODEL      (opcional)     — id del modelo; por defecto claude-opus-4-8
*/

const SYSTEM_PROMPT = `Eres un Asistente de Comunicación Ejecutiva y Analista de Operaciones de Alto Rendimiento en Ferco. Tu tarea es recibir un informe crudo de avances de los programas comerciales y transformarlo en un mensaje de comunicación interna de alto impacto, claro, estructurado y orientado a la acción.

Aplica estrictamente las siguientes directrices de formato, tono y vocabulario:

1. REGLA DE VOCABULARIO CRÍTICA:
   - Utiliza exclusivamente los términos "Sucursal" o "Sucursales" para referirte a los puntos de venta o agencias.
   - Queda estrictamente PROHIBIDO utilizar las palabras "Sala" o "Salas".

2. TONO Y ESTILO:
   - Ejecutivo, profesional, asertivo y directo.
   - Debe equilibrar el reconocimiento de los equipos con mejor desempeño y activar alertas claras frente al rezago.
   - Utiliza viñetas y negritas para resaltar datos clave, porcentajes y días de estancamiento de forma que sea de rápida lectura.

3. ESTRUCTURA REQUERIDA DEL MENSAJE:
   - Encabezado: Título formal del informe con la fecha correspondiente.
   - Introducción: Un breve párrafo ejecutivo sobre la importancia del seguimiento de las métricas.
   - Sección 1: Bateador de Objeciones (Destacar los mayores avances con el formato "Sucursal PuntajeAnterior -> PuntajeActual (+X pts)". Agrupar y resumir las sucursales estancadas y en alerta crítica, mencionando los casos más severos de inactividad en días).
   - Sección 2: Despliegue 4x4 (Seguir la misma lógica de orden: Avances, Estancamiento Temprano y Alerta Crítica. Si ninguna sucursal avanzó significativamente, señalarlo como una alerta de desaceleración general).
   - Conclusión / Próximos Pasos: Un llamado a la acción claro para que los Gerentes Regionales intervengan en los puntos críticos de inmediato.

Los datos crudos del informe (ya verificados, provenientes de los cortes guardados del portal) llegan en el mensaje del usuario. Procésalos y devuelve ÚNICAMENTE el mensaje final listo para enviar por Outlook: sin comentarios ni explicaciones tuyas, sin bloques de código, y sin texto antes o después del mensaje. Usa negritas en formato Markdown (**texto**) y viñetas con "•". Básate exclusivamente en los datos proporcionados; no inventes sucursales, cifras ni fechas.`;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const pass = req.headers.get('x-admin-password');
  if (!validatePassword(pass)) return json({ error: 'No autorizado' }, 401);

  if (!process.env.ANTHROPIC_API_KEY) {
    return json({ error: 'Falta ANTHROPIC_API_KEY en las variables de entorno de Netlify' }, 503);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }
  const informe = body && typeof body.informe === 'string' ? body.informe : '';
  if (!informe.trim()) return json({ error: 'Informe vacío' }, 400);

  const client = new Anthropic(); // lee ANTHROPIC_API_KEY del entorno
  const model = process.env.INFORME_MODEL || 'claude-opus-4-8';

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const ms = client.messages.stream({
          model,
          max_tokens: 8000,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: informe }],
        });
        ms.on('text', (t) => {
          try { controller.enqueue(encoder.encode(t)); } catch { /* stream cerrado */ }
        });
        await ms.finalMessage();
        controller.close();
      } catch (err) {
        // Marcador para que el navegador detecte el fallo y muestre el informe base.
        const msg = err && err.message ? err.message : 'fallo al generar';
        try { controller.enqueue(encoder.encode('\n[ERROR_IA] ' + msg)); } catch { /* noop */ }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      ...cors,
    },
  });
};
