# Using OpenCode Agent with Routstr

Learn how to integrate OpenCode, the open source AI coding agent, with Routstr to access premium AI models with complete privacy, anonymous payments, and no account requirements.

## What is OpenCode?

OpenCode is an open source AI coding agent that helps you write code directly in your terminal, IDE, or desktop application. With OpenCode, you can leverage AI to assist with coding tasks, refactoring, debugging, and more—all through a simple command-line interface or desktop app.

## Why Use Routstr with OpenCode?

By connecting OpenCode to Routstr's decentralized AI inference protocol, you gain access to cutting-edge AI models with unique benefits:

- **Complete Privacy** - Anonymous payments using Cashu e-cash
- **No Account Required** - Just connect and use, no signup needed
- **Decentralized Infrastructure** - Choose from multiple independent nodes
- **OpenAI API Compatible** - Works seamlessly with existing tools
- **Pay-Per-Use** - Micropayments for what you actually use, no subscriptions
- **Nostr Integration** - Privacy-first communication protocol

All models available through Routstr nodes work with OpenCode's interface, giving you the freedom to code privately without centralized tracking.

## Step by Step Set Up

### 1. Install OpenCode

First, install OpenCode using one of the following methods:

Using curl:

```bash
curl -fsSL https://opencode.ai/install | bash
```

Using npm:

```bash
npm install -g opencode
```

Using brew (macOS):

```bash
brew install opencode
```

For more installation options, visit the [OpenCode GitHub repository](https://github.com/sst/opencode).

### 2. Get Your Cashu Token

Unlike traditional API services, Routstr uses Cashu e-cash for anonymous payments. Your Cashu token acts as both authentication and payment mechanism—no personal information required.

You can obtain a Cashu token in two ways:

**Option A: Via any Cashu Wallet with Topup**

1. Use any Cashu wallet (e.g., Nutstash, Cashu.me, or a self-hosted wallet)
2. Top up your wallet with e-cash at [https://routstr.com/topup](https://routstr.com/topup)
3. Copy your Cashu token from the wallet

**Option B: Via Routstr Chat Interface**

1. Visit [chat.routstr.com](https://chat.routstr.com)
2. Create or manage an API key directly in the interface
3. The system will generate a Cashu token for you automatically

Ensure you have sufficient balance for your intended usage before proceeding.

### 3. Locate Your OpenCode Config Folder

OpenCode stores its configuration in a platform-specific location:

- **Linux**: `~/.config/opencode`
- **macOS**: `~/.config/opencode`
- **Windows**: `%APPDATA%\opencode`

Navigate to this folder in your terminal or file explorer.

### 4. Create the Configuration File

Create a new file called `opencode.json` in your OpenCode config folder with the following content:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "routstr": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "routstr",
      "options": {
        "baseURL": "https://api.nonkycai.com/v1",
        "apiKey": "your-cashu-token-here",
        "includeUsage": true
      },
      "models": {
        "gemini-3-pro-preview": {
          "name": "gemini-3-pro-preview"
        },
        "gpt-5.2": {
          "name": "gpt-5.2"
        },
        "gpt-5.2-pro": {
          "name": "gpt-5.2-pro"
        },
        "glm-4.7": {
          "name": "glm-4.7"
        },
        "kimi-k2-thinking": {
          "name": "kimi-k2-thinking"
        },
        "gpt-5.1-codex": {
          "name": "gpt-5.1-codex"
        },
        "claude-sonnet-4.5": {
          "name": "claude-sonnet-4.5"
        },
        "gemini-3-flash-preview": {
          "name": "gemini-3-flash-preview"
        },
        "grok-4.1-fast": {
          "name": "grok-4.1-fast"
        },
        "venice-uncensored": {
          "name": "venice-uncensored"
        },
        "deepseek-v3.2-speciale": {
          "name": "deepseek-v3.2-speciale"
        },
        "deepseek-v3.2": {
          "name": "deepseek-v3.2"
        },
        "minimax-m2.1": {
          "name": "minimax-m2.1"
        },
        "qwen3-vl-235b-a22b-thinking": {
          "name": "qwen3-vl-235b-a22b-thinking"
        },
        "claude-opus-4.5": {
          "name": "claude-opus-4.5"
        },
        "gpt-5-mini": {
          "name": "gpt-5-mini"
        },
        "gpt-oss-120b": {
          "name": "gpt-oss-120b"
        },
        "gpt-oss-20b": {
          "name": "gpt-oss-20b"
        },
        "grok-code-fast-1": {
          "name": "grok-code-fast-1"
        },
        "kimi-linear-48b-a3b-instruct": {
          "name": "kimi-linear-48b-a3b-instruct"
        },
        "gemma-3n-e4b-it": {
          "name": "gemma-3n-e4b-it"
        }
      }
    }
  }
}
```

**Important**:

- The `baseURL` is set to `https://api.nonkycai.com/v1` (you can also use `https://api.routstr.com/v1` as a fallback)
- Replace `your-cashu-token-here` with your actual Cashu token
- The models listed are examples; check your Routstr node for available models

