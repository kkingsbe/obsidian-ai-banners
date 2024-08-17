import MyPlugin from "main";
import { App, PluginSettingTab, Setting } from "obsidian";

export class SettingsTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('OpenAI API Key')
            .addText(text => text
                .setPlaceholder('Enter your key')
                .setValue(this.plugin.settings.openAiApiKey)
                .onChange(async (value) => {
                    this.plugin.settings.openAiApiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('fal.ai API Key')
            .addText(text => text
                .setPlaceholder('Enter your key')
                .setValue(this.plugin.settings.falApiKey)
                .onChange(async (value) => {
                    this.plugin.settings.falApiKey = value;
                    await this.plugin.saveSettings();
                }));
                
    }
}