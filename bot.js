const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
} = require("discord.js");

require("dotenv").config();
const fs = require("fs");

const typeMap = {
  playing: 0,
  streaming: 1,
  listening: 2,
  watching: 3,
  competing: 5,
};

// Chargement des données
let config = require("./config.json");
let prefixData = require("./prefix.json");
let panelData = require("./panel.json");
let ownersData = require("./owners.json");
let buyersData = require("./buyers.json");

// Création du bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Fonctions de sauvegarde
function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function saveAll() {
  save("./config.json", config);
  save("./prefix.json", prefixData);
  save("./panel.json", panelData);
  save("./owners.json", ownersData);
  save("./buyers.json", buyersData);
}

function isBuyer(id) {
  return buyersData.buyers.includes(id);
}
function isOwner(id) {
  return ownersData.owners.includes(id) || isBuyer(id);
}

// Mise à jour auto du panel
async function updatePanel(guild) {
  if (!panelData.messageId || !panelData.channelId) return;
  const channel = guild.channels.cache.get(panelData.channelId);
  if (!channel) return;
  try {
    const msg = await channel.messages.fetch(panelData.messageId);
    const role = guild.roles.cache.get(config.roleId);
    const embed = new EmbedBuilder()
      .setTitle("🔐 Auto Rôle")
      .setColor(0x5865f2)
      .setDescription("👤 Seul l’auteur du panneau peut le modifier")
      .addFields(
        { name: "Mot-clé", value: config.keyword || "*Aucun*" },
        { name: "Rôle", value: role ? role.name : "*Aucun*" }
      );

    const options = guild.roles.cache
      .filter(r => r.name !== "@everyone" && r.editable)
      .map(r => ({ label: r.name, value: r.id }));

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`modifier_motcle`)
        .setLabel("✏️ Modifier mot-clé")
        .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`choix_role`)
        .setPlaceholder("Choisir un rôle")
        .addOptions(options)
    );

    await msg.edit({ embeds: [embed], components: [row2, row1] });
  } catch (err) {
    console.error("Erreur updatePanel:", err);
  }
}

client.once("ready", () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  if (config.activity) client.user.setActivity(config.activity.text, { type: typeMap[config.activity.type] });
  if (config.presence) client.user.setPresence({ status: config.presence });
});
let globalFooter = "|*Autorank|"; // footer par défaut

