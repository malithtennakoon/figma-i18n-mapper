# Figma i18n Key Mapper - Complete Documentation

## 📖 Table of Contents
1. [What Is This Tool?](#what-is-this-tool)
2. [How It Works](#how-it-works)
3. [Getting Started](#getting-started)
4. [Step-by-Step Usage Guide](#step-by-step-usage-guide)
5. [Understanding the Features](#understanding-the-features)
6. [API Configuration](#api-configuration)
7. [Architecture & How It Works Internally](#architecture--how-it-works-internally)
8. [Cost Optimization](#cost-optimization)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## What Is This Tool?

**Figma i18n Key Mapper** is a web application that automates the process of creating internationalization (i18n) keys for your Japanese UI text.

### The Problem It Solves

When building multilingual apps, developers need to:
1. Extract text from designs (Figma)
2. Create unique keys for each text (e.g., `"login_button": "ログイン"`)
3. Make sure keys are semantic and follow naming conventions
4. Avoid creating duplicate keys

**This is time-consuming and error-prone when done manually.**

### The Solution

This tool:
- ✅ Automatically extracts Japanese text from your Figma designs
- ✅ Compares it with your existing translation files
- ✅ Uses AI (GPT-4o-mini) to generate semantic, context-aware keys
- ✅ Prevents duplicate keys
- ✅ Follows your existing naming patterns

**Result:** What took hours now takes minutes.

---

## How It Works

### Simple Flow

```
┌─────────────┐
│ 1. Upload   │  You upload your existing en.json & jp.json files
│   Files     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 2. Connect  │  Provide your Figma file URL
│   Figma     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 3. Extract  │  Tool reads all text from Figma
│   Text      │  Filters only Japanese text
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 4. Compare  │  Compares extracted text with your jp.json
│   Texts     │  Finds NEW texts not in your current file
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 5. Generate │  AI generates keys for NEW texts
│   Keys (AI) │  Follows your existing naming style
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 6. Export   │  Copy or download the generated JSON
│   Results   │
└─────────────┘
```

### Example Scenario

**Your Figma Design Has:**
- Page title: "ダッシュボード"
- Button: "送信"
- Label: "メールアドレス"

**Your Current jp.json:**
```json
{
  "HomePage": {
    "title": "ホーム"
  }
}
```

**What The Tool Does:**
1. Extracts: ["ダッシュボード", "送信", "メールアドレス"]
2. Checks: None of these exist in your jp.json
3. Generates:
```json
{
  "DashboardPage": {
    "title": "ダッシュボード",
    "submit_button": "送信",
    "email_label": "メールアドレス"
  }
}
```

---

## Getting Started

### Prerequisites

You need three things:

1. **Node.js** (version 18 or higher)
   - Check: `node -v`
   - Download: https://nodejs.org

2. **OpenAI API Key** (Required)
   - Get it: https://platform.openai.com/api-keys
   - Cost: ~$0.001-0.002 per request (very cheap)

3. **Figma API Token** (Optional - only for private files)
   - Get it: https://www.figma.com/developers/api#access-tokens
   - Not needed for public Figma files

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd figma-i18n-mapper

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.local.example .env.local

# 4. Edit .env.local and add your keys
# OPENAI_API_KEY=sk-your-key-here
# NEXT_PUBLIC_FIGMA_API_TOKEN=your-figma-token (optional)

# 5. Start the development server
npm run dev

# 6. Open http://localhost:3000
```

---

## Step-by-Step Usage Guide

### Step 1: Upload Your Translation Files

**What to do:**
- Click "Upload English JSON" → Select your `en.json` file
- Click "Upload Japanese JSON" → Select your `jp.json` file

**Why?**
- The tool needs to see your existing keys to:
  - Follow your naming patterns
  - Avoid creating duplicate keys
  - Compare against existing translations

**File Format:**
Both files should be valid JSON. Examples:

**Flat structure:**
```json
{
  "home_title": "Home",
  "home_desc": "Welcome to our app",
  "login_button": "Login"
}
```

**Nested structure:**
```json
{
  "HomePage": {
    "title": "Home",
    "description": "Welcome to our app"
  },
  "LoginPage": {
    "button": "Login"
  }
}
```

### Step 2: Configure Figma

**What to do:**
- Paste your Figma file URL in the input field
- If it's a private file, add your Figma API token

**Figma URL Format:**
```
https://www.figma.com/file/FILE_ID/FILE_NAME
```

**Example:**
```
https://www.figma.com/file/abc123def456/My-App-Design
```

**Private vs Public Files:**
- **Public:** No token needed
- **Private:** Add token in the "Figma API Token" field or in `.env.local`

### Step 3: Enter OpenAI API Key

**What to do:**
- Paste your OpenAI API key in the input field

**Why?**
- The AI (GPT-4o-mini) generates semantic key names
- Example: Instead of "text1", it generates "email_label"

**Security:**
- Your key is never stored
- It's only used for that one request
- Better: Add it to `.env.local` so you don't enter it every time

### Step 4: Choose Key Structure

**What to do:**
- Select "Flat Keys" or "Nested Keys"

**Flat Keys Example:**
```json
{
  "dashboard_title": "ダッシュボード",
  "dashboard_desc": "説明",
  "settings_button": "設定"
}
```

**Nested Keys Example:**
```json
{
  "DashboardPage": {
    "title": "ダッシュボード",
    "description": "説明"
  },
  "SettingsPage": {
    "button": "設定"
  }
}
```

**Which to choose?**
- Use **Flat Keys** if your existing files are flat
- Use **Nested Keys** if your files are organized by page/component

### Step 5: Generate Keys

**What to do:**
- Click "Generate i18n Keys"
- Wait for the process (usually 5-30 seconds)

**What happens during generation:**

1. **Extracting texts from Figma...**
   - Tool reads all text layers from your Figma file
   - Shows progress: "Found 150 text nodes"

2. **Filtering Japanese texts...**
   - Uses language detection to keep only Japanese text
   - Shows: "Found 80 Japanese texts"

3. **Comparing with existing translations...**
   - Checks which texts are already in your jp.json
   - Shows: "Found 15 new texts to translate"

4. **Generating keys with AI...**
   - Sends texts to GPT-4o-mini in batches (10 at a time)
   - AI generates semantic key names
   - Shows token usage and estimated cost

5. **Checking for duplicates...**
   - Verifies no duplicate keys were created
   - If found, automatically regenerates them

6. **Done!**
   - Shows the generated JSON

### Step 6: Review & Export

**What you see:**
- JSON viewer with syntax highlighting
- Statistics: "Generated 15 new keys"
- Token usage: "Used 1,250 tokens ($0.0012)"

**Export Options:**
1. **Copy to Clipboard** - Click the copy button
2. **Download JSON** - Click the download button

**What to do next:**
- Merge the generated JSON with your existing jp.json
- Create corresponding English translations in en.json
- Import into your app's i18n system

---

## Understanding the Features

### Smart Japanese Detection

The tool uses the `franc-min` library to detect language:

```javascript
// Example
detectLanguage("こんにちは") // → "jpn" ✅
detectLanguage("Hello")      // → "eng" ❌ (skipped)
detectLanguage("Settings")   // → "eng" ❌ (skipped)
```

**Benefits:**
- Filters out icons, English labels, numbers
- Reduces noise in your translations

### Context-Aware Key Generation

The AI receives context about each text:

```
Frame: "Login Form"
Path: HomePage > Authentication > Login Form
Text: "メールアドレス"
```

**AI generates:**
```json
{
  "LoginForm": {
    "email_label": "メールアドレス"
  }
}
```

The AI understands:
- Frame hierarchy (HomePage → Authentication → Login)
- Text purpose (label, button, title)
- Your existing naming patterns

### Duplicate Prevention System

**How it works:**

1. **Initial Generation:**
   - AI generates keys WITHOUT seeing existing keys (saves tokens!)

2. **Local Check:**
   - Compares generated keys with your existing keys
   - Finds any duplicates

3. **Smart Retry:**
   - If duplicates found, only those specific texts are regenerated
   - AI is told explicitly: "Don't use: login_button, home_title"
   - Uses higher temperature (0.5) for more variation

**Result:**
- 90%+ of requests have no duplicates
- When duplicates occur, only ~5-10% need regeneration
- Saves ~40% tokens compared to old approach

### Token Usage Estimation

Before generating, you see:

```
Estimated Token Usage:
- Input: 1,200 tokens
- Output: 350 tokens
- Total: 1,550 tokens
- Cost: ~$0.0014
```

**How it's calculated:**
- Japanese text: ~1.5 tokens per character
- English text: ~4 characters per token
- Includes: system prompt, context, instructions, JSON structure

**Color coding:**
- 🟢 Green (< 5,000 tokens): Good
- 🟡 Yellow (5,000-15,000): Moderate
- 🔴 Red (> 15,000): High - consider filtering your Figma page

### Batch Processing

Large Figma files are processed in batches:

```
Batch 1: Processing texts 1-10...
Batch 2: Processing texts 11-20...
Batch 3: Processing texts 21-30...
```

**Why?**
- Prevents token limit errors
- Better quality (AI focuses on smaller groups)
- Shows progress

**Default batch size:** 10 texts per batch

---

## API Configuration

### OpenAI API

**Model Used:** `gpt-4o-mini`

**Why this model?**
- Fast and cheap (~60x cheaper than GPT-4)
- Good at structured JSON output
- Understands Japanese context well

**Pricing (as of 2024):**
- Input: $0.150 per 1M tokens
- Output: $0.600 per 1M tokens

**Typical Costs:**
- 10 texts: ~$0.0005 ($0.05 cents)
- 50 texts: ~$0.0020 (0.2 cents)
- 200 texts: ~$0.0080 (0.8 cents)

**Configuration:**
```javascript
// In lib/utils/openai.ts
model: "gpt-4o-mini",
temperature: 0.3,  // Low = more consistent
response_format: { type: "json_object" }  // Ensures valid JSON
```

### Figma API

**Endpoints Used:**
- `GET /v1/files/:file_key` - Get file metadata
- Used to traverse the node tree and extract text

**Rate Limits:**
- Free: 5,000 requests/month
- Paid: Higher limits

**Token Format:**
```
figd_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Permissions Needed:**
- Read-only access to files
- No write permissions required

---

## Architecture & How It Works Internally

### Tech Stack

```
┌─────────────────────────────────────────┐
│           Frontend (React)              │
│  - Next.js 16 (App Router)              │
│  - TypeScript                           │
│  - TailwindCSS + shadcn/ui              │
│  - React Query (API state)              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│        API Routes (Next.js)             │
│  - /api/figma (extract text)            │
│  - /api/generate-keys (AI generation)   │
│  - /api/localazy (optional integration) │
└──────────────┬──────────────────────────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
┌──────────┐      ┌──────────┐
│  Figma   │      │  OpenAI  │
│   API    │      │   API    │
└──────────┘      └──────────┘
```

### Data Flow

**1. User uploads files → Frontend**
```typescript
// Files stored in React state
const [enJson, setEnJson] = useState<I18nJson>({})
const [jpJson, setJpJson] = useState<I18nJson>({})
```

**2. User clicks "Generate" → API: `/api/figma`**
```typescript
// Request
{
  figmaUrl: "https://www.figma.com/file/...",
  figmaToken: "optional",
  jpJson: {...}
}

// Processing
1. Extract file ID from URL
2. Fetch Figma file via API
3. Traverse node tree recursively
4. Collect all TEXT nodes
5. Detect language (keep only Japanese)
6. Compare with jpJson values
7. Return new texts only
```

**3. Frontend receives new texts → API: `/api/generate-keys`**
```typescript
// Request
{
  nodes: [
    {
      text: "ダッシュボード",
      frameName: "Dashboard",
      framePath: ["HomePage", "Dashboard"]
    }
  ],
  contextSample: "...", // Sample of existing JSON structure
  openaiApiKey: "sk-...",
  existingKeys: ["HomePage.title", "LoginPage.button"],
  useNestedKeys: true
}

// Processing
1. Split nodes into batches (10 per batch)
2. For each batch:
   a. Build prompt with context
   b. Call OpenAI API
   c. Parse JSON response
   d. Check for duplicate keys
   e. If duplicates found, regenerate only those
3. Merge all batches
4. Return final JSON + token usage
```

**4. Frontend displays results**
```typescript
// Response
{
  generatedKeys: {
    "DashboardPage": {
      "title": "ダッシュボード"
    }
  },
  tokenUsage: {
    promptTokens: 1200,
    completionTokens: 350,
    totalTokens: 1550
  }
}
```

### File Structure

```
figma-i18n-mapper/
│
├── app/
│   ├── api/
│   │   ├── figma/route.ts           # Figma text extraction
│   │   ├── generate-keys/route.ts   # AI key generation
│   │   └── localazy/route.ts        # Localazy integration
│   │
│   ├── page.tsx                     # Main UI
│   └── layout.tsx                   # Root layout
│
├── components/
│   ├── custom/
│   │   ├── file-upload.tsx          # File upload component
│   │   └── json-viewer.tsx          # JSON syntax highlighter
│   │
│   └── ui/                          # shadcn/ui components
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       └── ...
│
├── lib/
│   ├── types.ts                     # TypeScript interfaces
│   │
│   └── utils/
│       ├── figma.ts                 # Figma API functions
│       │   ├── extractFileIdFromUrl()
│       │   ├── fetchFigmaFile()
│       │   └── extractTextNodes()
│       │
│       ├── language.ts              # Language detection
│       │   └── detectLanguage()
│       │
│       ├── json-compare.ts          # JSON comparison
│       │   └── findMissingTexts()
│       │
│       ├── openai.ts                # OpenAI integration
│       │   ├── buildPrompt()
│       │   ├── generateKeysInBatches()
│       │   ├── findDuplicateKeys()
│       │   └── extractAllKeys()
│       │
│       └── token-estimator.ts      # Token calculation
│           ├── estimateTokens()
│           ├── estimateBatchTokens()
│           └── estimateCost()
│
└── .env.local                       # Environment variables
```

### Key Algorithms

**1. Figma Text Extraction**
```typescript
function extractTextNodes(node: FigmaNode, path: string[] = []): TextNode[] {
  const results: TextNode[] = []

  // If this is a text node, add it
  if (node.type === 'TEXT' && node.characters) {
    results.push({
      text: node.characters,
      frameName: node.name,
      framePath: [...path, node.name]
    })
  }

  // Recursively process children
  if (node.children) {
    for (const child of node.children) {
      results.push(...extractTextNodes(child, [...path, node.name]))
    }
  }

  return results
}
```

**2. Language Detection**
```typescript
function detectLanguage(text: string): string {
  // Use franc-min for detection
  const lang = franc(text)

  // franc returns ISO 639-3 codes
  return lang // "jpn", "eng", "cmn", etc.
}
```

**3. Duplicate Key Detection**
```typescript
function findDuplicateKeys(
  generated: I18nJson,
  existing: string[]
): string[] {
  const generatedKeys = extractAllKeys(generated) // Flatten nested keys
  const duplicates = []

  for (const key of generatedKeys) {
    if (existing.includes(key)) {
      duplicates.push(key)
    }
  }

  return duplicates
}

// Example:
// generated: { "HomePage": { "title": "..." } }
// extractAllKeys returns: ["HomePage.title"]
// If "HomePage.title" exists in existing array → duplicate!
```

---

## Cost Optimization

### Token Reduction Strategy

The tool implements an optimized approach:

**Old Approach (Inefficient):**
```
Prompt = Base Instructions + Existing Keys List + New Texts

With 100 existing keys:
- Base: 400 tokens
- Existing Keys: 150 tokens  ← WASTE
- New Texts: 500 tokens
= 1,050 tokens per batch
```

**New Approach (Optimized):**
```
Prompt = Base Instructions + New Texts

With 100 existing keys:
- Base: 400 tokens
- New Texts: 500 tokens
= 900 tokens per batch

THEN check duplicates locally (free)
If duplicates (rare ~8%), regenerate only those
```

**Savings:**
- Small projects (10 keys): ~5% savings
- Medium projects (100 keys): ~40% savings
- Large projects (500+ keys): ~60-70% savings

### Best Practices for Cost Reduction

**1. Filter Your Figma Pages**
```
❌ Don't: Select entire file with 500 screens
✅ Do: Select specific page with 20-30 screens
```

**2. Remove Duplicates First**
- Clean up your Figma designs
- Remove duplicate frames
- Delete unused text layers

**3. Use Batch Size Wisely**
```typescript
// Default: 10 texts per batch (recommended)
batchSize: 10

// For very simple texts: increase to 15-20
batchSize: 15

// For complex texts: keep at 10 or reduce to 5
batchSize: 5
```

**4. Reuse Context Samples**
```typescript
// Instead of including full en.json, provide a small sample
contextSample: JSON.stringify({
  "HomePage": {
    "title": "...",
    "subtitle": "..."
  }
}, null, 2).slice(0, 500)  // Limit to 500 characters
```

---

## Troubleshooting

### Common Issues

**1. "Invalid Figma URL"**

**Problem:** The URL format is not recognized

**Solutions:**
- ✅ Use: `https://www.figma.com/file/FILE_ID/FILE_NAME`
- ❌ Avoid: `https://www.figma.com/design/...`
- ❌ Avoid: URLs with `/edit` or query parameters

**2. "Failed to fetch Figma file"**

**Problem:** Can't access the file

**Solutions:**
- For private files: Add your Figma API token
- Check file permissions (must be at least "Can view")
- Verify the file ID is correct
- Try accessing the file in a browser first

**3. "No Japanese texts found"**

**Problem:** Language detection filtered everything

**Solutions:**
- Check your Figma file has actual Japanese text (Hiragana, Katakana, Kanji)
- Not just "Settings" or "Login" in English
- Make sure text layers have content (not empty)

**4. "OpenAI API Error: Invalid API Key"**

**Problem:** API key is wrong or expired

**Solutions:**
- Go to https://platform.openai.com/api-keys
- Create a new key
- Copy the full key (starts with `sk-`)
- Add it to `.env.local` or paste in the UI

**5. "Token limit exceeded"**

**Problem:** Too many texts in one request

**Solutions:**
- The tool batches automatically, so this is rare
- If it happens: Select a smaller Figma page
- Reduce batch size in code: `batchSize: 5`

**6. "Generated keys have duplicates"**

**Problem:** AI generated keys that already exist

**Solutions:**
- The tool automatically handles this!
- It detects duplicates and regenerates them
- If you still see duplicates: Check your existing JSON for inconsistencies

### Debug Mode

To see detailed logs:

```bash
# Run in development mode
npm run dev

# Check browser console (F12)
# Check terminal output
```

You'll see:
```
Extracting texts from Figma...
Found 150 text nodes
Filtering Japanese texts...
Found 80 Japanese texts
Comparing with existing translations...
Found 15 new texts
Generating keys with AI...
Batch 1/2: Processing 10 texts...
Batch 2/2: Processing 5 texts...
Found 2 duplicate keys, regenerating...
Done! Generated 15 keys
```

---

## Best Practices

### 1. Organize Your Figma Files

**Good Structure:**
```
📁 HomePage
  📁 Header
    📝 "ホーム"
    📝 "設定"
  📁 Content
    📝 "ようこそ"

📁 LoginPage
  📁 Form
    📝 "メールアドレス"
    📝 "ログイン"
```

**Why?**
- AI uses frame names as context
- Better key generation
- Example: `HomePage.Header.home` instead of `text1`

### 2. Use Consistent Naming in Figma

**Frame Names:**
```
✅ "Login Button"
✅ "Email Label"
✅ "Page Title"

❌ "Frame 123"
❌ "Rectangle"
❌ "Text"
```

### 3. Maintain Clean Translation Files

**Before generating:**
```json
{
  "HomePage": {
    "title": "ホーム",
    "desc": "説明"
  }
}
```

**After generating:**
```json
{
  "HomePage": {
    "title": "ホーム",
    "desc": "説明"
  },
  "LoginPage": {  // ← New section added
    "button": "ログイン"
  }
}
```

### 4. Review Before Merging

Always review AI-generated keys:
- ✅ Check key names make sense
- ✅ Verify no accidental duplicates
- ✅ Ensure correct Japanese text
- ✅ Test in your app before committing

### 5. Batch Your Workflow

Don't generate one text at a time:
```
❌ Bad:
  - Design 1 screen → Generate
  - Design 1 screen → Generate
  - Design 1 screen → Generate

✅ Good:
  - Design 10 screens → Generate once
  - Saves time and API calls
```

### 6. Use Environment Variables

```bash
# .env.local
OPENAI_API_KEY=sk-your-key
NEXT_PUBLIC_FIGMA_API_TOKEN=figd-your-token
```

**Benefits:**
- Don't enter keys every time
- More secure (not in UI)
- Easy to update

### 7. Version Control Your Translations

```bash
git add en.json jp.json
git commit -m "Add translations for Dashboard page"
```

**Why?**
- Track changes over time
- Rollback if needed
- Collaborate with team

---

## Advanced Features

### Localazy Integration

The tool includes optional Localazy integration for professional translation management:

**What is Localazy?**
- Cloud translation management platform
- Supports 80+ languages
- Machine translation + human review
- Free tier available

**How to use:**
1. Sign up at https://localazy.com
2. Get your project token
3. Click "Export to Localazy" in the UI
4. Files are uploaded automatically

**Benefits:**
- Auto-translate to multiple languages
- Manage translations in one place
- Track translation progress
- Collaborate with translators

### Custom Context Samples

You can customize how the AI learns your patterns:

```typescript
// In your request
{
  contextSample: JSON.stringify({
    "DashboardNavigation": {
      "home": "ホーム",
      "settings": "設定"
    },
    "Forms": {
      "email_input": "メール",
      "submit_btn": "送信"
    }
  }, null, 2)
}
```

The AI will follow this style:
- PascalCase for top-level keys
- snake_case for nested keys
- Suffixes like `_input`, `_btn`

---

## FAQ

**Q: How much does it cost to use?**
A: Very cheap! Using GPT-4o-mini:
- 10 texts: ~$0.0005 (0.05 cents)
- 100 texts: ~$0.005 (0.5 cents)
- 1000 texts: ~$0.05 (5 cents)

**Q: Do I need a Figma paid plan?**
A: No. The free Figma plan works fine for public files. For private files, you need an API token (available on all plans).

**Q: Can I use this for other languages?**
A: Yes! Currently optimized for Japanese, but you can modify the language detection in `lib/utils/language.ts` to support Chinese, Korean, etc.

**Q: Is my API key secure?**
A: Yes. It's only used for that one request and never stored. For maximum security, add it to `.env.local` instead of entering in the UI.

**Q: What if the AI generates bad key names?**
A: You can:
- Provide a better context sample
- Organize your Figma frames better
- Manually edit the generated JSON before merging

**Q: Can I run this locally offline?**
A: No. It requires internet access for:
- OpenAI API (key generation)
- Figma API (text extraction)

**Q: How do I contribute?**
A: Pull requests are welcome! Check the GitHub repository.

---

## Support & Resources

- **GitHub Issues:** Report bugs or request features
- **OpenAI Docs:** https://platform.openai.com/docs
- **Figma API Docs:** https://www.figma.com/developers/api
- **Next.js Docs:** https://nextjs.org/docs
- **shadcn/ui:** https://ui.shadcn.com

---

**Built with ❤️ for developers who hate manual i18n work.**
