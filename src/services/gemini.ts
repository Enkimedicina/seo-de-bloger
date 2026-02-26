import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateTitles(topic: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Actúa como un Redactor SEO Senior. Tu objetivo es crear un calendario editorial de 20 títulos únicos y optimizados para SEO sobre el tema: "${topic}". 
    Los títulos deben ser impactantes, libres de derechos y optimizados para Blogger.
    Responde ÚNICAMENTE con un array JSON de strings.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });
  
  try {
    return JSON.parse(response.text || "[]") as string[];
  } catch (e) {
    console.error("Error parsing titles:", e);
    return [];
  }
}

export async function generateOutline(title: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Actúa como un Redactor SEO Senior. Crea un esquema (outline) detallado para un artículo titulado: "${title}".
    El esquema debe tener al menos 10 subsecciones (H2, H3).
    Incluye una breve descripción de lo que se debe tratar en cada sección para asegurar que el artículo final llegue a las 3,000 palabras.
    Responde ÚNICAMENTE con un array JSON de objetos con las propiedades "title" y "description".`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["title", "description"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]") as { title: string; description: string }[];
  } catch (e) {
    console.error("Error parsing outline:", e);
    return [];
  }
}

export async function generateSectionContent(articleTitle: string, outline: any[], sectionIndex: number, previousContent: string = "") {
  const section = outline[sectionIndex];
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Actúa como un Redactor SEO Senior. Estás escribiendo un artículo de 3,000 palabras titulado "${articleTitle}".
    
    CONTEXTO DEL ESQUEMA:
    ${JSON.stringify(outline, null, 2)}
    
    TAREA:
    Redacta de forma EXTENSA, DETALLADA y PROFESIONAL la sección "${section.title}".
    Descripción de la sección: ${section.description}
    
    CONTENIDO PREVIO (para coherencia):
    ${previousContent.slice(-1000)}
    
    REQUISITOS:
    - Usa un tono informativo y cercano.
    - Usa formato Markdown (H2, H3, listas, negritas).
    - Sé muy descriptivo para ayudar a alcanzar el objetivo de palabras.
    - Evita clichés.
    - No repitas información de secciones anteriores.
    
    Responde solo con el contenido de esta sección en Markdown.`,
  });

  return response.text || "";
}
