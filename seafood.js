const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const QRCode = require('qrcode');

// Seafood product list with numbered selection
const products = [
    { key: 'prawns 10/12', price: 1000, unit: 'kg', desc: 'Prawns 10/12 pcs (pre-cleaning, 50-55% net weight after deveining)' },
    { key: 'prawns 15/18', price: 850, unit: 'kg', desc: 'Prawns 15/18 pcs (pre-cleaning, 50-55% net weight after deveining)' },
    { key: 'prawns 25/30', price: 700, unit: 'kg', desc: 'Prawns 25/30 pcs (pre-cleaning, 50-55% net weight after deveining)' },
    { key: 'prawns 35/40', price: 600, unit: 'kg', desc: 'Prawns 35/40 pcs (pre-cleaning, 50-55% net weight after deveining)' },
    { key: 'prawns 50/55', price: 550, unit: 'kg', desc: 'Prawns 50/55 pcs (pre-cleaning, 50-55% net weight after deveining)' },
    { key: 'pomfret 4/5', price: 1200, unit: 'kg', desc: 'Pomfret 4/5 pcs (pre-cleaning, 70-75% net weight after cutting)' },
    { key: 'pomfret 3', price: 1300, unit: 'kg', desc: 'Pomfret 3 pcs (pre-cleaning, 70-75% net weight after cutting)' },
    { key: 'pomfret 2', price: 1600, unit: 'kg', desc: 'Pomfret 2 pcs (pre-cleaning, 70-75% net weight after cutting)' },
    { key: 'surmai small', price: 700, unit: 'kg', desc: 'Surmai Small (pre-cleaning, 70-75% net weight after cutting)' },
    { key: 'surmai big', price: 900, unit: 'kg', desc: 'Surmai Big (pre-cleaning, 70-75% net weight after cutting)' },
    { key: 'surmai fillet', price: 1500, unit: 'kg', desc: 'Surmai Fillet Boneless' },
    { key: 'rawas slices', price: 800, unit: 'kg', desc: 'Rawas Slices (pre-cleaning, 70-75% net weight after cutting)' },
    { key: 'rawas fillet', price: 1600, unit: 'kg', desc: 'Rawas Fillet Boneless' },
    { key: 'halwa slices', price: 800, unit: 'kg', desc: 'Halwa Slices (pre-cleaning, 70-75% net weight after cutting)' },
    { key: 'hamoor slices', price: 700, unit: 'kg', desc: 'Hamoor Slices (pre-cleaning, 70-75% net weight after cutting)' },
    { key: 'dara slices', price: 800, unit: 'kg', desc: 'Dara Slices (pre-cleaning, 70-75% net weight after cutting)' },
    { key: 'dara fillet', price: 1600, unit: 'kg', desc: 'Dara Fillet Boneless' },
    { key: 'sea bass slices', price: 700, unit: 'kg', desc: 'Sea Bass (Bengali Bhetki) Slices (pre-cleaning, 70-75% net weight after cutting)' },
    { key: 'sea bass fillet', price: 1500, unit: 'kg', desc: 'Sea Bass (Bengali Bhetki) Fillet Boneless' },
    { key: 'red snapper slices', price: 700, unit: 'kg', desc: 'Red Snapper Slices (pre-cleaning, 70-75% net weight after cutting)' },
    { key: 'red snapper fillet', price: 1400, unit: 'kg', desc: 'Red Snapper Fillet Boneless' },
    { key: 'koti fillet', price: 1000, unit: 'kg', desc: 'Koti (Bombay Bhetki) Fillet Boneless' },
    { key: 'mahi-mahi slices', price: 400, unit: 'kg', desc: 'Mahi-Mahi (Dolphin Fish) Slices (pre-cleaning, 70-75% net weight after cutting)' },
    { key: 'mahi-mahi fillet', price: 700, unit: 'kg', desc: 'Mahi-Mahi (Dolphin Fish) Fillet Boneless' },
    { key: 'ghol slices', price: 700, unit: 'kg', desc: 'Ghol Fish Slices (pre-cleaning, 70-75% net weight after cutting)' },
    { key: 'ghol fillet', price: 1400, unit: 'kg', desc: 'Ghol Fish Fillet Boneless' },
    { key: 'tuna slices', price: 450, unit: 'kg', desc: 'Tuna Slices (pre-cleaning, 70-75% net weight after cutting)' },
    { key: 'tuna fillet', price: 850, unit: 'kg', desc: 'Tuna Fillet' },
    { key: 'bombil', price: 350, unit: 'kg', desc: 'Bombil (Bombay Duck) 8-12 pcs (pre-cleaning, 70-75% net weight after cutting)' },
    { key: 'mackerel', price: 350, unit: 'kg', desc: 'Mackerel (Bangda) 6-8 pcs (pre-cleaning, 70-75% net weight after cutting)' },
    { key: 'squid', price: 500, unit: 'kg', desc: 'Squid' },
    { key: 'lobster 1', price: 2600, unit: 'piece', desc: 'Lobster 1 piece (700g-1kg)' },
    { key: 'lobster 2', price: 2400, unit: 'kg', desc: 'Lobster 2 pcs' },
    { key: 'lobster 3', price: 1900, unit: 'kg', desc: 'Lobster 3 pcs' },
    { key: 'lobster 4', price: 1400, unit: 'kg', desc: 'Lobster 4 pcs' },
    { key: 'crab medium', price: 900, unit: 'kg', desc: 'Crab 3-4 medium (250-300g each)' },
    { key: 'crab large', price: 1300, unit: 'kg', desc: 'Crab 2 large' },
    { key: 'crab xl', price: 2000, unit: 'kg', desc: 'Crab 1 XL' }
];

