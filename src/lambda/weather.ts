interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
  forecast: DailyForecast[];
}

interface DailyForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  condition: string;
  chanceOfRain: number;
}

// API gratuita: OpenWeatherMap (requiere registro gratuito)
// Alternativa: WeatherAPI.com (también gratuita con límites)
const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Función para obtener la API key desde Secrets Manager
async function getWeatherAPIKey(): Promise<string> {
  try {
    const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
    const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });
    
    const command = new GetSecretValueCommand({
      SecretId: 'weather-api-key',
    });
    
    const response = await secretsClient.send(command);
    const secret = JSON.parse(response.SecretString || '{}');
    const apiKey = secret.apiKey;
    
    // Verificar si la API key es válida haciendo una prueba
    if (apiKey && apiKey !== 'demo') {
      try {
        const testUrl = `https://api.openweathermap.org/data/2.5/weather?q=Madrid&appid=${apiKey}&units=metric&lang=es`;
        const testResponse = await fetch(testUrl);
        
        if (testResponse.status === 401) {
          console.log('API key no válida, usando datos de ejemplo');
          return 'demo';
        }
        
        return apiKey;
      } catch (error) {
        console.log('Error verificando API key, usando datos de ejemplo');
        return 'demo';
      }
    }
    
    return 'demo';
  } catch (error) {
    console.error('Error getting weather API key:', error);
    return 'demo';
  }
}

export async function getCurrentWeather(city: string, countryCode?: string): Promise<string> {
  try {
    const location = countryCode ? `${city},${countryCode}` : city;
    
    // Obtener API key desde Secrets Manager
    const apiKey = await getWeatherAPIKey();
    
    // Si no hay API key, usar datos de ejemplo
    if (apiKey === 'demo') {
      return getDemoWeatherData(location);
    }

    const url = `${WEATHER_BASE_URL}/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric&lang=es`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 401) {
        return `❌ Error: API key de clima no válida. Usando datos de ejemplo para ${location}.`;
      }
      if (response.status === 404) {
        return `❌ No se encontró información del clima para "${location}". Verifica el nombre de la ciudad.`;
      }
      throw new Error(`Error del servidor: ${response.status}`);
    }
    
    const data = await response.json();
    
    const weatherInfo = `
🌤️ **Clima Actual en ${data.name}, ${data.sys.country}**

🌡️ **Temperatura**: ${Math.round(data.main.temp)}°C
🌡️ **Sensación térmica**: ${Math.round(data.main.feels_like)}°C
☁️ **Condición**: ${data.weather[0].description}
💧 **Humedad**: ${data.main.humidity}%
💨 **Viento**: ${Math.round(data.wind.speed * 3.6)} km/h (${Math.round(data.wind.speed)} m/s)
📊 **Presión**: ${data.main.pressure} hPa

🕐 **Última actualización**: ${new Date().toLocaleString('es-ES')}
    `.trim();
    
    return weatherInfo;
    
  } catch (error) {
    console.error('Error getting weather:', error);
    return `❌ Error al obtener el clima para "${city}". Usando datos de ejemplo.`;
  }
}

