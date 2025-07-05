// js/modules/dataManager.js (Versi LENGKAP & FINAL)

// Impor modul lain yang dibutuhkan oleh file ini
import { Utils } from './utils.js';
import { RekapitulasiManager } from './rekapManager.js';

// Ekspor variabel dataStore
export let dataStore = {
    ruangan: [
        { id: 1, nama: 'Ruang Mawar', jumlah_tt: 8, is_active: true },
        { id: 2, nama: 'Ruang Melati', jumlah_tt: 15, is_active: true },
        { id: 3, nama: 'ICU', jumlah_tt: 10, is_active: true },
        { id: 4, nama: 'Ruang Anak', jumlah_tt: 12, is_active: true }
    ],
    users: [
        { id: 1, username: 'admin', password: 'admin123', role: 'admin', ruangan_id: null },
        { id: 2, username: 'ruangmawar', password: 'mawar123', role: 'ruangan', ruangan_id: 1 },
        { id: 3, username: 'ruangmelati', password: 'melati123', role: 'ruangan', ruangan_id: 2 },
        { id: 4, username: 'ruangicu', password: 'icu123', role: 'ruangan', ruangan_id: 3 }
    ],
    pasien: [],
    riwayat_pasien: [],
    tempat_tidur: [],
    rekapitulasi_harian: [],
    current_user: null,
    next_id: { pasien: 1, riwayat: 1, ruangan: 5, users: 5 }
};

// Fungsi ini hanya digunakan di dalam file ini (privat)
function generateTempatTidur() {
    const tempatTidur = [];
    const ruanganConfig = [
        { id: 1, prefix: 'M', jumlah: 8 },
        { id: 2, prefix: 'ML', jumlah: 15 },
        { id: 3, prefix: 'ICU', jumlah: 10 },
        { id: 4, prefix: 'A', jumlah: 12 }
    ];

    ruanganConfig.forEach(ruangan => {
        for (let i = 1; i <= ruangan.jumlah; i++) {
            const nomorTT = `${ruangan.prefix}-${i.toString().padStart(2, '0')}`;
            const isOccupied = dataStore.pasien.some(p => p.no_tt === nomorTT && p.status === 'aktif');
            tempatTidur.push({
                id: tempatTidur.length + 1,
                ruangan_id: ruangan.id,
                nomor_tt: nomorTT,
                is_available: !isOccupied
            });
        }
    });
    console.log('Generated tempat tidur:', tempatTidur.filter(tt => tt.ruangan_id === 1));
    return tempatTidur;
}

