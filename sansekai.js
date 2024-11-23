const { BufferJSON, WA_DEFAULT_EPHEMERAL, generateWAMessageFromContent, proto, generateWAMessageContent, generateWAMessage, prepareWAMessageMedia, areJidsSameUser, getContentType } = require("@whiskeysockets/baileys");
const fs = require("fs");
const util = require("util");
const chalk = require("chalk");
const axios = require("axios");
const mime = require("mime-types");
const FormData = require("form-data");
const { fileTypeFromBuffer } = require('file-type');
const fetch = require('node-fetch');
const { Sticker, StickerTypes } = require("wa-sticker-formatter");
const { Client } = require('youtubei');

// Create a new instance of the YouTube client
const yt = new Client();

// Tambahkan fungsi-fungsi berikut di bagian atas file, sebelum module.exports:

const chatHistory = new Map();
const aiChatHistory = new Map();

const APIs = {
  ryzendesu: {
    baseURL: "https://api.ryzendesu.vip"
  },
  widipe: {
    baseURL: "https://widipe.com"
  },
  nyxs: {
    baseURL: "https://api.nyxs.pw"
  },
  sandipbaruwal: {
    baseURL: "https://sandipbaruwal.com"
  },
  agatz: {
      baseURL: "https://api.agatz.xyz"
  },
  aggelos_007: {
      baseURL: "https://api.aggelos-007.xyz"
  },
  chiwa: {
      baseURL: "https://api.chiwa.my.id"
  },
  firda: {
      baseURL: "https://api.firda.uz"
  },
  imphnen_ai: {
      baseURL: "https://imphnen-ai.vercel.app"
  },
  itzpire: {
      baseURL: "https://itzpire.com"
  },
  lenwy: {
      baseURL: "https://api-lenwy.vercel.app"
  },
  lolhuman: {
      baseURL: "https://api.lolhuman.xyz"
  },
  matbasing: {
      baseURL: "https://matbasing.glitch.me"
  },
  miwudev: {
      baseURL: "https://openapi.miwudev.my.id"
  }
  // Tambahkan API lain jika perlu
};

function createUrl(apiName, endpoint, params = {}) {
  const api = APIs[apiName];
  const queryParams = new URLSearchParams(params);
  const baseURL = api.baseURL;
  const apiUrl = new URL(endpoint, baseURL);
  apiUrl.search = queryParams.toString();
  return apiUrl.toString();
}





