import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { extractAmazonPageCandidates, selectAmazonPageProducts, validateAmazonResultsUrl } from './amazon-page-selection';
import { assertAmazonPageReadable } from './amazon-request-policy';
import { amazonReaderHttpError } from './amazon-search-diagnostics';

export const readAmazonResultsPage = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ url: z.string().max(2000).transform(validateAmazonResultsUrl) }).parse(input))
  .handler(async ({ data, context }) => {
    if (!['hugohug12ou@gmail.com', 'hugoet373@gmail.com'].includes(String(context.claims?.email ?? '').toLowerCase())) throw new Error('Recurso exclusivo da administração.');
    const key = process.env['LOVABLE_API_KEY'];
    const connection = process.env['FIRECRAWL_API_KEY'];
    if (!key || !connection) throw new Error('Serviço de leitura de páginas não configurado.');
    const response = await fetch('https://connector-gateway.lovable.dev/firecrawl/v2/scrape', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'X-Connection-Api-Key': connection },
      body: JSON.stringify({ url: data.url, formats: ['rawHtml'], onlyMainContent: false, waitFor: 3000, location: { country: 'BR', languages: ['pt-BR'] } }),
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw await amazonReaderHttpError(response);
    const result = await response.json();
    const payload = result?.data && typeof result.data === 'object' ? result.data : result;
    assertAmazonPageReadable(payload);
    if (typeof payload.rawHtml !== 'string' || !payload.rawHtml) throw new Error('O leitor não retornou a página de resultados.');
    return selectAmazonPageProducts(extractAmazonPageCandidates(payload.rawHtml));
  });