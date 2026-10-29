/*
  config.js — SATU-SATUNYA file yang perlu diubah untuk data.
  app.js hanya membaca objek ini, sehingga logika tidak bercampur dengan data.
*/
const CONFIG = {
  graduate: {
    name: "Wa Ode Sela",
    nameCaps: "WA ODE SELA",
    nameFullCaps: "WA ODE SELA, S.E.",
    degree: "Sarjana Ekonomi",
    university: "Universitas Pattimura"
  },

  event: {
    dateShort: "02 November 2026",
    date: "Senin, 2 November 2026",
    time: "Pukul 13.00 WIT – selesai",
    place: "Asrama Sulawesi Tenggara, Jl. Wailela Atas"
  },

  mapsUrl: "https://maps.app.goo.gl/cxaaCPBBTL3uxaGF6",

  /* Google Form: tempat ucapan dikirim */
  form: {
    id: "1FAIpQLScXBceY8nPegv5_afE_ER0_kxBBYcxsv5QpcjLEN_xf54XgoQ",
    // ISI: ID tiap pertanyaan, contoh "entry.1234567890" (cara mencarinya ada di penjelasan)
    entries: {
      name: "entry.732439350", 
      message: "entry.386619007", 
      attendance: "entry.1020708778" },
    // Teks harus SAMA PERSIS dengan opsi pertanyaan "Konfirmasi Kehadiran" di Google Form
    attendanceOptions: ["Hadir", "Tidak Hadir", "Masih Ragu"]
  },

  /* Google Sheet hasil Form: sumber daftar ucapan yang ditampilkan */
  sheet: {
    id: "1Z5NB6f0BqWhxrv6gVdmt1HZIo6eTNY8YkzBJVu-Y95M",   // ISI: ID spreadsheet (bagian antara /d/ dan /edit pada URL-nya)
    gid: "424702802"  // ID tab respons (angka setelah gid= pada URL)
  },

  wishesPerPage: 4
};