// Ekspor objek DataManager
export const DataManager = {
    save: () => {
        try {
            localStorage.setItem('sensus_harian_data', JSON.stringify(dataStore));
            console.log('Data saved successfully');
        } catch (error) {
            console.error('Error saving data:', error);
        }
    },

    load: () => {
        try {
            const saved = localStorage.getItem('sensus_harian_data');
            if (saved) {
                const parsed = JSON.parse(saved);
                dataStore = { ...dataStore, ...parsed };
                console.log('Data loaded successfully');
            }
            dataStore.tempat_tidur = generateTempatTidur();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    },

    pasien: {
        create: (data) => {
            const newPasien = {
                id: dataStore.next_id.pasien++,
                ...data,
                status: 'aktif'
            };
            dataStore.pasien.push(newPasien);
            const tanggalMasuk = data.tgl_masuk.split('T')[0];
            DataManager.save();
            RekapitulasiManager.updateHarian(data.ruangan_id, tanggalMasuk);
            return newPasien;
        },

        update: (id, data) => {
            const index = dataStore.pasien.findIndex(p => p.id === id);
            if (index !== -1) {
                // 1. Simpan tanggal masuk yang lama SEBELUM diubah
                const tanggalMasukLama = dataStore.pasien[index].tgl_masuk.split('T')[0];
                
                // 2. Lakukan pembaruan data
                dataStore.pasien[index] = { ...dataStore.pasien[index], ...data };
                
                // 3. Ambil tanggal masuk yang baru SETELAH diubah
                const tanggalMasukBaru = dataStore.pasien[index].tgl_masuk.split('T')[0];

                // 4. Simpan perubahan ke localStorage
                DataManager.save();

                // 5. Jika tanggalnya berubah, picu perhitungan ulang untuk KEDUA tanggal
                if (tanggalMasukLama !== tanggalMasukBaru) {
                    console.log(`Tanggal masuk berubah dari ${tanggalMasukLama} ke ${tanggalMasukBaru}. Menghitung ulang rekap.`);
                    RekapitulasiManager.updateHarian(dataStore.pasien[index].ruangan_id, tanggalMasukLama);
                    RekapitulasiManager.updateHarian(dataStore.pasien[index].ruangan_id, tanggalMasukBaru);
                }
                
                return dataStore.pasien[index];
            }
            return null;
        },

        delete: (id) => {
            const index = dataStore.pasien.findIndex(p => p.id === id);
            if (index !== -1) {
                dataStore.pasien.splice(index, 1);
                DataManager.save();
                return true;
            }
            return false;
        },

        keluar: (id, dataKeluar) => {
            const pasien = dataStore.pasien.find(p => p.id === id);
            if (pasien) {
                const riwayat = {
                    id: dataStore.next_id.riwayat++,
                    no_rm: pasien.no_rm,
                    nama: pasien.nama,
                    jenis_kelamin: pasien.jenis_kelamin,
                    ruangan_id: pasien.ruangan_id,
                    tgl_masuk: pasien.tgl_masuk,
                    asal_pasien: pasien.asal_pasien, // Perbaikan: Pastikan asal_pasien tersimpan
                    no_tt: pasien.no_tt, // Perbaikan: Pastikan no_tt tersimpan
                    tgl_keluar: dataKeluar.tgl_keluar,
                    keadaan_keluar: dataKeluar.keadaan_keluar,
                    lama_dirawat: Utils.hitungLamaDirawat(pasien.tgl_masuk, dataKeluar.tgl_keluar)
                };
                dataStore.riwayat_pasien.push(riwayat);
                DataManager.pasien.delete(id);
                const tempatTidur = dataStore.tempat_tidur.find(tt => tt.nomor_tt === pasien.no_tt);
                if (tempatTidur) {
                    tempatTidur.is_available = true;
                }
                DataManager.save();
                const tanggalKeluar = dataKeluar.tgl_keluar.split('T')[0];
                RekapitulasiManager.updateHarian(pasien.ruangan_id, tanggalKeluar);
                return riwayat;
            }
            return null;
        },

        // --- FUNGSI BARU DITAMBAHKAN DI SINI ---
        cancelDischarge: (riwayatId) => {
            const riwayatIndex = dataStore.riwayat_pasien.findIndex(p => p.id === riwayatId);
            if (riwayatIndex === -1) {
                console.error('Data riwayat tidak ditemukan!');
                return null;
            }

            const [pasienDibatalkan] = dataStore.riwayat_pasien.splice(riwayatIndex, 1);

            const pasienAktifKembali = {
                id: pasienDibatalkan.id,
                no_rm: pasienDibatalkan.no_rm,
                nama: pasienDibatalkan.nama,
                jenis_kelamin: pasienDibatalkan.jenis_kelamin,
                ruangan_id: pasienDibatalkan.ruangan_id,
                tgl_masuk: pasienDibatalkan.tgl_masuk,
                asal_pasien: pasienDibatalkan.asal_pasien || 'pindahan',
                no_tt: pasienDibatalkan.no_tt,
                status: 'aktif'
            };
            
            dataStore.pasien.push(pasienAktifKembali);

            const tempatTidur = dataStore.tempat_tidur.find(tt => tt.nomor_tt === pasienAktifKembali.no_tt);
            if (tempatTidur) {
                tempatTidur.is_available = false;
            }

            console.log(`Pasien ${pasienAktifKembali.nama} berhasil dikembalikan ke pasien aktif.`);
            DataManager.save();

            const tanggalBatalKeluar = pasienDibatalkan.tgl_keluar.split('T')[0];
            RekapitulasiManager.updateHarian(pasienDibatalkan.ruangan_id, tanggalBatalKeluar);
            
            return pasienAktifKembali;
        }
    },

    ruangan: {
        create: (data) => {
            const newRuangan = {
                id: dataStore.next_id.ruangan++,
                nama: data.nama_ruangan,
                jumlah_tt: parseInt(data.jumlah_tt),
                is_active: true
            };
            dataStore.ruangan.push(newRuangan);
            DataManager.save();
            return newRuangan;
        },
        update: (id, data) => {
            const index = dataStore.ruangan.findIndex(r => r.id === id);
            if (index !== -1) {
                dataStore.ruangan[index] = { 
                    ...dataStore.ruangan[index], 
                    nama: data.nama_ruangan,
                    jumlah_tt: parseInt(data.jumlah_tt)
                };
                DataManager.save();
                return dataStore.ruangan[index];
            }
            return null;
        },
        delete: (id) => {
            const index = dataStore.ruangan.findIndex(r => r.id === id);
            if (index !== -1) {
                dataStore.ruangan.splice(index, 1);
                DataManager.save();
                return true;
            }
            return false;
        }
    },

    users: {
        create: (data) => {
            const newUser = {
                id: dataStore.next_id.users++,
                username: data.username,
                password: data.password,
                role: 'ruangan',
                ruangan_id: parseInt(data.ruangan_id)
            };
            dataStore.users.push(newUser);
            DataManager.save();
            return newUser;
        },
        update: (id, data) => {
            const index = dataStore.users.findIndex(u => u.id === id);
            if (index !== -1) {
                dataStore.users[index] = { 
                    ...dataStore.users[index],
                    username: data.username,
                    ruangan_id: parseInt(data.ruangan_id)
                };
                if (data.password) {
                    dataStore.users[index].password = data.password;
                }
                DataManager.save();
                return dataStore.users[index];
            }
            return null;
        },
        delete: (id) => {
            const index = dataStore.users.findIndex(u => u.id === id);
            if (index !== -1) {
                dataStore.users.splice(index, 1);
                DataManager.save();
                return true;
            }
            return false;
        }
    }
};
