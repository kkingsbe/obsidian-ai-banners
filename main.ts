import { ImageGen } from 'lib/imagegenv2';
import { InputModal } from 'lib/inputmodal';
import { SettingsTab } from 'lib/settingstab';
import { DocumentInfo, MyPluginSettings } from 'lib/types';
import { Editor, MarkdownView, Notice, Plugin, TFile } from 'obsidian';

const DEFAULT_SETTINGS: MyPluginSettings = {
    openAiApiKey: '',
    falApiKey: ''
}

interface IGeneratedImagePath {
    obsidianRelUrl: string;
    fullUrl: string;
}

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings;
    imageGen: ImageGen;

    async onload() {
        await this.loadSettings();
        this.imageGen = new ImageGen(this.settings.falApiKey, this.settings.openAiApiKey);

        this.addCommand({
            id: 'generate-banner-image',
            name: 'Generate Banner Image (Flux AI)',
            callback: () => this.generateImage("banner")
        });

        this.addCommand({
            id: 'generate-inline-image',
            name: 'Generate Inline Image (Flux AI, 4:3)',
            callback: () => this.generateImage("inline")
        })

        this.addSettingTab(new SettingsTab(this.app, this));
    }

	async generateImage(type: "banner"|"inline") {
        if (!this.settings.openAiApiKey || !this.settings.falApiKey) {
            new Notice('Please enter your OpenAI and fal.ai API keys in the settings');
            return;
        }

        new InputModal(this.app, async (input: string) => {
            try {
                const activeFile = this.app.workspace.getActiveFile();
                if (!(activeFile instanceof TFile)) {
                    new Notice('No file is currently open');
                    return;
                }

                new Notice('Generating image...');
                const docInfo = await this.getCurrentFileInfo();

                // Use the user input in the image generation process
                const imageGenRes = await this.imageGen.generate(input, docInfo, type);
                const imageUrl = imageGenRes.imageUrl;
                
                new Notice('Saving image to vault...');
                const imageInfo = await this.saveImageToVault(imageUrl);
                
                if(type == "banner") {
                    await this.prependImageToDocument(activeFile, imageInfo.obsidianRelUrl);
                    new Notice('Image generated, saved, and prepended to the document');
                } else if(type == "inline") {
                    await this.insertInlineImageAtCursor(imageInfo.fullUrl);
                    const revisedImageGenRes = await this.imageGen.generateRevised(imageGenRes.imageDescription, imageGenRes.imagePrompt, imageGenRes.imageUrl);
                    
                    new Notice('Saving image to vault...');
                    const revisedInfo = await this.saveImageToVault(revisedImageGenRes.imageUrl);
                    await this.insertInlineImageAtCursor(revisedInfo.fullUrl);
                    new Notice('Image generated, saved, and inserted at cursor');
                }
            } catch (error) {
                console.error("Error in image generation process:", error);
                new Notice('Failed to complete the image generation process');
            }
        }).open();
    }

    async insertInlineImageAtCursor(imagePath: string) {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            new Notice('No active document');
            return;
        }

        const editor = activeView.editor;
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        const beforeCursor = line.slice(0, cursor.ch);
        const afterCursor = line.slice(cursor.ch);

        const newLine = `${beforeCursor}![[${imagePath}]]${afterCursor}`;
        editor.setLine(cursor.line, newLine);
    }

    onunload() {}

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.imageGen = new ImageGen(this.settings.falApiKey, this.settings.openAiApiKey);
    }

    async getCurrentFileInfo(): Promise<DocumentInfo> {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile instanceof TFile) {
            const content = await this.app.vault.read(activeFile);
            return {
                title: activeFile.basename,
                content: content
            };
        }
        return {
            title: "",
            content: ""
        };
    }

	async saveImageToVault(imageUrl: string): Promise<IGeneratedImagePath> {
        try {
            const response = await fetch(imageUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            
            const fileName = `generated_image_${Date.now()}.png`;
            const filePath = `ai_banners/${fileName}`;
            
            const file = await this.app.vault.createBinary(filePath, arrayBuffer);
            
            return {
                obsidianRelUrl: filePath,
                fullUrl: file.path
            };
        } catch (error) {
            console.error("Error saving image to vault:", error);
            throw new Error("Failed to save image to vault");
        }
    }

    async prependImageToDocument(file: TFile, imagePath: string) {
        const content = await this.app.vault.read(file);
        const lines = content.split('\n');
        let frontmatterEndIndex = -1;
    
        // Find the end of frontmatter if it exists
        for (let i = 0; i < lines.length; i++) {
            if (lines[i] === '---') {
                if (i === 0) {
                    frontmatterEndIndex = lines.indexOf('---', 1);
                } else {
                    frontmatterEndIndex = i;
                    break;
                }
            }
        }
    
        // Insert the banner image after the frontmatter (if exists) or at the top
        const insertIndex = frontmatterEndIndex !== -1 ? frontmatterEndIndex + 1 : 0;
        lines.splice(insertIndex, 0, `![[${imagePath}|banner]]`);
    
        const updatedContent = lines.join('\n');
        await this.app.vault.modify(file, updatedContent);
    }
}