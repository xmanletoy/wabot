//ps aux | grep node
//kill -9 1128275
const sessionName = "xman";
const {
  default: sansekaiConnect,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  jidDecode,
  proto,
  getContentType,
  Browsers, 
  fetchLatestWaWebVersion,
  downloadContentFromMessage  
} = require("@whiskeysockets/baileys");

const pino      = require("pino");
const { Boom }  = require("@hapi/boom");
const fs        = require("fs");
const axios     = require("axios");
const chalk     = require("chalk");
const figlet    = require("figlet");
const _ = require("lodash");
const PhoneNumber = require("awesome-phonenumber");
const qrcode    = require('qrcode');
const WebSocket = require('ws');
const wss       = new WebSocket.Server({ port: 8443 });
console.log('WebSocket server started on port 8443');
const fileType = require('file-type');
const mime = require('mime-types');

let client; // Definisikan client di scope yang lebih luas

// Tambahkan event listener untuk menangani pesan
wss.on('message', (msg) => {
  const data = JSON.parse(msg);

  // Deteksi jika koneksi diganti
  if (data.message === 'Connection Replaced, Another New Session Opened') {
    console.log('Koneksi diganti, menghapus session lama...');

    // Hapus session lama
    deleteSession();

    // Restart atau buat ulang koneksi
    startHisoka();
  } else {
    console.log('Pesan diterima:', data);
  }
});



// Fungsi untuk menghapus session lama
function deleteSession() {
  const fs = require('fs');
  const sessionPath = './xman';

  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
    console.log('Session lama berhasil dihapus.');
  }
}



wss.on('connection', function connection(ws) {
    console.log('WebSocket connection established');
    ws.send(JSON.stringify({ type: 'info', data: 'X-Man success connected to server' }));

    ws.on('message', async function incoming(message) {
        try {
            const data = JSON.parse(message);
            console.log('received: %s', message);

            if (data.type === 'sendWhatsApp') {
                const number = `${data.number}@s.whatsapp.net`;
                const text = data.message;
                const file = data.file;

                console.log(`Preparing to send message to ${number}: ${text}`);

                try {
                    if (!client) {
                        throw new Error('Client is not initialized');
                    }

                    if (file) {
                        const buffer = Buffer.from(file, 'base64');
                        const mimeType = await getMimeType(buffer);
                        const extension = mime.extension(mimeType) || 'bin';

                        if (mimeType.startsWith('image/')) {
                            await client.sendMessage(number, { image: buffer, caption: text });
                            console.log(`Image berhasil dikirim ke ${number}`);
                        } else {
                            await client.sendMessage(number, { document: buffer, mimetype: mimeType, caption: text });
                            console.log(`Document berhasil dikirim ke ${number}`);
                        }

                        // Send file data to PHP for saving
                        ws.send(JSON.stringify({
                            type: 'file',
                            data: file,
                            mimeType: mimeType,
                            extension: extension,
                            from: data.number
                        }));
                    } else {
                        await client.sendMessage(number, { text: text });
                        console.log(`Pesan berhasil dikirim ke ${number}`);
                    }
                } catch (error) {
                    console.error(`Inisialisasi data dari ${number}:`);
                }
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });
});

async function getMimeType(buffer) {
    const type = await fileType.fromBuffer(buffer);
    return type ? type.mime : 'application/octet-stream';
}



const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) });

const color = (text, color) => {
  return !color ? chalk.green(text) : chalk.keyword(color)(text);
};



const sendLogToClients = (message) => {
    console.log(message);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'log', data: message }));
        }
    });
};



