# Quick Start Guide for Testers

Hey! Thanks for testing the **Figma i18n Key Mapper**. Here's everything you need to get started:

## What This Tool Does

Automatically generates i18n keys for Japanese text in your Figma designs. Instead of manually creating keys like `"login_button": "ログイン"`, this tool does it for you using AI.

## Setup (5 minutes)

1. **Clone and install:**
```bash
git clone <repo-url>
cd figma-i18n-mapper
npm install
```

2. **Add your OpenAI API key:**
   - Create a file called `.env.local` in the project root
   - Add this line: `OPENAI_API_KEY=sk-your-key-here`
   - Get a key here if you don't have one: https://platform.openai.com/api-keys

3. **Start the app:**
```bash
npm run dev
```

4. **Open in browser:** http://localhost:3000

## How to Test

### Step 1: Prepare Test Files

You need two JSON files (I can provide sample files if needed):

**en.json** (English translations):
```json
{
  "HomePage": {
    "title": "Home",
    "description": "Welcome"
  }
}
```

**jp.json** (Japanese translations):
```json
{
  "HomePage": {
    "title": "ホーム",
    "description": "ようこそ"
  }
}
```

### Step 2: Use the Tool

1. **Upload files:** Click "Upload English JSON" and "Upload Japanese JSON"
2. **Add Figma URL:** Paste your Figma file URL (e.g., `https://www.figma.com/file/abc123/MyDesign`)
   - For private files: Add your Figma token in the UI or in `.env.local` as `NEXT_PUBLIC_FIGMA_API_TOKEN=your-token`
3. **Add OpenAI key:** If not in `.env.local`, paste it in the UI
4. **Choose structure:** Select "Flat Keys" or "Nested Keys"
5. **Click "Generate i18n Keys"**
6. **Wait ~10-30 seconds**
7. **Review results:** Copy or download the generated JSON

## What to Look For

### ✅ Success Scenarios
- [ ] Tool extracts Japanese text from Figma correctly
- [ ] Generated keys make semantic sense (e.g., `email_label` not `text1`)
- [ ] No duplicate keys are created
- [ ] Token usage and cost are displayed
- [ ] Can copy/download the result
- [ ] Keys follow the naming pattern of your existing JSON

### ⚠️ Things to Test
- [ ] Upload different JSON file structures (flat vs nested)
- [ ] Try with public Figma files (no token needed)
- [ ] Try with private Figma files (token required)
- [ ] Test with files that have 10, 50, 100+ text nodes
- [ ] Check if it filters out English text correctly
- [ ] Verify the generated keys match your Figma frame structure

### 🐛 Report If You See
- Errors or crashes
- Bad key names generated
- Duplicate keys not caught
- Japanese text filtered out incorrectly
- UI bugs or confusing parts
- Performance issues

## Test Figma File

If you don't have a Figma file ready, you can:
1. Create a simple Figma file with Japanese text
2. Make it public (Share → "Anyone with the link can view")
3. Copy the URL

**Sample structure:**
```
Frame: "Login Page"
  - Text: "メールアドレス" (email address)
  - Text: "パスワード" (password)
  - Text: "ログイン" (login)
```

## Expected Output

For the sample above, you should get something like:
```json
{
  "LoginPage": {
    "email_label": "メールアドレス",
    "password_label": "パスワード",
    "login_button": "ログイン"
  }
}
```

## Costs

Don't worry about costs - testing is super cheap:
- 10 texts: ~$0.0005 (0.05 cents)
- 50 texts: ~$0.002 (0.2 cents)
- 100 texts: ~$0.008 (0.8 cents)

You can run dozens of tests for less than $0.10.

## Need Help?

- Check the full `DOCUMENTATION.md` for detailed info
- Check browser console (F12) for errors
- Check terminal output for logs
- Message me with any issues!

## Quick Checklist

Before you start:
- [ ] Node.js 18+ installed (`node -v`)
- [ ] OpenAI API key ready
- [ ] Test JSON files prepared
- [ ] Figma file URL ready (or create a test file)
- [ ] (Optional) Figma API token for private files

---

**That's it! Should take ~30 minutes to test thoroughly. Let me know how it goes!** 🚀
