import 'dotenv/config';

console.log(`[GLOBAL DEBUG] process.env.TELEGRAM_CHANNEL_IDS: '${process.env.TELEGRAM_CHANNEL_IDS}'`);
console.log(`[GLOBAL DEBUG] process.env.DISCORD_GUILD_ID: '${process.env.DISCORD_GUILD_ID}'`);


import { Project, ProjectAgent, Character, IAgentRuntime, UUID, Service, EventType } from '@elizaos/core';
import { ChatGroq } from '@langchain/groq';

import discordPlugin from '@elizaos/plugin-discord';
import telegramPlugin from '@elizaos/plugin-telegram';


interface DiscordService extends Service { }
interface TelegramService extends Service { }


interface IDiscordAgentSettings {
    apiToken?: string;
    guildId?: string; 
    channelIds?: string[]; 
}

interface ITelegramAgentSettings {
    botToken?: string;
    channelIds?: string[]; 
}


const groq = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY || 'your-groq-api-key',
    model: 'llama-3.3-70b-versatile', 
});

async function generateResponse(prompt: string): Promise<string> {
    const response = await groq.invoke([{ role: 'user', content: prompt }],);
    return response.content as string;
}

// Helper to extract Discord IDs from URL
function extractDiscordIdsFromUrl(url: string | undefined): { guildId?: string; channelId?: string } {
    if (!url) {
        return {};
    }
    const parts = url.split('/');
    // Expected format: https://discord.com/channels/GUILD_ID/CHANNEL_ID/MESSAGE_ID
 
    if (parts.length >= 7 && parts[3] === 'channels') {
        const guildId = parts[4];
        const channelId = parts[5]; 
        return { guildId, channelId };
    }
    return {};
}


const discordCharacter: Character = {
    name: 'DiscordBot',
    plugins: ['@elizaos/plugin-discord'],
    settings: {
        discord: {
            apiToken: process.env.DISCORD_API_TOKEN || 'your-discord-api-token',
            guildId: process.env.DISCORD_GUILD_ID,
            channelIds: process.env.DISCORD_CHANNEL_IDS?.split(',')
        },
    },
    bio: ['A helpful bot for Discord communities.'],
    style: { all: ['Friendly', 'Helpful'], chat: ['Interactive'] },
};