// Personal number for forwarding
const SHABAZ_NUMBER = '919167455556@s.whatsapp.net'; // Your personal number: +919167455556

// Setup authentication
const startBot = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        auth: state
    });

    // Store manual chat numbers
    const manualChats = new Set();

    // Handle connection updates (including QR code)
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            QRCode.toDataURL(qr, async (err, url) => {
                if (err) console.error('QR Code Error:', err);
                else {
                    await sock.sendMessage(SHABAZ_NUMBER, { image: { url }, caption: 'Scan this QR code to authenticate the bot.' });
                    console.log('QR code sent to Shabaz');
                }
            });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed:', lastDisconnect?.error?.message);
            if (shouldReconnect) {
                startBot(); // Reconnect if not logged out
            } else {
                console.log('Logged out. Please scan QR code again.');
            }
        } else if (connection === 'open') {
            console.log('Connected successfully!');
        }
    });

    // Save credentials when updated
    sock.ev.on('creds.update', saveCreds);

    // Store user state (e.g., what menu they’re in)
    const userState = new Map();

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const normalizedText = messageText.trim().toLowerCase().replace(/\s+/g, ' '); // Normalize spaces

        console.log(`Received message from ${from}: "${messageText}" (State: ${JSON.stringify(userState.get(from))})`);

        // Handle manual chat commands from Shabaz
        if (from === SHABAZ_NUMBER && normalizedText.startsWith('manual ')) {
            const args = normalizedText.split(' ');
            if (args.length >= 3 && args[1] === 'on') {
                const targetNumber = args[2] + '@s.whatsapp.net';
                manualChats.add(targetNumber);
                await sock.sendMessage(SHABAZ_NUMBER, { text: `Manual chat enabled for ${targetNumber}` });
                console.log(`Enabled manual chat for ${targetNumber}`);
            } else if (args.length >= 3 && args[1] === 'off') {
                const targetNumber = args[2] + '@s.whatsapp.net';
                manualChats.delete(targetNumber);
                await sock.sendMessage(SHABAZ_NUMBER, { text: `Manual chat disabled for ${targetNumber}` });
                console.log(`Disabled manual chat for ${targetNumber}`);
            } else {
                await sock.sendMessage(SHABAZ_NUMBER, { text: 'Usage: manual on <number> or manual off <number> (e.g., manual on 919876543210)' });
            }
            return;
        }

        // Handle manual chats
        if (manualChats.has(from)) {
            await sock.sendMessage(SHABAZ_NUMBER, { text: `Message from ${from}: "${messageText}"` });
            console.log(`Forwarded manual chat message from ${from} to ${SHABAZ_NUMBER}`);
            return;
        }

        // Handle "hi" or "menu" command
        if (normalizedText === 'hi' || normalizedText === 'menu') {
            userState.delete(from); // Reset state
            const menu = `
🦐 *Welcome to Sea Food Kings!* 🐟

*Available Options*:
1. 🛒 Order Seafood
2. 🧾 File Complaint
3. 📞 Connect with Mr. Shabaz

_Reply with 1, 2 or 3 to proceed._
`;
            await sock.sendMessage(from, { text: menu });
            console.log(`Sent menu to ${from}`);
        }
        // Handle seafood item selection
        else if (userState.get(from)?.step === 'option_1') {
            let itemKey;
            // Check if input is a number
            const itemNumber = parseInt(messageText.trim());
            if (!isNaN(itemNumber) && itemNumber >= 1 && itemNumber <= products.length) {
                itemKey = products[itemNumber - 1].key;
            } else {
                // Fallback to name-based matching
                const cleanInput = normalizedText.replace(/pcs|pieces/gi, '').trim();
                itemKey = products.find(item => item.key.toLowerCase() === cleanInput || item.key.toLowerCase().replace(/\s+/g, '') === cleanInput.replace(/\s+/g, ''))?.key;
            }

            if (itemKey) {
                userState.set(from, { step: 'quantity', item: itemKey });
                const item = products.find(p => p.key === itemKey);
                const response = `
You selected *${item.desc}* (₹${item.price}/${item.unit}).
Please enter the quantity in ${item.unit === 'kg' ? 'kilograms' : 'pieces'} (e.g., "2" for 2 ${item.unit === 'kg' ? 'kg' : 'pieces'}).
`;
                await sock.sendMessage(from, { text: response });
                console.log(`Sent quantity prompt for ${itemKey} to ${from}`);
            } else {
                const response = `
Invalid item. Please reply with a valid item number (e.g., "1") or name (e.g., "Prawns 10/12", "Lobster 2").
Send "menu" to see the list again.
`;
                await sock.sendMessage(from, { text: response });
                console.log(`Sent invalid item response to ${from}`);
            }
        }
        // Handle quantity input
        else if (userState.get(from)?.step === 'quantity') {
            const quantity = parseFloat(messageText.trim());
            if (isNaN(quantity) || quantity <= 0) {
                const item = products.find(p => p.key === userState.get(from).item);
                const response = `Please enter a valid quantity in ${item.unit === 'kg' ? 'kilograms' : 'pieces'} (e.g., "2").`;
                await sock.sendMessage(from, { text: response });
                console.log(`Sent invalid quantity response to ${from}`);
            } else {
                const itemKey = userState.get(from).item;
                const item = products.find(p => p.key === itemKey);
                const total = item.unit === 'piece' ? item.price * quantity : item.price * quantity;
                const netWeightNote = item.unit === 'kg' ? (itemKey.includes('prawns') ? '50-55% net weight after cleaning' : '70-75% net weight after cleaning') : '';
                const orderDetails = `
Order successful!
- Item: *${item.desc}*
- Quantity: *${quantity} ${item.unit}*
- Total: *₹${total.toFixed(2)}*
${netWeightNote ? `- Note: ${netWeightNote}\n` : ''}Kindly order 1 day in advance. For bulk orders (>5kg), give 2-3 days notice.
Thank you for your order! We'll confirm delivery soon.
`;
                await sock.sendMessage(SHABAZ_NUMBER, { text: `New order from ${from}: ${item.desc}, ${quantity} ${item.unit}, ₹${total.toFixed(2)}` });
                userState.delete(from); // Reset state
                await sock.sendMessage(from, { text: orderDetails });
                console.log(`Sent order confirmation for ${itemKey}, ${quantity} ${item.unit} to ${from}`);
            }
        }
        // Handle complaint submission
        else if (userState.get(from)?.step === 'option_2') {
            await sock.sendMessage(SHABAZ_NUMBER, { text: `New complaint from ${from}: ${messageText}` });
            const response = `
Your complaint has been submitted:
"${messageText}"
We'll address it soon. Thank you!
`;
            userState.delete(from); // Reset state
            await sock.sendMessage(from, { text: response });
            console.log(`Sent complaint confirmation to ${from}`);
        }
        // Handle Shabaz query
        else if (userState.get(from)?.step === 'shabaz_query') {
            await sock.sendMessage(SHABAZ_NUMBER, { text: `Query from ${from}: "${messageText}"` });
            const response = `
Your query has been forwarded to Mr. Shabaz:
"${messageText}"
He'll reach out soon. Thank you!
`;
            userState.delete(from); // Reset state
            await sock.sendMessage(from, { text: response });
            console.log(`Forwarded Shabaz query to ${SHABAZ_NUMBER} and sent confirmation to ${from}`);
        }
        // Handle user selection (1, 2, or 3) for main menu
        else if (['1', '2', '3'].includes(messageText.trim())) {
            userState.set(from, { step: `option_${messageText.trim()}` });
            let response;
            switch (messageText.trim()) {
                case '1':
                    response = `
🛒 *Order Seafood* 🦐
*Notice*: Kindly order 1 day in advance. For bulk orders, give 2-3 days notice. Prices are pre-cleaning; fish net weight ~70-75%, prawns ~50-55% after cleaning.

*Our Products*:
${products.map((item, index) => `${index + 1}. ${item.desc} - ₹${item.price}/${item.unit}`).join('\n')}

Reply with the item number (e.g., "1" for ${products[0].desc}) or item name (e.g., "Prawns 10/12").
`;
                    break;
                case '2':
                    response = `
🧾 *File Complaint*
Please describe your issue, and we'll get back to you soon!
`;
                    break;
                case '3':
                    response = `
📞 *Connecting you to Mr. Shabaz...*
Please share your query, and it will be forwarded directly to him.
`;
                    userState.set(from, { step: 'shabaz_query' });
                    break;
            }
            await sock.sendMessage(from, { text: response });
            console.log(`Sent response for option ${messageText} to ${from}`);
        }
        // Fallback for invalid inputs
        else {
            const response = `
Invalid input. Please send "hi" or "menu" to start over.
`;
            await sock.sendMessage(from, { text: response });
            console.log(`Sent invalid input response to ${from}`);
        }
    });
};

startBot();
