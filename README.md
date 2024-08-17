# Obsidian Banner Generator Plugin

Enhance your Obsidian documents with stunning, AI-generated banner images using GPT and Flux AI.

## Features

- Create custom banner images tailored to your document's content
- Seamlessly integrate with Obsidian's interface
- Automatically save generated images to your vault
- Effortlessly prepend banner images to your documents

## Prerequisites

Before using this plugin, you'll need:

- An OpenAI API key
- A Flux AI (fal.ai) API key

## Installation

1. Launch Obsidian and navigate to Settings > Community Plugins
2. Disable Safe Mode
3. Click "Browse" and search for "Banner Generator"
4. Install and enable the plugin

## Setup

1. Go to Settings > Banner Generator
2. Enter your OpenAI API key
3. Enter your Flux AI (fal.ai) API key

## How to Use

1. Open any document in Obsidian
2. Access the command palette (Ctrl/Cmd + P)
3. Search for and select "Generate Banner Image (Flux AI)"
4. (Optional) Provide a brief description of your document's purpose
   - For longer documents, the plugin can effectively use the existing content as context
   - For shorter documents or when you want more control, add a description to guide the image generation
5. Wait briefly while your custom banner image is created and added to your document

## Behind the Scenes

1. The plugin analyzes your document's title, content, and any additional input you provide
2. It sends this information to GPT-4 to create an enhanced, contextual prompt
3. The refined prompt is then processed by Flux AI to generate a unique image
4. The resulting image is saved in your Obsidian vault and automatically prepended to your document

## Troubleshooting

If you encounter issues:

- Verify that your API keys are correctly entered in the plugin settings
- Ensure you have a stable internet connection
- For any errors, check the console log and report issues on our GitHub page

## Support and Feedback

We welcome your input! If you experience any problems or have ideas for improvements, please open an issue on our GitHub repository.

## License
This project is licensed under the MIT License. See the LICENSE file for details.
---

Elevate your Obsidian documents with captivating, AI-generated banners!