const discordAgent: ProjectAgent = {
    character: discordCharacter,
    plugins: [discordPlugin],
    init: async (runtime: IAgentRuntime) => {
        console.log('Initializing Discord Bot');
        console.log('▶︎ Discord settings (from character):', runtime.character?.settings?.discord);

        const discordSettings = runtime.character?.settings?.discord as IDiscordAgentSettings;
        const configuredDiscordGuildId = discordSettings?.guildId;
        const configuredDiscordChannelIds = discordSettings?.channelIds;

        if (configuredDiscordGuildId) {
            console.log(`[DiscordAgent] Configured to operate primarily in Discord Guild ID: ${configuredDiscordGuildId}`);
        } else {
            console.warn('[DiscordAgent] DISCORD_GUILD_ID not set in .env. Bot will attempt to operate across all invited guilds.');
        }
        if (configuredDiscordChannelIds && configuredDiscordChannelIds.length > 0) {
            console.log(`[DiscordAgent] Configured to operate in specific Discord Channel IDs (from settings): ${configuredDiscordChannelIds.join(', ')}`);
        } else {
            console.log('[DiscordAgent] No specific Discord CHANNEL_IDS configured in character settings.');
        }


        runtime.registerEvent('REPLY_IN_DISCORD', async (params: { text: string; roomId: string }) => { 
            const prompt = `Formulate a concise and helpful response for a Discord user based on the following text: "${params.text}"`;
            const reply = await generateResponse(prompt);
            console.log('[DiscordAgent] Generated Discord reply:', reply);

            try {
               
                await runtime.emitEvent(EventType.MESSAGE_SENT, {
                    message: {
                        text: reply,
                        source: 'discord'
                    },
                    roomId: params.roomId, 
                });
                console.log('✅ [DiscordAgent] Discord message sent successfully to Discord Channel ID:', params.roomId);
            } catch (error) {
                console.error('❌ [DiscordAgent] Failed to send Discord message via runtime.emitEvent:', error);
            }
        });

        runtime.registerEvent('MESSAGE_RECEIVED', async (payload: any) => {
            const client = payload.client || payload.message?.content?.source;
            const internalElizaOSRoomId = payload.message?.roomId || payload.roomId;

            console.log(`[DiscordAgent] Received MESSAGE_RECEIVED event for client: ${client}, internalElizaOSRoomId: ${internalElizaOSRoomId}`);

            if (client === 'discord') {
                const messageData = payload.message;

                const { guildId: extractedDiscordGuildId, channelId: extractedDiscordChannelId } = extractDiscordIdsFromUrl(messageData?.content?.url);
                
                const messageText = typeof messageData?.content?.text === 'string' ? messageData.content.text : '';
                const senderName = messageData?.metadata?.entityName || messageData?.senderName;

                console.log('[DiscordAgent] Parsed Discord Message Data:', {
                    client,
                    internalElizaOSRoomId,
                    incomingDiscordGuildId: extractedDiscordGuildId, 
                    incomingDiscordChannelId: extractedDiscordChannelId,
                    messageText,
                    senderName,
                    rawMessageData: {
                        id: messageData?.id,
                        entityId: messageData?.entityId,
                        agentId: messageData?.agentId,
                        roomId: messageData?.roomId,
                        content: messageData?.content ? { ...messageData.content } : undefined,
                        metadata: messageData?.metadata ? { ...messageData.metadata } : undefined,
                        createdAt: messageData?.createdAt
                    }
                });

                if (configuredDiscordGuildId && extractedDiscordGuildId && configuredDiscordGuildId !== extractedDiscordGuildId) {
                    console.log(`[DiscordAgent] Ignoring message from unconfigured Discord guild: ${extractedDiscordGuildId}. Configured: ${configuredDiscordGuildId}`);
                    return; 
                }


                console.log(`[DiscordAgent] Received Discord message from guild ${extractedDiscordGuildId || 'N/A'} (Discord Channel ID: ${extractedDiscordChannelId || 'N/A'}): "${messageText}" (Sender: ${senderName})`);

                console.log(`[DiscordAgent] Processing Discord message for ElizaOS roomId ${internalElizaOSRoomId} (Discord Channel ID: ${extractedDiscordChannelId}): "${messageText}"`);
                
              
                if (extractedDiscordChannelId) {
                    await runtime.emitEvent('REPLY_IN_DISCORD', { text: messageText, roomId: extractedDiscordChannelId });
                } else {
                    console.error('[DiscordAgent] Could not determine Discord Channel ID for Discord reply.');
                }
            } else if (client === 'client_chat') {
                const dashboardPayload = payload.payload;
                const dashboardMessageText = typeof dashboardPayload?.message === 'string' ? dashboardPayload.message : (dashboardPayload.message?.text || '');
                const dashboardSenderName = dashboardPayload.senderName;
                const dashboardRoomId = internalElizaOSRoomId;

                console.log(`[DiscordAgent] Handling dashboard message from ${dashboardSenderName}: "${dashboardMessageText}" (ElizaOS Room: ${dashboardRoomId})`);

                const prompt = `Formulate a concise and helpful response for a dashboard user based on the following text: "${dashboardMessageText}"`;
                const reply = await generateResponse(prompt);
                console.log('[DiscordAgent] Generated dashboard reply:', reply);

                try {
                    await runtime.emitEvent(EventType.MESSAGE_SENT, {
                        message: {
                            text: reply,
                            source: 'client_chat'
                        },
                        roomId: dashboardRoomId,
                    });
                    console.log('✅ [DiscordAgent] Dashboard message sent successfully to ElizaOS roomId:', dashboardRoomId);
                } catch (error) {
                    console.error('❌ [DiscordAgent] Failed to send dashboard message via runtime.emitEvent:', error);
                }
            } else {
                console.warn(`[DiscordAgent] Received MESSAGE_RECEIVED event from unknown client source: ${client}`);
            }
        });

        console.log('DiscordBot is ready. It will respond to messages in configured Discord channels.');
    },
};


