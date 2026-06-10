let jadwal = JSON.parse(localStorage.getItem('jadwal')) || [];
const namaHari = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
let lastNotified = {}; 
let editIndex = -1;

document.addEventListener('DOMContentLoaded', () => {
    renderTable();
    updateNotifStatus();
    if (Notification.permission !== "granted") {
        const banner = document.getElementById('perm-banner');
        if(banner) banner.style.display = 'block';
    }
    setInterval(checkJadwal, 30000); 
});

function updateNotifStatus() {
    const btn = document.getElementById('btnNotifStatus');
    if (!btn) return;
    if (Notification.permission === "granted") {
        btn.innerText = "Notif: On";
        btn.style.backgroundColor = "#28a745";
    } else {
        btn.innerText = "Notif: Off";
        btn.style.backgroundColor = "#6c757d";
    }
}

function aktifkanFitur() {
    Notification.requestPermission().then(() => {
        updateNotifStatus();
        new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').load();
        const banner = document.getElementById('perm-banner');
        if(banner) banner.style.display = 'none';
        document.getElementById('statusNotif').innerText = "Status: Memantau jadwal...";
    });
}

function renderTable(data = jadwal) {
    const body = document.getElementById('jadwalBody');
    body.innerHTML = data.map((j, i) => `
        <tr>
            <td>${j.nama}<br><small style="color: #666;">Dosen: ${j.dosen || '-'}</small></td>
            <td>${namaHari[j.hari]}</td>
            <td>${j.jam}</td>
            <td>
                <button onclick="editJadwal(${i})">Edit</button>
                <button class="btn-hapus" onclick="hapus(${i})">x</button>
            </td>
        </tr>
    `).join('');
}

function editJadwal(i) {
    editIndex = i;
    const j = jadwal[i];
    document.getElementById('nama').value = j.nama;
    document.getElementById('jam').value = j.jam;
    document.getElementById('hari').value = j.hari;
    document.getElementById('waktuIngatkan').value = j.ingatkan || 0;
    document.getElementById('btnTambah').innerText = "Update Jadwal";
}

function tambahManual() {
    const item = {
        nama: document.getElementById('nama').value,
        jam: document.getElementById('jam').value,
        hari: parseInt(document.getElementById('hari').value),
        dosen: editIndex === -1 ? "-" : jadwal[editIndex].dosen,
        ingatkan: parseInt(document.getElementById('waktuIngatkan').value)
    };
    if(!item.nama || !item.jam) return alert("Lengkapi data!");

    if (editIndex === -1) {
        jadwal.push(item);
    } else {
        jadwal[editIndex] = item;
        editIndex = -1;
        document.getElementById('btnTambah').innerText = "Tambah Jadwal";
    }
    document.getElementById('nama').value = "";
    saveAndRender();
}

async function prosesGambar() {
    const file = document.getElementById('uploadGambar').files[0];
    if (!file) return alert("Pilih gambar!");
    document.getElementById('statusNotif').innerText = "Memproses gambar...";

    try {
        const { data: { text } } = await Tesseract.recognize(file, 'ind');
        const hariMap = { "senin": 1, "selasa": 2, "rabu": 3, "kamis": 4, "jumat": 5, "sabtu": 6 };
        let hariTerakhir = 1;
        const lines = text.split('\n');

        lines.forEach((line, i) => {
            const lowerLine = line.toLowerCase();
            for (let h in hariMap) if (lowerLine.includes(h)) hariTerakhir = hariMap[h];
            const match = line.match(/\d{2}:\d{2}/);
            if (match) {
                jadwal.push({ 
                    nama: lines[i-1] ? lines[i-1].trim() : "MK Scan", 
                    jam: match[0], 
                    dosen: lines[i+1] ? lines[i+1].trim() : "-",
                    hari: hariTerakhir,
                    ingatkan: 0
                });
            }
        });
        saveAndRender();
        document.getElementById('statusNotif').innerText = "Berhasil diimpor!";
    } catch (e) { alert("Gagal memproses."); }
}

function checkJadwal() {
    const now = new Date();
    const menitSkrg = (now.getHours() * 60) + now.getMinutes();
    const hariSkrg = now.getDay() === 0 ? 7 : now.getDay(); 
    
    const tglHariIni = now.toDateString();
    if (lastNotified.date !== tglHariIni) lastNotified = { date: tglHariIni };

    jadwal.forEach((j, index) => {
        if (j.hari !== hariSkrg) return;
        const [h, m] = j.jam.split(':').map(Number);
        const targetMenit = (h * 60 + m) - (j.ingatkan || 0);

        if (menitSkrg === targetMenit) {
            const key = `${index}-${targetMenit}`;
            if (!lastNotified[key]) {
                triggerNotif(j.ingatkan === 0 ? "Waktunya Kuliah!" : "Persiapan Kelas", 
                             `Kelas: ${j.nama} dengan Dosen: ${j.dosen}`);
                lastNotified[key] = true; 
            }
        }
    });
}

function triggerNotif(judul, pesan) {
    if (Notification.permission === "granted") {
        new Notification(judul, { body: pesan, icon: 'https://cdn-icons-png.flaticon.com/512/2904/2904975.png' });
        new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play();
    }
}

function saveAndRender() { localStorage.setItem('jadwal', JSON.stringify(jadwal)); renderTable(); }
function hapus(i) { jadwal.splice(i, 1); saveAndRender(); }
function filterHari(h) { renderTable(jadwal.filter(j => j.hari === h)); }