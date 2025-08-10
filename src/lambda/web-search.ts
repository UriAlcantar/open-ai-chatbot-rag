interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

interface WebSearchResponse {
  results: SearchResult[];
  query: string;
  source: 'web';
}

export async function searchWeb(query: string, maxResults: number = 5): Promise<WebSearchResponse> {
  try {
    // Usar DuckDuckGo Instant Answer API (gratuita y sin API key)
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error(`Web search failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    const results: SearchResult[] = [];
    
    // Agregar respuesta directa si existe
    if (data.Abstract && data.AbstractText) {
      results.push({
        title: data.Heading || 'Respuesta Directa',
        link: data.AbstractURL || '',
        snippet: data.AbstractText
      });
    }
    
    // Agregar resultados relacionados
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, maxResults - results.length)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'Resultado Relacionado',
            link: topic.FirstURL,
            snippet: topic.Text
          });
        }
      }
    }
    
    // Si no hay suficientes resultados, intentar con búsqueda alternativa
    if (results.length < 2) {
      const alternativeResults = await searchAlternative(query, maxResults - results.length);
      results.push(...alternativeResults);
    }
    
    return {
      results: results.slice(0, maxResults),
      query,
      source: 'web'
    };
    
  } catch (error) {
    console.error('Error in web search:', error);
    return {
      results: [],
      query,
      source: 'web'
    };
  }
}

async function searchAlternative(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    // Búsqueda alternativa usando Wikipedia API
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    
    const response = await fetch(wikiUrl);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.extract) {
        return [{
          title: data.title || 'Información de Wikipedia',
          link: data.content_urls?.desktop?.page || '',
          snippet: data.extract.substring(0, 300) + '...'
        }];
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error in alternative search:', error);
    return [];
  }
}

// Función para obtener información actualizada
export async function getCurrentInfo(query: string): Promise<string> {
  try {
    const searchResponse = await searchWeb(query, 3);
    
    if (searchResponse.results.length === 0) {
      return 'No se encontró información actualizada sobre este tema.';
    }
    
    let currentInfo = `Información actualizada sobre "${query}":\n\n`;
    
    for (const result of searchResponse.results) {
      currentInfo += `**${result.title}**\n`;
      currentInfo += `${result.snippet}\n`;
      if (result.link) {
        currentInfo += `Fuente: ${result.link}\n`;
      }
      currentInfo += '\n';
    }
    
    return currentInfo;
  } catch (error) {
    console.error('Error getting current info:', error);
    return 'No se pudo obtener información actualizada en este momento.';
  }
}