function smsg(conn, m, store) {
  if (!m) return m;
  let M = proto.WebMessageInfo;

  
  if (m.key) {
    m.id = m.key.id;
    m.isBaileys = m.id.startsWith("BAE5") && m.id.length === 16;
    m.chat = m.key.remoteJid;
    m.fromMe = m.key.fromMe;
    m.isGroup = m.chat.endsWith("@g.us");
    m.sender = conn.decodeJid((m.fromMe && conn.user.id) || m.participant || m.key.participant || m.chat || "");
    if (m.isGroup) m.participant = conn.decodeJid(m.key.participant) || "";
  }



  if (m.message) {
    m.mtype = getContentType(m.message);
    m.msg = m.mtype == "viewOnceMessage" ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype];
    m.body =
      m.message.conversation ||
      m.msg.caption ||
      m.msg.text ||
      (m.mtype == "viewOnceMessage" && m.msg.caption) ||
      m.text;
    let quoted = (m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null);
    m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];

    if (m.quoted) {
      let type = getContentType(quoted);
      m.quoted = m.quoted[type];
      if (["productMessage"].includes(type)) {
        type = getContentType(m.quoted);
        m.quoted = m.quoted[type];
      }

      if (typeof m.quoted === "string")
        m.quoted = {
          text: m.quoted,
        };
      m.quoted.mtype = type;
      m.quoted.id = m.msg.contextInfo.stanzaId;
      m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat;
      m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith("BAE5") && m.quoted.id.length === 16 : false;
      m.quoted.sender = conn.decodeJid(m.msg.contextInfo.participant);
      m.quoted.fromMe = m.quoted.sender === conn.decodeJid(conn.user.id);
      m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || "";
      m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
      m.getQuotedObj = m.getQuotedMessage = async () => {
        if (!m.quoted.id) return false;
        let q = await store.loadMessage(m.chat, m.quoted.id, conn);
        return exports.smsg(conn, q, store);
      };
      let vM = (m.quoted.fakeObj = M.fromObject({
        key: {
          remoteJid: m.quoted.chat,
          fromMe: m.quoted.fromMe,
          id: m.quoted.id,
        },
        message: quoted,
        ...(m.isGroup ? { participant: m.quoted.sender } : {}),
      }));


      m.quoted.delete = () => conn.sendMessage(m.quoted.chat, { delete: vM.key });
      m.quoted.copyNForward = (jid, forceForward = false, options = {}) => conn.copyNForward(jid, vM, forceForward, options);
      m.quoted.download = () => conn.downloadMediaMessage(m.quoted);
    }
  }


  if (m.msg.url) m.download = () => conn.downloadMediaMessage(m.msg);
  m.text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || "";
  m.reply = (text, chatId = m.chat, options = {}) => (Buffer.isBuffer(text) ? conn.sendMedia(chatId, text, "file", "", m, { ...options }) : conn.sendText(chatId, text, m, { ...options }));
  m.copy = () => exports.smsg(conn, M.fromObject(M.toObject(m)));

  return m;
}

