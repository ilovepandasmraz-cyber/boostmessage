const { Client, GatewayIntentBits, EmbedBuilder, Partials, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

// Create the bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.GuildMember]
});

// In-memory boost tracking (replace with database for persistence)
const boostCounts = {};

// Role configuration
const roleRanks = [
  { count: 1, name: 'Silver', roleId: '1391720886654210179' },
  { count: 3, name: 'Platinum', roleId: '1391721060185018428' },
  { count: 4, name: 'Emerald', roleId: '1391721214732537866' },
  { count: 6, name: 'Diamond', roleId: '1391721542726979584' }
];

// Helper to determine role rank from boost count
function getRank(boosts) {
  let current = null, next = null;
  for (const rank of roleRanks) {
    if (boosts >= rank.count) current = rank;
    else if (!next) next = rank;
  }
  return { current, next };
}

// Handle boost
async function handleBoost(newMember, channel) {
  const userId = newMember.id;
  const boosts = (boostCounts[userId] || 0) + 1;
  boostCounts[userId] = boosts;

  const { current, next } = getRank(boosts);

  // Apply current role
  if (current) {
    const role = newMember.guild.roles.cache.get(current.roleId);
    if (role && !newMember.roles.cache.has(role.id)) {
      await newMember.roles.add(role).catch(console.error);
    }
  }

  // Create embed (same as your original message)
  const embed = new EmbedBuilder()
    .setTitle("<:boost:1393469695205834784> New Server Boost!")
    .setDescription(`Thank you <@${newMember.id}> for boosting the server!\n` +
      '\n' +
      '-# To claim your perks, please open a [General Support Ticket](https://discord.com/channels/1386289738419535882/1386304371989676137/1400268694029860936)'
    )
    .setColor(0xFF73FA)
    .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
    .setImage('https://media.discordapp.net/attachments/1386308042890543235/1401424657474654260/NoBlurDPSRedGlow.png?ex=689039eb&is=688ee86b&hm=1afb7b216cc00187b820c44bb8bc07fbae5c95eb70b740dee2769b46f30a69b2&=&format=webp&quality=lossless&width=1387&height=763')
    .setTimestamp();

  await channel.send({ embeds: [embed] });

  // Send rank info
  const info = `🎖️ You now have the **${current?.name || "No"}** role with **${boosts}** boosts.\n` +
               (next
                 ? `⭐ You need **${next.count - boosts}** more boost(s) to reach **${next.name}**!`
                 : `🏆 You've reached the highest rank!`);

  await channel.send(`<@${newMember.id}>\n${info}`);
}

// Boost detection
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  if (!oldMember.premiumSince && newMember.premiumSince) {
    const boostChannelId = '1392253947451805766'; // Replace with your channel ID
    const channel = newMember.guild.channels.cache.get(boostChannelId);
    if (!channel) return;

    await handleBoost(newMember, channel);
  }
});

// Register test command
client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('testboost')
      .setDescription('Simulates a boost for testing')
      .addUserOption(option => 
        option.setName('user')
              .setDescription('User to simulate boost')
              .setRequired(true)
      )
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log('Slash commands registered');
});

// Handle test command
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'testboost') {
    const requiredRoleId = '1386674622275125421'; // Replace with your required role ID

    if (!interaction.member.roles.cache.has(requiredRoleId)) {
      return interaction.reply({ content: "❌ You don't have permission to use this command.", ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(targetUser.id);
    const channel = interaction.channel;

    await handleBoost(member, channel);
    await interaction.reply({ content: `Simulated boost for <@${member.id}>`, ephemeral: true });
  }
});



// Login
client.login(process.env.TOKEN);
