import { OpenAI } from 'openai'
import * as fal from "@fal-ai/serverless-client";
import { Notice } from 'obsidian';
import { DocumentInfo } from './types';
import * as fs from 'fs';
import { Readable } from 'stream';

const imageDescriptionPrompt = `
Determine what image would make an appealing yet appropriate banner for the provided markdown document, and then generate a highly accurate and detailed description of the image. Pay close attention to the context within the source material to ensure the description captures the item or scene's specific and intended purpose, appearance, and function. Avoid relying on common associations or stereotypes related to the terminology used and focus instead on the unique characteristics as described or depicted in the original source. If the item or scene has unconventional or non-standard features, emphasize these aspects to maintain fidelity to the original intent and description.
`

const imageGenerationPrompt = `
You are an AI that generates detailed image descriptions for an AI image generator. When provided with a description, expand it into a comprehensive and vivid prompt. Include specific details about the subject, environment, style, lighting, mood, and any additional elements to create a clear and precise image prompt. Ensure that the description is detailed enough to guide the image generator in producing a high-quality and accurate image
`

interface ImageGenResult {
    imageUrl: string;
    imageDescription: string;
    imagePrompt: string;
}

export class ImageGen {
    private openaiClient: OpenAI;

    constructor(fal_key: string, openai_key: string) {
        fal.config({
            credentials: fal_key
        });
        this.openaiClient = new OpenAI({
            apiKey: openai_key,
            dangerouslyAllowBrowser: true
        });
    }

    async generate(additionalContext: string, docInfo: DocumentInfo, type: "banner"|"inline"): Promise<ImageGenResult> {
        try {
            new Notice("Generating image description...")
            const imageDescription = await this.generateImageDescription(`ADDITIONAL DOCUMENT INFORMATION PROVIDED BY USER: ${additionalContext}\n# ${docInfo.title}\n${docInfo.content}`);
            new Notice("Generated image description: " + imageDescription.slice(0, 100) + "...")
            new Notice("Generating prompt...")
            const imagePrompt = await this.generateImagePrompt(imageDescription);
            new Notice("Generated prompt: " + imagePrompt.slice(0, 100) + "...")

            new Notice("Generating image...")
            const imageUrl = await this.generateImage(imagePrompt, type);
            new Notice("Generated image: " + imageUrl.slice(0, 100) + "...")
            return { imageUrl, imageDescription, imagePrompt };
        } catch (error) {
            new Notice("Error generating image:", error);
            throw error;
        }
    }

    async generateRevised(imageDescription: string, previousImagePrompt: string, imageUrl: string): Promise<ImageGenResult> {
        try {
            const newPrompt = await this.generateRevisedImagePrompt(imageDescription, previousImagePrompt, imageUrl);
            new Notice("Generated revised image prompt: " + newPrompt.slice(0, 100) + "...")

            new Notice("Generating revised image...")
            const newImageUrl = await this.generateImage(newPrompt, "banner");
            new Notice("Generated revised image: " + newImageUrl.slice(0, 100) + "...")
            return { imageUrl: newImageUrl, imageDescription, imagePrompt: newPrompt };
        } catch (e) {
            new Notice("Error generating revised image:", e);
            throw e;
        }
    }

    private async generateImageDescription(markdownDocument: string): Promise<string> {
        try {
            const response = await this.openaiClient.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: imageDescriptionPrompt
                    },
                    {
                        role: "user",
                        content: markdownDocument
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7,
                n: 1
            });

            if (response.choices && response.choices.length > 0) {
                return response.choices[0].message.content?.trim() || "";
            } else {
                throw new Error("No image description generated");
            }
        } catch (error) {
            console.error("Error generating image description:", error);
            throw error;
        }
    }

    private async uploadImageToOpenai(imageUrl: string): Promise<string> {
        try {
            const res = await this.openaiClient.files.create({ file: await fetch(imageUrl), purpose: "vision" });
            return res.id;
        } catch (error) {
            console.error("Error uploading image to OpenAI:", error);
            throw error;
        }
    }

    private async generateRevisedImagePrompt(imageDescription: string, previousImagePrompt: string, imageUrl: string): Promise<string> {
        const id = await this.uploadImageToOpenai(imageUrl);
        
        try {
            const response = await this.openaiClient.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: imageGenerationPrompt
                    },
                    {
                        role: "user",
                        content: imageDescription
                    },
                    {
                        role: "assistant",
                        content: previousImagePrompt
                    },
                    {
                        role: "assistant",
                        content: `<image: ${id}>`
                    },
                    {
                        role: "user",
                        content: "Does this image fit what you were trying to generate? If not, produce an updated image generation prompt."
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7,
                n: 1
            });

            if (response.choices && response.choices.length > 0) {
                return response.choices[0].message.content?.trim() || "";
            } else {
                throw new Error("No revised image prompt generated");
            }
        } catch (error) {
            console.error("Error generating revised image prompt:", error);
            throw error;
        }
    }

    private async generateImagePrompt(imageDescription: string): Promise<string> {
        try {
            const response = await this.openaiClient.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: imageGenerationPrompt
                    },
                    {
                        role: "user",
                        content: imageDescription
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7,
                n: 1
            });

            if (response.choices && response.choices.length > 0) {
                return response.choices[0].message.content?.trim() || "";
            } else {
                throw new Error("No image prompt generated");
            }
        } catch (error) {
            console.error("Error generating image prompt:", error);
            throw error;
        }
    }

    private async generateImage(imagePrompt: string, type: "banner"|"inline"): Promise<string> {
        let image_size = {
            width: 0,
            height: 0
        }

        if(type === "banner") {
            image_size.width = 2000;
            image_size.height = 300;
        }

        if(type === "inline") {
            image_size.width = 1920;
            image_size.height = 1080;
        }

        const result = await fal.subscribe("fal-ai/flux/schnell", {
            input: {
                prompt: imagePrompt,
                image_size,
                num_inference_steps: 12
            },
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === "IN_PROGRESS") {
                    update.logs.map((log) => log.message).forEach(console.log);
                }
            },
        });

        console.log(result);

        return (result as any).images[0].url
    }
}