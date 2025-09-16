# Announcing Routstr Core v0.1.0: Come Run Routstr Nodes with Us

# A Message: 
Four months ago, we asked, “What would AI look like if no company, country or credit-card could gate-keep it?”

We wanted to build the infrastructure for permissionless AI. After 4 months, we are proud to announce Roustr Beta v0.1.0 as a stable version that we are comfortable with releasing for anyone to run a Routstr Node. You might be wondering why are we making this decentralized with nodes and other jargon. We feel the obligation to answer why. 

## Why Routstr? 
OpenRouter exists, doesn’t it? Yes, but are we gonna rely on another centralized service again for one of the most important technology of this century? 

Routstr is important for two main reasons: 
1. **Permissionless Listing:** Routstr allows anyone who has GPU compute to start a Routstr node and start serving AI inference to anyone who needs it. 
2. **Permissionless Access:** Anyone can access AI using Routstr and Bitcoin Lightning. No email sign-up, no KYC, no whitelisted IP address brackets. 

## Leveraging Nostr
### Discovery
Routstr leverages the permissionlessness nature of Nostr to help anyone with access to AI to serve anyone that needs it. We do this by broadcasting a Nostr event to various Nostr relays which can then be fetched by any client (like our chat app) to discover nodes offering AI inference at various prices (sats/million tokens). 

### Gossiping
Various Routstr clients that use pseudonymous Routstr nodes for AI inference can gossip on the Nostr network to ensure that Routstr nodes don’t misbehave. Users can report mispricing, serving lower quality models as higher quality ones, or just not responding despite accepting a Cashu token. This is in contrast with the anonymity of Bitcoin nodes where the truth is derived from a chain of blocks, but Routstr must operate on _some_ pseudonymous trust to make it work. 

### Sovereignty
None of the chat app, the node or any other software we build rely on a centralized server to operate. They all rely on Nostr relays for application state storage (nip-44), Cashu balance storage (nip-60) and for relay/mint selection. There is no way Routstr team or anyone can rug any user as users have full sovereignty. 

## Help Us!
There are a few ways you can help us. 

### Spread the word!
We need more Routstr nodes. And more Routstr users that our nodes can serve. Help us reach them both. 

### Run a node and give us feedback
Consider running a node by simply cloning our Routstr Core repo and setting up Ngrok or by setting up a subdomain. 

### Contribute to our code
If you are dev, we would highly appreciate your code contributions. Bonus points if you use Routstr to improve Routstr :). 

_Built with Love!_ 

_Routstr, A Freedom AI Tech Protocol_