module.exports = sansekai = async (client, m, chatUpdate) => {
  try {
    const body = m.mtype === "conversation" ? m.message.conversation :
      m.mtype === "imageMessage" ? m.message.imageMessage.caption :
        m.mtype === "videoMessage" ? m.message.videoMessage.caption :
          m.mtype === "extendedTextMessage" ? m.message.extendedTextMessage.text :
            m.mtype === "buttonsResponseMessage" ? m.message.buttonsResponseMessage.selectedButtonId :
              m.mtype === "listResponseMessage" ? m.message.listResponseMessage.singleSelectReply.selectedRowId :
                m.mtype === "templateButtonReplyMessage" ? m.message.templateButtonReplyMessage.selectedId :
                  m.mtype === "messageContextInfo" ? m.message.buttonsResponseMessage?.selectedButtonId ||
                    m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text :
                    "";

    if (m.mtype === "viewOnceMessageV2") return;

    const budy = typeof m.text === "string" ? m.text : "";
    const prefix = /^[\\/!#.]/gi.test(body) ? body.match(/^[\\/!#.]/gi)[0] : "/";
    const isCmd2 = body.startsWith(prefix);
    const command = body.replace(prefix, "").trim().split(/ +/).shift().toLowerCase();
    const args = body.trim().split(/ +/).slice(1);
    const pushname = m.pushName || "Pengguna";
    const botNumber = await client.decodeJid(client.user.id);
    const itsMe = m.sender === botNumber;

    const from = m.chat;
    const reply = m.reply;

    // Group
    const groupMetadata = m.isGroup ? await client.groupMetadata(m.chat).catch((e) => { }) : "";
    const groupName = m.isGroup ? groupMetadata.subject : "";

    // Push Message To Console
    let argsLog = budy.length > 30 ? `${budy.substring(0, 30)}...` : budy;

    if (isCmd2 && !m.isGroup) {
      console.log(chalk.black(chalk.bgWhite("[ LOGS ]")), chalk.green(argsLog), chalk.magenta("From"), chalk.green(pushname), chalk.yellow(`[ ${m.sender.replace("@s.whatsapp.net", "")} ]`));
    } else if (isCmd2 && m.isGroup) {
      console.log(
        chalk.black(chalk.bgWhite("[ LOGS ]")),
        chalk.green(argsLog),
        chalk.magenta("From"),
        chalk.green(pushname),
        chalk.yellow(`[ ${m.sender.replace("@s.whatsapp.net", "")} ]`),
        chalk.blueBright("IN"),
        chalk.green(groupName)
      );
    }

    if (isCmd2) {
      switch (command) {
        case "help": case "menu": case "start": case "info":
          m.reply(`📴 👨‍💻 Whatsapp Bot OpenAI 🌐
          
Cmd: ${prefix}gemini atau ${prefix}gem
Chat dengan Gemini AI (Lebih canggih!)
${prefix}gemreset - Hapus history chat Gemini

Cmd: ${prefix}cuaca
mengetahui cuaca suatu daerah

Cmd: ${prefix}play atau ${prefix}ytplay
Cari dan putar video YouTube

Cmd: ${prefix}image atau ${prefix}gambar atau ${prefix}img
Generate gambar dari teks menggunakan AI

Cmd: ${prefix}patmon
Total Patient Monitor atau /patmon [bulan] [tahun]

Cmd: ${prefix}topdiag
Top 10 Diagnosa Pasien /topdiag [bulan] [tahun]

Cmd: ${prefix}alquran atau ${prefix}quran
Membaca Al-Quran
Cmd: ${prefix}alquran list atau ${prefix}quran list
Menampilkan daftar lengkap surah Al-Quran
`)
          break;

        case "weather": case "cuaca":
          try {
            if (!args.length) return m.reply(`Cek cuaca dengan format: ${prefix}${command} [nama kota]\n\nContoh:\n${prefix}${command} Jakarta`);
            
            const city = args.join(" ");
            const apiKey = "060a6bcfa19809c2cd4d97a212b19273";
            const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}&lang=id`;
            
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            const caption = `Perkiraan cuaca ${data.name} saat ini ${data.weather[0]?.description}. Suhu mencapai ${data.main.temp}°C terasa seperti ${data.main.feels_like}°C dengan angin berkecepatan ${data.wind.speed} km/h dan kelembapan udara mencapai ${data.main.humidity}%.\n\nhttps://www.google.com/maps/place/${data.coord.lat},${data.coord.lon}`;

            m.reply(caption);
          } catch (error) {
            console.error(error);
            m.reply("❎ Maaf, sepertinya ada yang error saat mengambil data cuaca: " + error.message);
          }
          break;


        case "play": case "playyt": case "ytplay": case "youtubeplay": case "playyoutube":
          try {
            if (!args.length) return m.reply(`🎵 Cari dan putar video YouTube.\n\nContoh:\n${prefix}${command} Judul lagu atau video yang ingin dicari`);

            const query = args.join(" ");
            const search = await yt.search(query, { type: "video" });

            const result = search.items[0];
            if (!result) {
              return m.reply("Maaf, tidak ditemukan hasil untuk pencarian tersebut.");
            }

            const videoInfo = {
              title: result.title,
              thumbnail: result.thumbnails[0].url,
              id: result.id,
              description: result.description,
              uploadDate: result.uploadDate,
            };

            const caption = `🎵 *${videoInfo.title}*\n\n` +
                            `📅 Diunggah pada: ${videoInfo.uploadDate}\n\n` +
                            `📝 Deskripsi:\n${videoInfo.description}\n\n` +
                            `🔗 Link: https://www.youtube.com/watch?v=${videoInfo.id}`;

            await client.sendMessage(m.chat, {
              image: { url: videoInfo.thumbnail },
              caption: caption
            }, { quoted: m });

            // Simpan informasi video terakhir yang dicari oleh pengguna
            // Anda bisa menambahkan logika penyimpanan di sini jika diperlukan

          } catch (error) {
            console.error("Error during YouTube search:", error);
            m.reply("Terjadi kesalahan saat mencari video YouTube.");
          }
          break;

        case "image": case "gambar": case "img":
          try {
            if (!args.length) return m.reply(`🎨 Generate gambar dari teks.\n\nContoh:\n${prefix}${command} kucing lucu bermain bola di taman`);
            
            m.reply("⌛ Sedang mencari gambar... Mohon tunggu");
            
            const UNSPLASH_ACCESS_KEY = "lvpH2VKwlcJlEnmozcZtx-dIa9iT6hD5AY4TfZQBfg4"; // Daftar di unsplash.com/developers
            const prompt = args.join(" ");
            const response = await fetch(
              `https://api.unsplash.com/photos/random?query=${encodeURIComponent(prompt)}&client_id=${UNSPLASH_ACCESS_KEY}`
            );

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            
            await client.sendMessage(m.chat, {
              image: { url: data.urls.regular },
              caption: `📸 Foto oleh ${data.user.name} di Unsplash\nPrompt: ${prompt}`
            }, { quoted: m });
          } catch (error) {
            console.error(error);
            m.reply("❎ Maaf, terjadi kesalahan saat mencari gambar: " + error.message);
          }
          break;

        case "gemini": case "gem":
          try {
            if (!args.length) return m.reply(`🤖 Chat dengan Gemini AI.\n\nContoh:\n${prefix}${command} Siapa presiden Indonesia sekarang?\n\nGunakan ${prefix}gemreset untuk menghapus history chat.`);

            const text = args.join(" ");
            const senderId = m.sender;
            
            // Ambil history chat user ini atau buat baru jika belum ada
            if (!chatHistory.has(senderId)) {
              chatHistory.set(senderId, []);
            }
            const userHistory = chatHistory.get(senderId);
            
            // Gabungkan history dengan pertanyaan baru
            const fullContext = userHistory.length > 0 
              ? `Berikut adalah history chat sebelumnya:\n${userHistory.join("\n")}\n\nPertanyaan baru: ${text}`
              : text;

            const response = await fetch(`https://api.nyxs.pw/ai/gemini-advance?text=${encodeURIComponent(fullContext)}`);
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            if (data.status) {
              // Simpan Q&A ke history
              userHistory.push(`User: ${text}`);
              userHistory.push(`Assistant: ${data.result}`);
              
              // Batasi history hanya 10 pertukaran terakhir (20 pesan)
              while (userHistory.length > 20) {
                userHistory.shift();
              }
              
              await m.reply(data.result);
            } else {
              throw new Error(data.message || "Gagal mendapatkan respons dari Gemini");
            }
          } catch (error) {
            console.error(error);
            m.reply("❎ Maaf, terjadi kesalahan: " + error.message);
          }
          break;

        case "gemreset": case "gemclear":
          try {
            const senderId = m.sender;
            chatHistory.delete(senderId);
            m.reply("🔄 History chat dengan Gemini telah dihapus. Anda dapat memulai percakapan baru.");
          } catch (error) {
            console.error(error);
            m.reply("❎ Maaf, terjadi kesalahan saat menghapus history.");
          }
          break;

case "alquran": case "quran":
          try {
            if (!args.length) return m.reply(`📖 Baca Al-Quran.\n\nContoh:\n${prefix}${command} 21 35\n${prefix}${command} list`);

            if (args[0] === "list") {
              const apiUrl = "https://equran.id/api/v2/surat";
              const response = await axios.get(apiUrl);
              const surahList = response.data.data;

              let listMessage = "Daftar Surah Al-Quran:\n\n";
              surahList.forEach(surah => {
                listMessage += `${surah.nomor}. ${surah.namaLatin} (${surah.nama})\n`;
                listMessage += `   Arti: ${surah.arti}\n`;
                listMessage += `   Jumlah ayat: ${surah.jumlahAyat}\n`;
                listMessage += `   Tempat turun: ${surah.tempatTurun}\n`;
                listMessage += `   Deskripsi: ${surah.deskripsi.replace(/<\/?[^>]+(>|$)/g, "")}\n`; // Menghapus tag HTML
                listMessage += `   Audio:\n`;
                Object.entries(surah.audioFull).forEach(([key, value]) => {
                  listMessage += `     ${key}: ${value}\n`;
                });
                listMessage += "\n";
              });

              // Karena pesan mungkin sangat panjang, kita bagi menjadi beberapa pesan
              const chunkSize = 4000; // Sesuaikan ukuran chunk sesuai kebutuhan
              for (let i = 0; i < listMessage.length; i += chunkSize) {
                await m.reply(listMessage.slice(i, i + chunkSize));
              }
              return;
            }

            const [suraNumber, ayaInput] = args;
            const parsedSuraNumber = parseInt(suraNumber);

            if (isNaN(parsedSuraNumber) || parsedSuraNumber < 1 || parsedSuraNumber > 114) {
              return m.reply(`❎ Surah ${suraNumber} tidak ada.`);
            }

            const apiUrl = `https://equran.id/api/v2/surat/${parsedSuraNumber}`;
            const { data } = await axios.get(apiUrl);
            const surahData = data.data;

            if (ayaInput) {
              if (ayaInput.includes("-")) {
                const [startAya, endAya] = ayaInput.split("-").map(num => parseInt(num));

                if (isNaN(startAya) || isNaN(endAya) || startAya < 1 || endAya < startAya) {
                  return m.reply(`❎ Rentang ayat tidak valid.`);
                }

                const verses = surahData.ayat.filter((d) => d.nomorAyat >= startAya && d.nomorAyat <= endAya);
                if (verses.length === 0) {
                  return m.reply(`❎ Ayat dalam rentang ${startAya}-${endAya} tidak ada.`);
                }

                const versesText = verses.map((d) => {
                  return `${bold(`Ayat ${d.nomorAyat}:`)}\n${d.teksArab} (${d.teksLatin})\n${italic(d.teksIndonesia)}`;
                }).join("\n\n");

                return m.reply(`${bold(`Surah ${surahData.namaLatin}`)}\n${quote(`${surahData.arti}`)}\n${quote("─────")}\n${versesText}`);
              } else {
                const ayaNumber = parseInt(ayaInput);

                if (isNaN(ayaNumber) || ayaNumber < 1) {
                  return m.reply(`❎ Ayat harus lebih dari 0.`);
                }

                const aya = surahData.ayat.find((d) => d.nomorAyat === ayaNumber);
                if (!aya) {
                  return m.reply(`❎ Ayat ${ayaNumber} tidak ada.`);
                }

                return m.reply(`${aya.teksArab} (${aya.teksLatin})\n${italic(aya.teksIndonesia)}`);
              }
            } else {
              const versesText = surahData.ayat.map((d) => {
                return `${bold(`Ayat ${d.nomorAyat}:`)}\n${d.teksArab} (${d.teksLatin})\n${italic(d.teksIndonesia)}`;
              }).join("\n\n");

              return m.reply(`${bold(`Surah ${surahData.namaLatin}`)}\n${quote(`${surahData.arti}`)}\n${quote("─────")}\n${versesText}`);
            }
          } catch (error) {
            console.error(`Error:`, error);
            m.reply(`❎ Terjadi kesalahan: ${error.message}`);
          }
          break;

case "patmon":
          try {
            // Cek jika ada argument bulan dan tahun
            if (args.length >= 2) {
              const bulan = args[0].toLowerCase();
              const tahun = args[1];
              
              const bulanMap = {
                'januari': 1,
                'februari': 2,
                'maret': 3,
                'april': 4,
                'mei': 5,
                'juni': 6,
                'juli': 7,
                'agustus': 8,
                'september': 9,
                'oktober': 10,
                'november': 11,
                'desember': 12
              };
              
              if (!bulanMap[bulan]) {
                return m.reply(`❎ Format tidak valid. Contoh: ${prefix}patmon januari 2024`);
              }
              
              if (!/^\d{4}$/.test(tahun)) {
                return m.reply(`❎ Format tahun tidak valid. Contoh: ${prefix}patmon januari 2024`);
              }
              
              const responseDetail = await axios.get(`https://simrs.rsdurensawit.com/patmon/dat_patmon_detail.php?bulan=${bulanMap[bulan]}&tahun=${tahun}`);
              
              if (responseDetail.data && responseDetail.data.status === 'success') {
                const data = responseDetail.data;
                
                // Format pesan
                let message = `📊 *Data Patient Monitor RSKDDS*\n`;
                message += `⏰ Update: ${data.timestamp}\n`;
                message += `📅 Periode: ${bulan.charAt(0).toUpperCase() + bulan.slice(1)} ${tahun}\n\n`;
                message += `\nTotal Pasien: *${data.data.length}*\n\n`;
                
                if (data.data && Array.isArray(data.data)) {
                  data.data.forEach((pasien, index) => {
                    const waktu = pasien.waktu_pesan.split(' ')[1];
                    message += `${index + 1}. ${pasien.nama_ruangan}, ${pasien.nama} (${pasien.jenis_kelamin}), ${waktu}\n`;
                  });
                  
                  message += `\n\n/patmon [bulan] [tahun]\nuntuk melihat detail`;
                } else {
                  message += "Tidak ada data pasien.";
                }
                
                await m.reply(message);
              } else {
                throw new Error("Format data detail tidak valid");
              }
            } else if (args.length === 1) {
              return m.reply(`❎ Mohon sertakan tahun. Contoh: ${prefix}patmon januari 2024`);
            } else {
              // Request data normal (total)
              const response = await axios.get('https://simrs.rsdurensawit.com/patmon/dat_patmon.php');
              
              if (response.data && response.data.status === 'success') {
                const data = response.data;
                let message = `📊 *Data Patient Monitor RSKDDS*\n`;
                message += `⏰ Update: ${data.timestamp}\n\n`;
                message += `Total Patient Monitor: *${data.data.total_pasien}*\n`;
                message += `\n/patmon [bulan] [tahun]\nuntuk melihat detail`;
                await m.reply(message);
              } else {
                throw new Error("Format data tidak valid");
              }
            }
          } catch (error) {
            console.error("Error saat mengambil data patmon:", error);
            m.reply("❎ Terjadi kesalahan saat mengambil data patmon: " + error.message);
          }
          break;


          case "topdiag":
            try {
              // Cek jika ada argument bulan dan tahun
              if (args.length >= 2) {
                const bulan = args[0].toLowerCase();
                const tahun = args[1];
                
                const bulanMap = {
                  'januari': 1,
                  'februari': 2,
                  'maret': 3,
                  'april': 4,
                  'mei': 5,
                  'juni': 6,
                  'juli': 7,
                  'agustus': 8,
                  'september': 9,
                  'oktober': 10,
                  'november': 11,
                  'desember': 12
                };
                
                if (!bulanMap[bulan]) {
                  return m.reply(`❎ Format tidak valid. Contoh: ${prefix}diag januari 2024`);
                }
                
                if (!/^\d{4}$/.test(tahun)) {
                  return m.reply(`❎ Format tahun tidak valid. Contoh: ${prefix}diag januari 2024`);
                }
                
                const responseDetail = await axios.get(`https://simrs.rsdurensawit.com/patmon/dat_diagnosa.php?bulan=${bulanMap[bulan]}&tahun=${tahun}`);
                
                if (responseDetail.data && responseDetail.data.status === 'success') {
                  const data = responseDetail.data;
                  
                  // Format pesan
                  let message = `📊 *Data Top 10 Diagnosa RSKDDS*\n`;
                  message += `⏰ Update: ${data.timestamp}\n`;
                  message += `📅 Periode: ${bulan.charAt(0).toUpperCase() + bulan.slice(1)} ${tahun}\n`;
                  message += `📆 Tanggal Data: ${data.tanggal_data}\n\n`;
                  
                  if (data.data && Array.isArray(data.data)) {
                    message += `Total Data: *${data.data.length}* diagnosa\n\n`;
                    
                    data.data.forEach((diagnosa, index) => {
                      message += `${index + 1}. *${diagnosa.NamaDiagnosa}*\n`;
                      message += `   Kode: \`${diagnosa.KdDiagnosa}\`\n`;
                      message += `   Jumlah: ${diagnosa.JumlahPasien} pasien\n\n`;
                    });
                  } else {
                    message += "Tidak ada data diagnosa untuk periode tersebut.";
                  }
                  
                  await m.reply(message);
                } else {
                  throw new Error(responseDetail.data?.message || "Data tidak tersedia");
                }
              } else if (args.length === 1) {
                return m.reply(`❎ Mohon sertakan tahun. Contoh: ${prefix}diag januari 2024`);
              } else {
                return m.reply(`📋 Gunakan format: ${prefix}diag [bulan] [tahun]\nContoh: ${prefix}diag januari 2024`);
              }
            } catch (error) {
              console.error("Error saat mengambil data diagnosa:", error);
              m.reply("❎ Terjadi kesalahan saat mengambil data diagnosa: " + error.message);
            }
            break;




          default: {
          if (isCmd2 && budy.toLowerCase() !== undefined) {
            if (m.chat.endsWith("broadcast")) return;
            if (m.isBaileys) return;
            if (!budy.toLowerCase()) return;
            console.log(chalk.black(chalk.bgRed("[ ERROR ]")), chalk.red("command"), chalk.yellow(`${prefix}${command}`), chalk.red("tidak tersedia"));
          }
        }
      }
    }
  } catch (err) {
    m.reply(util.format(err));
  }
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});

//test