async function startHisoka() {
  const { state, saveCreds } = await useMultiFileAuthState(`./${sessionName ? sessionName : "session"}`);
  const { version, isLatest } = await fetchLatestWaWebVersion().catch(() => fetchLatestBaileysVersion());
  sendLogToClients(`LogToClients Using WA v${version.join(".")}, isLatest: ${isLatest}`);
  console.log(
    color(
      figlet.textSync("Wa - X Bot", {
        font: "Standard",
        horizontalLayout: "default",
        vertivalLayout: "default",
        whitespaceBreak: false,
      }),
      "yellow"
    )
  );

  client = sansekaiConnect({
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: Browsers.macOS('Desktop'),
    auth: state,
    generateHighQualityLinkPreview: true,
  });

  store.bind(client.ev);

  client.ev.on("messages.upsert", async (chatUpdate) => {
    try {
        const mek = chatUpdate.messages[0];
        console.log("Received message structure:", JSON.stringify(mek, null, 2));

        if (!mek.message) {
            console.log("Received message without body or invalid message structure");
            return;
        }
        mek.message = Object.keys(mek.message)[0] === "ephemeralMessage" ? mek.message.ephemeralMessage.message : mek.message;
        if (mek.key && mek.key.remoteJid === "status@broadcast") return;
        if (!client.public && !mek.key.fromMe && chatUpdate.type === "notify") return;
        if (mek.key.id.startsWith("BAE5") && mek.key.id.length === 16) return;
        const m = smsg(client, mek, store);

        const messageType = m.mtype;
        let buffer, mimeType;
        let latitude, longitude;

        console.log('Message Type:', messageType);
        console.log('Message Content:', JSON.stringify(m.message, null, 2));

        // Deteksi pesan lokasi
        if (messageType === 'locationMessage') {
            latitude = m.message.locationMessage.degreesLatitude;
            longitude = m.message.locationMessage.degreesLongitude;
            console.log(`Location received: ${latitude}, ${longitude}`);
        } else if (messageType === 'liveLocationMessage') {
            latitude = m.message.liveLocationMessage.degreesLatitude;
            longitude = m.message.liveLocationMessage.degreesLongitude;
            console.log(`Live location received: ${latitude}, ${longitude}`);
        }

        if (messageType === 'imageMessage' || messageType === 'videoMessage' || messageType === 'stickerMessage' || messageType === 'documentMessage') {
            console.log('Downloading content...');
            buffer = await safeDownloadContent(m.message[messageType], messageType.replace('Message', ''));
            console.log('Download complete. Buffer:', buffer ? `Valid (length: ${buffer.length})` : 'Invalid');
            mimeType = m.message[messageType].mimetype;

            if (buffer && Buffer.isBuffer(buffer)) {
                const base64Data = buffer.toString('base64');
                console.log('Base64 data length:', base64Data.length);

                // Kirim data file ke klien WebSocket yang terhubung
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'file',
                            data: base64Data,
                            mimeType: mimeType,
                            from: m.sender,
                            pushName: m.pushName
                        }));
                    }
                });
            } else {
                console.log('No valid buffer to process');
            }
        } else if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
            console.log('Text message received. Not saving or processing.');
        } else {
            console.log('Unsupported message type:', messageType);
        }

        if (m) {
            require("./sansekai")(client, m, chatUpdate, store);
        }

        // Tambahkan ini untuk menampilkan semua pesan
        let messageContent = '';
        if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
            messageContent = m.body;
        } else if (messageType === 'imageMessage' || messageType === 'videoMessage' || messageType === 'stickerMessage' || messageType === 'documentMessage') {
            messageContent = `[${messageType}]`;
        } else if (messageType === 'locationMessage' || messageType === 'liveLocationMessage') {
            messageContent = `[Location: ${latitude}, ${longitude}]`;
        }

        console.log(`Pesan ${mek.key.fromMe ? 'Terkirim' : 'Diterima'}: ${messageContent}`);

        // Kirim informasi pesan ke klien WebSocket
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                const messageData = JSON.stringify({
                    type: 'message',
                    direction: mek.key.fromMe ? 'sent' : 'received',
                    content: messageContent,
                    from: m.sender,
                    pushName: m.pushName,
                    latitude: latitude,
                    longitude: longitude
                });
                console.log('Sending to WebSocket client:', messageData);
                client.send(messageData);
            } else {
                console.log('WebSocket client not ready:', client.readyState);
            }
        });
    } catch (err) {
        sendLogToClients(`📛 Error processing message: ${err}`);    
        console.log('Error stack:', err.stack);
    }
  });




  // Handle error
  const unhandledRejections = new Map();
  process.on("unhandledRejection", (reason, promise) => {
    unhandledRejections.set(promise, reason);
    console.log("Unhandled Rejection at:", promise, "reason:", reason);
  });
  process.on("rejectionHandled", (promise) => {
    unhandledRejections.delete(promise);
  });
  process.on("Something went wrong", function (err) {
    console.log("Caught exception: ", err);
  });



  // Setting
  client.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {};
      return (decode.user && decode.server && decode.user + "@" + decode.server) || jid;
    } else return jid;
  };

  client.ev.on("contacts.update", (update) => {
    for (let contact of update) {
      let id = client.decodeJid(contact.id);
      if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
    }
  });




  client.getName = (jid, withoutContact = false) => {
    id = client.decodeJid(jid);
    withoutContact = client.withoutContact || withoutContact;
    let v;
    if (id.endsWith("@g.us"))
      return new Promise(async (resolve) => {
        v = store.contacts[id] || {};
        if (!(v.name || v.subject)) v = client.groupMetadata(id) || {};
        resolve(v.name || v.subject || PhoneNumber("+" + id.replace("@s.whatsapp.net", "")).getNumber("international"));
      });
    else
      v =
        id === "0@s.whatsapp.net"
          ? {
              id,
              name: "WhatsApp",
            }
          : id === client.decodeJid(client.user.id)
          ? client.user
          : store.contacts[id] || {};
    return (withoutContact ? "" : v.name) || v.subject || v.verifiedName || PhoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber("international");
  };

  client.public = true;

  client.serializeM = (m) => smsg(client, m, store);

  client.ev.on("connection.update", async (update) => {
  const { connection, lastDisconnect, qr } = update;
  
    if (qr) {
        qrcode.toDataURL(qr, (err, url) => {
            if (err) {
                console.error('Error generating QR code:', err);
                return;
            }
            //console.log('Scan the QR code below:');
            //console.log(url); //menampilkan data kode base64 di console terminal
    
            // Kirim URL QR code ke WebSocket client
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ qrCode: url }));
                    
                }
            });
        });
    }

    if (connection === "close") {
      let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      if (reason === DisconnectReason.badSession) {
        console.log(`Bad Session File, Please Delete Session and Scan Again`);
        deleteSession();
        process.exit();
      } else if (reason === DisconnectReason.connectionClosed) {
        console.log("Connection closed, reconnecting....");
        startHisoka();
      } else if (reason === DisconnectReason.connectionLost) {
        console.log("Connection Lost from Server, reconnecting...");
        startHisoka();
      } else if (reason === DisconnectReason.connectionReplaced) {
        console.log("Connection Replaced, Another New Session Opened, Please Restart Bot");
        deleteSession();
        process.exit();
      } else if (reason === DisconnectReason.loggedOut) {
        console.log(`Device Logged Out, Please Delete Folder Session xman and Scan Again.`);
        deleteSession();
        process.exit();
      } else if (reason === DisconnectReason.restartRequired) {
        console.log("Restart Required, Restarting...");
        startHisoka();
      } else if (reason === DisconnectReason.timedOut) {
        console.log("Connection TimedOut, Reconnecting...");
        startHisoka();
      } else {
        console.log(`Unknown DisconnectReason: ${reason}|${connection}`);
        startHisoka();
      }
      console.log(color("X-Man success connected to server", "green"));
    } else if (connection === "open") {
      console.log(color("cth: ketik /menu -> untuk melihat menu"));
      sendInitialMessage(client);
    }
  });

  client.ev.on("creds.update", saveCreds);

  const getBuffer = async (url, options) => {
    try {
      options ? options : {};
      const res = await axios({
        method: "get",
        url,
        headers: {
          DNT: 1,
          "Upgrade-Insecure-Request": 1,
        },
        ...options,
        responseType: "arraybuffer",
      });
      return res.data;
    } catch (err) {
      return err;
    }
  };

  client.sendImage = async (jid, path, caption = "", quoted = "", options) => {
    let buffer = Buffer.isBuffer(path)
      ? path
      : /^data:.*?\/.*?;base64,/i.test(path)
        ? Buffer.from(path.split`,`[1], "base64")
        : /^https?:\/\//.test(path)
          ? await await getBuffer(path)
          : fs.existsSync(path)
            ? fs.readFileSync(path)
            : Buffer.alloc(0);


    // Send the image data to connected WebSocket clients
    const base64Image = buffer.toString('base64');
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'image',
          data: base64Image,
          jid: jid,
          caption: caption
        }));
      }
    });

    try {
      return await client.sendMessage(jid, { image: buffer, caption: caption, ...options }, { quoted });
    } catch (error) {
      startHisoka();
    }


  };

  client.sendText = (jid, text, quoted = "", options) => client.sendMessage(jid, { text: text, ...options }, { quoted });

  client.cMod = (jid, copy, text = "", sender = client.user.id, options = {}) => {
    let mtype = Object.keys(copy.message)[0];
    let isEphemeral = mtype === "ephemeralMessage";
    if (isEphemeral) {
      mtype = Object.keys(copy.message.ephemeralMessage.message)[0];
    }
    let msg = isEphemeral ? copy.message.ephemeralMessage.message : copy.message;
    let content = msg[mtype];
    if (typeof content === "string") msg[mtype] = text || content;
    else if (content.caption) content.caption = text || content.caption;
    else if (content.text) content.text = text || content.text;
    if (typeof content !== "string")
      msg[mtype] = {
        ...content,
        ...options,
      };

    if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant;

    else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant;

    if (copy.key.remoteJid.includes("@s.whatsapp.net")) sender = sender || copy.key.remoteJid;
    else if (copy.key.remoteJid.includes("@broadcast")) sender = sender || copy.key.remoteJid;
    copy.key.remoteJid = jid;
    copy.key.fromMe = sender === client.user.id;

    return proto.WebMessageInfo.fromObject(copy);
  };

  return client;
}

