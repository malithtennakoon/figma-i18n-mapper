# Figma i18n Key Mapper

A production-ready web application that automatically generates i18n keys for Japanese text from Figma designs by comparing them with existing localization files.

## Features

- **Figma Integration**: Extracts text from Figma designs using the Figma REST API
- **Language Detection**: Automatically detects and filters Japanese text
- **Smart Comparison**: Compares extracted text against existing localization files
- **AI-Powered Key Generation**: Uses OpenAI (GPT-4o-mini) to generate semantic, context-aware i18n keys
- **Beautiful UI**: Clean, minimal dashboard built with Next.js and shadcn/ui
- **Export Options**: Copy to clipboard or download generated JSON

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **State Management**: React Query
- **AI**: OpenAI API (GPT-4o-mini)
- **APIs**: Figma REST API

## Getting Started

### Prerequisites

- Node.js 18+ installed
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- Figma API token (optional, for private files) ([Get one here](https://www.figma.com/developers/api#access-tokens))

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd figma-i18n-mapper
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.local.example .env.local
```

4. Add your API keys to `.env.local`:
```env
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_FIGMA_API_TOKEN=your_figma_token_here  # Optional
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Step-by-Step Workflow

1. **Upload Localization Files**
   - Upload your `en.json` (English) and `jp.json` (Japanese) localization files
   - Both files must be valid JSON

2. **Configure Figma**
   - Enter your Figma file URL (e.g., `https://www.figma.com/file/...`)
   - For private files, provide a Figma API token

3. **Enter OpenAI Key**
   - Provide your OpenAI API key for AI-powered key generation

4. **Generate Keys**
   - Click "Generate i18n Keys"
   - The app will:
     - Extract all text from your Figma file
     - Filter for Japanese text only
     - Compare against existing `jp.json`
     - Generate new keys for texts not in your current localization

5. **Export Results**
   - View the generated keys with syntax highlighting
   - Copy to clipboard or download as JSON

## Example

### Input

**Figma Design:**
- Frame: "Onboarding"
- Texts: "ようこそ", "次へ", "スキップ"

**Existing jp.json:**
```json
{
  "Welcome": {
    "title": "ホーム画面"
  }
}
```

### Output

```json
{
  "Onboarding": {
    "title": "ようこそ",
    "next": "次へ",
    "skip": "スキップ"
  }
}
```

## AI Key Generation Rules

The AI follows these naming conventions:

- **CamelCase/PascalCase**: Based on parent object style
- **Descriptive Keys**: Short but meaningful (e.g., "CTA", "title", "desc")
- **Frame Context**: Uses Figma frame names as top-level keys
- **Button/CTA**: Names like "CTA", "button", "confirm", "cancel"
- **Long Text**: Uses "desc" or "body" for paragraphs
- **No Generic Names**: Avoids "text1", "label2", etc.
- **Pattern Reuse**: Follows existing JSON structure patterns

## Project Structure

```
figma-i18n-mapper/
├── app/
│   ├── api/
│   │   ├── figma/          # Figma extraction endpoint
│   │   └── generate-keys/  # AI key generation endpoint
│   └── page.tsx            # Main application page
├── components/
│   ├── custom/
│   │   ├── file-upload.tsx # File upload component
│   │   └── json-viewer.tsx # JSON viewer with syntax highlighting
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── utils/
│   │   ├── figma.ts        # Figma API utilities
│   │   ├── language.ts     # Language detection
│   │   ├── json-compare.ts # JSON comparison utilities
│   │   └── openai.ts       # OpenAI integration
│   └── types.ts            # TypeScript types
└── .env.local.example      # Environment variables template
```

## API Routes

### POST /api/figma

Extracts text from a Figma file.

**Request:**
```json
{
  "figmaUrl": "https://www.figma.com/file/...",
  "figmaToken": "optional-token",
  "jpJson": "{...}"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTextNodes": 50,
    "japaneseNodes": 20,
    "newNodes": 5,
    "newTexts": [...],
    "contextSample": "..."
  }
}
```

### POST /api/generate-keys

Generates i18n keys using AI.

**Request:**
```json
{
  "nodes": [...],
  "contextSample": "...",
  "openaiApiKey": "sk-..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "generatedKeys": {...},
    "count": 5
  }
}
```

## Deployment

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Or manually:

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for key generation |
| `NEXT_PUBLIC_FIGMA_API_TOKEN` | No | Figma API token (for private files) |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

## Support

For issues or questions, please open an issue on GitHub.
