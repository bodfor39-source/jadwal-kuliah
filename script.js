let jadwal = JSON.parse(localStorage.getItem('jadwal')) || [];
const namaHari = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
let lastNotified = {}; 

document.addEventListener('DOMContentLoaded', () => {
    renderTable();
    if (Notification.permission !== "granted") {
        document.getElementById('perm-banner').style.display = 'block';
    }
    setInterval(checkJadwal, 30000); 
});

function aktifkanFitur() {
    Notification.requestPermission();
    new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').load();
    document.getElementById('perm-banner').style.display = 'none';
    document.getElementById('statusNotif').innerText = "Status: Memantau jadwal...";
}

function renderTable(data = jadwal) {
    const body = document.getElementById('jadwalBody');
    body.innerHTML = data.map((j, i) => `
        <tr><td>${j.nama}</td><td>${namaHari[j.hari]}</td><td>${j.jam}</td>
        <td><button class="btn-hapus" onclick="hapus(${i})">x</button></td></tr>
    `).join('');
}

function filterHari(hariTarget) {
    const dataFilter = jadwal.filter(j => j.hari === hariTarget);
    renderTable(dataFilter);
}

function tambahManual() {
    const item = {
        nama: document.getElementById('nama').value,
        jam: document.getElementById('jam').value,
        hari: parseInt(document.getElementById('hari').value)
    };
    if(!item.nama || !item.jam) return alert("Lengkapi data!");
    jadwal.push(item);
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

        text.split('\n').forEach(line => {
            const lowerLine = line.toLowerCase();
            for (let h in hariMap) if (lowerLine.includes(h)) hariTerakhir = hariMap[h];
            
            const match = line.match(/\d{2}:\d{2}/);
            if (match) {
                jadwal.push({ 
                    nama: line.replace(match[0], '').trim() || "MK Scan", 
                    jam: match[0], 
                    hari: hariTerakhir 
                });
            }
        });
        saveAndRender();
        document.getElementById('statusNotif').innerText = "Berhasil diimpor!";
    } catch (e) { alert("Gagal memproses gambar."); }
}

// LOGIKA UPDATE: Memastikan pengecekan waktu presisi
function checkJadwal() {
    const now = new Date();
    const menitSkrg = (now.getHours() * 60) + now.getMinutes();
    const hariSkrg = now.getDay() === 0 ? 7 : now.getDay(); // Konversi Minggu 0 jadi 7 agar sesuai array kita
    
    jadwal.forEach((j, index) => {
        if (j.hari !== hariSkrg) return;
        
        const [h, m] = j.jam.split(':').map(Number);
        const jadwalMenit = (h * 60 + m);
        const selisih = jadwalMenit - menitSkrg;

        if ([120, 60, 0].includes(selisih)) {
            const key = `${index}-${selisih}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
            
            if (!lastNotified[key]) {
                let judul = selisih === 0 ? "Waktunya Kuliah!" : "Pengingat Persiapan";
                let pesan = selisih === 0 ? `Sekarang kelas: ${j.nama}` : `${selisih/60} jam lagi: ${j.nama}`;
                
                triggerNotif(judul, pesan);
                lastNotified[key] = true;
            }
        }
    });
}

function triggerNotif(judul, pesan) {
    if (Notification.permission === "granted") {
        new Notification(judul, { body: pesan });
        new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play();
    }
}

function saveAndRender() { 
    localStorage.setItem('jadwal', JSON.stringify(jadwal)); 
    renderTable(); 
}

function hapus(i) { 
    jadwal.splice(i, 1); 
    saveAndRender(); 
}