// Commandes texte
client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild) return;

  const prefix = prefixData.prefix || "*";
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  if (["panel", "prefix", "owner", "unowner", "logs", "owners","help","status","setpresence","setpp","setbanner","footer"].includes(cmd) && !isOwner(message.author.id)) {
    return message.reply(`❌ <@${message.author.id}> vous n'êtes pas autorisé à utiliser cette commande.`);
  }
 if (cmd === 'help') {
    const embed = new EmbedBuilder()
      .setTitle('📖 Liste des commandes')
      .setColor('#0099ff')
      .setDescription('Voici les commandes disponibles et leur description :')
      .addFields(
        { name: `${prefix}panel`, value: '⚙️ - Ouvre le panneau de configuration.' },
        { name: `${prefix}prefix <prefix>`, value: '❗- Change le préfixe du bot.' },
        { name: `${prefix}owner @user`, value: '👑 - Ajoute un owner.' },
        { name: `${prefix}unowner @user`, value: '❌ - Retire un owner.' },
        { name: `${prefix}owners`, value: '❔ - Affiche la liste des owners.' },
        { name: `${prefix}logs #channel`, value: '📁 - Configure le salon de logs.' },
        { name: `${prefix}status <type> <texte>`, value: '🤖 - Change le status du bot.' },
        { name: `${prefix}setpresence <online|dnd|idle|invisible>`, value: '🤖 -Change le statut de présence.' },
        { name: `${prefix}setpp <url>`, value: '✅ - Change l\'image de profil du bot.' },
        { name: `${prefix}setbanner <url>`, value: '✅ - Change la banniere du bot.' },
        { name: `${prefix}footer <texte>`, value: '✅ - Modifie le footers de tout les embeds' },
      )
      .setFooter({ text: globalFooter })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }
  if (cmd === "prefix") {
    if (!args[0]) return message.reply(`🛠️ Préfixe actuel : \`${prefix}\``);
    prefixData.prefix = args[0];
    saveAll();
    return message.reply(`✅ Nouveau préfixe : \`${args[0]}\``);
  }

  if (cmd === "panel") {
    const role = message.guild.roles.cache.get(config.roleId);
    const embed = new EmbedBuilder()
      .setTitle("🔐 Auto Rank")
      .setColor(0x5865f2)
      .setDescription(`👤 Seul **${message.author.tag}** peut modifier ce panneau`)
      .addFields(
        { name: "Tag", value: config.keyword || "*Aucun*" },
        { name: "Rôle", value: role ? role.name : "*Aucun*" }
      )
      .setFooter({ text: globalFooter });
      

    const options = message.guild.roles.cache
      .filter(r => r.name !== "@everyone" && r.editable)
      .map(r => ({ label: r.name, value: r.id }));

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("modifier_motcle")
        .setLabel("✏️ Modifier le Tag")
        .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("choix_role")
        .setPlaceholder("Choisir un rôle")
        .addOptions(options)
    );

    const sent = await message.channel.send({ embeds: [embed], components: [row2, row1] });
    panelData = { messageId: sent.id, channelId: message.channel.id };
    saveAll();
  }

  if (cmd === "owner") {
    const user = message.mentions.users.first();
    if (!user) return message.reply("❌ Mentionne un utilisateur.");
    if (!ownersData.owners.includes(user.id)) {
      ownersData.owners.push(user.id);
      saveAll();
    }
    return message.reply(`✅ ${user.tag} est maintenant owner.`);
  }

  if (cmd === "unowner") {
    const user = message.mentions.users.first();
    if (!user) return message.reply("❌ Mentionne un utilisateur.");
    ownersData.owners = ownersData.owners.filter(id => id !== user.id);
    saveAll();
    return message.reply(`✅ ${user.tag} n'est plus owner.`);
  }

  if (cmd === "logs") {
    const channel = message.mentions.channels.first();
    if (!channel) return message.reply("❌ Mentionne un salon valide.");
    config.logChannelId = channel.id;
    saveAll();
    return message.reply(`✅ Salon de logs défini sur ${channel}`);
  }

  if (cmd === "owners") {
    const embed = new EmbedBuilder().setTitle("👑 Liste des Owners").setColor(0x5865f2);
    let desc = ownersData.owners.map(id => `<@${id}> (\`${id}\`)`).join("\n");
    desc += "\n\n👤 **Buyers (non modifiables)**\n" + buyersData.buyers.map(id => `<@${id}> (\`${id}\`)`).join("\n");
    embed.setDescription(desc);
    embed.setFooter({ text: globalFooter })
    return message.reply({ embeds: [embed] });
  }
if (cmd === "status") {
  if (args.length < 2) return message.reply("❌ Usage: *status <playing|listening|watching|streaming|competing> <texte du status>");
  const typeStr = args.shift().toLowerCase();
  if (!(typeStr in typeMap)) return message.reply("❌ Type invalide. Choisis parmi: playing, streaming, listening, watching, competing");
  
  const statusText = args.join(" ");
  if (!statusText) return message.reply("❌ Tu dois indiquer le texte du status.");

  try {
    await client.user.setActivity(statusText, { type: typeMap[typeStr] });
    config.activity = { text: statusText, type: typeStr };
    saveAll();
    return message.reply(`✅ Status mis à jour : ${typeStr} ${statusText}`);
  } catch (err) {
    console.error(err);
    return message.reply("❌ Impossible de modifier le status.");
  }
}


if (cmd === "setpresence") {
  if (args.length !== 1) return message.reply("❌ Usage: *setpresence <online|dnd|idle|invisible>");
  const validStatuses = ["online", "dnd", "idle", "invisible"];
  const status = args[0].toLowerCase();
  if (!validStatuses.includes(status)) return message.reply("❌ Statut invalide. Choisis parmi: online, dnd, idle, invisible");

  try {
    await client.user.setPresence({ status });
    config.presence = status;
    saveAll();
    return message.reply(`✅ Statut de présence mis à jour : ${status}`);
  } catch (err) {
    console.error(err);
    return message.reply("❌ Impossible de modifier la présence.");
  }
}