### 5. Launch OpenCode and Select Your Model

Start OpenCode in your terminal or desktop app. To view all available Routstr models, use the `/models` command:

```bash
/models
```

You'll see all the Routstr models listed under the "routstr" provider. Select the model that best fits your coding task.

### 6. Verify Your Setup

To verify that OpenCode is successfully using your Routstr node:

1. Run a simple coding task: `opencode run -m routstr/glm-4.7 "write a hello world function"`
2. Check that your Cashu token balance has decreased appropriately
3. Verify the response quality matches your expected model

You can also check your node's dashboard (if available) to see recent requests.

## Available Models

The models available through your Routstr node depend on which node you're connected to. Common models include:

- **OpenAI Models**: GPT-5.2 Pro, GPT-5.2, GPT-5.1 Codex
- **Anthropic Models**: Claude Sonnet 4.5, Claude Opus 4.5
- **Google Models**: Gemini 3 Pro Preview, Gemini 3 Flash Preview
- **Specialized AI Models**: DeepSeek v3.2, Qwen3 VL 235B Thinking, Kimi K2 Thinking
- **And more!**

Each Routstr node may offer different models based on their infrastructure and partnerships.

## Get the Most Recent Models

Want to see what models are available on your Routstr node? You can fetch the list directly from the node's API:

View all available models:

```bash
curl https://api.nonkycai.com/v1/models
```

Or use the fallback:

```bash
curl https://api.routstr.com/v1/models
```

This endpoint returns a JSON list of all currently available models on that specific Routstr node. You can use this to:

- **Check for new models** - See what's been added since you last checked
- **Build custom configs** - Create your own `opencode.json` with specific models you want
- **Compare nodes** - Check different Routstr nodes to find the best model selection

### Update Your Configuration with Available Models

Once you have the models list, you can update your `opencode.json` configuration:

1. Fetch the models from your node: `curl https://api.nonkycai.com/v1/models` (or `https://api.routstr.com/v1/models`)
2. Copy the model IDs from the response
3. Add them to your configuration file under the "models" section:

```json
"models": {
  "model-id-here": {
    "name": "model-id-here"
  }
}
```

**Critical**: Each model entry must have the model ID as BOTH the object key AND the "name" property value. Only use the "id" field from the API response—don't include other fields like "object", "created", or "owned_by".

## Example Workflows

### Code Generation

```bash
opencode run -m routstr/glm-4.7 "Create a REST API endpoint for user authentication"
```

OpenCode will analyze your project structure and generate appropriate code using a Routstr node for inference.

### Debugging

```bash
opencode run -m routstr/claude-opus-4.5 "Fix the error in src/auth.ts"
```

OpenCode reads your code, identifies issues, and suggests fixes.

### Code Review

```bash
opencode run -m routstr/claude-opus-4.5 "Review the changes in my pull request"
```

