import { OpenAI } from 'openai'
import * as fal from "@fal-ai/serverless-client";
import { Notice } from 'obsidian';
import { DocumentInfo } from './types';

const systemPrompt = `
Create a prompt to be used by an AI image generator in order to create a banner for an Obsidian document. The markdown document of the file will be provided, along with user-provided context as to what the documents purpose is. The name of the document does not need to be provided in the image prompt, and assume the image generator has no background information or context. Respond with only the prompt for image generation, and use the below guide to help design the prompt.

I. Basic Prompt Structure
[Subject] [Action/Pose] [Setting] [Style] [Additional Details]
II. Expanded Prompt Elements
Subject: The main focus of the image
Example: "A majestic lion", "A futuristic cityscape", "A bouquet of wildflowers"
Action/Pose (if applicable): What the subject is doing
Example: "standing proudly", "bustling with flying cars", "arranged in a vintage vase"
Setting: Where the scene takes place
Example: "on a savannah at sunset", "under a purple sky", "on a rustic wooden table"
Style: Artistic style or medium
Example: "photorealistic", "oil painting", "watercolor sketch"
Additional Details:
Lighting: "soft ambient light", "harsh shadows", "golden hour glow"
Color palette: "muted earth tones", "vibrant neon colors", "pastel shades"
Mood: "serene", "mysterious", "joyful", "melancholic"
Composition: "close-up", "wide angle", "bird's eye view"
III. Creating Realistic, Non-Clipart Images
Specify realistic styles:
Use terms like "photorealistic", "hyperrealistic", or "lifelike"
Example: "Create a photorealistic image of a snow-capped mountain"
Add texture details:
Mention specific textures to add depth and realism
Example: "rough tree bark", "smooth polished marble", "weathered leather"
Emphasize complex lighting:
Describe sophisticated lighting scenarios
Example: "soft diffused sunlight filtering through morning mist"
Include subtle imperfections:
Add slight flaws or asymmetries for a more natural look
Example: "an old pocket watch with a slightly scratched face"
Mention photographic techniques:
Use terms like "shallow depth of field", "long exposure", or "macro photography"
Example: "Capture the flower with a macro lens, focusing on the delicate stamens"
Avoid cartoonish terms:
Steer clear of words like "cartoon", "clipart", or "vector"
Instead, use terms like "detailed illustration" or "precise drawing" if you want a non-photorealistic style
Specify materials and fine details:
Mention specific materials and intricate details
Example: "a hand-blown Murano glass vase with swirling patterns of blue and gold"
IV. Avoiding Overdetailed or Cluttered Images
Use "focus on" or "emphasize" phrases:
Example: "Focus on the lion's face" or "Emphasize the lighthouse structure"
This helps direct the AI's attention to the main subject
Specify a simple background:
Example: "with a blurred forest background" or "against a plain white backdrop"
This can help prevent the AI from adding unnecessary details
Limit the number of elements in your prompt:
Instead of describing multiple objects, stick to one or two main elements
Example: "A single red rose in a clear glass vase" rather than "A bouquet of various flowers in a decorated room"
Use negative prompts:
Explicitly state what you don't want in the image
Example: "A cityscape at night, no people, no vehicles"
Specify the composition:
Use terms like "close-up", "medium shot", or "wide angle" to control how much of the scene is shown
Example: "A close-up portrait of an elderly man, focusing on his weathered face"
Avoid certain trigger words:
Some words might prompt the AI to add unwanted elements
For instance, avoid words like "map", "diagram", or "layout" unless you specifically want these elements
Use simplicity-oriented style words:
Incorporate terms like "minimalist", "clean", or "uncluttered" in your prompt
Example: "A minimalist landscape showing a single tree on a hill"
Iterate and refine:
If you get an overdetailed result, try simplifying your prompt and regenerating the image
V. Example Prompts
Basic prompt: "A majestic lion standing proudly on a savannah at sunset, oil painting style with warm earth tones and dramatic lighting."
Realistic, non-clipart prompt: "A weathered lighthouse on a rocky coast, photorealistic style, with detailed textures of peeling paint and rusted metal. Dramatic lighting with the warm glow of sunset casting long shadows. Capture the scene using a wide-angle lens perspective with a slightly tilted horizon for dynamic composition."
Detailed, artistic prompt: "A close-up of a dewdrop on a spider's web, hyperrealistic style. Capture the refraction of light through the water droplet, revealing a distorted image of the background forest. Use macro photography techniques to emphasize the intricate details of the silk strands. Soft, diffused morning light creates a dreamy atmosphere with a cool color palette dominated by blues and greens."
Focused, uncluttered prompt: "Close-up portrait of a lion, emphasizing its majestic mane. Simple, blurred savannah background. Photorealistic style with warm lighting. Focus on the lion's face, avoiding any additional elements."
VI. General Tips for Effective Prompts
Be specific and descriptive in your language
Use vivid adjectives and adverbs to convey your vision
Combine unexpected elements for unique and interesting results
Experiment with different styles and moods
Refine your prompt based on the generated results, iterating as necessary
Balance detail with focus to avoid cluttered or overcomplex images
Use the structure and tips provided, but don't be afraid to experiment and find what works best for you

Again, Respond with only the prompt for image generation`

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

    async generate(additionalContext: string, docInfo: DocumentInfo): Promise<string> {
        try {
            new Notice("Generating prompt...")
            const imagePrompt = await this.generateImagePrompt(`ADDITIONAL DOCUMENT INFORMATION PROVIDED BY USER: ${additionalContext}\n# ${docInfo.title}\n${docInfo.content}`);
            new Notice("Generated prompt: " + imagePrompt.slice(0, 100) + "...")

            new Notice("Generating image...")
            const imageUrl = await this.generateImage(imagePrompt);
            new Notice("Generated image: " + imageUrl.slice(0, 100) + "...")
            return imageUrl;
        } catch (error) {
            new Notice("Error generating image:", error);
            throw error;
        }
    }

    private async generateImagePrompt(markdownDocument: string): Promise<string> {
        try {
            const response = await this.openaiClient.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: markdownDocument
                    }
                ],
                max_tokens: 100,
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

    private async generateImage(imagePrompt: string): Promise<string> {
        const result = await fal.subscribe("fal-ai/flux/schnell", {
            input: {
                prompt: imagePrompt,
                image_size: {
                    width: 2000,
                    height: 300
                },
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