// Commande pour changer la photo de profil
if (cmd === "setpp") {
  if (args.length !== 1) return message.reply("❌ Usage: *setpp <url_image>");
  const url = args[0];
  try {
    await client.user.setAvatar(url);
    return message.reply("✅ Photo de profil mise à jour.");
  } catch {
    return message.reply("❌ Impossible de modifier la photo de profil.");
  }
}

// Commande pour changer la bannière (uniquement pour les bots avec accès à cette fonctionnalité)
if (cmd === "setbanner") {
  if (args.length !== 1) return message.reply("❌ Usage: *setbanner <url_image>");
  const url = args[0];
  try {
    await client.user.setBanner(url);
    return message.reply("✅ Bannière mise à jour.");
  } catch {
    return message.reply("❌ Impossible de modifier la bannière. (Vérifie si le bot a accès à cette fonctionnalité)");
  }
}

  if (cmd === 'footer') {

    if (args.length === 0) {
      return message.reply("Veuillez fournir un texte pour le footer.");
    }

    globalFooter = args.join(' ');
    saveAll();
    return message.channel.send(`Footer global mis à jour en : "${globalFooter}"`);
  }

});

// Interaction
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

  if (interaction.customId === "modifier_motcle") {
    const modal = new ModalBuilder()
      .setCustomId("set_keyword")
      .setTitle("Changer le Tag")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("new_keyword")
            .setLabel("Entrez le nouveau Tag")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
    return interaction.showModal(modal);
  }

  if (interaction.customId === "choix_role") {
    const roleId = interaction.values[0];
    config.roleId = roleId;
    saveAll();
    await updatePanel(interaction.guild);
    return interaction.reply({ content: `✅ Rôle mis à jour.`, ephemeral: true });
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId === "set_keyword") {
    config.keyword = interaction.fields.getTextInputValue("new_keyword");
    saveAll();
    await updatePanel(interaction.guild);
    return interaction.reply({ content: `✅ Tag mis à jour.`, ephemeral: true });
  }
});

// Suivi des pseudos
client.on("guildMemberUpdate", async (oldM, newM) => {
  const before = (oldM.nickname || oldM.user.username).toLowerCase();
  const after = (newM.nickname || newM.user.username).toLowerCase();
  const keyword = config.keyword?.toLowerCase();
  const role = newM.guild.roles.cache.get(config.roleId);
  const logChannel = config.logChannelId && newM.guild.channels.cache.get(config.logChannelId);

  if (!role || !keyword) return;

  const added = !before.includes(keyword) && after.includes(keyword);
  const removed = before.includes(keyword) && !after.includes(keyword);

  if (added) {
    if (!newM.roles.cache.has(role.id)) await newM.roles.add(role);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setDescription(`✅ ${newM.user} a ajouté le Tag et a reçu le rôle **${role.name}**.`)
        .setFooter({ text: globalFooter });
      logChannel.send({ embeds: [embed] });
    }
  }

  if (removed) {
    if (newM.roles.cache.has(role.id)) await newM.roles.remove(role);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription(`❌ ${newM.user} a retiré le Tag et a perdu le rôle **${role.name}**.`)
        .setFooter({ text: globalFooter });
      logChannel.send({ embeds: [embed] });
    }
  }
});

// Quitter si ajouté par personne non autorisée
client.on("guildCreate", async guild => {
  const inviter = await guild.fetchOwner();
  const isAllowed = isOwner(inviter.id);
  const embed = new EmbedBuilder().setColor(isAllowed ? 0x00ff00 : 0xff0000);

  if (isAllowed) {
    embed.setTitle("✅ Nouvelle invitation")
      .setDescription(`Serveur : **${guild.name}**\nCréateur : ${inviter.user}\nAjouté par : ${inviter.user}`);
  } else {
    embed.setTitle("⛔️ Invitation refusée")
      .setDescription(`Je n'ai pas été invité par un Owner/Buyer.\nServeur : **${guild.name}**\nCréateur : ${inviter.user}\nJe quitte le serveur.`);
  }

  [...buyersData.buyers, ...ownersData.owners].forEach(async id => {
    try {
      const user = await client.users.fetch(id);
      if (user) user.send({ embeds: [embed] });
    } catch {}
  });

  if (!isAllowed) guild.leave();
});

client.login(process.env.TOKEN);