Get AI-powered code reviews without sending your code to centralized services.

### Documentation

```bash
opencode run -m routstr/claude-sonnet-4.5  "Generate documentation for this module"
```

Automatically create comprehensive documentation for your codebase.

## Advanced Configuration

### Using Multiple Routstr Nodes

You can configure OpenCode to use different Routstr nodes for different projects or tasks. Simply update the `baseURL` in your `opencode.json` file:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "routstr-nonkycai": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "routstr-nonkycai",
      "options": {
        "baseURL": "https://api.nonkycai.com/v1",
        "apiKey": "your-cashu-token-1",
        "includeUsage": true
      },
      "models": {
        /* models */
      }
    },
    "routstr-api": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "routstr-api",
      "options": {
        "baseURL": "https://api.routstr.com/v1",
        "apiKey": "your-cashu-token-2",
        "includeUsage": true
      },
      "models": {
        /* models */
      }
    }
  }
}
```

This allows you to:

- Use different tokens for different nodes
- Compare pricing and performance across nodes
- Have fallback options if one node is unavailable
- Separate work projects from personal projects

## Troubleshooting

### Connection Issues

If you can't connect to your Routstr node:

1. Verify the node URL is correct
2. Check your Cashu token balance
3. Ensure the node is online and accepting requests
4. Try a different Routstr node

### Cashu Token Issues

For payment-related problems:

1. **Check your Cashu wallet balance** - Ensure you have sufficient e-cash
2. **Verify your token format** - Make sure you copied the complete Cashu token
3. **Check the mint URL** - Ensure the mint associated with your token is operational
4. **Verify node compatibility** - Confirm the node accepts your Cashu mint
5. **Token expiration** - Some tokens may have expiration dates

### Performance Tips

- **Monitor token balance** - Keep track of your Cashu balance in `chat.routstr.com` to avoid interruptions
- **Select appropriate models** - Use lighter models for simple tasks to save costs
- **Batch similar requests** - Group related coding tasks together

## Tips for Best Results

- **Choose the right model**: Use specialized coding models like `claude-opus-4.5` or `glm-4.7` for programming tasks
- **Experiment**: Different models excel at different tasks—try a few to find your favorite
- **Stay private**: Take advantage of Routstr's anonymous payments for sensitive projects
- **Support decentralization**: Try different Routstr nodes to support the decentralized ecosystem

## Problems?

If you encounter issues:

- **Check the Routstr website** - Visit the main Routstr node for status updates
- **Join Nostr channels** - Ask questions in privacy-focused Routstr communities
- **Verify your setup** - Double-check your `opencode.json` configuration
- **Try a different node** - If one node is down, try connecting to another
- **Check OpenCode docs** - Review [OpenCode documentation](https://opencode.ai/docs) for troubleshooting

## Community and Support

- **Tag Red, Shroominic, or Routstr on Nostr**: [Red](https://jumble.social/users/npub1ftt05tgku25m2akgvw6v7aqy5ux5mseqcrzy05g26ml43xf74nyqsredsh), [Shroominic](https://jumble.social/users/npub18gr2m5cflkzpn6jdfer4a8qdlavsn334m9mfhurjsge08grg82zq6hu9su) or [Routstr](https://jumble.social/users/npub130mznv74rxs032peqym6g3wqavh472623mt3z5w73xq9r6qqdufs7ql29s)
- **Routstr GitHub**: https://github.com/Routstr/routstr-core
- **OpenCode Documentation**: https://opencode.ai/docs
- **Community Nodes**: Discover and connect with community-run Routstr nodes

## Contributing

Both Routstr and OpenCode are open-source projects. Contributions are welcome!

- Routstr: https://github.com/Routstr/routstr-core
- Routstr Chat: https://github.com/Routstr/routstr-chat
- OpenCode: https://github.com/sst/opencode

---

**Ready to code with complete privacy and freedom?** Start using OpenCode with Routstr today and experience AI-powered development without compromising your privacy or requiring accounts!
