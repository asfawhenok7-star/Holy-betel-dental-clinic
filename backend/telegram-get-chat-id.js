require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is missing from .env');
    process.exit(1);
}

async function main() {
    console.log('Connecting to Telegram...');

    // Check bot token
    const meResponse = await fetch(
        `https://api.telegram.org/bot${token}/getMe`
    );

    const meData = await meResponse.json();

    if (!meResponse.ok || !meData.ok) {
        console.error(
            'Telegram bot connection failed:',
            meData.description || 'Unknown error'
        );
        process.exit(1);
    }

    console.log(`Bot connected: @${meData.result.username}`);

    // Get messages sent to the bot
    const updatesResponse = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates`
    );

    const updatesData = await updatesResponse.json();

    if (!updatesResponse.ok || !updatesData.ok) {
        console.error(
            'Could not get Telegram messages:',
            updatesData.description || 'Unknown error'
        );
        process.exit(1);
    }

    if (!updatesData.result.length) {
        console.log('');
        console.log('No Telegram messages found.');
        console.log('');
        console.log('Open your bot in Telegram.');
        console.log('Press START.');
        console.log('Then send: hello');
        console.log('');
        console.log('After that, run this command again.');
        return;
    }

    const chats = new Map();

    for (const update of updatesData.result) {
        const message = update.message;

        if (!message || !message.chat || !message.chat.id) {
            continue;
        }

        chats.set(String(message.chat.id), {
            id: String(message.chat.id),
            type: message.chat.type,
            name:
                message.chat.first_name ||
                message.chat.title ||
                '',
            username: message.chat.username || ''
        });
    }

    if (!chats.size) {
        console.log('No usable Telegram chat ID found.');
        return;
    }

    console.log('');
    console.log('============================================');
    console.log('TELEGRAM CHAT ID FOUND');
    console.log('============================================');

    for (const chat of chats.values()) {
        console.log(`Chat ID: ${chat.id}`);
        console.log(`Type:    ${chat.type}`);

        if (chat.name) {
            console.log(`Name:    ${chat.name}`);
        }

        if (chat.username) {
            console.log(`Username: @${chat.username}`);
        }

        console.log('--------------------------------------------');
    }
}

main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
});