export async function getWeatherForecast(city: string, days: number = 5): Promise<string> {
  try {
    // Obtener API key desde Secrets Manager
    const apiKey = await getWeatherAPIKey();
    
    // Si no hay API key, usar datos de ejemplo
    if (apiKey === 'demo') {
      return getDemoForecastData(city, days);
    }

    const url = `${WEATHER_BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=es&cnt=${days * 8}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 401) {
        return `❌ Error: API key de clima no válida. Usando pronóstico de ejemplo para ${city}.`;
      }
      if (response.status === 404) {
        return `❌ No se encontró pronóstico para "${city}". Verifica el nombre de la ciudad.`;
      }
      throw new Error(`Error del servidor: ${response.status}`);
    }
    
    const data = await response.json();
    
    let forecastInfo = `🌤️ **Pronóstico del Clima para ${data.city.name}, ${data.city.country}**\n\n`;
    
    // Agrupar por día
    const dailyData = new Map();
    
    data.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000).toLocaleDateString('es-ES', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
      
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          temps: [],
          conditions: [],
          humidity: []
        });
      }
      
      const dayData = dailyData.get(date);
      dayData.temps.push(item.main.temp);
      dayData.conditions.push(item.weather[0].description);
      dayData.humidity.push(item.main.humidity);
    });
    
    // Mostrar resumen diario
    dailyData.forEach((dayData, date) => {
      const maxTemp = Math.round(Math.max(...dayData.temps));
      const minTemp = Math.round(Math.min(...dayData.temps));
      const avgHumidity = Math.round(dayData.humidity.reduce((a: number, b: number) => a + b, 0) / dayData.humidity.length);
      const mainCondition = getMostFrequent(dayData.conditions);
      
      forecastInfo += `📅 **${date}**\n`;
      forecastInfo += `🌡️ ${minTemp}°C - ${maxTemp}°C\n`;
      forecastInfo += `☁️ ${mainCondition}\n`;
      forecastInfo += `💧 ${avgHumidity}% humedad\n\n`;
    });
    
    forecastInfo += `🕐 **Pronóstico generado**: ${new Date().toLocaleString('es-ES')}`;
    
    return forecastInfo;
    
  } catch (error) {
    console.error('Error getting forecast:', error);
    return `❌ Error al obtener el pronóstico para "${city}". Usando datos de ejemplo.`;
  }
}

// Función auxiliar para obtener el elemento más frecuente
function getMostFrequent(arr: string[]): string {
  const frequency: { [key: string]: number } = {};
  let maxFreq = 0;
  let mostFrequent = arr[0];
  
  arr.forEach(item => {
    frequency[item] = (frequency[item] || 0) + 1;
    if (frequency[item] > maxFreq) {
      maxFreq = frequency[item];
      mostFrequent = item;
    }
  });
  
  return mostFrequent;
}

// Datos de ejemplo para cuando no hay API key
function getDemoWeatherData(location: string): string {
  const conditions = ['Soleado', 'Parcialmente nublado', 'Nublado', 'Lluvia ligera'];
  const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
  const temp = Math.floor(Math.random() * 30) + 10; // 10-40°C
  const feelsLike = temp + Math.floor(Math.random() * 6) - 3; // ±3°C
  const humidity = Math.floor(Math.random() * 40) + 40; // 40-80%
  const windSpeed = Math.floor(Math.random() * 20) + 5; // 5-25 km/h
  
  return `
🌤️ **Clima Actual en ${location}** (Datos de Ejemplo)

🌡️ **Temperatura**: ${temp}°C
🌡️ **Sensación térmica**: ${feelsLike}°C
☁️ **Condición**: ${randomCondition}
💧 **Humedad**: ${humidity}%
💨 **Viento**: ${windSpeed} km/h
📊 **Presión**: ${Math.floor(Math.random() * 50) + 1000} hPa

🕐 **Última actualización**: ${new Date().toLocaleString('es-ES')}
⚠️ **Nota**: Estos son datos de ejemplo. Para datos reales, configura una API key de clima.
  `.trim();
}

function getDemoForecastData(city: string, days: number): string {
  const conditions = ['Soleado', 'Parcialmente nublado', 'Nublado', 'Lluvia ligera', 'Tormenta'];
  const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  let forecastInfo = `🌤️ **Pronóstico del Clima para ${city}** (Datos de Ejemplo)\n\n`;
  
  for (let i = 1; i <= Math.min(days, 7); i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const weekday = weekdays[date.getDay()];
    const month = date.toLocaleDateString('es-ES', { month: 'short' });
    const day = date.getDate();
    
    const maxTemp = Math.floor(Math.random() * 15) + 20; // 20-35°C
    const minTemp = maxTemp - Math.floor(Math.random() * 10) - 5; // 5-15°C menos
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    const humidity = Math.floor(Math.random() * 40) + 40; // 40-80%
    
    forecastInfo += `📅 **${weekday}, ${day} ${month}**\n`;
    forecastInfo += `🌡️ ${minTemp}°C - ${maxTemp}°C\n`;
    forecastInfo += `☁️ ${condition}\n`;
    forecastInfo += `💧 ${humidity}% humedad\n\n`;
  }
  
  forecastInfo += `🕐 **Pronóstico generado**: ${new Date().toLocaleString('es-ES')}\n`;
  forecastInfo += `⚠️ **Nota**: Estos son datos de ejemplo. Para datos reales, configura una API key de clima.`;
  
  return forecastInfo;
}

// Función principal para detectar consultas de clima
export function isWeatherQuery(query: string): boolean {
  const weatherKeywords = [
    'clima', 'tiempo', 'temperatura', 'lluvia', 'sol', 'nublado',
    'weather', 'temperature', 'rain', 'sunny', 'cloudy',
    'grados', 'celsius', 'fahrenheit', 'humedad', 'viento',
    'pronóstico', 'forecast', 'hoy', 'mañana', 'semana'
  ];
  
  const queryLower = query.toLowerCase();
  return weatherKeywords.some(keyword => queryLower.includes(keyword));
}

// Función para extraer ubicación de la consulta
export function extractLocation(query: string): string | null {
  const locationPatterns = [
    /(?:en|de|para|el clima de|tiempo en)\s+([A-Za-zÀ-ÿ\s]+?)(?:\s|$|\.|,)/i,
    /([A-Za-zÀ-ÿ\s]+?)\s+(?:clima|tiempo|temperatura)/i,
    /(?:clima|tiempo)\s+(?:en|de)\s+([A-Za-zÀ-ÿ\s]+?)(?:\s|$|\.|,)/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const location = match[1].trim();
      if (location.length > 2 && location.length < 50) {
        return location;
      }
    }
  }
  
  return null;
}
