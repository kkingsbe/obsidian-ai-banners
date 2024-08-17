import { App, Modal } from "obsidian";

export class InputModal extends Modal {
    private input: string;
    private onSubmit: (input: string) => void;

    constructor(app: App, onSubmit: (input: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

	onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        contentEl.createEl("h2", { text: "Enter additional details for image generation" });

        const inputEl = contentEl.createEl("textarea", {
            attr: {
                style: "width: 100%; height: 150px; margin-bottom: 10px;"
            }
        });
        inputEl.placeholder = "Enter your text here...";

        const buttonEl = contentEl.createEl("button", { 
            text: "Generate Image",
            attr: {
                style: "display: block; width: 100%;"
            }
        });
        
        buttonEl.addEventListener("click", () => {
            this.input = inputEl.value;
            this.close();
            this.onSubmit(this.input);
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}