startHisoka();

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});

async function sendInitialMessage(client) {
  const number = "6285775107126@s.whatsapp.net"; // Format nomor untuk WhatsApp
  const message = "Host Whatsapp Terhubung";

  try {
    await client.sendMessage(number, { text: message });
    console.log("Pesan inisial berhasil dikirim");
  } catch (error) {
    console.error("Gagal mengirim pesan inisial:", error);
  }
}

async function safeDownloadContent(messageContent, contentType) {
    try {
        const stream = await downloadContentFromMessage(messageContent, contentType);
        let chunks = [];
        for await (const chunk of stream) {
            if (Buffer.isBuffer(chunk)) {
                chunks.push(chunk);
            } else if (typeof chunk === 'number') {
                chunks.push(Buffer.from([chunk]));
            } else if (Array.isArray(chunk)) {
                chunks.push(Buffer.from(chunk));
            } else if (typeof chunk === 'string') {
                chunks.push(Buffer.from(chunk, 'utf8'));
            } else {
                console.warn('Chunk tidak valid, dilewati:', typeof chunk, chunk);
            }
        }
        console.log('Chunks collected:', chunks.length);
        if (chunks.length === 0) {
            console.warn('No valid chunks collected');
            return null;
        }
        const validChunks = chunks.filter(chunk => Buffer.isBuffer(chunk));
        console.log('Valid chunks:', validChunks.length);
        if (validChunks.length === 0) {
            console.warn('No valid Buffer chunks');
            return null;
        }
        return Buffer.concat(validChunks);
    } catch (error) {
        console.error(`Error downloading ${contentType}:`, error);
        return null;
    }
}

