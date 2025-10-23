# Quick Start Guide

## Prerequisites Setup

### 1. Get Your OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. Save it securely - you'll need it to run the app

### 2. Get Your Figma API Token (Optional - for private files)
1. Go to https://www.figma.com/developers/api#access-tokens
2. Sign in to your Figma account
3. Go to Settings → Account → Personal Access Tokens
4. Click "Generate new token"
5. Give it a name and click "Generate token"
6. Copy and save the token

## Running the App

### Step 1: Install Dependencies
```bash
cd figma-i18n-mapper
npm install
```

### Step 2: Set Up Environment Variables
```bash
cp .env.local.example .env.local
```

Then edit `.env.local` and add your OpenAI API key:
```env
OPENAI_API_KEY=sk-your-actual-key-here
```

### Step 3: Run Development Server
```bash
npm run dev
```

Open http://localhost:3000

## Using the App

### Quick Test with Sample Files
The `sample-data` folder contains example localization files you can use for testing:
- `sample-data/en.json` - English translations
- `sample-data/jp.json` - Japanese translations

### Full Workflow

1. **Upload Files**
   - Click "Choose File" for en.json and jp.json
   - Select your localization files
   - Files must be valid JSON

2. **Enter Figma URL**
   - Paste your Figma file URL
   - Format: `https://www.figma.com/file/YOUR_FILE_ID/...`
   - Add Figma token if file is private

3. **Add OpenAI Key**
   - Paste your OpenAI API key
   - This is required for AI key generation

4. **Generate**
   - Click "Generate i18n Keys"
   - Wait for processing (usually 10-30 seconds)
   - View results with syntax highlighting

5. **Export**
   - Click "Copy JSON" to copy to clipboard
   - Or click "Download JSON" to save as file

## Example Figma File Structure

For best results, organize your Figma file like this:

```
Page
├── Frame: "Onboarding"
│   ├── Text: "ようこそ"
│   ├── Text: "次へ"
│   └── Text: "スキップ"
├── Frame: "Settings"
│   ├── Text: "設定"
│   └── Text: "通知を許可する"
└── Frame: "Profile"
    └── Text: "プロフィールを編集"
```

## Troubleshooting

### Error: "Failed to fetch Figma file"
- Check if your Figma URL is correct
- If it's a private file, add your Figma API token
- Verify the file ID in the URL is valid

### Error: "OpenAI API key is required"
- Make sure you've entered your API key
- Check that the key starts with `sk-`
- Verify the key is active in your OpenAI dashboard

### Error: "Invalid JSON file"
- Check that your JSON files are properly formatted
- Use a JSON validator like jsonlint.com
- Ensure files are saved with UTF-8 encoding

### No New Texts Found
- All Japanese texts already exist in jp.json
- Try a different Figma file
- Check that Figma file contains Japanese text

## Tips for Best Results

1. **Frame Naming**: Use descriptive frame names in Figma (e.g., "LoginScreen", "SettingsPage")
2. **Text Organization**: Group related texts in the same frame
3. **Consistent Structure**: Keep your existing JSON structure consistent
4. **Review Output**: Always review AI-generated keys before using in production
5. **Batch Processing**: Process multiple screens at once for consistency

## Next Steps

- Test with your own Figma files
- Customize the AI prompt in `lib/utils/openai.ts`
- Deploy to Vercel for team access
- Integrate into your CI/CD pipeline

For more information, see the full README.md