const telegramAgent: ProjectAgent = {
    character: {
        name: 'TelegramBot',
        plugins: ['@elizaos/plugin-telegram'],
        settings: {
            telegram: {
                botToken: process.env.TELEGRAM_BOT_TOKEN,
                channelIds: process.env.TELEGRAM_CHANNEL_IDS?.split(',') // Pass as array
            },
        },
        bio: ['A quick-response bot for Telegram users.'],
        style: { all: ['Fast', 'Direct'], chat: ['Supportive'] },
    },
    plugins: [telegramPlugin],
    init: async (runtime: IAgentRuntime) => {
        console.log('Initializing Telegram Bot');
        console.log('▶︎ Telegram settings (from character):', runtime.character?.settings?.telegram);

        const telegramSettings = runtime.character?.settings?.telegram as ITelegramAgentSettings;
        const configuredTelegramChannelIds = telegramSettings?.channelIds;

        if (configuredTelegramChannelIds && configuredTelegramChannelIds.length > 0) {
            console.log(`[TelegramAgent] Configured to operate in Telegram Channel IDs (from settings): ${configuredTelegramChannelIds.join(', ')}`);
        } else {
            console.warn('[TelegramAgent] TELEGRAM_CHANNEL_IDS not set or empty in .env. Bot will respond to all messages it receives, if no plugin-level filtering.');
        }


        runtime.registerEvent('REPLY_IN_TELEGRAM', async (params: { text: string; roomId: string | number }) => {
            console.log('[TelegramAgent] REPLY_IN_TELEGRAM event triggered with params:', params);
            const prompt = `Respond concisely and supportively to a Telegram user based on the following text: "${params.text}"`;
            const reply = await generateResponse(prompt);
            console.log('[TelegramAgent] Generated Telegram reply:', reply);

            try {
                await runtime.emitEvent(EventType.MESSAGE_SENT, {
                    message: {
                        text: reply,
                        source: 'telegram'
                    },
                    roomId: String(params.roomId),
                });
                console.log('✅ [TelegramAgent] Telegram message sent successfully to roomId:', params.roomId);
            } catch (error) {
                console.error('❌ [TelegramAgent] Failed to send Telegram message via runtime.emitEvent:', error);
            }
        });

        runtime.registerEvent('MESSAGE_RECEIVED', async (payload: any) => {
            const client = payload.client || payload.message?.content?.source;
            const internalElizaOSRoomId = payload.message?.roomId || payload.roomId;

            console.log(`[TelegramAgent] Received MESSAGE_RECEIVED event for client: ${client}, internalElizaOSRoomId: ${internalElizaOSRoomId}`);

            if (client === 'telegram') {
                const messageData = payload.message; // For Telegram, messageData is payload.message

                const incomingTelegramRoomId = messageData?.metadata?.fromId;
                const messageText = messageData?.content?.text;
                const senderName = messageData?.metadata?.entityName || messageData?.metadata?.entityUserName;


                console.log('[TelegramAgent] Parsed Telegram Message Data:', {
                    client,
                    internalElizaOSRoomId,
                    incomingTelegramRoomId,
                    messageText,
                    senderName,
                    rawMessageData: messageData
                });

                if (!internalElizaOSRoomId || incomingTelegramRoomId === undefined || !messageText) {
                    console.error('[TelegramAgent] Critical Telegram message data missing after parsing (ElizaOS roomId, Telegram chat ID, or text). Skipping reply.');
                    return;
                }

                console.log(`[TelegramAgent] Received Telegram message from chat ${incomingTelegramRoomId} (ElizaOS roomId: ${internalElizaOSRoomId}): "${messageText}" (Sender: ${senderName})`);

                console.log(`[TelegramAgent] Debugging Telegram filter:`);
                console.log(`  configuredTelegramChannelIds: ${JSON.stringify(configuredTelegramChannelIds)}`);
                console.log(`  incomingTelegramRoomId (string): '${String(incomingTelegramRoomId)}'`);
                const isIncluded = configuredTelegramChannelIds?.includes(String(incomingTelegramRoomId));
                console.log(`  configuredTelegramChannelIds.includes(incomingTelegramRoomId): ${isIncluded}`);


                if (configuredTelegramChannelIds && !isIncluded) {
                    console.log(`[TelegramAgent] Ignoring message from unconfigured Telegram chat: ${incomingTelegramRoomId}`);
                    return;
                }

                console.log(`[TelegramAgent] Processing Telegram message for room ${incomingTelegramRoomId}: "${messageText}"`);
                if (internalElizaOSRoomId && isIncluded) {
                     await runtime.emitEvent('REPLY_IN_TELEGRAM', { text: messageText, roomId: configuredTelegramChannelIds });
                } else {
                    console.error('[TelegramAgent] Could not determine ElizaOS roomId for Telegram reply.');
                }
            } else if (client === 'client_chat') {
                const dashboardPayload = payload.payload;
                const dashboardMessageText = typeof dashboardPayload?.message === 'string' ? dashboardPayload.message : (dashboardPayload.message?.text || '');
                const dashboardSenderName = dashboardPayload.senderName;
                const dashboardRoomId = internalElizaOSRoomId;

                console.log(`[TelegramAgent] Handling dashboard message from ${dashboardSenderName}: "${dashboardMessageText}" (ElizaOS Room: ${dashboardRoomId})`);

                const prompt = `Formulate a concise and helpful response for a dashboard user based on the following text: "${dashboardMessageText}"`;
                const reply = await generateResponse(prompt);
                console.log('[TelegramAgent] Generated dashboard reply:', reply);

                try {
                    await runtime.emitEvent(EventType.MESSAGE_SENT, {
                        message: {
                            text: reply,
                            source: 'client_chat'
                        },
                        roomId: dashboardRoomId,
                    });
                    console.log('✅ [TelegramAgent] Dashboard message sent successfully to ElizaOS roomId:', dashboardRoomId);
                } catch (error) {
                    console.error('❌ [TelegramAgent] Failed to send dashboard message via runtime.emitEvent:', error);
                }
            } else {
                console.warn(`[TelegramAgent] Received MESSAGE_RECEIVED event from unknown client source: ${client}`);
            }
        });

        console.log('[TelegramAgent] Emitting test REPLY_IN_TELEGRAM event on startup to user 1047320223.');
        await runtime.emitEvent('REPLY_IN_TELEGRAM', { text: 'Hello Telegram! I am online and ready to chat.', roomId: '1047320223' });


        console.log('TelegramBot is ready. It will respond to messages in configured Telegram chats and dashboard messages directed to it.');
    },
};


const project: Project = {
    agents: [discordAgent, telegramAgent],
};

export default project;
