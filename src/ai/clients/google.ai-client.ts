import { GoogleGenAI } from "@google/genai";
import { Logger } from "@nestjs/common";

const MAX_TOKENS = 10000;

export class GoogleAIClient {
  private static readonly TextModel = "gemini-2.5-flash";

  private readonly genAI: GoogleGenAI;
  private readonly logger = new Logger(GoogleAIClient.name);

  constructor(apiKey: string) {
    if (!apiKey) {
      this.logger.error("GOOGLE_AI_API_KEY is not set");
    } else {
      this.genAI = new GoogleGenAI({ apiKey });
    }
  }

  async generateText(
    prompt: string,
    systemInstruction?: string
  ): Promise<string> {
    const settings: Record<string, unknown> = {
      contents: prompt,
      model: GoogleAIClient.TextModel,
      config: {},
    };

    if (systemInstruction) {
      settings.config = { systemInstruction };
    }

    const result = await this.genAI.models.generateContent({
      contents: prompt,
      model: GoogleAIClient.TextModel,
    });

    return result.text;
  }

  async generateJson<T = any>(
    prompt: string,
    responseSchema: Record<string, unknown>,
    systemInstruction?: string,
    propertyOrdering?: string[]
  ): Promise<T> {
    try {
      const processedSchema = { ...responseSchema };
      if (propertyOrdering && propertyOrdering.length > 0) {
        processedSchema["propertyOrdering"] = propertyOrdering;
      }

      const config: Record<string, unknown> = {
        responseMimeType: "application/json",
        responseSchema: processedSchema,
      };

      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }

      const result = await this.genAI.models.generateContent({
        contents: prompt,
        model: GoogleAIClient.TextModel,
        config,
      });

      console.log(result.text);
      const jsonResponse = JSON.parse(result.text);
      return jsonResponse as T;
    } catch (error) {
      this.logger.error(`Error generating JSON content: ${error.message}`);
      throw new Error(`Failed to generate JSON content: ${error.message}`);
    }
  }

  async analyzeImage(
    imageData: string | Buffer,
    prompt: string,
    mimeType: string = "image/jpeg",
    systemInstruction?: string
  ): Promise<string> {
    try {
      const base64Data = Buffer.isBuffer(imageData)
        ? imageData.toString("base64")
        : imageData;

      const config: Record<string, unknown> = {
        maxOutputTokens: MAX_TOKENS,
      };

      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }

      const result = await this.genAI.models.generateContent({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        model: GoogleAIClient.TextModel,
        config,
      });

      return result.text;
    } catch (error) {
      this.logger.error(`Error analyzing image: ${error.message}`);
      throw new Error(`Failed to analyze image: ${error.message}`);
    }
  }

  async analyzeImageWithJson<T = any>(
    imageData: string | Buffer,
    prompt: string,
    responseSchema: Record<string, unknown>,
    mimeType: string = "image/jpeg",
    systemInstruction?: string,
    propertyOrdering?: string[]
  ): Promise<T> {
    try {
      const base64Data = Buffer.isBuffer(imageData)
        ? imageData.toString("base64")
        : imageData;

      const processedSchema = { ...responseSchema };
      if (propertyOrdering && propertyOrdering.length > 0) {
        processedSchema["propertyOrdering"] = propertyOrdering;
      }

      const config: Record<string, unknown> = {
        responseMimeType: "application/json",
        responseSchema: processedSchema,
      };

      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }

      const result = await this.genAI.models.generateContent({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        model: GoogleAIClient.TextModel,
        config,
      });

      const jsonResponse = JSON.parse(result.text);
      return jsonResponse as T;
    } catch (error) {
      this.logger.error(`Error analyzing image with JSON: ${error.message}`);
      throw new Error(`Failed to analyze image with JSON: ${error.message}`);
    }
  }
}
