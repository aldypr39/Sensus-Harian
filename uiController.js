import { dataStore } from './dataManager.js';
import { Utils } from './utils.js';
import { RekapitulasiManager } from './rekapManager.js';

export const UIController = {
    renderPasienAktif: (searchTerm = '') => {
        const tbody = document.getElementById('tabel-pasien-aktif');
        if (!tbody) return;

        const ruanganId = dataStore.current_user?.ruangan_id;
        let pasienAktif = dataStore.pasien.filter(p => 
            p.ruangan_id === ruanganId && p.status === 'aktif'
        );

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            pasienAktif = pasienAktif.filter(pasien => {
                return (
                    pasien.nama.toLowerCase().includes(lowerCaseSearchTerm) ||
                    pasien.no_rm.toLowerCase().includes(lowerCaseSearchTerm)
                );
            });
        }

        tbody.innerHTML = '';

        if (pasienAktif.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <i class="fas fa-user-plus" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                        <br>
                        Belum ada pasien yang dirawat
                        <br>
                        <small>Klik "Tambah Pasien Masuk" untuk memulai</small>
                    </td>
                </tr>
            `;
            return;
        }

        pasienAktif.forEach((pasien, index) => {
            const lamaDirawat = Utils.hitungLamaDirawat(pasien.tgl_masuk);
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${pasien.no_rm}</td>
                <td>${pasien.nama}</td>
                <td>${Utils.formatDateTime(pasien.tgl_masuk)}</td>
                <td>${lamaDirawat}</td>
                <td><span class="bed-tag">${pasien.no_tt}</span></td>
                <td class="actions-cell">
                    <button class="btn-action-icon edit" title="Edit Data Pasien" data-id="${pasien.id}">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="btn-action-icon delete" title="Hapus Data Pasien" data-id="${pasien.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                    <button class="btn-action-primary discharge" title="Keluar/Pindah Pasien" data-id="${pasien.id}">
                        Keluar/Pindah
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });
    },

    displayRiwayatPage: () => {
        const tanggalAwalInput = document.getElementById('filter-tanggal-awal');
        const tanggalAkhirInput = document.getElementById('filter-tanggal-akhir');

        if (tanggalAwalInput && tanggalAkhirInput && tanggalAwalInput.value === '' && tanggalAkhirInput.value === '') {
            const formattedDate = new Date().toISOString().slice(0, 10);
            tanggalAwalInput.value = formattedDate;
            tanggalAkhirInput.value = formattedDate;
        }

        const ruanganId = dataStore.current_user?.ruangan_id;
        const searchTerm = document.getElementById('search-riwayat-pulang')?.value || '';
        const tanggalAwal = tanggalAwalInput?.value;
        const tanggalAkhir = tanggalAkhirInput?.value;

        let allRiwayat = dataStore.riwayat_pasien.filter(p => p.ruangan_id === ruanganId);

        if (tanggalAwal && tanggalAkhir) {
            allRiwayat = allRiwayat.filter(pasien => {
                if (!pasien.tgl_keluar) return false;
                const tanggalKeluarPasien = pasien.tgl_keluar.split('T')[0];
                return tanggalKeluarPasien >= tanggalAwal && tanggalKeluarPasien <= tanggalAkhir;
            });
        }
        
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            allRiwayat = allRiwayat.filter(pasien => 
                pasien.nama.toLowerCase().includes(lowerCaseSearchTerm) ||
                pasien.no_rm.toLowerCase().includes(lowerCaseSearchTerm)
            );
        }
        
        UIController.renderRiwayatPasien(allRiwayat);
    },

    renderRiwayatPasien: (daftarRiwayat) => {
        const tbody = document.querySelector('#pulang tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        if (daftarRiwayat.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        <i class="fas fa-history" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                        <br>
                        Belum ada riwayat pasien pulang
                        <br>
                        <small>Riwayat akan muncul setelah ada pasien yang keluar</small>
                    </td>
                </tr>
            `;
            return;
        }
        
        daftarRiwayat.forEach((pasien, index) => {
            const row = document.createElement('tr');
            const thead = document.querySelector('#pulang table thead tr');
            if (thead && !thead.innerHTML.includes('Aksi')) {
                thead.innerHTML += '<th>Aksi</th>';
            }
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${pasien.no_rm}</td>
                <td>${pasien.nama}</td>
                <td>${Utils.formatDate(pasien.tgl_masuk)}</td>
                <td>${Utils.formatDate(pasien.tgl_keluar)}</td>
                <td>${pasien.lama_dirawat}</td>
                <td>${pasien.keadaan_keluar}</td>
                <td class="actions-cell">
                    <button class="btn-action-primary btn-cancel-discharge" data-id="${pasien.id}" title="Batalkan status keluar pasien ini">
                        Batalkan Keluar
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    // Fungsi baru untuk render rekapitulasi
    renderRekapitulasi: (bulanFilter = null, tahunFilter = null) => {
        const tbody = document.querySelector('.recap-table-section tbody');
        if (!tbody || !window.location.pathname.includes('rekapitulasi')) return;

        const ruanganId = dataStore.current_user?.ruangan_id || 1;
        const currentDate = new Date();
        
        // Gunakan filter jika ada, atau default ke bulan/tahun ini
        const bulan = bulanFilter || currentDate.getMonth() + 1;
        const tahun = tahunFilter || currentDate.getFullYear();

        console.log(`Rendering rekapitulasi untuk bulan ${bulan} tahun ${tahun}`);

        // Generate data rekapitulasi untuk bulan dan tahun yang dipilih
        const rekapData = RekapitulasiManager.generateRekapBulan(ruanganId, bulan, tahun);

        tbody.innerHTML = '';
        
        rekapData.forEach((data, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="sticky-col">${Utils.formatDate(data.tanggal)}</td>
                <td>${data.pasien_awal}</td>
                <td>${data.masuk_baru}</td>
                <td>${data.pindahan}</td>
                <td>${data.jml_masuk}</td>
                <td>${data.dipindahkan}</td>
                <td>${data.keluar_hidup}</td>
                <td>${data.dirujuk}</td>
                <td>${data.aps}</td>
                <td>${data.mati_kurang48_l}</td>
                <td>${data.mati_kurang48_p}</td>
                <td>${data.mati_lebih48_l}</td>
                <td>${data.mati_lebih48_p}</td>
                <td>${data.jml_mati}</td>
                <td>${data.jml_keluar}</td>
                <td>${data.lama_dirawat}</td>
                <td>${data.in_out_sama}</td>
                <td>${data.pasien_sisa}</td>
                <td>${data.hari_perawatan}</td>
            `;
            tbody.appendChild(row);
        });

        // Update juga ringkasan statistik
        UIController.updateRingkasanStatistik(rekapData);
    },

    // Fungsi baru untuk update ringkasan statistik
    updateRingkasanStatistik: (rekapData) => {
        if (!rekapData || rekapData.length === 0) return;

        // Hitung total dari semua data
        const totalMasuk = rekapData.reduce((sum, data) => sum + data.jml_masuk, 0);
        const totalKeluar = rekapData.reduce((sum, data) => sum + data.jml_keluar, 0);
        const totalHariPerawatan = rekapData.reduce((sum, data) => sum + data.hari_perawatan, 0);
        const totalLamaDirawat = rekapData.reduce((sum, data) => sum + data.lama_dirawat, 0);

        // Update elemen-elemen ringkasan
        const updateStatElement = (selector, value) => {
            const element = document.querySelector(selector);
            if (element) element.textContent = value;
        };

        // Update ringkasan pasien masuk
        updateStatElement('.mini-card:nth-child(1) .summary-item:nth-child(1) .value', rekapData[0]?.pasien_awal || 0);
        updateStatElement('.mini-card:nth-child(1) .summary-item:nth-child(2) .value', totalMasuk);

        // Update ringkasan pasien keluar
        updateStatElement('.mini-card:nth-child(2) .summary-item:nth-child(1) .value', totalKeluar);
        updateStatElement('.mini-card:nth-child(2) .summary-item:nth-child(2) .value', 0); // Meninggal ≤ 48 jam
        updateStatElement('.mini-card:nth-child(2) .summary-item:nth-child(3) .value', 0); // Meninggal > 48 jam
        updateStatElement('.mini-card:nth-child(2) .summary-item:nth-child(4) .value', totalKeluar);

        // Update ringkasan perawatan
        updateStatElement('.mini-card:nth-child(3) .summary-item:nth-child(1) .value', totalHariPerawatan);
        updateStatElement('.mini-card:nth-child(3) .summary-item:nth-child(2) .value', totalLamaDirawat);
        updateStatElement('.mini-card:nth-child(3) .summary-item:nth-child(3) .value', rekapData[rekapData.length - 1]?.pasien_sisa || 0);

        // Update data ruangan - gunakan data real
        const ruangan = dataStore.ruangan.find(r => r.id === (dataStore.current_user?.ruangan_id || 1));
        updateStatElement('.mini-card:nth-child(4) .summary-item:nth-child(1) .value', ruangan?.jumlah_tt || 8);
        updateStatElement('.mini-card:nth-child(4) .summary-item:nth-child(2) .value', rekapData.length);
        
        console.log(`Statistik updated: ${totalMasuk} masuk, ${totalKeluar} keluar, ${totalHariPerawatan} hari perawatan`);
    },

    // Fungsi baru untuk render indikator
    renderIndikator: (bulanFilter = null, tahunFilter = null) => {
        if (!window.location.pathname.includes('laporan_indikator')) return;

        const ruanganId = dataStore.current_user?.ruangan_id || 1;
        const currentDate = new Date();
        
        // Gunakan filter jika ada, atau default ke bulan/tahun ini
        const bulan = bulanFilter || currentDate.getMonth() + 1;
        const tahun = tahunFilter || currentDate.getFullYear();

        console.log(`Rendering indikator untuk bulan ${bulan} tahun ${tahun}`);
        
        // Hitung indikator berdasarkan periode yang dipilih
        const bor = Utils.hitungBOR(ruanganId, bulan, tahun);
        const avlos = Utils.hitungAvLOS(ruanganId, bulan, tahun);
        const bto = Math.round((bor / 100) * 4); // Simplified BTO calculation
        const toi = Math.round((100 - bor) / bor * 0.5 * 10) / 10; // Simplified TOI
        
        // Update indicator cards
        const borCard = document.querySelector('.indicator-card.bor .indicator-value');
        const avlosCard = document.querySelector('.indicator-card.avlos .indicator-value');
        const btoCard = document.querySelector('.indicator-card.bto .indicator-value');
        const toiCard = document.querySelector('.indicator-card.toi .indicator-value');

        if (borCard) borCard.textContent = `${bor}%`;
        if (avlosCard) avlosCard.innerHTML = `${avlos} <span class="unit">hari</span>`;
        if (btoCard) btoCard.innerHTML = `${bto} <span class="unit">kali</span>`;
        if (toiCard) toiCard.innerHTML = `${toi} <span class="unit">hari</span>`;

        console.log(`Indikator updated: BOR=${bor}%, AvLOS=${avlos} hari`);
    },

    renderRuanganAdmin: () => {
        const tbody = document.querySelector('.admin-content table tbody');
        if (!tbody || !window.location.pathname.includes('admin_ruangan')) return;

        tbody.innerHTML = '';
        
        dataStore.ruangan.forEach((ruangan) => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${ruangan.nama}</td>
                <td>${ruangan.jumlah_tt}</td>
                <td style="text-align: center;">
                    <button class="btn-edit" title="Edit Ruangan" data-id="${ruangan.id}">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="btn-delete" title="Hapus Ruangan" data-id="${ruangan.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    },

    renderAkunAdmin: () => {
        const tbody = document.querySelector('.admin-content table tbody');
        if (!tbody || !window.location.pathname.includes('admin_akun')) return;

        tbody.innerHTML = '';
        
        const akunRuangan = dataStore.users.filter(u => u.role === 'ruangan');
        
        akunRuangan.forEach((user) => {
            const ruangan = dataStore.ruangan.find(r => r.id === user.ruangan_id);
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${ruangan ? ruangan.nama : 'Tidak ada ruangan'}</td>
                <td>${user.username}</td>
                <td style="text-align: center;">
                    <button class="btn-edit" title="Edit Password" data-id="${user.id}">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="btn-delete" title="Hapus Akun" data-id="${user.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    },

    updateTempatTidurDropdown: () => {
        const dropdown = document.getElementById('no_tt');
        if (!dropdown) {
            console.log('Dropdown no_tt not found!');
            return;
        }

        const ruanganId = dataStore.current_user?.ruangan_id;
        console.log('Updating tempat tidur dropdown for ruangan:', ruanganId);
        
        const tempatTidurTersedia = dataStore.tempat_tidur.filter(tt => 
            tt.ruangan_id === ruanganId && tt.is_available
        );
        
        console.log('Available beds:', tempatTidurTersedia.length);
        console.log('Available bed details:', tempatTidurTersedia);

        dropdown.innerHTML = '<option value="">Pilih Tempat Tidur</option>';
        
        tempatTidurTersedia.forEach(tt => {
            const option = document.createElement('option');
            option.value = tt.nomor_tt;
            option.textContent = tt.nomor_tt;
            dropdown.appendChild(option);
        });

        if (dropdown.dataset.currentValue && !dropdown.querySelector(`option[value="${dropdown.dataset.currentValue}"]`)) {
            const option = document.createElement('option');
            option.value = dropdown.dataset.currentValue;
            option.textContent = dropdown.dataset.currentValue;
            option.selected = true;
            dropdown.appendChild(option);
        }
        
        console.log('Dropdown updated with', dropdown.options.length, 'options');
    },

    updateRuanganDropdown: () => {
        const dropdown = document.getElementById('pilih-ruangan');
        if (!dropdown) return;

        dropdown.innerHTML = '';
        
        dataStore.ruangan.forEach(ruangan => {
            const option = document.createElement('option');
            option.value = ruangan.id;
            option.textContent = ruangan.nama;
            dropdown.appendChild(option);
        });
    }
};