import { ImageGen } from 'lib/imagegen';
import { InputModal } from 'lib/inputmodal';
import { SettingsTab } from 'lib/settingstab';
import { DocumentInfo, MyPluginSettings } from 'lib/types';
import { Notice, Plugin, TFile } from 'obsidian';

const DEFAULT_SETTINGS: MyPluginSettings = {
    openAiApiKey: '',
    falApiKey: ''
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
            callback: () => this.generateBannerImage()
        });

        this.addSettingTab(new SettingsTab(this.app, this));
    }

	async generateBannerImage() {
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
                const imageUrl = await this.imageGen.generate(input, docInfo);
                
                new Notice('Saving image to vault...');
                const savedImagePath = await this.saveImageToVault(imageUrl);
                
                await this.prependImageToDocument(activeFile, savedImagePath);
                new Notice('Image generated, saved, and prepended to the document');
            } catch (error) {
                console.error("Error in image generation process:", error);
                new Notice('Failed to complete the image generation process');
            }
        }).open();
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

	async saveImageToVault(imageUrl: string): Promise<string> {
        try {
            const response = await fetch(imageUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            
            const fileName = `generated_image_${Date.now()}.png`;
            const filePath = `ai_banners/${fileName}`;
            
            await this.app.vault.createBinary(filePath, arrayBuffer);
            
            return filePath;
        } catch (error) {
            console.error("Error saving image to vault:", error);
            throw new Error("Failed to save image to vault");
        }
    }

    async prependImageToDocument(file: TFile, imagePath: string) {
        const content = await this.app.vault.read(file);
        const updatedContent = `![[${imagePath}|banner]]\n${content}`;
        await this.app.vault.modify(file, updatedContent);
    }
}