# Using OpenCode with Routstr

OpenCode is an open-source AI coding assistant that works directly in your terminal. When combined with Routstr's decentralized AI inference protocol, you get a powerful, private, and flexible development experience.

## What is Routstr?

Routstr is a decentralized protocol for AI inference that enables:
- **Anonymous payments** using Cashu e-cash
- **No account requirements** - just connect and use
- **Privacy-first** approach with Nostr integration
- **OpenAI API compatibility** - works with existing tools

## Setting Up OpenCode with Routstr

### 1. Install OpenCode

```bash
curl -fsSL https://opencode.ai/install | bash
```

### 2. Configure Routstr as Your AI Provider

OpenCode supports custom OpenAI-compatible endpoints. Configure it to use a Routstr node:

```bash
opencode config set api.base_url https://your-routstr-node.com/v1
opencode config set api.key your-cashu-token
```

### 3. Initialize Your Project

Navigate to your project directory and initialize OpenCode:

```bash
cd your-project
opencode
```

Then type `/init` to let OpenCode analyze your repository.

## Benefits of Using OpenCode with Routstr

### Privacy
- Your code stays local
- No account registration required
- Anonymous payments protect your identity
- No tracking or data collection

### Flexibility
- Use any language or framework
- Switch between different Routstr nodes
- Local model support available
- Works with your existing workflow

### Cost-Effective
- Pay only for what you use with Cashu
- No subscription fees
- Micropayments for small tasks
- Transparent pricing

## Example Workflows

### Code Generation

```bash
opencode "Create a REST API endpoint for user authentication"
```

OpenCode will analyze your project structure and generate appropriate code using a Routstr node for inference.

### Debugging

```bash
opencode "Fix the error in src/auth.ts"
```

OpenCode reads your code, identifies issues, and suggests fixes.

### Code Review

```bash
opencode "Review the changes in my pull request"
```

Get AI-powered code reviews without sending your code to centralized services.

### Documentation

```bash
opencode "Generate documentation for this module"
```

Automatically create comprehensive documentation for your codebase.

## Advanced Configuration

### Multiple Routstr Nodes

You can configure OpenCode to use different Routstr nodes for different tasks:

```bash
# For code generation
opencode config set api.base_url https://node1.routstr.com/v1

# For debugging
opencode config set api.base_url https://node2.routstr.com/v1
```

### Local Models with Routstr

Combine local inference with Routstr's payment infrastructure:

```bash
opencode config set api.base_url http://localhost:11434/v1
```

### Custom Skills

Create custom OpenCode skills that leverage Routstr's capabilities:

```javascript
// .opencode/skills/routstr-payment.js
export default {
  name: 'routstr-payment',
  description: 'Handle payments using Routstr protocol',
  execute: async (context) => {
    // Your custom logic
  }
}
```

## Troubleshooting

### Connection Issues

If you can't connect to your Routstr node:

1. Verify the node URL is correct
2. Check your Cashu token balance
3. Ensure the node is online and accepting requests
4. Try a different Routstr node

### Payment Issues

For payment-related problems:

1. Check your Cashu wallet balance
2. Verify the token mint URL
3. Ensure you have sufficient funds for the request
4. Check the node's pricing structure

### Performance Tips

- Use nodes closer to your location for lower latency
- Cache frequently used responses
- Batch similar requests together
- Consider local models for sensitive code

## Community and Support

- **Routstr Documentation**: https://docs.routstr.com
- **OpenCode Documentation**: https://opencode.ai/docs
- **Routstr Nostr**: Join the conversation on Nostr
- **GitHub Issues**: Report bugs and request features

## Contributing

Both Routstr and OpenCode are open-source projects. Contributions are welcome!

- Routstr: https://github.com/Routstr/protocol
- OpenCode: https://github.com/sst/opencode

## License

This guide is part of the Routstr ecosystem. See individual project licenses for details.

---

**Ready to code with privacy and freedom?** Start using OpenCode with Routstr today!
